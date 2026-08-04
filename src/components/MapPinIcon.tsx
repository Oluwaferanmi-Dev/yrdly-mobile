import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { G, GOLD, BLUE, SURFACE, TEXT_PRIMARY } from '@/constants/tokens';

export type PinType = 'post' | 'marketplace' | 'event' | 'business';

interface Props {
  type: PinType;
  /** Price label, e.g. "₦25,000" — shown on marketplace pins */
  price?: string;
  /** Short badge text, e.g. "NEW" or "FREE" */
  badge?: string;
}

const PIN_COLORS: Record<PinType, string> = {
  marketplace: GOLD,
  event:       BLUE,
  business:    G,
  post:        SURFACE,
};

const PIN_SIZE = 36;

/**
 * Typed map pin icon for YRDLY dark map.
 * Renders a coloured teardrop pin with an inner icon or price label.
 * Matches Figma Make's MapPinIcon({ type, price?, badge? }) component.
 */
export function MapPinIcon({ type, price, badge }: Props) {
  const color = PIN_COLORS[type];

  return (
    <View style={styles.wrapper}>
      {/* Pin body */}
      <View style={[styles.pin, { backgroundColor: color }]}>
        {type === 'marketplace' && price ? (
          <Text style={styles.priceLabel} numberOfLines={1}>
            ₦{price}
          </Text>
        ) : type === 'event' ? (
          <CalendarMini color={TEXT_PRIMARY} />
        ) : type === 'business' ? (
          <StorefrontMini color="#050505" />
        ) : (
          <CommunityMini color={TEXT_PRIMARY} />
        )}
        {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
      </View>
      {/* Tail */}
      <View style={[styles.tail, { borderTopColor: color }]} />
    </View>
  );
}

// ─── Micro icons ──────────────────────────────────────────────────────────────

function CalendarMini({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function StorefrontMini({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l1-5h16l1 5M3 9h18M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CommunityMini({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      <Path
        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  pin: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  priceLabel: {
    color: '#050505',
    fontFamily: 'Outfit',
    fontSize: 8,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '700',
  },
});
