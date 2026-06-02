import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { Post } from '../types';

const GREEN = '#388E3C';

interface Ticket {
  id: string;
  event_id: string;
  status: string;
  created_at: string;
  event?: Post;
}

export default function TicketsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('my_tickets')
        .select(`
          *,
          event:posts!my_tickets_event_id_fkey(
            id, title, text, event_date, location, image_url, image_urls, price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data as Ticket[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, [fetchTickets]);

  const renderTicket = ({ item }: { item: Ticket }) => {
    const event = item.event;
    const imageUrl = event?.image_urls?.[0] || event?.image_url;
    const formattedDate = event?.event_date
      ? new Date(event.event_date).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        })
      : 'Date TBD';

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => event && router.push(`/events/${event.id}`)}
      >
        {/* Left color bar */}
        <View style={styles.ticketAccent} />

        {/* Image */}
        <View style={styles.ticketImageWrapper}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.ticketImage} contentFit="cover" />
          ) : (
            <View style={[styles.ticketImage, styles.ticketImagePlaceholder]}>
              <Ionicons name="calendar" size={28} color={GREEN} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketTitle} numberOfLines={2}>
            {event?.title || 'Event'}
          </Text>
          <View style={styles.ticketMeta}>
            <Ionicons name="calendar-outline" size={13} color="#9E9E9E" />
            <Text style={styles.ticketMetaText}>{formattedDate}</Text>
          </View>
          {!!event?.location && (
            <View style={styles.ticketMeta}>
              <Ionicons name="location-outline" size={13} color="#9E9E9E" />
              <Text style={styles.ticketMetaText} numberOfLines={1}>{event.location}</Text>
            </View>
          )}
          <View style={[styles.statusBadge, item.status === 'active' ? styles.activeBadge : styles.usedBadge]}>
            <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Tear line */}
        <View style={styles.tearLine}>
          <View style={styles.tearCircleTop} />
          <View style={styles.tearDashes} />
          <View style={styles.tearCircleBottom} />
        </View>

        {/* QR placeholder */}
        <View style={styles.qrSection}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={48} color={GREEN} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tickets</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={72} color="rgba(56,142,60,0.3)" />
              <Text style={styles.emptyTitle}>No Tickets Yet</Text>
              <Text style={styles.emptySubtitle}>Buy tickets to events to see them here.</Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.push('/(tabs)/catalog')}
              >
                <Text style={styles.browseButtonText}>Browse Events</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F4' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F2'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1C' },
  listContent: { padding: 16, paddingBottom: 100 },

  // Ticket Card
  ticketCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  ticketAccent: { width: 6, backgroundColor: GREEN },
  ticketImageWrapper: { padding: 12 },
  ticketImage: { width: 72, height: 72, borderRadius: 8 },
  ticketImagePlaceholder: { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  ticketInfo: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  ticketTitle: { fontSize: 15, fontWeight: 'bold', color: '#1C1C1C', marginBottom: 6 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  ticketMetaText: { fontSize: 12, color: '#9E9E9E', marginLeft: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 6 },
  activeBadge: { backgroundColor: 'rgba(56,142,60,0.12)' },
  usedBadge: { backgroundColor: '#F2F2F2' },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', color: GREEN },

  // Tear line
  tearLine: { width: 20, alignItems: 'center', justifyContent: 'center' },
  tearCircleTop: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#F4F6F4', marginBottom: 4 },
  tearCircleBottom: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#F4F6F4', marginTop: 4 },
  tearDashes: { flex: 1, borderLeftWidth: 1.5, borderLeftColor: '#E0E0E0', borderStyle: 'dashed' },

  // QR Section
  qrSection: { padding: 12, justifyContent: 'center', alignItems: 'center', width: 80 },
  qrPlaceholder: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },

  // Empty State
  emptyContainer: { flex: 1, paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1C', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#9E9E9E', textAlign: 'center', lineHeight: 22 },
  browseButton: {
    marginTop: 28, paddingVertical: 14, paddingHorizontal: 32,
    backgroundColor: GREEN, borderRadius: 24
  },
  browseButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
