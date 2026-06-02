import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { MarketplaceItemCard } from './MarketplaceItemCard';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useRouter } from 'expo-router';

interface MarketplaceGridProps {
  searchQuery?: string;
}

export function MarketplaceGrid({ searchQuery = '' }: MarketplaceGridProps) {
  const router = useRouter();
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`*, user:users!posts_user_id_fkey(id, name, avatar_url)`)
        .eq('category', 'For Sale')
        .eq('is_sold', false);

      if (searchQuery) {
        // Simple search on title or description
        query = query.or(`title.ilike.%${searchQuery}%,text.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(40);

      if (error) throw error;
      setItems(data as Post[]);
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          {searchQuery ? `No results for "${searchQuery}"` : "Marketplace is empty"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <MarketplaceItemCard 
          item={item} 
          onPress={() => router.push(`/marketplace/${item.id}`)}
          onMessageSeller={() => {
            // Future navigation to messages
            console.log('Message seller', item.user?.name);
          }}
        />
      )}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.columnWrapper}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 100, // padding for the FAB later
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#616161',
    textAlign: 'center',
  },
});
