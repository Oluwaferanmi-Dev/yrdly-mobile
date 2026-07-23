import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing
} from 'react-native-reanimated';

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

// Custom Skeleton Component
const SkeletonCard = () => {
  const { colors } = useAppTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }, animStyle]}>
      <View style={[styles.avatar, { backgroundColor: colors.border }]} />
      <View style={styles.contentContainer}>
        <View style={{ height: 16, width: '60%', backgroundColor: colors.border, borderRadius: 4, marginBottom: 8 }} />
        <View style={{ height: 12, width: '80%', backgroundColor: colors.border, borderRadius: 4, marginBottom: 8 }} />
        <View style={{ height: 10, width: '30%', backgroundColor: colors.border, borderRadius: 4 }} />
      </View>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchNotifications = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Keep reasonable limit for performance

      if (error || !data) return;

      const senderIds = Array.from(new Set(data.map(n => n.sender_id || n.data?.from_user_id).filter(Boolean)));
      let senderMap = new Map();
      if (senderIds.length > 0) {
        const { data: senders } = await supabase.from('users').select('id, name, avatar_url').in('id', senderIds);
        if (senders) {
          senderMap = new Map(senders.map(s => [s.id, s]));
        }
      }

      // Collect transaction IDs to fetch item images
      const txIds = Array.from(new Set(data.map(n => n.related_id || n.data?.transactionId).filter(Boolean)));
      let txImageMap = new Map();
      if (txIds.length > 0) {
        const { data: txs } = await supabase
          .from('escrow_transactions')
          .select('id, item:posts(image_urls)')
          .in('id', txIds);
        if (txs) {
          txs.forEach((tx: any) => {
            const itemObj = Array.isArray(tx.item) ? tx.item[0] : tx.item;
            const imgUrls = itemObj?.image_urls;
            const img = Array.isArray(imgUrls) ? imgUrls[0] : null;
            if (img) txImageMap.set(tx.id, img);
          });
        }
      }

      // Collect item IDs (for marketplace notifications)
      const postIds = Array.from(new Set(data.map(n => n.data?.itemId || n.data?.post_id).filter(Boolean)));
      let postImageMap = new Map();
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, image_urls')
          .in('id', postIds);
        if (posts) {
          posts.forEach((p: any) => {
            const img = Array.isArray(p.image_urls) ? p.image_urls[0] : null;
            if (img) postImageMap.set(p.id, img);
          });
        }
      }

      const formatted = data.map((notif: any) => {
        const sId = notif.sender_id || notif.data?.from_user_id;
        const sender = sId ? senderMap.get(sId) : null;
        
        // Resolve item image
        const txId = notif.related_id || notif.data?.transactionId;
        const pId = notif.data?.itemId || notif.data?.post_id;
        const itemImage = (txId && txImageMap.get(txId)) || (pId && postImageMap.get(pId)) || notif.data?.item_image;

        return {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          data: { ...notif.data, item_image: itemImage },
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
      setRefreshing(false);
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
        () => fetchNotifications() // re-fetch to get enriched data
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleToggleReadStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('notifications').update({ is_read: !currentStatus }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: !currentStatus } : n)));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) handleToggleReadStatus(notification.id, false);

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
      case 'payment_successful':
      case 'item_shipped':
      case 'delivery_confirmed':
      case 'funds_released':
      case 'dispute_opened':
      case 'dispute_resolved': {
        const txId = notification.related_id || notification.data?.transactionId;
        if (txId) router.push(`/transactions/${txId}`);
        break;
      }
      case 'marketplace_item_sold':
      case 'marketplace_item_interest': {
        const pid = notification.related_id || notification.data?.itemId;
        if (pid) router.push(`/posts/${pid}`);
        break;
      }
      default:
        break;
    }
  };

  const handleLongPress = (notification: Notification) => {
    Alert.alert(
      'Options',
      'Choose an action',
      [
        { text: 'View Sender Profile', onPress: () => {
          const uid = notification.from_user_id || notification.data?.from_user_id;
          if (uid) router.push(`/profile/${uid}`);
        }},
        { text: notification.is_read ? 'Mark as Unread' : 'Mark as Read', onPress: () => handleToggleReadStatus(notification.id, notification.is_read) },
        { text: 'Delete Notification', onPress: () => handleDelete(notification.id), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
        return <Ionicons name="chatbubble" size={14} color="#60A5FA" />;
      case 'post_like':
        return <Ionicons name="heart" size={14} color="#F87171" />;
      case 'post_comment':
        return <Ionicons name="chatbubble" size={14} color="#60A5FA" />;
      case 'event_invite':
        return <Ionicons name="calendar" size={14} color="#FB923C" />;
      case 'new_follower':
      case 'friend_request':
        return <Ionicons name="person-add" size={14} color="#34D399" />;
      case 'payment_successful':
      case 'funds_released':
        return <Ionicons name="cash" size={14} color="#34D399" />;
      case 'item_shipped':
        return <Ionicons name="cube" size={14} color="#60A5FA" />;
      case 'delivery_confirmed':
        return <Ionicons name="checkmark-done" size={14} color="#34D399" />;
      case 'marketplace_item_sold':
      case 'marketplace_item_interest':
        return <Ionicons name="cart" size={14} color="#FBBF24" />;
      default:
        return <Ionicons name="notifications" size={14} color={colors.textMuted} />;
    }
  };

  const renderRightActions = (item: Notification) => (
    <View style={styles.swipeRightActionContainer}>
      <TouchableOpacity 
        style={[styles.swipeAction, { backgroundColor: '#60A5FA' }]} 
        onPress={() => handleToggleReadStatus(item.id, item.is_read)}
      >
        <Feather name={item.is_read ? "eye-off" : "eye"} size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderLeftActions = (item: Notification) => (
    <View style={styles.swipeLeftActionContainer}>
      <TouchableOpacity 
        style={[styles.swipeAction, { backgroundColor: '#EF4444' }]} 
        onPress={() => handleDelete(item.id)}
      >
        <Feather name="trash-2" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.is_read;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        renderLeftActions={() => renderLeftActions(item)}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
      >
        <TouchableOpacity
          style={[
            styles.card, 
            { backgroundColor: isUnread ? colors.card + '90' : colors.card, borderColor: colors.borderLight }
          ]}
          onPress={() => handleNotificationPress(item)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarContainer}>
            {item.from_user_avatar ? (
              <Image source={{ uri: item.from_user_avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.tint + '40' }]}>
                <Text style={[styles.avatarFallbackText, { color: colors.tint }]}>
                  {item.from_user_name ? item.from_user_name.charAt(0).toUpperCase() : 
                    (item.type === 'payment_successful' ? '💰' : 
                     item.type === 'item_shipped' ? '📦' : 
                     item.type === 'delivery_confirmed' ? '✅' : 
                     item.type === 'funds_released' ? '💸' : 
                     item.type.includes('marketplace') ? '🛒' : '?')}
                </Text>
              </View>
            )}
            <View style={[styles.typeIconBadge, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              {renderIcon(item.type)}
            </View>
          </View>

          <View style={styles.contentContainer}>
            <Text style={[styles.messageText, { color: isUnread ? colors.text : colors.textSecondary }]}>
              <Text style={[styles.boldText, { color: colors.text }]}>{item.from_user_name || item.title} </Text>
              {item.from_user_name ? item.message : ''}
            </Text>
            {!item.from_user_name && (
              <Text style={[styles.subMessageText, { color: colors.textSecondary }]}>{item.message}</Text>
            )}
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
          </View>

          <View style={styles.rightContent}>
            {item.data?.item_image ? (
              <Image source={{ uri: item.data.item_image }} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            )}
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity style={[styles.markAllBtn, { backgroundColor: colors.tint + '20' }]} onPress={handleMarkAllRead}>
              <Feather name="check-circle" size={20} color={colors.tint} />
            </TouchableOpacity>
          ) : (
            <View style={styles.markAllPlaceholder} />
          )}
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Everything happening around your account</Text>
      </View>

      {/* Pill Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity
                style={[
                  styles.filterPill, 
                  { backgroundColor: isActive ? colors.tint : colors.card }
                ]}
                onPress={() => setActiveFilter(item)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.filterPillText, 
                  { color: isActive ? '#000000' : colors.text }
                ]}>
                  {item}
                </Text>
                {item === 'Unread' && unreadCount > 0 && (
                  <View style={[styles.filterBadge, { backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : colors.tint }]}>
                    <Text style={[styles.filterBadgeText, { color: isActive ? '#000' : '#FFF' }]}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
            <Feather name="bell" size={48} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            When people interact with you, you'll see everything here.
          </Text>
          <TouchableOpacity 
            style={[styles.exploreBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/' as any)}
          >
            <Text style={styles.exploreBtnText}>Explore YRDLY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={filteredNotifications}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          {...({ estimatedItemSize: 90 } as any)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={colors.tint}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 24, fontWeight: '800', flex: 1, textAlign: 'center' },
  headerSubtitle: { fontSize: 14, textAlign: 'center', marginTop: 4 },
  markAllBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center' 
  },
  markAllPlaceholder: { width: 40 },
  filterContainer: { paddingBottom: 16 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24, marginRight: 10,
  },
  filterPillText: { fontSize: 14, fontWeight: 'bold' },
  filterBadge: {
    borderRadius: 12, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', 
    marginLeft: 6, paddingHorizontal: 6,
  },
  filterBadgeText: { fontSize: 11, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', 
    padding: 16, marginBottom: 12,
    borderRadius: 16, borderWidth: 1,
  },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 20, fontWeight: 'bold' },
  typeIconBadge: {
    position: 'absolute', bottom: -2, right: -2,
    borderRadius: 12, padding: 3, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  contentContainer: { flex: 1, marginRight: 8 },
  messageText: { fontSize: 15, lineHeight: 21 },
  boldText: { fontWeight: 'bold' },
  subMessageText: { fontSize: 14, marginTop: 2 },
  timeText: { fontSize: 13, marginTop: 6 },
  rightContent: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  unreadDot: { 
    width: 10, height: 10, borderRadius: 5, 
    marginLeft: 12, marginTop: -20 // Offset slightly
  },
  emptyContainer: { 
    flex: 1, justifyContent: 'center', alignItems: 'center', 
    padding: 32, marginTop: -60 
  },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  exploreBtn: { 
    paddingHorizontal: 24, paddingVertical: 14, 
    borderRadius: 24 
  },
  exploreBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  swipeRightActionContainer: {
    width: 70, height: '100%', marginBottom: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  swipeLeftActionContainer: {
    width: 70, height: '100%', marginBottom: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  swipeAction: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  }
});
