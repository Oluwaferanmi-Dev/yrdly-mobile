import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { GlassCard } from './GlassCard';

const GREEN = '#388E3C';

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
    <GlassCard style={styles.card} borderRadius={16} intensity={Platform.OS === 'ios' ? 50 : undefined} tint="systemChromeMaterial">
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
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
              <Ionicons name="calendar-outline" size={16} color="#616161" />
              <Text style={styles.metaText}>{getEventDate()}</Text>
            </View>
          )}
          {!!event.event_location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color="#616161" />
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
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#F2F2F2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
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
    color: '#616161',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: GREEN,
  },
  actionButton: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: GREEN,
  },
  editButtonText: {
    color: GREEN,
  },
});
