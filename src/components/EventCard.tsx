import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Calendar, MapPin } from 'lucide-react-native';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { theme } from '../theme';

interface EventCardProps {
  event: Post;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const { user } = useAuth();
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
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* Header Image */}
      {imageUrl ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {event.title || event.text || 'Untitled Event'}
        </Text>

        {/* Date & Location */}
        <View style={styles.metaContainer}>
          {!!event.event_date && (
            <View style={styles.metaRow}>
              <Calendar size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{getEventDate()}</Text>
            </View>
          )}
          {!!event.event_location && (
            <View style={styles.metaRow}>
              <MapPin size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {getLocation(event.event_location)}
              </Text>
            </View>
          )}
        </View>

        {/* Price & Action Row */}
        <View style={styles.footer}>
          <Text style={styles.price}>
            {event.price === 0 || !event.price ? 'FREE' : formatPrice(event.price)}
          </Text>
          
          <TouchableOpacity style={[styles.actionButton, isOwner && styles.editButton]}>
            <Text style={[styles.actionText, isOwner && styles.editButtonText]}>
              {isOwner ? 'Edit Event' : 'View Tickets'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    marginVertical: 8,
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
    height: 180,
    backgroundColor: theme.colors.surfaceDim,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: theme.spacing.base,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.textPrimary,
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
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.body,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  price: {
    fontSize: 20,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.primary,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  editButtonText: {
    color: theme.colors.primary,
  },
});
