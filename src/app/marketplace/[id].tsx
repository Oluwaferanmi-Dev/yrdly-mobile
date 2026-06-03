import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, ShoppingCart, MessageCircle } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Post } from '../../types';
import { formatPrice, timeAgo } from '../../lib/utils';

const { width } = Dimensions.get('window');
const GREEN = '#388E3C';

export default function MarketplaceDetailScreen() {
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

    // Marketplace logic: We check for a chat context
    // Actually, Phase 4 handles routing to chat/[id] natively via notifications.
    // If we are starting a *new* marketplace chat, we'd need to create a `chat_messages` or similar.
    // For now, we'll route to a new or existing chat based on user IDs.
    // Let's just create/open a conversation in `conversations` table for simplicity.
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
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity style={styles.backBtnWrapper} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];
  const isOwner = user?.id === post.user_id;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
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
            <ShoppingCart size={64} color="rgba(56, 142, 60, 0.5)" />
          </View>
        )}

        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{post.title || post.text || 'Untitled'}</Text>
            <Text style={styles.price}>{post.price === 0 ? 'FREE' : formatPrice(post.price || 0)}</Text>
          </View>
          
          <Text style={styles.timestamp}>Posted {timeAgo(post.timestamp)}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{post.text}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerRow}>
            <View style={styles.avatar}>
              {post.user?.avatar_url || post.author_image ? (
                <Image source={{ uri: post.user?.avatar_url || post.author_image }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {post.user?.name ? post.user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.sellerName}>{post.user?.name || post.author_name || 'Unknown Seller'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {isOwner ? (
          <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
            <Text style={styles.editButtonText}>Edit Item</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.messageButton} onPress={handleMessageSeller}>
              <MessageCircle size={20} color={GREEN} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.buyButton}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errorText: { fontSize: 18, color: '#1C1C1C', marginBottom: 20 },
  backBtnWrapper: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#F2F2F2', borderRadius: 8 },
  backBtnText: { color: '#1C1C1C', fontWeight: 'bold' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  scrollContent: { flex: 1 },
  imageScroll: { height: width },
  mainImage: { width: width, height: width },
  placeholderImage: { width: width, height: width, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  infoSection: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1C', flex: 1, marginRight: 10 },
  price: { fontSize: 24, fontWeight: 'bold', color: GREEN },
  timestamp: { fontSize: 14, color: '#9E9E9E', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#F2F2F2', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', marginBottom: 12 },
  description: { fontSize: 16, color: '#424242', lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  sellerName: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1C' },
  footer: {
    flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F2F2F2',
    backgroundColor: '#FFFFFF', paddingBottom: 30, // extra for safe area
  },
  actionButton: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  editButton: { backgroundColor: '#F2F2F2' },
  editButtonText: { color: '#1C1C1C', fontSize: 16, fontWeight: 'bold' },
  messageButton: {
    flex: 1, flexDirection: 'row', height: 50, borderRadius: 25, borderWidth: 1, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: 'rgba(56, 142, 60, 0.05)',
  },
  messageButtonText: { color: GREEN, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  buyButton: {
    flex: 1, height: 50, borderRadius: 25, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
  },
  buyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
