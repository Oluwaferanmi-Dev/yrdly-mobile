import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  location?: {
    state?: string;
    lga?: string;
    city?: string;
    ward?: string;
  };
  friends?: string[];
  blocked_users?: string[];
  interests?: string[];
  shareLocation?: boolean;
  notification_settings?: {
    friendRequests: boolean;
    messages: boolean;
    postUpdates: boolean;
    comments: boolean;
    postLikes: boolean;
    eventInvites: boolean;
  };
  is_online?: boolean;
  last_seen?: string;
  onboarding_status?: 'signup' | 'email_verification' | 'profile_setup' | 'welcome' | 'tour' | 'completed';
  profile_completed?: boolean;
  onboarding_completed_at?: string;
  tour_completed?: boolean;
  welcome_message_sent?: boolean;
  created_at?: string;
  updated_at?: string;
  push_token?: string;
}

export class AuthService {
  private static getRedirectUrl() {
    const url = makeRedirectUri({
      path: 'auth/callback'
    });
    console.log('--- SUPABASE REDIRECT URL ---');
    console.log(url);
    console.log('-----------------------------');
    return url;
  }

  // Sign up with email and password
  static async signUp(email: string, password: string, name: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: this.getRedirectUrl(),
          data: {
            name,
          },
        },
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error };
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error };
    }
  }

  // Sign in with Google
  static async signInWithGoogle() {
    try {
      const redirectTo = this.getRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // Prevents default web redirect, required for native
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Opens the secure native browser to complete OAuth
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        
        if (result.type === 'success' && result.url) {
          // If Supabase uses PKCE flow (default in v2), extract code:
          const urlParams = new URLSearchParams(result.url.split('?')[1] || '');
          const code = urlParams.get('code');
          if (code) {
             await supabase.auth.exchangeCodeForSession(code);
          } else {
             // If Implicit flow (hash), extract token:
             const hashParams = new URLSearchParams(result.url.split('#')[1] || '');
             const access_token = hashParams.get('access_token');
             const refresh_token = hashParams.get('refresh_token');
             if (access_token && refresh_token) {
               await supabase.auth.setSession({ access_token, refresh_token });
             }
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { data: null, error };
    }
  }

  // Sign in with Apple
  static async signInWithApple() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: this.getRedirectUrl(),
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Apple sign in error:', error);
      return { data: null, error };
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        if (error.message !== 'Auth session missing!') {
          console.error('Get current user error:', error);
        }
        return null;
      }
      return user;
    } catch (error: any) {
      if (error.message !== 'Auth session missing!') {
        console.error('Get current user error:', error);
      }
      return null;
    }
  }

  // Get user profile from public.users table
  static async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Database error fetching user profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  // Create user profile in public.users table
  static async createUserProfile(user: User, name: string) {
    try {
      const existingProfile = await this.getUserProfile(user.id);
      if (existingProfile) {
        return;
      }

      const finalName = name || user.user_metadata?.name || user.email?.split('@')[0];

      const { error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name: finalName,
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url,
          profile_completed: false,
          onboarding_status: 'profile_setup',
          notification_settings: {
            friendRequests: true,
            messages: true,
            postUpdates: true,
            comments: true,
            postLikes: true,
            eventInvites: true,
          },
        });

      if (error) {
        if (error.code === '23505') {
          return;
        }
        console.error('Database error creating user profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('Create user profile error:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<AuthUser>) {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('reset-password'),
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  }

  // Update password
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Update password error:', error);
      return { error };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }
}
