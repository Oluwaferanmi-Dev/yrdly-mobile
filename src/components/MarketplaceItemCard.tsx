import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingCart, Pencil, MessageCircle } from 'lucide-react-native';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
// Calculate card width for 2 columns with padding
const cardWidth = (width - 48) / 2;

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
            <ShoppingCart size={32} color="rgba(56, 142, 60, 0.5)" />
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
              <Pencil size={14} color={theme.colors.primary} />
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
                <MessageCircle size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sellerRow}>
          <View style={styles.avatar}>
            {item.user?.avatar_url || item.author_image ? (
              <Image 
                source={{ uri: item.user?.avatar_url || item.author_image }} 
                style={styles.avatarImage} />
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
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.surfaceDim,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceDim,
  },
  infoContainer: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
    height: 36, // Force two lines height
  },
  price: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
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
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 142, 60, 0.05)',
  },
  editButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  editButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
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
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
  },
});
