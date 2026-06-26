import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { StorageService } from '../lib/storage-service';

interface EventCardProps {
  event: Post;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const isOwner = user?.id === event.user_id;

  const imageUrl = event.image_urls?.[0] || event.image_url;

  const getEventDate = () => {
    if (!event.event_date) return '';
    try {
      return new Date(event.event_date).toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getLocation = (loc: any) => {
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    if (loc.address) return loc.address;
    return 'Location not specified';
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={[styles.container, { borderBottomColor: colors.borderLight }]}
    >
      {/* Header Image */}
      {imageUrl ? (
        <View style={[styles.imageContainer, { backgroundColor: colors.borderLight }]}>
          <Image source={{ uri: StorageService.getOptimizedImageUrl(imageUrl, 800) || imageUrl }} style={styles.image} contentFit="cover" />
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {event.title || event.text || 'Untitled Event'}
        </Text>

        {/* Date & Location */}
        <View style={styles.metaContainer}>
          {!!event.event_date && (
            <View style={styles.metaRow}>
              <Feather name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{getEventDate()}</Text>
            </View>
          )}
          {!!event.event_location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {getLocation(event.event_location)}
              </Text>
            </View>
          )}
        </View>

        {/* Price & Action Row */}
        <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.price, { color: colors.tint }]}>
            {event.price === 0 || !event.price ? 'FREE' : formatPrice(event.price)}
          </Text>
          
          <TouchableOpacity 
            onPress={onPress}
            style={[
              styles.actionButton, 
              isOwner ? [styles.editButton, { borderColor: colors.tint }] : { backgroundColor: colors.tint }
            ]}
          >
            <Text style={[
              styles.actionText, 
              isOwner ? { color: colors.tint } : { color: '#FFFFFF' }
            ]}>
              {isOwner ? 'Edit Event' : 'View Tickets'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    // padding removed as container handles horizontal padding, image has bottom margin
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metaContainer: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
});
