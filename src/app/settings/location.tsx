import { createStyleSheet, useStyles } from "react-native-unistyles";
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
const ALL_NEIGHBOURHOODS = [
  'Victoria Island, Eti-Osa, Lagos',
  'Lekki Phase 1, Eti-Osa, Lagos',
  'Ikeja GRA, Ikeja, Lagos',
  'Surulere, Surulere, Lagos',
  'Yaba, Shomolu, Lagos',
  'Ikoyi, Eti-Osa, Lagos',
  'Gbagada, Kosofe, Lagos',
  'Ajah, Eti-Osa, Lagos',
  'Maryland, Ikeja, Lagos',
  'Festac Town, Amuwo-Odofin, Lagos',
  'Alimosho, Alimosho, Lagos',
  'Magodo, Kosofe, Lagos',
  'Opebi, Ikeja, Lagos',
  'Allen Avenue, Ikeja, Lagos',
  'Maitama, Abuja (FCT)',
  'Wuse II, Abuja (FCT)',
  'Gwarinpa, Abuja (FCT)',
  'Asokoro, Abuja (FCT)',
  'Jabi, Abuja (FCT)',
  'Port Harcourt City, Rivers',
  'Enugu North, Enugu',
  'Ibadan North, Oyo',
  'Benin City, Edo',
  'Calabar Municipal, Cross River',
  'Abeokuta South, Ogun',
  'Kaduna North, Kaduna',
  'Kano Municipal, Kano',
];

export default function LocationSettingsScreen() {
  const { styles: s, theme } = useStyles(sStylesheet);

  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const currentNeighbourhood = profile?.location?.state || 'Not set';

  const handleSelectNeighbourhood = async (neigh: string) => {
    setUpdating(true);
    try {
      await updateProfile({
        location: {
          ...profile?.location,
          state: neigh,
        },
      });
      Alert.alert('Success', 'Neighbourhood updated successfully.');
      setSearch('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update location.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUseGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use GPS.');
        setGpsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse && reverse.length > 0) {
        const place = reverse[0];
        const district = place.district || place.subregion || place.city;
        const region = place.region || place.city || 'Lagos';
        const formatted = district ? `${district}, ${region}` : 'Victoria Island, Lagos';
        await handleSelectNeighbourhood(formatted);
      } else {
        await handleSelectNeighbourhood('Victoria Island, Lagos');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to detect location via GPS.');
    } finally {
      setGpsLoading(false);
    }
  };

  const filteredNeighbourhoods = ALL_NEIGHBOURHOODS.filter(n =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Location Settings</Text>
        {updating ? (
          <ActivityIndicator size="small" color={theme.colors.G} style={{ marginRight: 8 }} />
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Current Location Display */}
        <View style={s.currentCard}>
          <View style={s.gpsBadge}>
            <Feather name="map-pin" size={18} color={theme.colors.G} />
          </View>
          <View style={s.currentInfo}>
            <Text style={s.currentLabel}>CURRENT NEIGHBOURHOOD</Text>
            <Text style={s.currentValue}>{currentNeighbourhood}</Text>
          </View>
        </View>

        {/* GPS Button */}
        <TouchableOpacity style={s.gpsBtn} onPress={handleUseGPS} disabled={gpsLoading || updating}>
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="location-outline" size={18} color="#fff" />
              <Text style={s.gpsBtnText}>Use Current Location (GPS)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Search */}
        <Text style={s.sectionLabel}>CHANGE NEIGHBOURHOOD</Text>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color={theme.colors.LABEL} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search communities..."
            placeholderTextColor={theme.colors.LABEL}
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.LABEL} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search Results / Suggestion List */}
        <View style={s.listCard}>
          {filteredNeighbourhoods.map((n, idx) => {
          return (
                      <React.Fragment key={n}>
                        {idx > 0 && <View style={s.divider} />}
                        <TouchableOpacity
                          style={s.listItem}
                          onPress={() => handleSelectNeighbourhood(n)}
                          disabled={updating}
                        >
                          <Text style={[s.listItemText, n === currentNeighbourhood && { color: theme.colors.G, fontFamily: 'Inter-SemiBold' }]}>
                            {n}
                          </Text>
                          {n === currentNeighbourhood && (
                            <Ionicons name="checkmark" size={18} color={theme.colors.G} />
                          )}
                        </TouchableOpacity>
                      </React.Fragment>
                    );
          })}
          {filteredNeighbourhoods.length === 0 && (
            <Text style={s.noResults}>No matching neighbourhoods found.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const sStylesheet = createStyleSheet(theme => ({
      root: { flex: 1, backgroundColor: theme.colors.DARK },
      header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.GLASS_BORDER },
      backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
      headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
      content: { padding: 20 },
      currentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.SURFACE, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, padding: 16, marginBottom: 16 },
      gpsBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(130,219,126,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
      currentInfo: { flex: 1 },
      currentLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: theme.colors.MUTED, letterSpacing: 0.8, marginBottom: 4 },
      currentValue: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
      gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 25, backgroundColor: theme.colors.G, marginBottom: 24 },
      gpsBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
      sectionLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: theme.colors.MUTED, letterSpacing: 0.8, marginBottom: 10 },
      searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, borderRadius: 14, height: 48, paddingHorizontal: 12, marginBottom: 16 },
      searchInput: { flex: 1, color: '#fff', fontFamily: 'Inter', fontSize: 14, height: '100%' },
      listCard: { backgroundColor: theme.colors.SURFACE, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, overflow: 'hidden' },
      listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
      listItemText: { fontFamily: 'Inter', fontSize: 14, color: '#fff' },
      divider: { height: 1, backgroundColor: theme.colors.GLASS_BORDER },
      noResults: { fontFamily: 'Inter', fontSize: 13, color: theme.colors.MUTED, textAlign: 'center', paddingVertical: 20 },
    }));
