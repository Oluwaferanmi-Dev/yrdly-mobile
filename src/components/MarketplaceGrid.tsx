import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, Alert } from 'react-native';
import { MarketplaceItemCard } from './MarketplaceItemCard';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/use-supabase-auth';

interface MarketplaceGridProps {
  searchQuery?: string;
}

export function MarketplaceGrid({ searchQuery = '' }: MarketplaceGridProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagingItem, setMessagingItem] = useState<string | null>(null);

  const handleMessageSeller = useCallback(async (item: Post) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to message the seller.');
      return;
    }
    if (user.id === item.user_id) {
      Alert.alert("That's your own listing!");
      return;
    }

    setMessagingItem(item.id);
    try {
      // 1. Look for existing marketplace conversation for this item between these two users
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'marketplace')
        .contains('participant_ids', [user.id, item.user_id])
        .eq('item_id', item.id)
        .maybeSingle();

      if (existing?.id) {
        router.push({ pathname: '/chat/[id]', params: { id: existing.id } });
        return;
      }

      // 2. Create a new marketplace conversation
      const imageUrl = item.image_urls?.[0] || item.image_url || null;
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          type: 'marketplace',
          participant_ids: [user.id, item.user_id],
          item_id: item.id,
          item_title: item.title || item.text || 'Listing',
          item_image: imageUrl,
          item_price: item.price ?? null,
          last_message_text: '',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error || !created) throw error ?? new Error('Failed to create conversation');

      router.push({ pathname: '/chat/[id]', params: { id: created.id } });
    } catch (e) {
      console.error('Message seller error:', e);
      Alert.alert('Error', 'Could not open chat. Please try again.');
    } finally {
      setMessagingItem(null);
    }
  }, [user, router]);

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
          onMessageSeller={handleMessageSeller}
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
