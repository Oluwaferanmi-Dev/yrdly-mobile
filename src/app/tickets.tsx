import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { Post } from '../types';
import { useAppTheme } from '../context/ThemeContext';

interface Ticket {
  id: string;
  event_id: string;
  status: string;
  created_at: string;
  token?: string;
  event?: Post;
}

const getTicketStatusInfo = (ticket: Ticket) => {
  const isActiveOrConfirmed = ticket.status === 'active' || ticket.status === 'confirmed';
  
  if (!isActiveOrConfirmed) {
    return { isExpired: false, isValid: false, text: ticket.status.toUpperCase() };
  }

  const eventDate = ticket.event?.event_date ? new Date(ticket.event.event_date) : null;
  // Give a 24-hour buffer after the event date before expiring the ticket
  const isExpired = eventDate ? (new Date().getTime() - eventDate.getTime() > 24 * 60 * 60 * 1000) : false;

  if (isExpired) {
    return { isExpired: true, isValid: false, text: 'EXPIRED' };
  }

  return { isExpired: false, isValid: true, text: ticket.status === 'confirmed' ? 'CONFIRMED' : 'ACTIVE' };
};

export default function TicketsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const ticketTranslateY = useSharedValue(200);

  useEffect(() => {
    if (selectedTicket) {
      ticketTranslateY.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 100 }));
    } else {
      ticketTranslateY.value = 200;
    }
  }, [selectedTicket]);

  const animatedTicketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ticketTranslateY.value }]
  }));

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

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchTickets(); }, [fetchTickets]);

  const isTicketPast = (t: Ticket) => {
    const info = getTicketStatusInfo(t);
    return info.isExpired || t.status === 'used' || t.status === 'cancelled' || t.status === 'refunded';
  };

  const displayedTickets = tickets.filter(t => 
    activeTab === 'active' ? !isTicketPast(t) : isTicketPast(t)
  );

  const renderTicket = ({ item }: { item: Ticket }) => {
    const event = item.event;
    const imageUrl = event?.image_urls?.[0] || event?.image_url;
    const formattedDate = event?.event_date
      ? new Date(event.event_date).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        })
      : 'Date TBD';

    return (
      <TouchableOpacity
        style={[styles.ticketCard, { backgroundColor: colors.card }]}
        onPress={() => setSelectedTicket(item)}
        activeOpacity={0.8}
      >
        {/* Image */}
        <View style={styles.ticketImageWrapper}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.ticketImage} contentFit="cover" />
          ) : (
            <View style={[styles.ticketImage, styles.ticketImagePlaceholder, { backgroundColor: colors.inputBackground }]}>
              <Feather name="calendar" size={28} color={colors.tint} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.ticketInfo}>
          <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={2}>
            {event?.title || 'Event'}
          </Text>
          <View style={styles.ticketMeta}>
            <Feather name="calendar" size={13} color={colors.textMuted} />
            <Text style={[styles.ticketMetaText, { color: colors.textMuted }]}>{formattedDate}</Text>
          </View>
          {!!((event as any)?.location || (event as any)?.metadata?.location) && (
            <View style={styles.ticketMeta}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[styles.eventLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                {(() => {
                  const loc = (event as any)?.metadata?.location || (event as any)?.location;
                  return typeof loc === 'object' && loc !== null 
                    ? (loc.address || [loc.ward, loc.lga, loc.state].filter(Boolean).join(', ') || 'TBA') 
                    : (loc || 'TBA');
                })()}
              </Text>
            </View>
          )}
          
          {(() => {
            const statusInfo = getTicketStatusInfo(item);
            return (
              <View style={[styles.statusBadge, statusInfo.isValid ? styles.activeBadge : [styles.usedBadge, { backgroundColor: colors.inputBackground }]]}>
                <Text style={[styles.statusBadgeText, { color: statusInfo.isExpired ? '#FFA000' : colors.tint }]}>
                  {statusInfo.text}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Tear line */}
        <View style={styles.tearLine}>
          <View style={[styles.tearCircleTop, { backgroundColor: colors.background }]} />
          <View style={[styles.tearDashes, { borderLeftColor: colors.border }]} />
          <View style={[styles.tearCircleBottom, { backgroundColor: colors.background }]} />
        </View>

        {/* QR hint */}
        <View style={styles.qrSection}>
          <Feather name="maximize" size={40} color={colors.tint} />
          <Text style={[styles.tapText, { color: colors.textMuted }]}>Tap to view</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Tickets</Text>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && { borderBottomColor: colors.tint }]} 
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'active' ? colors.tint : colors.textMuted }]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && { borderBottomColor: colors.tint }]} 
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'past' ? colors.tint : colors.textMuted }]}>Past / Used</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={displayedTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="tag" size={72} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tickets Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Buy tickets to events to see them here.</Text>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push('/(tabs)/catalog')}
              >
                <Text style={styles.browseButtonText}>Browse Events</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* QR Ticket Modal */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.modalClose}>
              <Feather name="x" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Your Ticket</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedTicket && (
            <Animated.View style={[styles.modalContent, animatedTicketStyle]}>
              {/* Event card */}
              <View style={[styles.modalEventCard, { backgroundColor: colors.inputBackground }]}>
                {(selectedTicket.event?.image_urls?.[0] || selectedTicket.event?.image_url) && (
                  <Image
                    source={{ uri: selectedTicket.event?.image_urls?.[0] || selectedTicket.event?.image_url }}
                    style={styles.modalEventImage}
                    contentFit="cover"
                  />
                )}
                <View style={styles.modalEventInfo}>
                  <Text style={[styles.modalEventTitle, { color: colors.text }]}>{selectedTicket.event?.title || 'Event'}</Text>
                  <Text style={[styles.modalEventDate, { color: colors.textSecondary }]}>
                    {selectedTicket.event?.event_date
                      ? new Date(selectedTicket.event.event_date).toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                        })
                      : 'Date TBD'
                    }
                  </Text>
                </View>
              </View>

              {/* QR Code */}
              <View style={[styles.qrContainer, { backgroundColor: colors.card }]}>
                <QRCode
                  value={selectedTicket.token || selectedTicket.id}
                  size={220}
                  color={colors.text}
                  backgroundColor={colors.card}
                />
              </View>

              {/* Ticket token */}
              <Text style={[styles.tokenLabel, { color: colors.textMuted }]}>TICKET ID</Text>
              <Text style={[styles.tokenValue, { color: colors.text }]}>{(selectedTicket.token || selectedTicket.id).slice(0, 16).toUpperCase()}</Text>

              <View style={[
                styles.modalStatusBadge,
                getTicketStatusInfo(selectedTicket).isValid ? styles.activeBadge : [styles.usedBadge, { backgroundColor: colors.inputBackground }]
              ]}>
                <Text style={[styles.modalStatusText, { color: getTicketStatusInfo(selectedTicket).isExpired ? '#FFA000' : colors.tint }]}>
                  {getTicketStatusInfo(selectedTicket).isValid ? '✓ Valid Ticket' : getTicketStatusInfo(selectedTicket).text}
                </Text>
              </View>

              <Text style={[styles.scanInstructions, { color: colors.textMuted }]}>
                Present this QR code to the event organizer for check-in
              </Text>
            </Animated.View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20 },
  tab: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 15, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 100 },

  ticketCard: {
    flexDirection: 'row', borderRadius: 12, marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  ticketAccent: { width: 6 },
  ticketImageWrapper: { padding: 12 },
  ticketImage: { width: 72, height: 72, borderRadius: 8 },
  ticketImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  ticketInfo: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  ticketTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  ticketMetaText: { fontSize: 12, marginLeft: 4 },
  eventLocation: { fontSize: 12, marginLeft: 4, flex: 1 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 6 },
  activeBadge: { backgroundColor: 'rgba(56,142,60,0.12)' },
  usedBadge: { },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },

  tearLine: { width: 20, alignItems: 'center', justifyContent: 'center' },
  tearCircleTop: { width: 14, height: 14, borderRadius: 7, marginBottom: 4 },
  tearCircleBottom: { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  tearDashes: { flex: 1, borderLeftWidth: 1.5, borderStyle: 'dashed' },

  qrSection: { width: 80, justifyContent: 'center', alignItems: 'center', gap: 4 },
  tapText: { fontSize: 9, fontWeight: '600' },

  emptyContainer: { flex: 1, paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  browseButton: {
    marginTop: 28, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24,
  },
  browseButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalClose: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 'bold' },
  modalContent: { flex: 1, alignItems: 'center', padding: 24 },
  modalEventCard: {
    width: '100%', flexDirection: 'row',
    borderRadius: 12, overflow: 'hidden', marginBottom: 32, gap: 12,
  },
  modalEventImage: { width: 80, height: 80 },
  modalEventInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  modalEventTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  modalEventDate: { fontSize: 12 },
  qrContainer: {
    padding: 24,
    borderRadius: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  tokenLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  tokenValue: { fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
  modalStatusBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
  modalStatusText: { fontSize: 14, fontWeight: 'bold' },
  scanInstructions: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
