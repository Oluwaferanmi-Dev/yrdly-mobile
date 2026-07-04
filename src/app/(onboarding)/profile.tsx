import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { LocationPicker, LocationValue } from '../../components/LocationPicker';
import { useAppTheme } from '../../context/ThemeContext';

export default function OnboardingProfileScreen() {
  const { colors } = useAppTheme();
  const { profile, updateProfile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState<LocationValue>({
    state: (profile?.location as any)?.state || '',
    lga: (profile?.location as any)?.lga || '',
  });
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your display name to continue.');
      return;
    }
    if (!location.state || !location.lga) {
      Alert.alert(
        'Location required',
        'Your neighbourhood is how Yrdly connects you locally. Please select your State and LGA.'
      );
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        location: {
          state: location.state,
          lga: location.lga,
          ...(location.lat ? { lat: location.lat, lng: location.lng } : {}),
        },
        profile_completed: true,
        onboarding_status: 'welcome',
      } as any);
      router.replace('/(onboarding)/welcome');
    } catch (e) {
      console.error('Profile save error:', e);
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress dots */}
          <View style={styles.progress}>
            <View style={[styles.dot, styles.dotActive, { backgroundColor: colors.tint }]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconRing, { backgroundColor: colors.tint + '22' }]}>
              <Feather name="user-plus" size={32} color={colors.tint} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Set up your profile</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Tell your neighbours a little about yourself. You can always edit this later.
            </Text>
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Display name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. James Okafor"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={50}
            />
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Bio <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your neighbours something about yourself…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>{bio.length}/200</Text>
          </View>

          {/* Location Picker */}
          <View style={styles.sectionDivider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>Your neighbourhood</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <LocationPicker value={location} onChange={setLocation} />

          <View style={styles.locationNote}>
            <Feather name="shield" size={14} color={colors.textMuted} />
            <Text style={[styles.locationNoteText, { color: colors.textMuted }]}>
              Your exact GPS coordinates are never shared. Only your State and LGA are visible to neighbours.
            </Text>
          </View>
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }, saving && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Feather name="arrow-right" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  dotActive: { width: 24 },

  header: { alignItems: 'center', marginBottom: 32 },
  iconRing: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  textarea: { height: 90, paddingTop: 14 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, marginHorizontal: 12, fontWeight: '600' },

  locationNote: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, gap: 6 },
  locationNoteText: { fontSize: 12, flex: 1, lineHeight: 17 },

  footer: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1 },
  continueBtn: {
    borderRadius: 14, height: 56, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
});
