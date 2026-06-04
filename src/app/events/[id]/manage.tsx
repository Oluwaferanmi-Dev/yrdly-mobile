import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { formatPrice } from '../../../lib/utils';

const GREEN = '#388E3C';

interface Ticket {
  id: string;
  status: string;
  checked_in_at: string | null;
  buyer: { id: string; name: string; avatar_url: string | null } | null;
  ticket_type: string | null;
  price: number;
}

interface EventDetail {
  id: string;
  title: string;
  event_date: string;
  organizer_id: string;
  image_url: string | null;
  image_urls: string[] | null;
  price: number | null;
}

export default function ManageEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    try {
      // Fetch event
      const { data: ev, error: evErr } = await supabase
        .from('posts')
        .select('id, title, event_date, organizer_id, image_url, image_urls, price')
        .eq('id', id)
        .single();
      if (evErr) throw evErr;

      if (ev.organizer_id !== user.id) {
        Alert.alert('Access Denied', 'You are not the organizer of this event.');
        router.back();
        return;
      }
      setEvent(ev as EventDetail);

      // Fetch tickets
      const { data: tix, error: tixErr } = await supabase
        .from('my_tickets')
        .select('id, status, checked_in_at, ticket_type, price, buyer:users!my_tickets_user_id_fkey(id, name, avatar_url)')
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      if (tixErr) throw tixErr;

      const normalised = (tix || []).map(t => ({
        ...t,
        buyer: Array.isArray(t.buyer) ? t.buyer[0] ?? null : t.buyer,
      })) as Ticket[];
      setTickets(normalised);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load event data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const totalSold = tickets.length;
  const checkedIn = tickets.filter(t => t.status === 'checked_in' || !!t.checked_in_at).length;
  const revenue = tickets.reduce((sum, t) => sum + (t.price || 0), 0);

  const handleCancelEvent = () => {
    Alert.alert(
      'Cancel Event?',
      'This will cancel the event and trigger refunds for all ticket holders. This cannot be undone.',
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('posts')
                .update({ status: 'cancelled' })
                .eq('id', id);
              Alert.alert('Event Cancelled', 'The event has been cancelled.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert('Error', 'Failed to cancel event. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  const eventImage = event?.image_urls?.[0] || event?.image_url;
  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date TBD';

  const renderTicket = ({ item }: { item: Ticket }) => {
    const isCheckedIn = item.status === 'checked_in' || !!item.checked_in_at;
    return (
      <View style={styles.ticketRow}>
        {item.buyer?.avatar_url
          ? <Image source={{ uri: item.buyer.avatar_url }} style={styles.avatar} contentFit="cover" />
          : <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{item.buyer?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
        }
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketName}>{item.buyer?.name ?? 'Attendee'}</Text>
          <Text style={styles.ticketType}>{item.ticket_type || 'General Admission'}</Text>
        </View>
        <View style={[styles.statusBadge, isCheckedIn ? styles.checkedInBadge : styles.activeBadge]}>
          <Ionicons name={isCheckedIn ? 'checkmark-circle' : 'ticket-outline'} size={12} color={isCheckedIn ? '#2E7D32' : '#616161'} />
          <Text style={[styles.statusText, isCheckedIn ? styles.checkedInText : styles.activeText]}>
            {isCheckedIn ? 'Checked In' : 'Active'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Manage Event</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={tickets}
        keyExtractor={t => t.id}
        renderItem={renderTicket}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            {/* Event Banner */}
            <View style={styles.eventBanner}>
              {eventImage && <Image source={{ uri: eventImage }} style={styles.bannerImg} contentFit="cover" />}
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle} numberOfLines={2}>{event?.title}</Text>
                <Text style={styles.bannerDate}>{eventDate}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalSold}</Text>
                <Text style={styles.statLabel}>Tickets Sold</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{checkedIn}</Text>
                <Text style={styles.statLabel}>Checked In</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: GREEN }]}>{formatPrice(revenue)}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>

            {/* Check-in progress bar */}
            {totalSold > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Check-in Progress</Text>
                  <Text style={styles.progressPct}>{Math.round((checkedIn / totalSold) * 100)}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(checkedIn / totalSold) * 100}%` as any }]} />
                </View>
              </View>
            )}

            {/* Scan Button */}
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => router.push(`/events/${id}/scan` as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code" size={22} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.scanBtnText}>Start Scanning Tickets</Text>
            </TouchableOpacity>

            <Text style={styles.listHeader}>ATTENDEES ({totalSold})</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="ticket-outline" size={52} color="rgba(56,142,60,0.25)" />
            <Text style={styles.emptyText}>No tickets sold yet</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEvent}>
            <Ionicons name="close-circle-outline" size={18} color="#B71C1C" style={{ marginRight: 8 }} />
            <Text style={styles.cancelBtnText}>Cancel This Event</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 'bold', color: '#1C1C1C' },

  eventBanner: { height: 180, position: 'relative', backgroundColor: '#1C1C1C' },
  bannerImg: { ...StyleSheet.absoluteFillObject },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  bannerContent: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  bannerDate: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1C1C1C', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#9E9E9E', textTransform: 'uppercase', fontWeight: '600' },

  progressSection: { marginHorizontal: 16, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#424242' },
  progressPct: { fontSize: 13, fontWeight: '700', color: GREEN },
  progressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: GREEN, borderRadius: 4 },

  scanBtn: {
    flexDirection: 'row', height: 54, borderRadius: 27, backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 20,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  scanBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },

  listHeader: {
    fontSize: 11, fontWeight: '800', color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, marginBottom: 8,
  },

  ticketRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: 'bold', color: GREEN },
  ticketInfo: { flex: 1 },
  ticketName: { fontSize: 14, fontWeight: '700', color: '#1C1C1C' },
  ticketType: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  checkedInBadge: { backgroundColor: '#E8F5E9' },
  activeBadge: { backgroundColor: '#F5F5F5' },
  statusText: { fontSize: 11, fontWeight: '700' },
  checkedInText: { color: '#2E7D32' },
  activeText: { color: '#616161' },

  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 15, color: '#9E9E9E' },

  cancelBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    margin: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#B71C1C' },
});
