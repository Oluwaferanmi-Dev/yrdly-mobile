import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Share, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { StorageService } from '../lib/storage-service';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface EventCardProps {
  event: Post;
  onPress?: () => void;
  compact?: boolean; // for horizontal scroll cards
}

type BadgeType = 'Today' | 'Tomorrow' | 'This Weekend' | 'Free' | 'Trending' | 'New';

function getEventBadge(event: Post): BadgeType | null {
  if (!event.event_date) return null;
  const d = new Date(event.event_date);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (event.price === 0 || !event.price) return 'Free';
  const ageHours = (now.getTime() - new Date(event.timestamp || event.created_at || '').getTime()) / 3600000;
  if (ageHours < 12) return 'New';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays >= 2 && diffDays <= 5) return 'This Weekend';
  if ((event as any).view_count > 80) return 'Trending';
  return null;
}

const BADGE_STYLE: Record<BadgeType, { bg: string; color: string; icon: string }> = {
  'Today':        { bg: 'rgba(239,68,68,0.2)',   color: '#ef4444', icon: 'flash-outline' },
  'Tomorrow':     { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B', icon: 'time-outline' },
  'This Weekend': { bg: 'rgba(139,92,246,0.2)',  color: '#8B5CF6', icon: 'calendar-outline' },
  'Free':         { bg: 'rgba(34,197,94,0.2)',   color: '#22c55e', icon: 'gift-outline' },
  'Trending':     { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B', icon: 'trending-up-outline' },
  'New':          { bg: 'rgba(130,219,126,0.2)', color: '#82DB7E', icon: 'sparkles-outline' },
};

function getLocation(loc: any): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  if (loc.address) return loc.address;
  return '';
}

function fmtDate(dateStr: string): { day: string; month: string; full: string; time: string } {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    full: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ── Compact card (horizontal scroll "More Events") ───────────────────────────
export function EventCardCompact({ event, onPress }: EventCardProps) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const isOwner = user?.id === event.user_id;
  const pressScale = useRef(new Animated.Value(1)).current;
  const [saved, setSaved] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const imageUrl = event.image_urls?.[0] || event.image_url;
  const badge = getEventBadge(event);
  const dateInfo = event.event_date ? fmtDate(event.event_date) : null;
  const location = getLocation(event.event_location);
  const router = useRouter();

  const onPressIn = () => Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  const toggleSave = () => {
    setSaved(s => !s);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1.0, useNativeDriver: true, speed: 40 }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity
        activeOpacity={1} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        style={[c.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      >
        {/* Image */}
        <View style={c.imgWrap}>
          {imageUrl
            ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
            : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a2210' }]} />}
          {/* Date badge overlay */}
          {dateInfo && (
            <View style={c.dateBubble}>
              <Text style={c.dateDay}>{dateInfo.month}</Text>
              <Text style={c.dateNum}>{dateInfo.day}</Text>
            </View>
          )}
          {/* Heart */}
          <TouchableOpacity style={c.heart} onPress={toggleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#ff4d6d' : '#fff'} />
            </Animated.View>
          </TouchableOpacity>
          {badge && (
            <View style={[c.badge, { backgroundColor: BADGE_STYLE[badge].bg }]}>
              <Text style={[c.badgeTxt, { color: BADGE_STYLE[badge].color }]}>{badge}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={c.info}>
          <Text style={[c.title, { color: colors.text }]} numberOfLines={1}>{event.title || event.text || 'Event'}</Text>
          {event.text && event.title && (
            <Text style={[c.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{event.text}</Text>
          )}
          {dateInfo && (
            <View style={c.row}>
              <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
              <Text style={[c.meta, { color: colors.textMuted }]}>{dateInfo.full} at {dateInfo.time}</Text>
            </View>
          )}
          {!!location && (
            <View style={c.row}>
              <Ionicons name="location-outline" size={11} color={colors.textMuted} />
              <Text style={[c.meta, { color: colors.textMuted }]} numberOfLines={1}>{location}</Text>
            </View>
          )}
          <View style={c.footer}>
            <Text style={[c.price, { color: event.price ? colors.tint : '#22c55e' }]}>
              {event.price === 0 || !event.price ? 'Free Entry' : formatPrice(event.price)}
            </Text>
            <View style={c.avatarRow}>
              <View style={[c.avatar, { backgroundColor: colors.tint }]}>
                {event.author_image
                  ? <Image source={{ uri: event.author_image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  : <Text style={c.avatarTxt}>{(event.author_name || 'E').charAt(0)}</Text>}
              </View>
              <Text style={[c.attendees, { color: colors.textMuted }]}>+{Math.floor(Math.random() * 30) + 5}</Text>
            </View>
            <TouchableOpacity
              style={[c.ctaBtn, { backgroundColor: isOwner ? 'transparent' : colors.tint, borderWidth: isOwner ? 1 : 0, borderColor: colors.tint }]}
              onPress={onPress}>
              <Ionicons name={isOwner ? 'create-outline' : 'arrow-forward'} size={14} color={isOwner ? colors.tint : '#0B0D0B'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Full featured hero card ──────────────────────────────────────────────────
export function EventCard({ event, onPress }: EventCardProps) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isOwner = user?.id === event.user_id;
  const [saved, setSaved] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const imageUrl = event.image_urls?.[0] || event.image_url;
  const badge = getEventBadge(event);
  const dateInfo = event.event_date ? fmtDate(event.event_date) : null;
  const location = getLocation(event.event_location);

  const toggleSave = () => {
    setSaved(s => !s);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1.0, useNativeDriver: true, speed: 40 }),
    ]).start();
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out "${event.title || 'this event'}" on Yrdly!`, url: `https://app.yrdly.ng/events/${event.id}` });
    } catch {}
  };

  const onPressIn = () => Animated.spring(pressScale, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={[f.wrap, { transform: [{ scale: pressScale }] }]}>
      <TouchableOpacity
        activeOpacity={1} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        style={[f.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      >
        {/* Cover */}
        <View style={f.imgWrap}>
          {imageUrl
            ? <Image source={{ uri: StorageService.getOptimizedImageUrl(imageUrl, 800) || imageUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
            : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a2210' }]}><Ionicons name="calendar" size={40} color="rgba(130,219,126,0.3)" style={{ margin: 'auto' }} /></View>}
          <View style={f.overlay} />

          {/* Date chip */}
          {dateInfo && (
            <View style={f.dateBubble}>
              <Text style={f.dateMonth}>{dateInfo.month}</Text>
              <Text style={f.dateDay}>{dateInfo.day}</Text>
            </View>
          )}

          {/* Badge */}
          {badge && (
            <View style={[f.badge, { backgroundColor: BADGE_STYLE[badge].bg }]}>
              <Ionicons name={BADGE_STYLE[badge].icon as any} size={10} color={BADGE_STYLE[badge].color} style={{ marginRight: 3 }} />
              <Text style={[f.badgeTxt, { color: BADGE_STYLE[badge].color }]}>{badge}</Text>
            </View>
          )}

          {/* Top-right actions */}
          <View style={f.topActions}>
            <TouchableOpacity style={f.actionBtn} onPress={toggleSave}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#ff4d6d' : '#fff'} />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={f.actionBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Body */}
        <View style={f.body}>
          <Text style={[f.title, { color: colors.text }]} numberOfLines={2}>
            {event.title || event.text || 'Untitled Event'}
          </Text>
          {event.text && event.title && (
            <Text style={[f.tagline, { color: colors.textMuted }]} numberOfLines={1}>{event.text}</Text>
          )}

          {/* Meta rows */}
          {dateInfo && (
            <View style={f.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={[f.metaTxt, { color: colors.textSecondary }]}>{dateInfo.full} at {dateInfo.time}</Text>
            </View>
          )}
          {!!location && (
            <View style={f.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={[f.metaTxt, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
            </View>
          )}

          {/* Attendee avatars + price + CTA */}
          <View style={f.footer}>
            <View style={f.attendees}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[f.aAvatar, { backgroundColor: colors.tint, marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
                  <Ionicons name="person" size={10} color="#0B0D0B" />
                </View>
              ))}
              <Text style={[f.attendeesTxt, { color: colors.textMuted }]}>+{Math.floor(Math.random() * 40) + 5}</Text>
            </View>

            <View style={f.priceWrap}>
              <Text style={[f.price, { color: event.price ? colors.tint : '#22c55e' }]}>
                {event.price === 0 || !event.price ? 'Free Entry' : formatPrice(event.price)}
              </Text>
            </View>

            <TouchableOpacity
              style={[f.cta, { backgroundColor: isOwner ? 'transparent' : colors.tint, borderWidth: isOwner ? 1 : 0, borderColor: colors.tint }]}
              onPress={onPress}>
              <Text style={[f.ctaTxt, { color: isOwner ? colors.tint : '#0B0D0B' }]}>
                {isOwner ? 'Edit' : 'View Tickets'}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={isOwner ? colors.tint : '#0B0D0B'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Compact card styles ───────────────────────────────────────────────────────
const COMPACT_W = width * 0.56;
const c = StyleSheet.create({
  card: { width: COMPACT_W, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  imgWrap: { width: '100%', height: 140, position: 'relative' },
  dateBubble: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  dateDay: { color: '#82DB7E', fontSize: 9, fontWeight: '800' },
  dateNum: { color: '#fff', fontSize: 15, fontWeight: '900', lineHeight: 17 },
  heart: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12 },
  badgeTxt: { fontSize: 9, fontWeight: '800' },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '800', marginBottom: 1 },
  subtitle: { fontSize: 11, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  meta: { fontSize: 10, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { fontSize: 13, fontWeight: '900', flex: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  avatar: { width: 18, height: 18, borderRadius: 9, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: '#fff', fontSize: 8, fontWeight: '800' },
  attendees: { fontSize: 10, color: '#aaa' },
  ctaBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});

// ── Full card styles ──────────────────────────────────────────────────────────
const f = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 16 },
  card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  imgWrap: { width: '100%', height: 200, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  dateBubble: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 44 },
  dateMonth: { color: '#82DB7E', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  dateDay: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  badge: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  topActions: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  body: { padding: 14 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 3 },
  tagline: { fontSize: 12, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  metaTxt: { fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  attendees: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  aAvatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0B0D0B' },
  attendeesTxt: { fontSize: 11, marginLeft: 4 },
  priceWrap: { flex: 1 },
  price: { fontSize: 15, fontWeight: '900' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  ctaTxt: { fontSize: 13, fontWeight: '800' },
});
