import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';

const { width } = Dimensions.get('window');
// Calculate card width for 2 columns with padding
const cardWidth = (width - 48) / 2;
const GREEN = '#388E3C';

interface MarketplaceItemCardProps {
  item: Post;
  onPress?: () => void;
  onMessageSeller?: () => void;
}

export function MarketplaceItemCard({ item, onPress, onMessageSeller }: MarketplaceItemCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === item.user_id;

  const getInitials = (name?: string) => name ? name.charAt(0).toUpperCase() : 'U';
  const imageUrl = item.image_urls?.[0] || item.image_url;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* Image Container */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="cart-outline" size={32} color="rgba(56, 142, 60, 0.5)" />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || item.text || 'Untitled'}
        </Text>
        
        <Text style={styles.price}>
          {item.price === 0 ? 'FREE' : formatPrice(item.price || 0)}
        </Text>

        <View style={styles.actionsRow}>
          {isOwner ? (
            <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
              <Ionicons name="pencil" size={14} color={GREEN} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.actionButton, styles.buyButton]}>
                <Text style={styles.buyButtonText}>
                  {item.price === 0 ? 'Claim Free' : 'Buy Now'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton} onPress={onMessageSeller}>
                <Ionicons name="chatbubble-outline" size={16} color={GREEN} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sellerRow}>
          <View style={styles.avatar}>
            {item.user?.avatar_url || item.author_image ? (
              <Image 
                source={{ uri: item.user?.avatar_url || item.author_image }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarText}>
                {getInitials(item.user?.name || item.author_name)}
              </Text>
            )}
          </View>
          <Text style={styles.sellerName} numberOfLines={1}>
            {item.user?.name || item.author_name || 'Unknown Seller'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F2F2F2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  infoContainer: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1C',
    lineHeight: 18,
    marginBottom: 4,
    height: 36, // Force two lines height
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GREEN,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: GREEN,
    marginRight: 6,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messageButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 142, 60, 0.05)',
  },
  editButton: {
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: 'transparent',
  },
  editButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 8,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  sellerName: {
    flex: 1,
    fontSize: 10,
    color: '#616161',
  },
});
