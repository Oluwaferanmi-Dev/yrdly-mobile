import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AlertService, Alert } from '../lib/alert-service';
import { AlertBanner } from '../components/AlertBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, RED, AMBER, BLUE } from '../constants/tokens';

type SeverityFilter = 'all' | 'urgent' | 'caution' | 'information';

const FILTERS: { key: SeverityFilter; label: string; color: string; bg: string }[] = [
  { key: 'all',         label: 'All',     color: '#FFFFFF',  bg: 'rgba(255,255,255,0.1)' },
  { key: 'urgent',      label: 'Urgent',  color: '#EF4444',  bg: 'rgba(183,28,28,0.18)' },
  { key: 'caution',     label: 'Caution', color: '#FFB74D',  bg: 'rgba(230,81,0,0.15)' },
  { key: 'information', label: 'Info',    color: '#64B5F6',  bg: 'rgba(33,150,243,0.12)' },
];

export default function AlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('all');

  const fetchAlerts = useCallback(async () => {
    const fetchedAlerts = await AlertService.getActiveAlerts();
    setAlerts(fetchedAlerts);
  }, []);

  useEffect(() => {
    fetchAlerts().then(() => setLoading(false));
  }, [fetchAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }, [fetchAlerts]);

  const filtered = useMemo(() =>
    activeFilter === 'all' ? alerts : alerts.filter((a: any) => a.severity === activeFilter),
    [alerts, activeFilter]
  );

  return (
    <View style={[styles.container, { backgroundColor: DARK, paddingTop: insets.top }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: 18, color: TEXT_PRIMARY }}>Active Alerts</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Severity Filter Pills */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row' }}>
          {FILTERS.map(f => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: active ? f.bg : SURFACE, borderColor: active ? f.color : GLASS_BORDER }}
              >
                <Text style={{ fontFamily: 'Outfit', fontWeight: active ? '700' : '500', fontSize: 13, color: active ? f.color : MUTED }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertBanner
            alert={item}
            onPress={() => router.push(`/alert/${item.id}` as any)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeFilter === 'all'
                  ? 'There are no active alerts in your area.'
                  : `No ${activeFilter} alerts right now.`}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18 },
  filterRow: { paddingVertical: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingBottom: 24 },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
