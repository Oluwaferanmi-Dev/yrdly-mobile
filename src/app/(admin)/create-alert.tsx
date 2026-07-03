import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert as RNAlert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { AlertService } from '../../lib/alert-service';
import { useAuth } from '../../hooks/use-supabase-auth';

export default function CreateAlertScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'amber' | 'missing_person' | 'community_safety'>('amber');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [radiusKm, setRadiusKm] = useState('50');
  const [coordinate, setCoordinate] = useState({ latitude: 6.5244, longitude: 3.3792 }); // Default Lagos
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setCoordinate({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      fetchAddress(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  const fetchAddress = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result.length > 0) {
        const place = result[0];
        setAddress(`${place.street || ''} ${place.city || place.subregion || ''}, ${place.region || ''}`.trim());
      }
    } catch (error) {
      console.log('Geocoding error', error);
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapPress = (e: any) => {
    const coord = e.nativeEvent.coordinate;
    setCoordinate(coord);
    fetchAddress(coord.latitude, coord.longitude);
  };

  // If user is not admin, they shouldn't even be here, but let's be safe
  if (profile?.role !== 'admin' && !profile?.is_admin) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unauthorized Access</Text>
      </View>
    );
  }

  const handleCreate = async () => {
    if (!title || !description) {
      RNAlert.alert('Error', 'Please fill in the title and description.');
      return;
    }

    setLoading(true);
    
    // Defaulting location to a placeholder for Phase 1 if we don't have a map picker yet.
    // In a real scenario, this would use a map picker component.
    const { error } = await AlertService.createAlert({
      type,
      title,
      description,
      radius_km: parseInt(radiusKm, 10) || 50,
      source: 'yrdly_admin',
      last_seen_address: address,
      lat: coordinate.latitude,
      lng: coordinate.longitude,
    });

    setLoading(false);

    if (error) {
      RNAlert.alert('Error', 'Failed to create alert: ' + error.message);
    } else {
      RNAlert.alert('Success', 'Alert broadcasted successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Alert</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.label}>Alert Type</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'amber' && styles.typeButtonActive]}
          onPress={() => setType('amber')}
        >
          <Text style={[styles.typeText, type === 'amber' && styles.typeTextActive]}>Amber / Child</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'missing_person' && styles.typeButtonActive]}
          onPress={() => setType('missing_person')}
        >
          <Text style={[styles.typeText, type === 'missing_person' && styles.typeTextActive]}>Missing Person</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'community_safety' && styles.typeButtonActive]}
          onPress={() => setType('community_safety')}
        >
          <Text style={[styles.typeText, type === 'community_safety' && styles.typeTextActive]}>Safety</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Alert Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Missing 9yo in Shomolu"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Provide all known details..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Radius (km)</Text>
      <TextInput
        style={styles.input}
        placeholder="50"
        keyboardType="numeric"
        value={radiusKm}
        onChangeText={setRadiusKm}
      />

      <Text style={styles.label}>Location</Text>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          region={{
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={handleMapPress}
        >
          <Marker coordinate={coordinate} />
        </MapView>
        <View style={styles.addressBox}>
          {geocoding ? (
            <ActivityIndicator size="small" color="#6b7280" />
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>
              {address || 'Tap on the map to set location'}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>{loading ? 'Broadcasting...' : 'Broadcast Alert'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#111827',
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  typeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#4b5563',
  },
  typeTextActive: {
    color: '#ffffff',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginTop: 4,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  addressBox: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
});
