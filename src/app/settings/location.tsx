import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { LocationPicker, LocationValue } from '../../components/LocationPicker';
import { useAppTheme } from '../../context/ThemeContext';

export default function LocationSettingsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [location, setLocation] = useState<LocationValue>({
    state: (profile?.location as any)?.state ?? '',
    lga: (profile?.location as any)?.lga ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.location) {
      setLocation({
        state: (profile.location as any).state ?? '',
        lga: (profile.location as any).lga ?? '',
      });
    }
  }, [profile]);

  const hasChanges =
    location.state !== ((profile?.location as any)?.state ?? '') ||
    location.lga !== ((profile?.location as any)?.lga ?? '');

  const handleSave = async () => {
    if (!location.state || !location.lga) {
      Alert.alert('Required', 'Please select both your State and LGA.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        location: {
          state: location.state,
          lga: location.lga,
          ...(location.lat ? { lat: location.lat, lng: location.lng } : {}),
        },
      } as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert('Error', 'Could not update location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Current location */}
        {location.state ? (
          <View style={[styles.currentCard, { backgroundColor: colors.card }]}>
            <View style={[styles.currentIcon, { backgroundColor: colors.tint + '22' }]}>
              <Ionicons name="location-outline" size={22} color={colors.tint} />
            </View>
            <View>
              <Text style={[styles.currentLabel, { color: colors.textMuted }]}>Current Location</Text>
              <Text style={[styles.currentValue, { color: colors.text }]}>
                {location.lga ? `${location.lga}, ` : ''}{location.state}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={[styles.info, { color: colors.textMuted }]}>
          Your location determines which posts, events, marketplace items, and neighbours you see.
        </Text>

        <LocationPicker value={location} onChange={(l) => { setLocation(l); setSaved(false); }} />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : saved ? (
            <>
              <Feather name="check-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Location Updated!</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>Save Location</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  currentCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  currentIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  currentLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  currentValue: { fontSize: 15, fontWeight: '700' },
  info: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  saveBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
