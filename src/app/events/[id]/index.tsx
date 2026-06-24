import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { Image } from 'expo-image';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { Post } from '../../../types';
import { formatPrice } from '../../../lib/utils';
import { useAppTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTicket, setHasTicket] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [rsvping, setRsvping] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('posts')
      .select(`*, user:users!posts_user_id_fkey(id, name, avatar_url)`)
      .eq('id', id)
      .single();

    if (!error && data) {
      setEvent(data);
      if (user) {
        const { data: ticket } = await supabase
          .from('my_tickets')
          .select('id')
          .eq('event_id', data.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setHasTicket(!!ticket);
      }
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleFreeRSVP = async () => {
    if (!user || !event) return;
    setRsvping(true);
    try {
      const { error } = await supabase.from('my_tickets').insert({
        user_id: user.id,
        event_id: event.id,
        status: 'active',
      });

      if (error) {
        if (error.code === '23505') { // Unique violation
          setHasTicket(true);
          Alert.alert('RSVP Confirmed', 'You are already registered for this event!');
          return;
        }
        throw error;
      }
      
      setHasTicket(true);
      Alert.alert('RSVP Confirmed', 'You have successfully registered for this free event!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not RSVP. Please try again.');
    } finally {
      setRsvping(false);
    }
  };

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-200, 0, 300],
      [-100, 0, 150],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [-200, 0],
      [1.5, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Event not found</Text>
        <TouchableOpacity style={[styles.backBtnWrapper, { backgroundColor: colors.inputBackground }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrls = (event.image_urls?.length ? event.image_urls : event.image_url ? [event.image_url] : []).filter(Boolean);
  const isOwner = user?.id === event.user_id || user?.id === (event as any).organizer_id;
  const isExpired = event.event_date ? new Date(event.event_date).getTime() < Date.now() : false;

  const formattedDate = event.event_date 
    ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Date TBD';
  
  const formattedTime = event.event_date 
    ? new Date(event.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Time TBD';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Images */}
        {imageUrls.length > 0 ? (
          <Animated.View style={[headerAnimatedStyle, { zIndex: -1 }]}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {imageUrls.map((url, i) => (
                <TouchableOpacity 
                  key={i} 
                  activeOpacity={0.9} 
                  onPress={() => {
                    setCurrentImageIndex(i);
                    setIsGalleryVisible(true);
                  }}
                >
                  <Image source={{ uri: url }} style={styles.mainImage} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="calendar-outline" size={64} color="rgba(56, 142, 60, 0.5)" />
          </View>
        )}

        <View style={[styles.infoSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title || event.text || 'Untitled Event'}</Text>
          
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <Ionicons name="calendar" size={20} color={colors.tint} />
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{formattedDate}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <Ionicons name="time" size={20} color={colors.tint} />
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{formattedTime}</Text>
            </View>
            {!!((event as any)?.location) && (
            <View style={styles.dateTimeRow}>
              <Ionicons name="location" size={20} color={colors.tint} />
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>
                {(() => {
                  const loc = (event as any).location;
                  return typeof loc === 'object' && loc !== null 
                    ? (loc.address || [loc.ward, loc.lga, loc.state].filter(Boolean).join(', ') || 'TBA') 
                    : (loc || 'TBA');
                })()}
              </Text>
            </View>
          )}
          </View>

          <View style={[styles.ticketBox, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.ticketLabel, { color: colors.textSecondary }]}>Ticket Price</Text>
            <Text style={[styles.price, { color: colors.tint }]}>{event.price === 0 || !event.price ? 'FREE' : formatPrice(event.price)}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>About this event</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{event.text}</Text>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Organizer</Text>
          <View style={styles.sellerRow}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              {event.user?.avatar_url || event.author_image ? (
                <Image source={{ uri: event.user?.avatar_url || event.author_image }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {event.user?.name ? event.user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            <View>
              <Text style={[styles.sellerName, { color: colors.text }]}>{event.user?.name || event.author_name || 'Unknown Organizer'}</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        {isOwner ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.manageButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push(`/events/${event.id}/manage` as any)}
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.manageButtonText}>Manage Event</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.buyButton, 
              { backgroundColor: hasTicket || isExpired ? colors.inputBackground : colors.tint },
              (hasTicket || isExpired) && { opacity: 0.7 }
            ]}
            disabled={hasTicket || rsvping || isExpired}
            onPress={() => {
              if (event.price === 0 || !event.price) {
                handleFreeRSVP();
              } else {
                router.push({ pathname: '/checkout/[id]', params: { id: event.id, type: 'event' } });
              }
            }}
          >
            {rsvping ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={[styles.buyButtonText, (hasTicket || isExpired) && { color: colors.textSecondary }]}>
                {isExpired ? 'Event Ended' : hasTicket ? 'Ticket Purchased ✓' : event.price === 0 || !event.price ? 'RSVP / Register' : 'Buy Tickets'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {isGalleryVisible && imageUrls.length > 0 && (
        <ImageViewing
          images={imageUrls.map(uri => ({ uri }))}
          imageIndex={currentImageIndex}
          visible={isGalleryVisible}
          onRequestClose={() => setIsGalleryVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backBtnText: { fontWeight: 'bold' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  scrollContent: { flex: 1 },
  imageScroll: { height: width * 0.75 },
  mainImage: { width: width, height: width * 0.75 },
  placeholderImage: { width: width, height: width * 0.75, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  infoSection: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  dateTimeContainer: { marginBottom: 20 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateTimeText: { fontSize: 16, marginLeft: 8 },
  ticketBox: { padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketLabel: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 24, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  sellerName: { fontSize: 16, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row', padding: 16, borderTopWidth: 1,
    paddingBottom: 30,
  },
  actionButton: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  manageButton: { },
  manageButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  editButton: { },
  editButtonText: { fontSize: 16, fontWeight: 'bold' },
  buyButton: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  buyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
