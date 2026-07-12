import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { Image } from 'expo-image';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { Event, TicketTier } from '../../../types/events';
import { getEventById } from '../../../lib/event-service';
import { api } from '../../../lib/api';
import { formatPrice } from '../../../lib/utils';
import { useAppTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Ticket Purchase State
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    const data = await getEventById(id as string);
    if (data) {
      setEvent(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (user) {
      setAttendeeEmail(user.email || '');
      setAttendeeName(profile?.name || user.user_metadata?.name || '');
    }
  }, [user, profile]);

  const handlePurchase = async () => {
    if (!event || !selectedTier) return;
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      Alert.alert('Error', 'Please enter your name and email.');
      return;
    }
    setPurchasing(true);
    try {
      const callbackUrl = Linking.createURL('payment-verify');
      const res = await api.post<any>('/api/events/tickets/purchase', {
        event_id: event.id,
        tier_id: selectedTier.id,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone,
        callbackUrl,
      });

      if (selectedTier.price === 0) {
        Alert.alert('Success', 'Free ticket registered successfully!');
        setSelectedTier(null);
        fetchEvent();
      } else {
        const browserResult = await WebBrowser.openAuthSessionAsync(res.paymentLink, callbackUrl);
        if (browserResult.type === 'success' && browserResult.url) {
          const urlObj = new URL(browserResult.url);
          const status = urlObj.searchParams.get('status');
          if (status === 'cancelled') {
            Alert.alert('Cancelled', 'Payment was cancelled.');
          } else {
            Alert.alert('Success', 'Payment successful! Check your tickets.');
            setSelectedTier(null);
            fetchEvent();
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not process ticket purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [-200, 0, 300], [-100, 0, 150], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [-200, 0], [1.5, 1], Extrapolation.CLAMP);
    return { transform: [{ translateY }, { scale }] };
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

  const imageUrls = event.cover_image_url ? [event.cover_image_url] : [];
  const isOwner = user?.id === event.organizer_id;
  const isExpired = event.start_time ? new Date(event.start_time).getTime() < Date.now() : false;

  const formattedDate = event.start_time 
    ? new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Date TBD';
  const formattedTime = event.start_time 
    ? new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Time TBD';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
        {imageUrls.length > 0 ? (
          <Animated.View style={[headerAnimatedStyle, { zIndex: -1 }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => { setCurrentImageIndex(0); setIsGalleryVisible(true); }}>
              <Image source={{ uri: imageUrls[0] }} style={styles.mainImage} contentFit="cover" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="calendar-outline" size={64} color="rgba(56, 142, 60, 0.5)" />
          </View>
        )}

        <View style={[styles.infoSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <Ionicons name="calendar" size={20} color={colors.tint} />
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{formattedDate}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <Ionicons name="time" size={20} color={colors.tint} />
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{formattedTime}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <Ionicons name={event.location_online ? "globe" : "location"} size={20} color={colors.tint} />
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>
                {event.location_online ? 'Online Event' : (event.location_address || [event.ward, event.lga, event.state].filter(Boolean).join(', ') || 'TBA')}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>About this event</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{event.description || 'No description provided.'}</Text>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Organizer</Text>
          <View style={styles.sellerRow}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              {event.organizer?.avatar_url ? (
                <Image source={{ uri: event.organizer.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {event.organizer?.name ? event.organizer.name.charAt(0).toUpperCase() : 'O'}
                </Text>
              )}
            </View>
            <View>
              <Text style={[styles.sellerName, { color: colors.text }]}>{event.organizer?.name || 'Unknown Organizer'}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tickets</Text>
          {event.ticket_tiers?.filter(t => t.is_visible).length ? (
            event.ticket_tiers.filter(t => t.is_visible).map((tier) => (
              <View key={tier.id} style={[styles.tierCard, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: colors.text }]}>{tier.name}</Text>
                  {tier.description && <Text style={[styles.tierDesc, { color: colors.textSecondary }]}>{tier.description}</Text>}
                  <Text style={[styles.tierPrice, { color: colors.tint }]}>{tier.price === 0 ? 'FREE' : formatPrice(tier.price)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.tierBuyButton, { backgroundColor: tier.is_sold_out || isExpired ? colors.borderLight : colors.tint }]}
                  disabled={tier.is_sold_out || isExpired || isOwner}
                  onPress={() => setSelectedTier(tier)}
                >
                  <Text style={styles.tierBuyText}>
                    {isExpired ? 'Ended' : tier.is_sold_out ? 'Sold Out' : isOwner ? 'Owner' : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary }}>No tickets available.</Text>
          )}

          <View style={{ height: 40 }} />
        </View>
      </Animated.ScrollView>

      {/* Ticket Purchase Modal */}
      <Modal visible={!!selectedTier} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Get Tickets</Text>
              <TouchableOpacity onPress={() => setSelectedTier(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedTier && (
              <View style={[styles.modalTierSummary, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.modalTierName, { color: colors.text }]}>{selectedTier.name}</Text>
                <Text style={[styles.modalTierPrice, { color: colors.tint }]}>{selectedTier.price === 0 ? 'FREE' : formatPrice(selectedTier.price)}</Text>
              </View>
            )}

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                value={attendeeName}
                onChangeText={setAttendeeName}
                placeholder="Enter your name"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[styles.inputLabel, { color: colors.text }]}>Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                value={attendeeEmail}
                onChangeText={setAttendeeEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[styles.inputLabel, { color: colors.text }]}>Phone (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                value={attendeePhone}
                onChangeText={setAttendeePhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </ScrollView>

            <TouchableOpacity 
              style={[styles.purchaseBtn, { backgroundColor: purchasing ? colors.borderLight : colors.tint }]}
              disabled={purchasing}
              onPress={handlePurchase}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.purchaseBtnText}>
                  {selectedTier?.price === 0 ? 'Register Now' : 'Proceed to Payment'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
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
  divider: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  sellerName: { fontSize: 16, fontWeight: 'bold' },
  tierCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  tierInfo: { flex: 1, marginRight: 16 },
  tierName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  tierDesc: { fontSize: 14, marginBottom: 8 },
  tierPrice: { fontSize: 16, fontWeight: '600' },
  tierBuyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  tierBuyText: { color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalTierSummary: { padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  modalTierName: { fontSize: 16, fontWeight: '600' },
  modalTierPrice: { fontSize: 16, fontWeight: 'bold' },
  modalForm: { marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16 },
  purchaseBtn: { padding: 18, borderRadius: 12, alignItems: 'center' },
  purchaseBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
