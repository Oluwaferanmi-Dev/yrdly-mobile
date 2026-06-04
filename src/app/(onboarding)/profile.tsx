import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { LocationPicker, LocationValue } from '../../components/LocationPicker';

const GREEN = '#388E3C';

export default function OnboardingProfileScreen() {
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress dots */}
          <View style={styles.progress}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconRing}>
              <Ionicons name="person-add-outline" size={32} color={GREEN} />
            </View>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              Tell your neighbours a little about yourself. You can always edit this later.
            </Text>
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Display name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. James Okafor"
              placeholderTextColor="#BDBDBD"
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={50}
            />
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Bio <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your neighbours something about yourself…"
              placeholderTextColor="#BDBDBD"
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>
          </View>

          {/* Location Picker */}
          <View style={styles.sectionDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Your neighbourhood</Text>
            <View style={styles.dividerLine} />
          </View>

          <LocationPicker value={location} onChange={setLocation} />

          <View style={styles.locationNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#9E9E9E" />
            <Text style={styles.locationNoteText}>
              Your exact GPS coordinates are never shared. Only your State and LGA are visible to neighbours.
            </Text>
          </View>
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, saving && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  dotActive: { backgroundColor: GREEN, width: 24 },

  header: { alignItems: 'center', marginBottom: 32 },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C1C',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  fieldGroup: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: { fontWeight: '400', color: '#9E9E9E', textTransform: 'none', letterSpacing: 0 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1C',
  },
  textarea: { height: 90, paddingTop: 14 },
  charCount: { fontSize: 11, color: '#BDBDBD', textAlign: 'right', marginTop: 4 },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { fontSize: 12, color: '#9E9E9E', marginHorizontal: 12, fontWeight: '600' },

  locationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  locationNoteText: { fontSize: 12, color: '#9E9E9E', flex: 1, lineHeight: 17 },

  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    backgroundColor: '#FAFAFA',
  },
  continueBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
});
