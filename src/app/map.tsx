import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { User, Business, Post } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/use-supabase-auth';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [events, setEvents] = useState<Post[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1. Request Permissions & Get Current Location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let currentLoc = await Location.getCurrentPositionAsync({});
      setLocation(currentLoc);

      // 2. Fetch Users & Businesses with Location Data
      await fetchMapData();
    })();
  }, [user]);

  const fetchMapData = async () => {
    try {
      // Fetch users with recent location updates
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .not('currentLocation', 'is', null)
        .limit(50);
        
      if (!userError && userData) {
        setUsers(userData as User[]);
      }

      // Fetch businesses
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .not('map-pin', 'is', null)
        .limit(50);

      if (!bizError && bizData) {
        setBusinesses(bizData as Business[]);
      }

      // Fetch Events
      const { data: eventData, error: eventError } = await supabase
        .from('posts')
        .select('*')
        .eq('category', 'Event')
        .limit(50);

      if (!eventError && eventData) {
        setEvents(eventData as Post[]);
      }

      // Fetch Friends
      if (user) {
        const { data: me } = await supabase.from('users').select('friends').eq('id', user.id).single();
        const friendIds = me?.friends || [];
        if (friendIds.length > 0) {
          const { data: friendsData } = await supabase
            .from('users')
            .select('*')
            .in('id', friendIds)
            .not('currentLocation', 'is', null);
          if (friendsData) {
            setFriends(friendsData as User[]);
          }
        }
      }

    } catch (e) {
      console.error('Map Data Fetch Error', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Locating you...</Text>
      </View>
    );
  }

  // Fallback to a default location (e.g. Lagos) if location permission is denied
  const initialRegion = {
    latitude: location?.coords.latitude || 6.5244,
    longitude: location?.coords.longitude || 3.3792,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Yrdly Map</Text>
        <View style={{ width: 40 }} />
      </View>

      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>{errorMsg}</Text>
          <Text style={[styles.subErrorText, { color: colors.textSecondary }]}>Please enable location services in your settings to view the map correctly.</Text>
        </View>
      ) : null}

      <MapView 
        style={styles.map} 
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Render Users */}
        {users.map(u => {
          // Skip if user is in friends list (they will be rendered as friends)
          if (friends.some(f => f.id === u.id)) return null;
          if (!u.currentLocation) return null;
          const lat = parseFloat(u.currentLocation.lat as any);
          const lng = parseFloat(u.currentLocation.lng as any);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`user-${u.id}`}
              coordinate={{
                latitude: lat,
                longitude: lng
              }}
              pinColor="blue" // Blue for users
            >
              <Callout onPress={() => router.push(`/profile/${u.id}`)}>
                <View style={styles.calloutContainer}>
                  <Text style={[styles.calloutTitle, { color: colors.text }]}>{u.name}</Text>
                  <Text style={[styles.calloutSub, { color: colors.textMuted }]}>Tap to view profile</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Render Friends */}
        {friends.map(friend => {
          if (!friend.currentLocation) return null;
          const lat = parseFloat(friend.currentLocation.lat as any);
          const lng = parseFloat(friend.currentLocation.lng as any);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`friend-${friend.id}`}
              coordinate={{
                latitude: lat,
                longitude: lng
              }}
              pinColor="violet" // Purple for friends
            >
              <Callout onPress={() => router.push(`/profile/${friend.id}`)}>
                <View style={styles.calloutContainer}>
                  <Text style={[styles.calloutTitle, { color: colors.text }]}>{friend.name} (Friend)</Text>
                  <Text style={[styles.calloutSub, { color: colors.textMuted }]}>Tap to view profile</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Render Businesses */}
        {businesses.map(biz => {
          const loc = biz.location as any;
          if (!loc) return null;
          
          const lat = parseFloat(loc.lat || loc.geopoint?.latitude);
          const lng = parseFloat(loc.lng || loc.geopoint?.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`biz-${biz.id}`}
              coordinate={{
                latitude: lat,
                longitude: lng
              }}
              pinColor="green" // Green for businesses
            >
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={[styles.calloutTitle, { color: colors.text }]}>{biz.name}</Text>
                  <Text style={[styles.calloutSub, { color: colors.textMuted }]}>{biz.category}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Render Events */}
        {events.map(event => {
          const loc = (event.event_location as any) || (event as any).location;
          if (!loc) return null;
          
          const lat = parseFloat(loc.lat || loc.geopoint?.latitude);
          const lng = parseFloat(loc.lng || loc.geopoint?.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`evt-${event.id}`}
              coordinate={{
                latitude: lat,
                longitude: lng
              }}
              pinColor="orange" // Orange for events
            >
              <Callout onPress={() => router.push(`/events/${event.id}`)}>
                <View style={styles.calloutContainer}>
                  <Text style={[styles.calloutTitle, { color: colors.text }]}>{event.title || 'Event'}</Text>
                  <Text style={[styles.calloutSub, { color: colors.textMuted }]}>Tap to view event</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Legend */}
      <View style={[styles.legendContainer, { backgroundColor: colors.card }]}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#0ea5e9' }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Users</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Friends</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.tint }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Businesses</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Events</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  subErrorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
  map: {
    width: width,
    height: height,
  },
  calloutContainer: {
    width: 150,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutSub: {
    fontSize: 12,
  },
  legendContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
