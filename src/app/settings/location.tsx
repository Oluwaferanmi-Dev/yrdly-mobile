import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { LocationPicker, LocationValue } from '../../components/LocationPicker';

const GREEN = '#388E3C';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Current location */}
        {location.state ? (
          <View style={styles.currentCard}>
            <View style={styles.currentIcon}>
              <Ionicons name="location" size={22} color={GREEN} />
            </View>
            <View>
              <Text style={styles.currentLabel}>Current Location</Text>
              <Text style={styles.currentValue}>
                {location.lga ? `${location.lga}, ` : ''}{location.state}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.info}>
          Your location determines which posts, events, marketplace items, and neighbours you see.
        </Text>

        <LocationPicker value={location} onChange={(l) => { setLocation(l); setSaved(false); }} />

        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : saved ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
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
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2', backgroundColor: '#FFF' },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  currentCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  currentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  currentLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  currentValue: { fontSize: 15, fontWeight: '700', color: '#1C1C1C' },
  info: { fontSize: 13, color: '#9E9E9E', lineHeight: 20, marginBottom: 20 },
  saveBtn: { height: 56, borderRadius: 28, backgroundColor: GREEN, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
