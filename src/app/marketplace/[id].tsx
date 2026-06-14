import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Post } from '../../types';
import { formatPrice, timeAgo } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function MarketplaceDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('posts')
      .select(`*, user:users!posts_user_id_fkey(id, name, avatar_url)`)
      .eq('id', id)
      .single();

    if (!error && data) {
      setPost(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleMessageSeller = async () => {
    if (!post || !user || user.id === post.user_id) return;

    try {
      // 1. Check if conversation exists
      const { data: existing, error: existingError } = await supabase
        .from('conversations')
        .select('*')
        .eq('post_id', post.id)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (existing && existing.length > 0) {
        router.push({ pathname: '/chat/[id]', params: { id: existing[0].id, type: 'marketplace' } });
        return;
      }

      // 2. Create new conversation
      const { data: newConv, error: newError } = await supabase
        .from('conversations')
        .insert({
          user1_id: user.id,
          user2_id: post.user_id,
          post_id: post.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (newConv) {
        router.push({ pathname: '/chat/[id]', params: { id: newConv.id, type: 'marketplace' } });
      }
    } catch (e) {
      console.error('Error starting chat', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Item not found</Text>
        <TouchableOpacity style={[styles.backBtnWrapper, { backgroundColor: colors.inputBackground }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];
  const isOwner = user?.id === post.user_id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Item Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Images */}
        {imageUrls.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {imageUrls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.mainImage} contentFit="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="cart-outline" size={64} color="rgba(56, 142, 60, 0.5)" />
          </View>
        )}

        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{post.title || post.text || 'Untitled'}</Text>
            <Text style={[styles.price, { color: colors.tint }]}>{post.price === 0 ? 'FREE' : formatPrice(post.price || 0)}</Text>
          </View>
          
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>Posted {timeAgo(post.timestamp)}</Text>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{post.text}</Text>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Seller</Text>
          <View style={styles.sellerRow}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              {post.user?.avatar_url || post.author_image ? (
                <Image source={{ uri: post.user?.avatar_url || post.author_image }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {post.user?.name ? post.user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            <View>
              <Text style={[styles.sellerName, { color: colors.text }]}>{post.user?.name || post.author_name || 'Unknown Seller'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        {isOwner ? (
          <TouchableOpacity style={[styles.actionButton, styles.editButton, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.editButtonText, { color: colors.text }]}>Edit Item</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.messageButton, { borderColor: colors.tint, backgroundColor: colors.inputBackground }]} onPress={handleMessageSeller}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.tint} />
              <Text style={[styles.messageButtonText, { color: colors.tint }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.buyButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push({ pathname: '/checkout/[id]', params: { id: post.id, type: 'marketplace' } })}
            >
              <Text style={styles.buyButtonText}>Buy Now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backBtnText: { fontWeight: 'bold' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  scrollContent: { flex: 1 },
  imageScroll: { height: width },
  mainImage: { width: width, height: width },
  placeholderImage: { width: width, height: width, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  infoSection: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', flex: 1, marginRight: 10 },
  price: { fontSize: 24, fontWeight: 'bold' },
  timestamp: { fontSize: 14, marginBottom: 20 },
  divider: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  sellerName: { fontSize: 16, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row', padding: 16, borderTopWidth: 1, paddingBottom: 30, // extra for safe area
  },
  actionButton: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  editButton: { },
  editButtonText: { fontSize: 16, fontWeight: 'bold' },
  messageButton: {
    flex: 1, flexDirection: 'row', height: 50, borderRadius: 25, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  messageButtonText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  buyButton: {
    flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
  },
  buyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
