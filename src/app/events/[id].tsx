import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Post } from '../../types';
import { formatPrice } from '../../lib/utils';

const { width } = Dimensions.get('window');
const GREEN = '#388E3C';

export default function EventDetailScreen() {
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
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backBtnWrapper} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrls = event.image_urls?.length ? event.image_urls : event.image_url ? [event.image_url] : [];
  const isOwner = user?.id === event.user_id;

  const formattedDate = event.event_date 
    ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Date TBD';
  
  const formattedTime = event.event_date 
    ? new Date(event.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Time TBD';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
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
            <Calendar size={64} color="rgba(56, 142, 60, 0.5)" />
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.title}>{event.title || event.text || 'Untitled Event'}</Text>
          
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <Calendar size={20} color={GREEN} />
              <Text style={styles.dateTimeText}>{formattedDate}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <Clock size={20} color={GREEN} />
              <Text style={styles.dateTimeText}>{formattedTime}</Text>
            </View>
            {!!event.location && (
              <View style={styles.dateTimeRow}>
                <MapPin size={20} color={GREEN} />
                <Text style={styles.dateTimeText}>{event.location}</Text>
              </View>
            )}
          </View>

          <View style={styles.ticketBox}>
            <Text style={styles.ticketLabel}>Ticket Price</Text>
            <Text style={styles.price}>{event.price === 0 || !event.price ? 'FREE' : formatPrice(event.price)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>{event.text}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Organizer</Text>
          <View style={styles.sellerRow}>
            <View style={styles.avatar}>
              {event.user?.avatar_url || event.author_image ? (
                <Image source={{ uri: event.user?.avatar_url || event.author_image }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {event.user?.name ? event.user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.sellerName}>{event.user?.name || event.author_name || 'Unknown Organizer'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {isOwner ? (
          <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
            <Text style={styles.editButtonText}>Edit Event</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.buyButton}
            onPress={() => {
              if (event.price === 0 || !event.price) {
                // Free RSVP logic could go here
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errorText: { fontSize: 18, color: '#1C1C1C', marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#F2F2F2', borderRadius: 8 },
  backBtnText: { color: '#1C1C1C', fontWeight: 'bold' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  scrollContent: { flex: 1 },
  imageScroll: { height: width * 0.75 },
  mainImage: { width: width, height: width * 0.75 },
  placeholderImage: { width: width, height: width * 0.75, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  infoSection: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1C', marginBottom: 16 },
  dateTimeContainer: { marginBottom: 20 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateTimeText: { fontSize: 16, color: '#424242', marginLeft: 8 },
  ticketBox: { backgroundColor: '#F9FBF9', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketLabel: { fontSize: 16, color: '#616161', fontWeight: '600' },
  price: { fontSize: 24, fontWeight: 'bold', color: GREEN },
  divider: { height: 1, backgroundColor: '#F2F2F2', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', marginBottom: 12 },
  description: { fontSize: 16, color: '#424242', lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  sellerName: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1C' },
  footer: {
    flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F2F2F2',
    backgroundColor: '#FFFFFF', paddingBottom: 30,
  },
  actionButton: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#F2F2F2' },
  editButtonText: { color: '#1C1C1C', fontSize: 16, fontWeight: 'bold' },
  buyButton: { flex: 1, height: 50, borderRadius: 25, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  buyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
