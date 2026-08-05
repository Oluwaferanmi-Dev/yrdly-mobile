import { DARK, SURFACE } from '../../../../constants/tokens';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { useAppTheme } from '../../../context/ThemeContext';

type DisputeStatus = 'all' | 'open' | 'under_review' | 'resolved' | 'closed';

const STATUS_FILTERS: { key: DisputeStatus; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'open',         label: 'Open' },
  { key: 'under_review', label: 'In Review' },
  { key: 'resolved',     label: 'Resolved' },
  { key: 'closed',       label: 'Closed' },
];

const STATUS_COLOR: Record<string, string> = {
  open:         '#EF4444',
  under_review: '#F59E0B',
  resolved:     '#82DB7E',
  closed:       '#6B7280',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function AdminDisputesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();

  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DisputeStatus>('all');
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchDisputes = useCallback(async () => {
    if (!user) return;
    try {
      // Check admin role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        setAccessDenied(true);
        return;
      }

      const { data, error } = await supabase
        .from('disputes')
        .select(`
          id, status, reason, created_at,
          transaction:transactions(id, amount,
            buyer:users!transactions_buyer_id_fkey(id, name, avatar_url),
            seller:users!transactions_seller_id_fkey(id, name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (e) {
      console.error('Fetch disputes error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchDisputes(); }, [fetchDisputes]);

  const filtered = useMemo(() =>
    activeFilter === 'all' ? disputes : disputes.filter(d => d.status === activeFilter),
    [disputes, activeFilter]
  );

  if (accessDenied) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: DARK }]}>
        <View style={s.center}>
          <Feather name="lock" size={48} color={colors.textMuted} />
          <Text style={[s.accessText, { color: colors.textSecondary }]}>Admin access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const tx = item.transaction;
    const buyer = tx?.buyer;
    const seller = tx?.seller;
    const statusColor = STATUS_COLOR[item.status] ?? '#6B7280';

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: SURFACE, borderColor: colors.borderLight }]}
        onPress={() => router.push(`/(admin)/disputes/${item.id}` as any)}
        activeOpacity={0.75}
      >
        {/* Status badge */}
        <View style={s.cardHeader}>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
            <Text style={[s.statusText, { color: statusColor }]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={[s.dateText, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Reason */}
        <Text style={[s.reason, { color: colors.text }]} numberOfLines={2}>
          {item.reason?.replace(/_/g, ' ') ?? 'Dispute'}
        </Text>

        {/* Parties */}
        <View style={s.parties}>
          <View style={s.party}>
            {buyer?.avatar_url
              ? <Image source={{ uri: buyer.avatar_url }} style={s.avatar} />
              : <View style={[s.avatar, s.avatarFallback, { backgroundColor: colors.inputBackground }]}>
                  <Feather name="user" size={14} color={colors.textMuted} />
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={[s.partyRole, { color: colors.textMuted }]}>Buyer</Text>
              <Text style={[s.partyName, { color: colors.text }]} numberOfLines={1}>{buyer?.name ?? '—'}</Text>
            </View>
          </View>

          <Feather name="arrow-right" size={16} color={colors.textMuted} />

          <View style={[s.party, { justifyContent: 'flex-end' }]}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[s.partyRole, { color: colors.textMuted }]}>Seller</Text>
              <Text style={[s.partyName, { color: colors.text }]} numberOfLines={1}>{seller?.name ?? '—'}</Text>
            </View>
            {seller?.avatar_url
              ? <Image source={{ uri: seller.avatar_url }} style={s.avatar} />
              : <View style={[s.avatar, s.avatarFallback, { backgroundColor: colors.inputBackground }]}>
                  <Feather name="user" size={14} color={colors.textMuted} />
                </View>
            }
          </View>
        </View>

        {tx?.amount != null && (
          <Text style={[s.amount, { color: colors.textSecondary }]}>
            Order: ₦{Number(tx.amount).toLocaleString()}
          </Text>
        )}

        <View style={s.chevronRow}>
          <Text style={[s.viewDetail, { color: colors.tint }]}>View Details</Text>
          <Feather name="chevron-right" size={16} color={colors.tint} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: DARK }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Disputes</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {STATUS_FILTERS.map(f => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[
                s.filterPill,
                {
                  backgroundColor: active ? colors.tint + '22' : 'transparent',
                  borderColor: active ? colors.tint : colors.borderLight,
                },
              ]}
            >
              <Text style={[s.filterLabel, { color: active ? colors.tint : colors.textMuted }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Feather name="check-circle" size={48} color={colors.textMuted} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No disputes found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18 },
  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, gap: 10,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  dateText: { fontSize: 12 },
  reason: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  parties: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  party: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  partyRole: { fontSize: 11 },
  partyName: { fontSize: 13, fontWeight: '600' },
  amount: { fontSize: 13 },
  chevronRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewDetail: { fontSize: 13, fontWeight: '600' },
  accessText: { marginTop: 12, fontSize: 16, fontFamily: 'Inter-Medium' },
  emptyText: { marginTop: 12, fontSize: 16, fontFamily: 'Inter-Medium' },
});
