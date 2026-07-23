'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AuthService, AuthUser } from '@/lib/auth-service';
import { supabase } from '@/lib/supabase';
import { usePostHog } from 'posthog-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';

const PROFILE_CACHE_FILE = `${FileSystem.documentDirectory}user_profile_cache.json`;

interface AuthContextType {
  user: User | null;
  profile: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, legalName: string) => Promise<{ user: User | null; session: Session | null; error: any }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: any }>;
  signInWithGoogle: () => Promise<{ data: any; error: any }>;
  signInWithApple: () => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCreationInProgress, setProfileCreationInProgress] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    let isMounted = true;
    let profileChannel: any = null;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          
          if (currentUser) {
            try {

              let userProfile = null;
              try {
                // Try cache first for fast boot
                const info = await FileSystem.getInfoAsync(PROFILE_CACHE_FILE);
                if (info.exists) {
                  const cached = await FileSystem.readAsStringAsync(PROFILE_CACHE_FILE);
                  const parsed = JSON.parse(cached);
                  if (parsed && parsed.id === currentUser.id) {
                    userProfile = parsed;
                  }
                }
              } catch (e) {}

              const netInfo = await NetInfo.fetch();
              if (netInfo.isConnected) {
                try {
                  // Fetch fresh profile, but timeout after 5 seconds so we don't hang splash screen
                  const fetchPromise = AuthService.getUserProfile(currentUser.id);
                  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
                  const freshProfile = await Promise.race([fetchPromise, timeoutPromise]);
                  
                  if (freshProfile) {
                    userProfile = freshProfile;
                    FileSystem.writeAsStringAsync(PROFILE_CACHE_FILE, JSON.stringify(freshProfile)).catch(() => {});
                  }
                } catch (e) {
                  console.warn('Network fetch for profile failed:', e);
                }
              }

              // If no profile exists and not from cache, create one
              if (!userProfile && !profileCreationInProgress) {
                setProfileCreationInProgress(true);
                try {
                  await AuthService.createUserProfile(currentUser, 
                    currentUser.user_metadata?.name || 
                    currentUser.user_metadata?.full_name ||
                    currentUser.user_metadata?.display_name ||
                    currentUser.user_metadata?.given_name ||
                    currentUser.email?.split('@')[0] || 
                    'User'
                  );
                  // Fetch the newly created profile
                  userProfile = await AuthService.getUserProfile(currentUser.id);
                  if (userProfile) {
                    FileSystem.writeAsStringAsync(PROFILE_CACHE_FILE, JSON.stringify(userProfile)).catch(() => {});
                  }
                } catch (createError) {
                  console.error('Error creating user profile on initial load:', createError);
                  userProfile = {
                    id: currentUser.id,
                    name: currentUser.user_metadata?.name || 'User',
                    email: currentUser.email,
                    profile_completed: true,
                  } as AuthUser;
                } finally {
                  setProfileCreationInProgress(false);
                }
              }
              
              if (isMounted) {
                setProfile(userProfile);
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
              if (isMounted) {
                setProfile(null);
              }
            }
          } else {
            // No user, ensure profile is also null
            if (isMounted) {
              setProfile(null);
            }
          }
        }
      } catch (error) {
        // Don't log AuthSessionMissingError as it's expected when user is logged out
        if (error instanceof Error && error.message !== 'Auth session missing!') {
          console.error('Error getting initial session:', error);
        }
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const setupProfileRealtime = (userId: string) => {
      // Clean up existing subscription if present
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
        profileChannel = null;
      }
      // Set up real-time subscription for profile updates
      profileChannel = supabase
        .channel(`user-profile-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${userId}`,
          },
          async (payload) => {
            if (isMounted && payload.new) {
              // Use the new payload directly instead of fetching which may return stale data
              setProfile((prev) => {
                if (!prev) return payload.new as AuthUser;
                return { ...prev, ...(payload.new as Partial<AuthUser>) };
              });
            }
          }
        )
        .subscribe();
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          console.warn('[Yrdly Auth] Ignored SIGNED_OUT event because device is offline.');
          return;
        }
      }

      if (event === 'TOKEN_REFRESH_FAILED') {
        console.warn('[Yrdly Auth] Token refresh failed, keeping current user state.');
        return;
      }

      if (isMounted) {
        setUser(user);
        
        if (user) {
          if (posthog) {
            posthog.identify(user.id, {
              email: user.email || '',
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0],
            });
          }

          try {
            let userProfile = null;
            try {
              const info = await FileSystem.getInfoAsync(PROFILE_CACHE_FILE);
              if (info.exists) {
                const cached = await FileSystem.readAsStringAsync(PROFILE_CACHE_FILE);
                const parsed = JSON.parse(cached);
                if (parsed && parsed.id === user.id) {
                  userProfile = parsed;
                }
              }
            } catch (e) {}

            const netInfo = await NetInfo.fetch();
            if (netInfo.isConnected) {
              try {
                const fetchPromise = AuthService.getUserProfile(user.id);
                const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
                const freshProfile = await Promise.race([fetchPromise, timeoutPromise]);
                
                if (freshProfile) {
                  userProfile = freshProfile;
                  FileSystem.writeAsStringAsync(PROFILE_CACHE_FILE, JSON.stringify(freshProfile)).catch(() => {});
                }
              } catch (e) {
                console.warn('Network fetch for profile failed:', e);
              }
            }

            // If no profile exists, create one
            if (!userProfile && !profileCreationInProgress) {
              setProfileCreationInProgress(true);
              try {
                await AuthService.createUserProfile(user, 
                  user.user_metadata?.name || 
                  user.user_metadata?.full_name ||
                  user.user_metadata?.display_name ||
                  user.user_metadata?.given_name ||
                  user.email?.split('@')[0] || 
                  'User'
                );
                // Fetch the newly created profile
                userProfile = await AuthService.getUserProfile(user.id);
                if (userProfile) {
                  FileSystem.writeAsStringAsync(PROFILE_CACHE_FILE, JSON.stringify(userProfile)).catch(() => {});
                }
              } catch (createError) {
                console.error('Error creating user profile:', createError);
                userProfile = {
                  id: user.id,
                  name: user.user_metadata?.name || 'User',
                  email: user.email,
                  profile_completed: true,
                } as AuthUser;
              } finally {
                setProfileCreationInProgress(false);
              }
            }
            
            if (isMounted) {
              setProfile(userProfile);
              // Set up real-time subscription for this user's profile
              setupProfileRealtime(user.id);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            if (isMounted) {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
          // Clean up profile subscription
          if (profileChannel) {
            supabase.removeChannel(profileChannel);
            profileChannel = null;
          }
        }
        
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [profileCreationInProgress]);

  const signUp = async (email: string, password: string, name: string, legalName: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signUp(email, password, name, legalName);
      const { data: { session } } = await supabase.auth.getSession();
      if (result.error || !session) {
        setLoading(false);
      }
      return result;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      if (result.error) {
        setLoading(false);
      }
      return result;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithGoogle();
      const { data: { session } } = await supabase.auth.getSession();
      if (result.error || !session) {
        setLoading(false);
      }
      return result;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const signInWithApple = async () => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithApple();
      const { data: { session } } = await supabase.auth.getSession();
      if (result.error || !session) {
        setLoading(false);
      }
      return result;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (posthog) {
        posthog.capture('user_signed_out');
        posthog.reset();
      }
      const result = await AuthService.signOut();
      if (result.error) {
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
      }
      return result;
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const resetPassword = async (email: string) => {
    return await AuthService.resetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    return await AuthService.updatePassword(newPassword);
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await AuthService.updateUserProfile(user.id, updates);
      
      const updatedProfile = profile ? { ...profile, ...updates } : null;
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

