import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MapIcon, NotificationsIcon } from './SvgIcons';
import { useAppTheme } from '../context/ThemeContext';
import { useNotificationBadge } from '../context/NotificationBadgeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScreenHeader({ title, hideIcons, rightContent }: { title: string; hideIcons?: boolean; rightContent?: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { unreadCount } = useNotificationBadge();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
      <View style={{ flex: 1 }} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.rightContainer}>
        {!hideIcons && (
          <>
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
              <MapIcon size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
              <NotificationsIcon size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { borderColor: colors.background }]}>
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
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
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
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});
