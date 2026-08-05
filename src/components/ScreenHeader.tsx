import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MapIcon, NotificationsIcon } from './SvgIcons';
import { useNotificationBadge } from '../context/NotificationBadgeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DARK, GLASS_BORDER, G, TEXT_PRIMARY } from '../constants/tokens';

export function ScreenHeader({ title, hideIcons, rightContent }: { title: string; hideIcons?: boolean; rightContent?: React.ReactNode }) {
  const router = useRouter();
  const { unreadCount } = useNotificationBadge();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={{ flex: 1 }} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightContainer}>
        {!hideIcons && (
          <>
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
              <MapIcon size={24} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
              <NotificationsIcon size={24} color={TEXT_PRIMARY} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { borderColor: DARK }]}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
        {rightContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: DARK,
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Outfit',
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  rightContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: G,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: { color: '#000', fontSize: 9, fontWeight: '800', fontFamily: 'Outfit' }
});
