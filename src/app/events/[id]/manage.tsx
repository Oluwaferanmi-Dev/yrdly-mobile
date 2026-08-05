import { DARK, SURFACE } from '../../../constants/tokens';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { useAppTheme } from '../../../context/ThemeContext';
import type { Event, Ticket } from '../../../types/events';

const formatDateTime = (value: string | null) => value
  ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not scanned';

export default function ManageEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*, ticket_tiers(*)')
        .eq('id', id)
        .maybeSingle();
      if (eventError) throw eventError;

      if (!eventData || eventData.organizer_id !== user.id) {
        setAccessDenied(true);
        return;
      }
      setEvent(eventData as Event);

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*, tier:ticket_tiers(id, name, price)')
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      if (ticketError) throw ticketError;
      setTickets((ticketData || []) as Ticket[]);
    } catch (error) {
      console.error('Failed to load organizer event details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const metrics = useMemo(() => {
    const paidTickets = tickets.filter(ticket => ticket.status === 'PAID' || ticket.status === 'USED');
    return {
      sold: paidTickets.length,
      checkedIn: tickets.filter(ticket => ticket.status === 'USED').length,
      revenue: paidTickets.reduce((sum, ticket) => sum + Number(ticket.amount_paid || 0), 0),
    };
  }, [tickets]);

  if (loading) {
    return <SafeAreaView style={[styles.center, { backgroundColor: DARK }]}><ActivityIndicator size="large" color={colors.tint} /></SafeAreaView>;
  }

  if (accessDenied || !event) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: DARK, padding: 28 }]}>
        <Feather name="lock" size={44} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Organizer access only</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Only the event organizer can view ticket buyers and check-ins.</Text>
        <TouchableOpacity style={[styles.backAction, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
          <Text style={styles.backActionText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const eventDate = new Date(event.start_time).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const renderTicket = ({ item }: { item: Ticket }) => {
    const checkedIn = item.status === 'USED';
    return (
      <View style={[styles.ticketCard, { backgroundColor: SURFACE, borderColor: colors.borderLight }]}>
        <View style={styles.ticketTopRow}>
          <View style={[styles.attendeeIcon, { backgroundColor: colors.tint + '18' }]}><Feather name="user" size={18} color={colors.tint} /></View>
          <View style={styles.ticketInfo}>
            <Text style={[styles.ticketName, { color: colors.text }]}>{item.attendee_name || 'Attendee'}</Text>
            <Text style={[styles.ticketEmail, { color: colors.textMuted }]}>{item.attendee_email || 'Email unavailable'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: checkedIn ? colors.tint + '20' : colors.borderLight }]}>
            <Feather name={checkedIn ? 'check-circle' : 'clock'} size={12} color={checkedIn ? colors.tint : colors.textMuted} />
            <Text style={{ color: checkedIn ? colors.tint : colors.textMuted, fontSize: 11, fontWeight: '700' }}>{checkedIn ? 'Scanned' : 'Not scanned'}</Text>
          </View>
        </View>
        <View style={[styles.ticketDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.ticketMeta}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>PURCHASED</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>{formatDateTime(item.created_at)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>SCANNED</Text>
            <Text style={[styles.metaValue, { color: checkedIn ? colors.tint : colors.textMuted }]}>{formatDateTime(item.scanned_at)}</Text>
          </View>
        </View>
        <Text style={[styles.tierText, { color: colors.textSecondary }]}>{item.tier?.name || 'Ticket'} · ₦{Number(item.amount_paid || 0).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="chevron-back" size={28} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Dashboard</Text>
        <TouchableOpacity onPress={() => router.push(`/events/${id}/scan` as any)} style={[styles.scanIcon, { backgroundColor: colors.tint + '20' }]}><Ionicons name="qr-code-outline" size={20} color={colors.tint} /></TouchableOpacity>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={ticket => ticket.id}
        renderItem={renderTicket}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        ListHeaderComponent={<>
          <View style={[styles.eventCard, { backgroundColor: SURFACE, borderColor: colors.borderLight }]}>
            {event.cover_image_url && <Image source={{ uri: event.cover_image_url }} style={styles.eventImage} contentFit="cover" />}
            <View style={styles.eventBody}>
              <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
              <Text style={[styles.eventDate, { color: colors.textSecondary }]}>{eventDate}</Text>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <Metric label="Sold" value={String(metrics.sold)} colors={colors} />
            <Metric label="Revenue" value={`₦${metrics.revenue.toLocaleString()}`} colors={colors} />
            <Metric label="Scanned" value={String(metrics.checkedIn)} colors={colors} />
          </View>
          <TouchableOpacity style={[styles.scanButton, { backgroundColor: colors.tint }]} onPress={() => router.push(`/events/${id}/scan` as any)}>
            <Ionicons name="qr-code" size={22} color="#000" /><Text style={styles.scanButtonText}>Scan Attendee Tickets</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ticket buyers ({metrics.sold})</Text>
        </>}
        ListEmptyComponent={<View style={styles.emptyList}><Feather name="users" size={42} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>No tickets sold yet.</Text></View>}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, colors }: { label: string; value: string; colors: any }) {
  return <View style={[styles.metric, { backgroundColor: SURFACE, borderColor: colors.borderLight }]}><Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>{value}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingHorizontal: 12 }, backBtn: { width: 40 }, headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' }, scanIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  listContent: { padding: 16, paddingBottom: 40 }, eventCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' }, eventImage: { height: 150, width: '100%' }, eventBody: { padding: 14 }, eventTitle: { fontSize: 20, fontWeight: '800' }, eventDate: { fontSize: 13, marginTop: 4 },
  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 14 }, metric: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center' }, metricValue: { fontSize: 17, fontWeight: '800' }, metricLabel: { fontSize: 11, marginTop: 3 },
  scanButton: { height: 52, borderRadius: 14, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, scanButtonText: { color: '#000', fontSize: 16, fontWeight: '800' }, sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  ticketCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 }, ticketTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, attendeeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, ticketInfo: { flex: 1 }, ticketName: { fontSize: 15, fontWeight: '800' }, ticketEmail: { fontSize: 12, marginTop: 2 }, statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 }, ticketDivider: { height: 1, marginVertical: 12 }, ticketMeta: { flexDirection: 'row', gap: 12 }, metaItem: { flex: 1 }, metaLabel: { fontSize: 9, fontWeight: '800', letterSpacing: .5 }, metaValue: { fontSize: 12, fontWeight: '600', marginTop: 3 }, tierText: { fontSize: 12, marginTop: 12 },
  emptyList: { paddingVertical: 44, alignItems: 'center', gap: 10 }, emptyTitle: { fontSize: 18, fontWeight: '800' }, emptyText: { fontSize: 14, textAlign: 'center' }, backAction: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 }, backActionText: { color: '#000', fontWeight: '800' },
});
