import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
// Calculate card width for 2 columns with padding
const cardWidth = (width - 48) / 2;

interface MarketplaceItemCardProps {
  item: Post;
  onPress?: () => void;
  onMessageSeller?: (item: Post) => void;
}

export function MarketplaceItemCard({ item, onPress, onMessageSeller }: MarketplaceItemCardProps) {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const isOwner = user?.id === item.user_id;

  const getInitials = (name?: string) => name ? name.charAt(0).toUpperCase() : 'U';
  const imageUrl = item.image_urls?.[0] || item.image_url;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={[
        styles.card, 
        { backgroundColor: colors.card, borderColor: colors.borderLight }
      ]}
    >
      {/* Image Container */}
      <View style={[styles.imageContainer, { backgroundColor: colors.borderLight }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="cart-outline" size={32} color={colors.tint} style={{ opacity: 0.5 }} />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title || item.text || 'Untitled'}
        </Text>
        
        <Text style={[styles.price, { color: colors.tint }]}>
          {item.price === 0 ? 'FREE' : formatPrice(item.price || 0)}
        </Text>

        <View style={styles.actionsRow}>
          {isOwner ? (
            <TouchableOpacity style={[styles.actionButton, styles.editButton, { borderColor: colors.tint }]}>
              <Ionicons name="pencil" size={14} color={colors.tint} />
              <Text style={[styles.editButtonText, { color: colors.tint }]}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.actionButton, styles.buyButton, { backgroundColor: colors.tint }]}>
                <Text style={styles.buyButtonText}>
                  {item.price === 0 ? 'Claim Free' : 'Buy Now'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.messageButton, { borderColor: colors.tint }]} 
                onPress={() => onMessageSeller?.(item)}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.tint} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[styles.sellerRow, { borderTopColor: colors.borderLight }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
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
          <Text style={[styles.sellerName, { color: colors.textSecondary }]} numberOfLines={1}>
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
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  imageContainer: {
    width: '100%',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 4,
    height: 36, // Force two lines height
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  editButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
  },
});
