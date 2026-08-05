import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, RED } from '../../constants/tokens';

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11, color: LABEL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 20, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

interface SettingRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  sub: string;
  onPress?: () => void;
  isLast?: boolean;
  value?: string;
  toggle?: boolean;
  toggled?: boolean;
  onToggle?: (val: boolean) => void;
}

function SettingRow({ icon, iconColor = G, label, sub, onPress, isLast = false, value, toggle, toggled, onToggle }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: GLASS_BORDER }}
      onPress={toggle ? undefined : onPress}
      activeOpacity={toggle ? 1 : 0.7}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: iconColor + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 15, color: TEXT_PRIMARY, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: MUTED }}>{sub}</Text>
      </View>
      {value ? (
        <Text style={{ fontFamily: 'Inter-Medium', fontSize: 13, color: G, marginRight: 4 }}>{value}</Text>
      ) : null}
      {toggle ? (
        <Switch
          value={toggled}
          onValueChange={onToggle}
          trackColor={{ false: '#353534', true: G }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#353534"
        />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { isDarkMode, toggleTheme } = useAppTheme();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  const isAdmin = (profile as any)?.is_admin || (profile as any)?.role === 'admin';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DARK }}>
      {/* ── Detail Header (Figma matching) ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#111111', borderWidth: 1, borderColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="chevron-back" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: TEXT_PRIMARY }}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>
        
        {/* Section 1: Account & Identity */}
        <SettingSection title="Account & Identity">
          <SettingRow 
            icon="person-outline" 
            label="Edit Profile" 
            sub="Update your name, photo and bio" 
            onPress={() => router.push('/profile/edit')} 
          />
          <SettingRow 
            icon="call-outline" 
            label="Phone Number" 
            sub={profile?.phone_verified ? `${profile?.phone || 'Phone'} · Verified` : 'Verify phone number for trusted status'} 
            value={profile?.phone_verified ? 'Verified' : 'Verify'} 
            onPress={() => router.push('/verify-phone')} 
          />
          <SettingRow 
            icon="mail-outline" 
            label="Email Address" 
            sub={user?.email || 'No email linked'} 
            isLast 
          />
        </SettingSection>

        {/* Section 2: Commerce */}
        <SettingSection title="Commerce">
          <SettingRow 
            icon="bag-handle-outline" 
            label="Transactions" 
            sub="Track your orders & marketplace activity" 
            onPress={() => router.push('/transactions')} 
          />
          <SettingRow 
            icon="wallet-outline" 
            label="Payouts" 
            sub="Manage your earnings & balances" 
            onPress={() => router.push('/settings/payouts')} 
          />
          <SettingRow 
            icon="business-outline" 
            label="Bank Account" 
            sub="Manage your linked payout account" 
            onPress={() => router.push('/settings/payout-settings')} 
            isLast 
          />
        </SettingSection>

        {/* Section 3: Privacy & Location */}
        <SettingSection title="Privacy & Location">
          <SettingRow 
            icon="lock-closed-outline" 
            label="Privacy & Discoverability" 
            sub="Manage location sharing and visibility" 
            onPress={() => router.push('/settings/privacy')} 
          />
          <SettingRow 
            icon="location-outline" 
            label="Location" 
            sub="Your neighbourhood & location alerts" 
            onPress={() => router.push('/settings/location')} 
          />
          <SettingRow 
            icon="shield-outline" 
            label="Blocked Users" 
            sub="Manage who can't see or contact you" 
            value={profile?.blocked_users?.length ? `${profile.blocked_users.length}` : '0'} 
            isLast 
          />
        </SettingSection>

        {/* Section 4: Preferences */}
        <SettingSection title="Preferences">
          <SettingRow 
            icon="notifications-outline" 
            label="Notifications" 
            sub="Choose what you want to hear" 
            onPress={() => router.push('/settings/notifications')} 
          />
          <SettingRow 
            icon="moon-outline" 
            label="Dark Mode" 
            sub="Keep it easy on your eyes" 
            toggle 
            toggled={isDarkMode} 
            onToggle={toggleTheme} 
            isLast 
          />
        </SettingSection>

        {/* Section 5: Community & Support */}
        <SettingSection title="Community & Support">
          <SettingRow 
            icon="person-add-outline" 
            label="Invite Neighbours" 
            sub="Invite neighbours to join your community" 
            onPress={() => router.push('/invite' as any)} 
          />
          <SettingRow 
            icon="book-outline" 
            label="Neighbourhood Guidelines" 
            sub="What we stand for in every community" 
            onPress={() => Alert.alert('Neighbourhood Guidelines', 'Be respectful, look out for your neighbours, and support your local marketplace.')} 
          />
          <SettingRow 
            icon="help-circle-outline" 
            label="Help Center" 
            sub="FAQs, tutorials and getting support" 
            onPress={() => Alert.alert('Help Center', 'Need help? Contact support@yrdly.app')} 
          />
          <SettingRow 
            icon="flag-outline" 
            label="Report an Issue" 
            sub="Flag a problem or inappropriate content" 
            onPress={() => Alert.alert('Report an Issue', 'Thank you for keeping Yrdly safe. Please email safety@yrdly.app to report an issue.')} 
            isLast 
          />
        </SettingSection>

        {/* Section 6: Admin Tools (Figma matching) */}
        {isAdmin && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: G + '10', borderWidth: 1, borderColor: G + '25', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: G + '18', borderWidth: 1, borderColor: G + '30', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={18} color={G} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: G }}>Admin Portal</Text>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL }}>You have administrator privileges</Text>
              </View>
              <TouchableOpacity 
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: G, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => router.push('/(admin)/disputes' as any)}
              >
                <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 12, color: DARK }}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Section 7: Account Actions */}
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', marginTop: 4 }} 
          onPress={handleSignOut} 
          disabled={authLoading}
        >
          <Ionicons name="log-out-outline" size={20} color={RED} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 15, color: RED }}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
