import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { Skeleton } from './Skeleton';
import type { Business } from '../types';

interface BusinessHubProps {
  searchQuery: string;
}

interface CategoryTile {
  name: string;
  count: number;
  image: string | null;
}

export function BusinessHub({ searchQuery }: BusinessHubProps) {
  const { colors, isDarkMode } = useAppTheme();
  const router = useRouter();
  const { activeFilter } = useLocation();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      let q = supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });
        
      const { data, error } = await q;
      if (error) throw error;
      setBusinesses(data as Business[] || []);
    } catch (e) {
      console.error('Error fetching businesses:', e);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBusinesses(true);
    setRefreshing(false);
  }, [fetchBusinesses]);

  const categoryTiles = useMemo<CategoryTile[]>(() => {
    const map = new Map<string, CategoryTile>();
    for (const biz of businesses) {
      const name = (biz.category || "Other").trim() || "Other";
      const image = biz.cover_image || biz.image_urls?.[0] || null;

      const existing = map.get(name);
      if (existing) {
        existing.count += 1;
        if (!existing.image && image) existing.image = image;
      } else {
        map.set(name, { name, count: 1, image });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [businesses]);

  const visibleBusinesses = useMemo(() => {
    let list = businesses;

    if (activeCategory) {
      list = list.filter((b) => (b.category || "Other").trim() === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.category?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [businesses, activeCategory, searchQuery]);

  const showingList = activeCategory !== null || searchQuery.trim().length > 0;

  if (loading && businesses.length === 0) {
    return (
      <View style={s.skeletonGrid}>
        {[1, 2, 3, 4].map(k => (
          <View key={k} style={[s.skeletonCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Skeleton width="100%" height={150} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={s.container}>
      {activeCategory && !searchQuery.trim() && (
        <TouchableOpacity 
          style={s.backBtn}
          onPress={() => setActiveCategory(null)}
        >
          <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
          <Text style={[s.backTxt, { color: colors.textMuted }]}>Back to categories</Text>
        </TouchableOpacity>
      )}

      {!showingList ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          contentContainerStyle={s.contentPad}
        >
          <View style={s.grid}>
            {categoryTiles.map(tile => (
              <TouchableOpacity
                key={tile.name}
                activeOpacity={0.8}
                onPress={() => setActiveCategory(tile.name)}
                style={s.tile}
              >
                {tile.image ? (
                  <Image source={{ uri: tile.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#2e7d32' }]} />
                )}
                <View style={s.tileOverlay} />
                <View style={s.tileBadge}>
                  <Text style={s.tileBadgeTxt}>{tile.count}</Text>
                </View>
                <Text style={s.tileTitle}>{tile.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={visibleBusinesses}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          contentContainerStyle={s.contentPad}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="storefront-outline" size={48} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 12 }} />
              <Text style={[s.emptyTxt, { color: colors.textMuted }]}>
                No businesses found
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/businesses/${item.id}` as any)}
              style={[s.bizCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            >
              <View style={[s.bizImgContainer, { backgroundColor: colors.background }]}>
                <Image 
                  source={{ uri: item.logo || item.cover_image || item.image_urls?.[0] || 'https://via.placeholder.com/150' }} 
                  style={s.bizImg} 
                  contentFit="cover" 
                />
              </View>
              <View style={s.bizInfo}>
                <Text style={[s.bizName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[s.bizCat, { color: colors.textMuted }]} numberOfLines={1}>{item.category || 'Other'}</Text>
                
                <View style={s.bizMetaRow}>
                  <View style={s.bizRating}>
                    <Ionicons name="star" size={12} color="#FBBF24" />
                    <Text style={[s.bizRatingTxt, { color: colors.text }]}>{item.rating?.toFixed(1) || '0.0'}</Text>
                    <Text style={[s.bizReviewCount, { color: colors.textMuted }]}>({item.review_count || 0})</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
  skeletonCard: { width: '48%', borderRadius: 20, overflow: 'hidden', borderWidth: 1, marginBottom: 14, height: 150 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  backTxt: { fontSize: 13, fontWeight: '600' },
  contentPad: { paddingHorizontal: 16, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 14 },
  tileOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  tileBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  tileBadgeTxt: { color: '#2e7d32', fontSize: 11, fontWeight: '700' },
  tileTitle: { position: 'absolute', bottom: 12, left: 12, right: 12, color: '#fff', fontSize: 16, fontWeight: '800' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyTxt: { fontSize: 15, textAlign: 'center' },
  bizCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  bizImgContainer: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', marginRight: 12 },
  bizImg: { width: '100%', height: '100%' },
  bizInfo: { flex: 1 },
  bizName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  bizCat: { fontSize: 13, marginBottom: 6 },
  bizMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bizRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bizRatingTxt: { fontSize: 12, fontWeight: '600' },
  bizReviewCount: { fontSize: 12 },
});
