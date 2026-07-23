import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Share, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler, useSharedValue, useAnimatedStyle,
  interpolate, Extrapolation, withSpring, withTiming, withDelay,
  withRepeat, withSequence, Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import ImageViewing from 'react-native-image-viewing';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { Event, TicketTier } from '../../../types/events';
import { getEventById } from '../../../lib/event-service';
import { api } from '../../../lib/api';
import { formatPrice } from '../../../lib/utils';
import { useAppTheme } from '../../../context/ThemeContext';

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2236' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d1a0f' }] },
];

const { width } = Dimensions.get('window');

// Custom Skeleton Component
const SkeletonCard = ({ height = 20, width = '100%', style }: any) => {
  const { colors, isDarkMode } = useAppTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ height, width, backgroundColor: colors.borderLight, borderRadius: 8 }, style, animStyle]} />
  );
};

export default function EventDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowingOrganizer, setIsFollowingOrganizer] = useState(false);
  const [relatedEvents, setRelatedEvents] = useState<any[]>([]);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // Ticket Purchase State
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [userHasTickets, setUserHasTickets] = useState(false);

  // Ticket success overlay
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [successTierName, setSuccessTierName] = useState('');
  const successSheetY  = useSharedValue(400);
  const successOverlayOp = useSharedValue(0);
  const successContentOp = useSharedValue(0);
  const successContentY  = useSharedValue(20);

  const successOverlayStyle = useAnimatedStyle(() => ({ opacity: successOverlayOp.value }));
  const successSheetStyle   = useAnimatedStyle(() => ({ transform: [{ translateY: successSheetY.value }] }));
  const successContentStyle = useAnimatedStyle(() => ({
    opacity: successContentOp.value,
    transform: [{ translateY: successContentY.value }],
  }));

  function showTicketSuccess(tierName: string) {
    setSuccessTierName(tierName);
    setTicketSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    successOverlayOp.value = withTiming(1, { duration: 250 });
    successSheetY.value    = withSpring(0, { damping: 22, stiffness: 200 });
    successContentOp.value = withDelay(280, withTiming(1, { duration: 380 }));
    successContentY.value  = withDelay(280, withSpring(0, { damping: 18, stiffness: 140 }));
  }

  function dismissTicketSuccess() {
    successOverlayOp.value = withTiming(0, { duration: 200 });
    successSheetY.value    = withSpring(400, { damping: 22, stiffness: 200 });
    setTimeout(() => {
      setTicketSuccess(false);
      setSelectedTier(null);
      setQuantity(1);
      fetchEvent();
    }, 220);
  }

  async function getDirections() {
    if (!event || event.location_online) return;
    const lat = event.lat;
    const lng = event.lng;
    const address = event.location_address || [event.ward, event.lga, event.state].filter(Boolean).join(', ');
    const encoded = encodeURIComponent(address || '');

    const destCoord = lat && lng ? `${lat},${lng}` : encoded;

    const appleMapsUrl = lat && lng
      ? `maps://?daddr=${lat},${lng}&dirflg=d`
      : `maps://?daddr=${encoded}&dirflg=d`;

    const googleMapsUrl = lat && lng
      ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
      : `comgooglemaps://?daddr=${encoded}&directionsmode=driving`;

    const googleMapsWeb = `https://www.google.com/maps/dir/?api=1&destination=${destCoord}&travelmode=driving`;

    let hasGoogleMaps = false;
    try {
      hasGoogleMaps = await Linking.canOpenURL('comgooglemaps://');
    } catch(e) {
      hasGoogleMaps = false;
    }

    const buttons: any[] = [
      { text: '🍎 Apple Maps', onPress: () => { Linking.openURL(appleMapsUrl).catch(() => Linking.openURL(googleMapsWeb)); } },
    ];

    if (hasGoogleMaps) {
      buttons.push({ text: '🗺️ Google Maps', onPress: () => Linking.openURL(googleMapsUrl).catch(() => Linking.openURL(googleMapsWeb)) });
    } else {
      buttons.push({ text: '🗺️ Google Maps (web)', onPress: () => ExpoLinking.openURL(googleMapsWeb) });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' as const });

    Alert.alert('Get Directions', `Navigate to ${address || 'the venue'}?`, buttons);
  }

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getEventById(id as string);
      if (data) {
        setEvent(data);
        
        if (user) {
          // Check bookmark
          const { data: bData } = await supabase.from('event_bookmarks').select('id').eq('user_id', user.id).eq('event_id', data.id).maybeSingle();
          setIsBookmarked(!!bData);

          // Check follow
          if (data.organizer_id) {
            const { data: fData } = await supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', data.organizer_id).maybeSingle();
            setIsFollowingOrganizer(!!fData);
          }

          // Check if user has tickets
          const { data: tData } = await supabase.from('tickets').select('id').eq('buyer_id', user.id).eq('event_id', data.id).limit(1);
          if (tData && tData.length > 0) {
            setUserHasTickets(true);
          }
        }

        // Fetch related events
        const { data: related } = await supabase
          .from('events')
          .select(`id, title, cover_image_url, start_time, location_address, location_online`)
          .eq('status', 'PUBLISHED')
          .neq('id', data.id)
          .limit(5);
        if (related) setRelatedEvents(related);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (user) {
      setAttendeeEmail(user.email || '');
      setAttendeeName(profile?.name || user.user_metadata?.name || '');
    }
  }, [user, profile]);

  const handleShare = async () => {
    if (!event) return;
    try {
      const url = `https://app.yrdly.ng/events/${event.id}`;
      await Share.share({
        message: `Check out ${event.title} on YRDLY! ${url}`,
        url: url,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleBookmark = async () => {
    if (!user || !event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isBookmarked) {
        setIsBookmarked(false);
        await supabase.from('event_bookmarks').delete().match({ user_id: user.id, event_id: event.id });
      } else {
        setIsBookmarked(true);
        await supabase.from('event_bookmarks').insert({ user_id: user.id, event_id: event.id });
      }
    } catch (e) {
      console.error(e);
      setIsBookmarked(!isBookmarked); // Revert on failure
    }
  };

  const handleFollow = async () => {
    if (!user || !event?.organizer_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isFollowingOrganizer) {
        setIsFollowingOrganizer(false);
        await supabase.from('followers').delete().match({ follower_id: user.id, following_id: event.organizer_id });
      } else {
        setIsFollowingOrganizer(true);
        await supabase.from('followers').insert({ follower_id: user.id, following_id: event.organizer_id });
      }
    } catch (e) {
      console.error(e);
      setIsFollowingOrganizer(!isFollowingOrganizer); // Revert
    }
  };

  const handlePurchase = async () => {
    if (!event || !selectedTier) return;
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      Alert.alert('Error', 'Please enter your name and email.');
      return;
    }
    setPurchasing(true);
    try {
      const callbackUrl = ExpoLinking.createURL('payment-verify');
      const tierName = selectedTier.name;
      const res = await api.post<any>('/api/events/tickets/purchase', {
        event_id: event.id,
        tier_id: selectedTier.id,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone,
        callbackUrl,
        quantity,
      });

      if (selectedTier.price === 0) {
        setSelectedTier(null);
        setTimeout(() => showTicketSuccess(tierName), 100);
      } else {
        const browserResult = await WebBrowser.openAuthSessionAsync(res.payment_link, callbackUrl);
        if (browserResult.type === 'success' && browserResult.url) {
          const urlObj = new URL(browserResult.url);
          const status = urlObj.searchParams.get('status');
          if (status === 'cancelled') {
            Alert.alert('Cancelled', 'Payment was cancelled.');
          } else {
            setSelectedTier(null);
            setTimeout(() => showTicketSuccess(tierName), 100);
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
  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 100], [0, 1], Extrapolation.CLAMP);
    return { opacity, backgroundColor: colors.background };
  });

  const getEventStatus = (ev: Event) => {
    if (ev.status === 'CANCELLED') return { label: 'Cancelled', color: '#EF4444' };
    const now = new Date().getTime();
    const start = ev.start_time ? new Date(ev.start_time).getTime() : 0;
    const end = ev.end_time ? new Date(ev.end_time).getTime() : 0;
    
    if (end && now > end) return { label: 'Ended', color: '#6B7280' };
    if (start && now > start && (!end || now < end)) return { label: 'Live Now', color: '#EF4444' };
    if (start && start - now < 86400000 && start > now) return { label: 'Starting Soon', color: '#F59E0B' };
    return { label: 'Upcoming', color: colors.tint };
  };

  const scrollToTickets = () => {
    // If we had a ref, we'd scroll to tickets.
    // For now we just open the ticket selection if it's a simple event, or just scroll down manually by user.
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><Feather name="arrow-left" size={24} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Event Details</Text>
          <View style={styles.headerRightActions}>
             <View style={styles.iconBtn} />
             <View style={styles.iconBtn} />
          </View>
        </View>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SkeletonCard height={width * 0.8} style={{ borderRadius: 0 }} />
          <View style={styles.infoSection}>
            <SkeletonCard height={32} width="80%" style={{ marginBottom: 16 }} />
            <SkeletonCard height={120} style={{ borderRadius: 20, marginBottom: 24 }} />
            <SkeletonCard height={80} style={{ borderRadius: 20, marginBottom: 24 }} />
            <SkeletonCard height={100} style={{ borderRadius: 20, marginBottom: 24 }} />
          </View>
        </ScrollView>
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

  const imageUrls = event.cover_image_url ? [event.cover_image_url] : []; // Add any other media here later
  const isOwner = user?.id === event.organizer_id;
  const statusObj = getEventStatus(event);
  const isExpired = statusObj.label === 'Ended' || statusObj.label === 'Cancelled';
  const allTicketsSoldOut = event.ticket_tiers?.every(t => t.is_sold_out);

  const formattedDate = event.start_time 
    ? new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Date TBD';
  const formattedTime = event.start_time 
    ? new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Time TBD';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.stickyHeader, headerAnimatedStyle, { zIndex: 10 }]}>
        <SafeAreaView edges={['top']} />
      </Animated.View>
      
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={styles.headerRightActions}>
            <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.4)', marginRight: 8 }]}>
              <Feather name="share" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBookmark} style={[styles.iconBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
              <Feather name={isBookmarked ? "bookmark" : "bookmark"} size={20} color={isBookmarked ? colors.tint : "#FFF"} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Animated.ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HERO GALLERY */}
        <View style={styles.heroContainer}>
          {imageUrls.length > 0 ? (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
            >
              {imageUrls.map((uri, idx) => (
                <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => { setCurrentImageIndex(idx); setIsGalleryVisible(true); }}>
                  <Image source={{ uri }} style={styles.mainImage} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            </View>
          )}
          {imageUrls.length > 1 && (
            <View style={styles.galleryBadge}>
              <Text style={styles.galleryBadgeText}>{currentImageIndex + 1}/{imageUrls.length}</Text>
            </View>
          )}
          {imageUrls.length > 1 && (
            <View style={styles.dotsContainer}>
              {imageUrls.map((_, idx) => (
                <View key={idx} style={[styles.dot, { backgroundColor: idx === currentImageIndex ? '#FFF' : 'rgba(255,255,255,0.5)' }]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          {/* TITLE & STATUS */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusObj.color + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: statusObj.color }]}>{statusObj.label}</Text>
            </View>
          </View>
          
          {/* PREMIUM INFO CARD */}
          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
                <Feather name="calendar" size={20} color={colors.tint} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formattedDate}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
                <Feather name="clock" size={20} color={colors.tint} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Time</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formattedTime}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
                <Feather name={event.location_online ? "video" : "map-pin"} size={20} color={colors.tint} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{event.location_online ? 'Platform' : 'Location'}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
                  {event.location_online ? 'Online Event' : (event.location_address || [event.ward, event.lga, event.state].filter(Boolean).join(', ') || 'TBA')}
                </Text>
              </View>
            </View>

            {!event.location_online && (
              <TouchableOpacity
                style={[styles.directionsBtn, { backgroundColor: colors.tint }]}
                onPress={getDirections}
                activeOpacity={0.8}
              >
                <Feather name="navigation" size={18} color="#FFF" />
                <Text style={styles.directionsTxt}>Get Directions</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ABOUT SECTION */}
          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={styles.aboutHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About this event</Text>
            </View>
            <Text 
              style={[styles.description, { color: colors.textSecondary }]} 
              numberOfLines={aboutExpanded ? undefined : 4}
            >
              {event.description || 'No description has been added.'}
            </Text>
            {event.description && event.description.length > 150 && (
              <TouchableOpacity onPress={() => setAboutExpanded(!aboutExpanded)} style={{ marginTop: 8 }}>
                <Text style={[styles.readMoreText, { color: colors.tint }]}>{aboutExpanded ? 'Read Less' : 'Read More'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ORGANIZER CARD */}
          <TouchableOpacity 
            style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.borderLight }, styles.organizerCard]}
            onPress={() => router.push(`/profile/${event.organizer_id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.organizerRow}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                {event.organizer?.avatar_url ? (
                  <Image source={{ uri: event.organizer.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {event.organizer?.name ? event.organizer.name.charAt(0).toUpperCase() : 'O'}
                  </Text>
                )}
              </View>
              <View style={styles.organizerInfo}>
                <Text style={[styles.organizerLabel, { color: colors.textSecondary }]}>Organizer</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.sellerName, { color: colors.text }]}>{event.organizer?.name || 'Unknown Organizer'}</Text>
                  {/* Verified badge placeholder */}
                  <Ionicons name="checkmark-circle" size={16} color={colors.tint} style={{ marginLeft: 4 }} />
                </View>
              </View>
              {!isOwner && (
                <TouchableOpacity 
                  style={[styles.followBtn, { backgroundColor: isFollowingOrganizer ? colors.inputBackground : colors.tint }]}
                  onPress={(e) => { e.stopPropagation(); handleFollow(); }}
                >
                  <Text style={[styles.followBtnText, { color: isFollowingOrganizer ? colors.text : '#FFF' }]}>
                    {isFollowingOrganizer ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
              {isOwner && <Feather name="chevron-right" size={20} color={colors.textSecondary} />}
            </View>
          </TouchableOpacity>

          {/* MAP PREVIEW */}
          {!event.location_online && event.lat && event.lng && (
            <TouchableOpacity 
              style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.borderLight, padding: 0, overflow: 'hidden' }]}
              onPress={getDirections}
              activeOpacity={0.9}
            >
              <MapView
                style={{ height: 160, width: '100%' }}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                  latitude: event.lat,
                  longitude: event.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                pitchEnabled={false}
                rotateEnabled={false}
                scrollEnabled={false}
                zoomEnabled={false}
                userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
                customMapStyle={Platform.OS === 'android' ? (isDarkMode ? DARK_STYLE : []) : undefined}
              >
                <Marker coordinate={{ latitude: event.lat, longitude: event.lng }}>
                  <View style={[styles.mapMarker, { backgroundColor: colors.tint }]}>
                    <Feather name="map-pin" size={16} color="#FFF" />
                  </View>
                </Marker>
              </MapView>
            </TouchableOpacity>
          )}

          {/* TICKETS SECTION */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12, marginBottom: 12 }]}>Tickets</Text>
          {event.ticket_tiers?.filter(t => t.is_visible).length ? (
            event.ticket_tiers.filter(t => t.is_visible).map((tier) => (
              <TouchableOpacity 
                key={tier.id} 
                style={[styles.tierCard, { backgroundColor: colors.card, borderColor: tier.price === 0 ? colors.tint : colors.borderLight }]}
                disabled={tier.is_sold_out || isExpired || isOwner}
                onPress={() => setSelectedTier(tier)}
                activeOpacity={0.8}
              >
                <View style={[styles.tierIconBox, { backgroundColor: colors.inputBackground }]}>
                  <Feather name="tag" size={24} color={colors.textSecondary} />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: colors.text }]}>{tier.name}</Text>
                  {tier.description && <Text style={[styles.tierDesc, { color: colors.textSecondary }]} numberOfLines={2}>{tier.description}</Text>}
                  <Text style={[styles.tierPrice, { color: tier.price === 0 ? colors.tint : colors.text }]}>
                    {tier.price === 0 ? 'FREE' : formatPrice(tier.price)}
                  </Text>
                </View>
                <View style={styles.tierStatus}>
                  {isExpired ? (
                    <View style={[styles.tierBadge, { backgroundColor: '#6B728020' }]}><Text style={{ color: '#6B7280', fontSize: 12, fontWeight: 'bold' }}>Ended</Text></View>
                  ) : tier.is_sold_out ? (
                    <View style={[styles.tierBadge, { backgroundColor: '#EF444420' }]}><Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Sold Out</Text></View>
                  ) : (
                    <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.borderLight, alignItems: 'center', paddingVertical: 32 }]}>
              <Feather name="tag" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>No tickets available.</Text>
            </View>
          )}

          {/* RELATED EVENTS */}
          {relatedEvents.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>More Events Near You</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                {relatedEvents.map(rel => (
                  <TouchableOpacity 
                    key={rel.id} 
                    style={[styles.relatedCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                    onPress={() => { router.push(`/events/${rel.id}`); }}
                  >
                    <Image source={{ uri: rel.cover_image_url }} style={styles.relatedImg} contentFit="cover" />
                    <View style={styles.relatedInfo}>
                      <Text style={[styles.relatedTitle, { color: colors.text }]} numberOfLines={1}>{rel.title}</Text>
                      <Text style={[styles.relatedLoc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {rel.location_online ? 'Online' : rel.location_address || 'TBA'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {isOwner && (
            <TouchableOpacity 
              style={[styles.deleteEventBtn, { backgroundColor: '#EF444420' }]}
              onPress={() => {
                Alert.alert('Delete Event', 'Are you sure you want to delete this event? This action cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                          await supabase.from('events').delete().eq('id', event.id);
                          await supabase.from('posts').delete().ilike('event_link', `%events/${event.id}%`);
                          router.back();
                        } catch (e) {
                          Alert.alert('Error', 'Failed to delete event.');
                        }
                      } 
                    }
                  ]
                );
              }}
            >
              <Feather name="trash-2" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>Delete Event</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.ScrollView>

      {/* FLOATING ACTION BAR */}
      <View style={[styles.bottomActionBar, { backgroundColor: colors.card, borderTopColor: colors.borderLight }]}>
        
        
        <TouchableOpacity 
          style={[styles.bottomPrimaryBtn, { 
            backgroundColor: isExpired || allTicketsSoldOut ? colors.borderLight : colors.tint 
          }]}
          disabled={isExpired || allTicketsSoldOut}
          onPress={() => {
            if (userHasTickets) router.push('/(tabs)/tickets' as any);
            else if (event.ticket_tiers && event.ticket_tiers.length > 0) setSelectedTier(event.ticket_tiers[0]);
          }}
        >
          <Text style={[styles.bottomPrimaryText, { color: isExpired || allTicketsSoldOut ? colors.textMuted : '#FFF' }]}>
            {isExpired ? 'Event Ended' : allTicketsSoldOut ? 'Sold Out' : userHasTickets ? 'View My Tickets' : 'View Tickets'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ticket Purchase Modal */}
      <Modal visible={!!selectedTier} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Get Tickets</Text>
              <TouchableOpacity onPress={() => { setSelectedTier(null); setQuantity(1); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedTier && (
              <View style={[styles.modalTierSummary, { backgroundColor: colors.inputBackground }]}>
                <View>
                  <Text style={[styles.modalTierName, { color: colors.text }]}>{selectedTier.name}</Text>
                  <Text style={[styles.modalTierPrice, { color: colors.tint }]}>{selectedTier.price === 0 ? 'FREE' : formatPrice(selectedTier.price * quantity)}</Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity onPress={() => setQuantity(q => Math.max(1, q - 1))} style={[styles.quantityBtn, { backgroundColor: colors.borderLight }]}>
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.quantityText, { color: colors.text }]}>{quantity}</Text>
                  <TouchableOpacity onPress={() => setQuantity(q => Math.min(10, q + 1))} style={[styles.quantityBtn, { backgroundColor: colors.borderLight }]}>
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
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
                <Text style={styles.purchaseBtnText}>Processing...</Text>
              ) : (
                <Text style={styles.purchaseBtnText}>
                  {selectedTier?.price === 0 ? 'Register Now' : `Pay ${formatPrice((selectedTier?.price || 0) * quantity)}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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

      {/* ── Ticket Success Overlay ─────────────────── */}
      {ticketSuccess && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 100, justifyContent: 'flex-end' }, successOverlayStyle]}>
          <View style={styles.successBackdrop} />
          <Animated.View style={[styles.successSheet, { backgroundColor: colors.card }, successSheetStyle]}>
            <View style={styles.successHandleBar} />
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Ionicons name="checkmark-circle" size={100} color="#82DB7E" />
            </View>
            <Animated.View style={[{ alignItems: 'center', paddingHorizontal: 32, width: '100%' }, successContentStyle]}>
              <Text style={[styles.successTitle, { color: colors.text }]}>You're In! 🎟️</Text>
              <Text style={[styles.successTier, { color: colors.tint }]}>{successTierName}</Text>
              <Text style={[styles.successBody, { color: colors.textSecondary }]}>
                Your ticket has been confirmed. Check the Tickets tab to view it.
              </Text>
              <TouchableOpacity
                style={[styles.successBtn, { backgroundColor: colors.tint }]}
                onPress={() => { dismissTicketSuccess(); router.push('/tickets' as any); }}
                activeOpacity={0.85}
              >
                <Text style={styles.successBtnText}>View My Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.successSecondary} onPress={dismissTicketSuccess}>
                <Text style={[styles.successSecondaryText, { color: colors.textSecondary }]}>Back to Event</Text>
              </TouchableOpacity>
            </Animated.View>
            <View style={{ height: 24 }} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backBtnText: { fontWeight: 'bold' },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  headerRow: { 
    flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerRightActions: { flexDirection: 'row' },
  scrollContent: { flex: 1 },
  
  heroContainer: { position: 'relative', width: width, height: width * 0.8 },
  mainImage: { width: width, height: width * 0.8, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  placeholderImage: { width: width, height: width * 0.8, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  galleryBadge: { 
    position: 'absolute', bottom: 16, right: 16, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 
  },
  galleryBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  dotsContainer: { 
    position: 'absolute', bottom: 16, left: 0, right: 0, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center' 
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 3 },
  
  infoSection: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', flex: 1, marginRight: 16, lineHeight: 32 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold' },
  
  premiumCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 13, marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '600' },
  directionsBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 14, borderRadius: 16, marginTop: 8 
  },
  directionsTxt: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#FFF' },
  
  aboutHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  description: { fontSize: 16, lineHeight: 26 },
  readMoreText: { fontSize: 15, fontWeight: 'bold' },
  
  organizerCard: { padding: 16 },
  organizerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  organizerInfo: { flex: 1 },
  organizerLabel: { fontSize: 13, marginBottom: 2 },
  sellerName: { fontSize: 17, fontWeight: 'bold' },
  followBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 12 },
  followBtnText: { fontWeight: 'bold', fontSize: 14 },
  
  mapMarker: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
  
  tierCard: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1 
  },
  tierIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  tierInfo: { flex: 1, marginRight: 16 },
  tierName: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  tierDesc: { fontSize: 14, marginBottom: 8 },
  tierPrice: { fontSize: 16, fontWeight: 'bold' },
  tierStatus: { alignItems: 'center', justifyContent: 'center' },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  
  relatedSection: { marginTop: 16, marginBottom: 24 },
  relatedCard: { width: 220, borderRadius: 20, borderWidth: 1, marginRight: 16, overflow: 'hidden' },
  relatedImg: { width: '100%', height: 120 },
  relatedInfo: { padding: 12 },
  relatedTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  relatedLoc: { fontSize: 13 },
  
  deleteEventBtn: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 20,
  },
  
  bottomActionBar: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32,
    borderTopWidth: 1 
  },
  bottomShareBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  bottomPrimaryBtn: { flex: 1, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  bottomPrimaryText: { fontSize: 16, fontWeight: 'bold' },

  // Modal styles preserved
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalTierSummary: { padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTierName: { fontSize: 16, fontWeight: '600' },
  modalTierPrice: { fontSize: 18, fontWeight: 'bold' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  quantityText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16 },
  modalForm: { marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
  purchaseBtn: { padding: 18, borderRadius: 16, alignItems: 'center' },
  purchaseBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Success overlay
  successBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  successSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, alignItems: 'center' },
  successHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', marginBottom: 8 },
  successTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6, textAlign: 'center' },
  successTier:  { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  successBody:  { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 24, maxWidth: 270 },
  successBtn: { width: '100%', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  successBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  successSecondary: { height: 40, justifyContent: 'center', alignItems: 'center' },
  successSecondaryText: { fontSize: 14, fontWeight: '600' },
});
