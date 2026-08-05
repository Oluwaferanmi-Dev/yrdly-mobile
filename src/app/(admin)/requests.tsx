import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED,
  TEXT_PRIMARY
} from '../../constants/tokens';

const ADMIN_EMAIL = 'support@yrdly.ng'; // Replace with actual admin email

type DeletionRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
  delete_requested_at: string | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RequestCard({ item, onResolve }: { item: DeletionRequest; onResolve: (id: string) => void }) {
  const initials = item.name ? item.name.charAt(0).toUpperCase() : '?';

  const handleContactUser = () => {
    if (item.email) {
      Linking.openURL(`mailto:${item.email}?subject=Account Deletion Request - YRDLY&body=Hi ${item.name},%0A%0AWe have received your account deletion request.`);
    } else if (item.phone) {
      Linking.openURL(`tel:${item.phone}`);
    } else {
      Alert.alert('No contact info', 'This user has no email or phone on file.');
    }
  };

  const handleMarkResolved = () => {
    Alert.alert(
      'Mark as Resolved',
      `This will clear the deletion flag for ${item.name}. Only do this after you have fully deleted their data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          style: 'destructive',
          onPress: () => onResolve(item.id),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          {/* Red dot indicator */}
          <View style={styles.urgentDot} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.userName}>{item.name || 'Unknown User'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email || item.phone || 'No contact'}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>
            {item.delete_requested_at ? timeAgo(item.delete_requested_at) : timeAgo(item.created_at)}
          </Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <View style={styles.infoChip}>
          <Ionicons name="warning-outline" size={12} color="#F59E0B" />
          <Text style={styles.infoChipTxt}>Deletion Requested</Text>
        </View>
        {item.phone ? (
          <View style={styles.infoChip}>
            <Ionicons name="call-outline" size={12} color={MUTED} />
            <Text style={[styles.infoChipTxt, { color: MUTED }]}>{item.phone}</Text>
          </View>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleContactUser}>
          <Feather name="mail" size={15} color={G} />
          <Text style={[styles.actionTxt, { color: G }]}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.resolveBtn]} onPress={handleMarkResolved}>
          <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
          <Text style={[styles.actionTxt, { color: '#fff' }]}>Mark Resolved</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DeletionRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, avatar_url, created_at, delete_requested_at')
      .eq('delete_requested', true)
      .order('delete_requested_at', { ascending: false, nullsFirst: false });

    if (!error && data) {
      setRequests(data as DeletionRequest[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleResolve = async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({ delete_requested: false, delete_requested_at: null })
      .eq('id', userId);

    if (error) {
      Alert.alert('Error', 'Failed to update. Please try again.');
    } else {
      setRequests(prev => prev.filter(r => r.id !== userId));
      Alert.alert('Done', 'Marked as resolved. Remember to fully delete user data from Supabase.');
    }
  };

  const handleEmailAll = () => {
    const userList = requests.map(r => `• ${r.name} (${r.email || r.phone || 'no contact'})`).join('%0A');
    Linking.openURL(`mailto:${ADMIN_EMAIL}?subject=Pending Deletion Requests&body=The following users have requested account deletion:%0A%0A${userList}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Deletion Requests</Text>
          {requests.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countTxt}>{requests.length}</Text>
            </View>
          )}
        </View>
        {requests.length > 0 && (
          <TouchableOpacity onPress={handleEmailAll} style={styles.emailAllBtn}>
            <Feather name="send" size={18} color={G} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={G} size="large" />
          <Text style={styles.loadingTxt}>Loading requests...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color={G} style={{ opacity: 0.6 }} />
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtitle}>No pending account deletion requests.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <RequestCard item={item} onResolve={handleResolve} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={G}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Ionicons name="warning" size={14} color="#F59E0B" />
              <Text style={styles.listHeaderTxt}>
                {requests.length} user{requests.length !== 1 ? 's' : ''} waiting for data deletion. Contact each user and delete their data from Supabase, then mark as resolved.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GLASS_BG, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff',
  },
  countBadge: {
    backgroundColor: '#EF4444', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center',
  },
  countTxt: { color: '#fff', fontFamily: 'Outfit-Bold', fontSize: 12 },
  emailAllBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GLASS_BG, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  loadingTxt: { color: LABEL, fontFamily: 'Inter-Regular', marginTop: 8 },
  emptyTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', textAlign: 'center' },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
  listHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  listHeaderTxt: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 12,
    color: '#F59E0B', lineHeight: 18,
  },
  card: {
    backgroundColor: GLASS_BG, borderWidth: 1, borderColor: GLASS_BORDER,
    borderRadius: 18, padding: 16, gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: 'Outfit-Bold', fontSize: 18, color: G },
  urgentDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: DARK,
  },
  cardMeta: { flex: 1 },
  userName: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' },
  userEmail: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 },
  timeBadge: {
    backgroundColor: SURFACE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  timeText: { fontFamily: 'Inter-Regular', fontSize: 11, color: MUTED },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  infoChipTxt: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#F59E0B' },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12,
    backgroundColor: 'rgba(130,219,126,0.08)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.25)',
  },
  resolveBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)',
  },
  actionTxt: { fontFamily: 'Outfit-Bold', fontSize: 13 },
});
