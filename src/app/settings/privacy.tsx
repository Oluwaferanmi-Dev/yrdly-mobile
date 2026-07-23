import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/use-supabase-auth';
import { AuthService } from '../../lib/auth-service';
import { useAppTheme } from '../../context/ThemeContext';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors, isDarkMode } = useAppTheme();

  const [shareLocation, setShareLocation] = useState<boolean>(false);
  const [discoverable, setDiscoverable] = useState<boolean>(true);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingDiscoverable, setSavingDiscoverable] = useState(false);

  useEffect(() => {
    if (profile) {
      setShareLocation(profile.share_location ?? false);
      setDiscoverable(profile.discoverable ?? true);
    }
  }, [profile]);

  const handleShareLocationToggle = async (value: boolean) => {
    setShareLocation(value);
    if (!user) return;
    setSavingLocation(true);
    try {
      await AuthService.updateUserProfile(user.id, { share_location: value });
    } catch (e) {
      console.error(e);
      setShareLocation(!value); // revert on error
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDiscoverableToggle = async (value: boolean) => {
    setDiscoverable(value);
    if (!user) return;
    setSavingDiscoverable(true);
    try {
      await AuthService.updateUserProfile(user.id, { discoverable: value });
    } catch (e) {
      console.error(e);
      setDiscoverable(!value); // revert on error
    } finally {
      setSavingDiscoverable(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Discoverability</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>LOCATION PRIVACY</Text>
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={[styles.navRow, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.iconGlow, { backgroundColor: 'rgba(130, 225, 87, 0.1)' }]}>
              <Ionicons name="location-outline" size={24} color={colors.tint} />
            </View>
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: colors.text }]}>Share Location with Friends</Text>
              <Text style={[styles.navSubtext, { color: colors.textSecondary }]}>
                Let mutual friends see you on the map
              </Text>
            </View>
            {savingLocation ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Switch
                value={shareLocation}
                onValueChange={handleShareLocationToggle}
                trackColor={{ false: '#353534', true: colors.tint }}
                thumbColor={'#FFFFFF'}
                ios_backgroundColor="#353534"
              />
            )}
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>COMMUNITY VISIBILITY</Text>
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={[styles.navRow, { borderBottomColor: colors.borderLight }]}>
            <View style={[styles.iconGlow, { backgroundColor: 'rgba(130, 225, 87, 0.1)' }]}>
              <Ionicons name="compass-outline" size={24} color={colors.tint} />
            </View>
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: colors.text }]}>Allow Neighbors to Discover Me</Text>
              <Text style={[styles.navSubtext, { color: colors.textSecondary }]}>
                When enabled, your profile may appear in other users' Discover tab based on your location.
              </Text>
            </View>
            {savingDiscoverable ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Switch
                value={discoverable}
                onValueChange={handleDiscoverableToggle}
                trackColor={{ false: '#353534', true: colors.tint }}
                thumbColor={'#FFFFFF'}
                ios_backgroundColor="#353534"
              />
            )}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Disabling discovery prevents new people from finding you in the Community tab, but existing friends will still see you on their friends list.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D0B' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 24 },
  
  sectionHeader: {
    color: '#A6A6A6', fontSize: 12, fontWeight: '700',
    letterSpacing: 1.2, marginLeft: 8, marginBottom: 12,
  },
  glassCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 24,
    borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16,
  },
  iconGlow: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(130, 225, 87, 0.1)',
  },
  navTextWrap: { flex: 1, marginRight: 16 },
  navLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  navSubtext: { color: '#A6A6A6', fontSize: 13, lineHeight: 18 },
  
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  }
});
