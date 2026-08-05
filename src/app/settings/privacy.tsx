import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/use-supabase-auth';
import { AuthService } from '../../lib/auth-service';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

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
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]}>
      <View style={[styles.header, { backgroundColor: DARK, borderBottomColor: GLASS_BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TEXT_PRIMARY }]}>Privacy & Discoverability</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <Text style={[styles.sectionHeader, { color: LABEL }]}>LOCATION PRIVACY</Text>
        <View style={[styles.glassCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}>
          <View style={[styles.navRow, { borderBottomColor: GLASS_BORDER }]}>
            <View style={[styles.iconGlow, { backgroundColor: 'rgba(130, 219, 126, 0.1)' }]}>
              <Ionicons name="location-outline" size={24} color={G} />
            </View>
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: TEXT_PRIMARY }]}>Share Location with Friends</Text>
              <Text style={[styles.navSubtext, { color: MUTED }]}>
                Let mutual friends see you on the map
              </Text>
            </View>
            {savingLocation ? (
              <ActivityIndicator size="small" color={G} />
            ) : (
              <Switch
                value={shareLocation}
                onValueChange={handleShareLocationToggle}
                trackColor={{ false: '#353534', true: G }}
                thumbColor={'#FFFFFF'}
                ios_backgroundColor="#353534"
              />
            )}
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: LABEL }]}>COMMUNITY VISIBILITY</Text>
        <View style={[styles.glassCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]}>
          <View style={[styles.navRow, { borderBottomColor: GLASS_BORDER }]}>
            <View style={[styles.iconGlow, { backgroundColor: 'rgba(130, 219, 126, 0.1)' }]}>
              <Ionicons name="compass-outline" size={24} color={G} />
            </View>
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: TEXT_PRIMARY }]}>Allow Neighbors to Discover Me</Text>
              <Text style={[styles.navSubtext, { color: MUTED }]}>
                When enabled, your profile may appear in other users' Discover tab based on your location.
              </Text>
            </View>
            {savingDiscoverable ? (
              <ActivityIndicator size="small" color={G} />
            ) : (
              <Switch
                value={discoverable}
                onValueChange={handleDiscoverableToggle}
                trackColor={{ false: '#353534', true: G }}
                thumbColor={'#FFFFFF'}
                ios_backgroundColor="#353534"
              />
            )}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={18} color={MUTED} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: MUTED }]}>
            We value your privacy. Your exact GPS coordinates are never broadcast to the public — only coarse location (State and LGA) is used for local discovery.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconGlow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  navLabel: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 2,
  },
  navSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
});
