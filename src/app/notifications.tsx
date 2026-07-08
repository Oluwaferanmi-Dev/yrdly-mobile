import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  from_user_id?: string;
  from_user_name?: string;
  from_user_avatar?: string;
  related_id?: string;
}

const FILTER_TABS = ['All', 'Unread', 'Messages', 'Activity'];

function timeAgo(dateString: string) {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) return;

      const senderIds = Array.from(new Set(data.map(n => n.sender_id || n.data?.from_user_id).filter(Boolean)));
      let senderMap = new Map();
      
      if (senderIds.length > 0) {
        const { data: senders } = await supabase.from('users').select('id, name, avatar_url').in('id', senderIds);
        if (senders) {
          senderMap = new Map(senders.map(s => [s.id, s]));
        }
      }

      const formatted = data.map((notif: any) => {
        const sId = notif.sender_id || notif.data?.from_user_id;
        const sender = sId ? senderMap.get(sId) : null;
        return {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          data: notif.data,
          is_read: notif.is_read,
          created_at: notif.created_at,
          from_user_id: sId,
          from_user_name: sender?.name || notif.data?.fromUserName || notif.data?.from_user_name,
          from_user_avatar: sender?.avatar_url || notif.data?.from_user_avatar,
          related_id: notif.related_id,
        };
      }) as Notification[];

      setNotifications(formatted);
    } catch (e) {
      console.error('Fetch notifications error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    const channel = supabase
      .channel('notifications_mobile')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        fetchNotifications
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id);

    switch (notification.type) {
      case 'message':
      case 'message_reaction': {
        const cid = notification.related_id || notification.data?.conversation_id;
        if (cid) router.push(`/chat/${cid}`);
        break;
      }
      case 'post_like':
      case 'post_share': {
        const pid = notification.related_id || notification.data?.post_id;
        if (pid) router.push(`/posts/${pid}`);
        break;
      }
      case 'post_comment': {
        const pid = notification.related_id || notification.data?.post_id;
        if (pid) router.push(`/posts/${pid}?focusComments=true`);
        break;
      }
      case 'event_invite': {
        const eid = notification.related_id || notification.data?.event_id;
        if (eid) router.push(`/events/${eid}`);
        break;
      }
      case 'new_follower':
      case 'friend_request': {
        const uid = notification.data?.from_user_id || notification.from_user_id;
        if (uid) router.push(`/profile/${uid}`);
        break;
      }
      default:
        break;
    }
  };

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'Unread':
        return notifications.filter((n) => !n.is_read);
      case 'Messages':
        return notifications.filter((n) => n.type === 'message' || n.type === 'message_reaction');
      case 'Activity':
        return notifications.filter((n) =>
          ['post_like', 'post_comment', 'post_share', 'event_invite', 'new_follower'].includes(n.type)
        );
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderIcon = (type: string) => {
    switch (type) {
      case 'message':
      case 'message_reaction':
        return <Ionicons name="chatbubble" size={16} color="#60A5FA" />;
      case 'post_like':
        return <Ionicons name="heart" size={16} color="#F87171" />;
      case 'post_comment':
        return <Ionicons name="chatbubble" size={16} color="#60A5FA" />;
      case 'event_invite':
        return <Ionicons name="calendar" size={16} color="#FB923C" />;
      case 'new_follower':
      case 'friend_request':
        return <Ionicons name="person-add" size={16} color="#34D399" />;
      default:
        return <Ionicons name="notifications" size={16} color={colors.textMuted} />;
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[styles.card, { borderBottomColor: colors.borderLight }, isUnread && [styles.cardUnread, { backgroundColor: colors.inputBackground }]]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          {item.from_user_avatar ? (
            <Image source={{ uri: item.from_user_avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarFallbackText}>
                {item.from_user_name ? item.from_user_name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <View style={[styles.typeIconBadge, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            {renderIcon(item.type)}
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.messageText, { color: colors.textSecondary }, isUnread && [styles.messageTextUnread, { color: colors.text }]]}>
            <Text style={[styles.boldText, { color: colors.text }]}>{item.from_user_name || item.title} </Text>
            {item.from_user_name ? item.message : ''}
          </Text>
          {!item.from_user_name && (
            <Text style={[styles.subMessageText, { color: colors.textSecondary }]}>{item.message}</Text>
          )}
          <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
        </View>

        {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.text} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          </TouchableOpacity>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Feather name="check-circle" size={16} color={colors.tint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.borderLight }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity
                style={[styles.filterTab, { backgroundColor: colors.inputBackground }, isActive && [styles.filterTabActive, { backgroundColor: colors.tint }]]}
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[styles.filterTabText, { color: colors.textSecondary }, isActive && styles.filterTabTextActive]}>
                  {item}
                </Text>
                {item === 'Unread' && unreadCount > 0 && (
                  <View style={[styles.filterBadge, { backgroundColor: colors.card }]}>
                    <Text style={[styles.filterBadgeText, { color: colors.tint }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bell-off" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No notifications yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>You're all caught up!</Text>
        </View>
      ) : (
        <FlashList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  markAllBtn: { padding: 8, backgroundColor: '#E8F5E9', borderRadius: 20 },
  filterContainer: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginRight: 8,
  },
  filterTabActive: { },
  filterTabText: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  filterTabTextActive: { color: '#FFFFFF' },
  filterBadge: {
    borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', marginLeft: 6, paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardUnread: { },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  typeIconBadge: {
    position: 'absolute', bottom: -4, right: -4,
    borderRadius: 12, padding: 2,
    borderWidth: 1,
  },
  contentContainer: { flex: 1 },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTextUnread: { fontWeight: '500' },
  boldText: { fontWeight: 'bold' },
  subMessageText: { fontSize: 13, marginTop: 2 },
  timeText: { fontSize: 12, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8 },
});
