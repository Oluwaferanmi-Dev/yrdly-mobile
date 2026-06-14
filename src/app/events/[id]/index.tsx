import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { Image } from 'expo-image';
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

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('posts')
      .select(`*, user:users!posts_user_id_fkey(id, name, avatar_url)`)
      .eq('id', id)
      .single();

    if (!error && data) {
      setEvent(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

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

  const imageUrls = event.image_urls?.length ? event.image_urls : event.image_url ? [event.image_url] : [];
  const isOwner = user?.id === event.user_id || user?.id === (event as any).organizer_id;

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

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Images */}
        {imageUrls.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {imageUrls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.mainImage} contentFit="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="calendar-outline" size={64} color="rgba(56, 142, 60, 0.5)" />
          </View>
        )}

        <View style={styles.infoSection}>
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
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{(event as any).location}</Text>
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
      </ScrollView>

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
            style={[styles.buyButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              if (event.price === 0 || !event.price) {
                Alert.alert('RSVP', 'You have successfully RSVPd to this free event!');
              } else {
                router.push({ pathname: '/checkout/[id]', params: { id: event.id, type: 'event' } });
              }
            }}
          >
            <Text style={styles.buyButtonText}>
              {event.price === 0 || !event.price ? 'RSVP / Register' : 'Buy Tickets'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
