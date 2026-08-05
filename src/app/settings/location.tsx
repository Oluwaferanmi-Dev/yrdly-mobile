import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
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

export default function LocationSettingsScreen() {
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
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]}>
      <View style={[styles.header, { backgroundColor: DARK, borderBottomColor: GLASS_BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TEXT_PRIMARY }]}>Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Current location */}
        {location.state ? (
          <View style={[styles.currentCard, { backgroundColor: SURFACE, borderColor: GLASS_BORDER, borderWidth: 1 }]}>
            <View style={[styles.currentIcon, { backgroundColor: 'rgba(130, 219, 126, 0.1)' }]}>
              <Ionicons name="location-outline" size={22} color={G} />
            </View>
            <View>
              <Text style={[styles.currentLabel, { color: MUTED }]}>Current Location</Text>
              <Text style={[styles.currentValue, { color: TEXT_PRIMARY }]}>
                {location.lga ? `${location.lga}, ` : ''}{location.state}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={[styles.info, { color: MUTED }]}>
          Your location determines which posts, events, marketplace items, and neighbours you see.
        </Text>

        <LocationPicker value={location} onChange={(l) => { setLocation(l); setSaved(false); }} />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: G }, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#000000" />
          ) : saved ? (
            <>
              <Feather name="check-circle" size={20} color="#000000" style={{ marginRight: 8 }} />
              <Text style={[styles.saveBtnText, { color: '#000000' }]}>Location Updated!</Text>
            </>
          ) : (
            <Text style={[styles.saveBtnText, { color: '#000000' }]}>Save Location</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-ExtraBold', flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  currentCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 16, marginBottom: 16 },
  currentIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  currentLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  currentValue: { fontSize: 15, fontFamily: 'Outfit-Bold' },
  info: { fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 20, marginBottom: 20 },
  saveBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontFamily: 'Outfit-ExtraBold', color: '#111' },
});
