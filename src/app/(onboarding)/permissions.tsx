import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo, PrimaryBtn } from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';

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
  const [perms, setPerms] = useState({ location: false, notifications: false, camera: false });

  const toggle = (key: keyof typeof perms) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const items = [
    { key: 'location' as const, emoji: '📍', title: 'Location Access', desc: 'To show you nearby neighbours, events & marketplace items' },
    { key: 'notifications' as const, emoji: '🔔', title: 'Push Notifications', desc: 'To alert you when neighbours message or post nearby' },
    { key: 'camera' as const, emoji: '📷', title: 'Camera & Photos', desc: 'To list items in marketplace and post community photos' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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

              <ToggleSwitch value={perms[item.key]} onToggle={() => toggle(item.key)} />
            </View>
          ))}
        </View>

        <View style={styles.bottomActions}>
          <PrimaryBtn label="Allow Selected & Continue" onClick={() => router.push('/(onboarding)/feed' as any)} />
        </View>
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
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 32,
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
    flex: 1,
    gap: 12,
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
