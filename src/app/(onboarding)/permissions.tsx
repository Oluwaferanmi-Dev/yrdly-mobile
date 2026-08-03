import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Logo, PrimaryBtn } from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';
import { useAuth } from '@/hooks/use-supabase-auth';

const { colors, radii } = ONBOARDING_THEME;

function ToggleSwitch({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? colors.G : 'rgba(255,255,255,0.1)' },
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          { left: value ? 23 : 3 },
        ]}
      />
    </TouchableOpacity>
  );
}

export default function PermissionsScreen() {
  const router = useRouter();
  const { updateProfile } = useAuth();
  const [perms, setPerms] = useState({ location: false, notifications: false, camera: false });

  const handleFinish = async () => {
    try {
      await updateProfile({ profile_completed: true });
    } catch (e) {
      console.log('Profile completion update skipped:', e);
    }
    router.replace('/(tabs)');
  };

  const togglePermission = async (key: keyof typeof perms) => {
    if (perms[key]) {
      setPerms(prev => ({ ...prev, [key]: false }));
      return;
    }

    try {
      if (key === 'location') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPerms(prev => ({ ...prev, location: status === 'granted' }));
      } else if (key === 'notifications') {
        const { status } = await Notifications.requestPermissionsAsync();
        setPerms(prev => ({ ...prev, notifications: status === 'granted' }));
      } else if (key === 'camera') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setPerms(prev => ({ ...prev, camera: status === 'granted' }));
      }
    } catch (e) {
      setPerms(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const items = [
    { key: 'location' as const, emoji: '📍', title: 'Location Access', desc: 'To show you nearby neighbours, events & marketplace items' },
    { key: 'notifications' as const, emoji: '🔔', title: 'Push Notifications', desc: 'To alert you when neighbours message or post nearby' },
    { key: 'camera' as const, emoji: '📷', title: 'Camera & Photos', desc: 'To list items in marketplace and post community photos' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Logo size={56} />
            <Text style={styles.titleText}>Enable permissions for the best experience</Text>
            <Text style={styles.subtitleText}>
              YRDLY works best with these on. You can change them anytime in Settings.
            </Text>
          </View>

          <View style={styles.cardStack}>
            {items.map(item => (
              <View
                key={item.key}
                style={[
                  styles.permCard,
                  { borderColor: perms[item.key] ? 'rgba(130,219,126,0.25)' : colors.GLASS_BORDER },
                ]}
              >
                <View
                  style={[
                    styles.emojiBadge,
                    { backgroundColor: perms[item.key] ? 'rgba(130,219,126,0.1)' : 'rgba(255,255,255,0.04)' },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>

                <ToggleSwitch value={perms[item.key]} onToggle={() => togglePermission(item.key)} />
              </View>
            ))}
          </View>

          <View style={styles.bottomActions}>
            <PrimaryBtn label="Allow Selected & Continue" onClick={handleFinish} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: colors.LABEL,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  cardStack: {
    gap: 12,
    marginBottom: 24,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderRadius: radii.card,
  },
  emojiBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.LABEL,
    lineHeight: 18,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 99,
    justifyContent: 'center',
    position: 'relative',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  bottomActions: {
    paddingBottom: 24,
    paddingTop: 12,
  },
});
