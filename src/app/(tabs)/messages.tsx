import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, BLUE, AMBER } from '../../constants/tokens';

// ── Types ─────────────────────────────────────────────────────────
type ConvType = 'friend' | 'marketplace' | 'briefcase';
type FilterTab = 'all' | 'friends' | 'marketplace' | 'business';

interface Conversation {
  id: string;
  type: ConvType;
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  context?: {
    itemTitle?: string;
    itemImage?: string;
    itemPrice?: number;
  };
  deleted_by?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────
function timeLabel(ts: string) {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

// ── Main Component ────────────────────────────────────────────────
export default function MessagesTab() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useAppTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchConversations = async (isRefresh = false) => {
    if (!user) return;
    
    const cacheFile = FileSystem.documentDirectory + `yrdly_messages_cache_${user.id}.json`;
    
    try {
      if (!isRefresh) {
        const fileInfo = await FileSystem.getInfoAsync(cacheFile);
        if (fileInfo.exists) {
          const cachedData = await FileSystem.readAsStringAsync(cacheFile);
          if (cachedData) setConversations(JSON.parse(cachedData) as Conversation[]);
        }
      }
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id])
        .order('updated_at', { ascending: false });

      if (error || !data) return;

      // Fetch unread counts for all messages
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .in('conversation_id', data.map((c: any) => c.id));

      const unreadCounts = (unreadData || []).reduce((acc: Record<string, number>, curr: any) => {
        acc[curr.conversation_id] = (acc[curr.conversation_id] || 0) + 1;
        return acc;
      }, {});

      // Transform raw DB rows into Conversation objects
      const transformed: Conversation[] = data.map((conv: any) => {
        const otherId = conv.participant_ids?.find((id: string) => id !== user.id);
        const unreadCount = unreadCounts[conv.id] || 0;

        if (conv.type === 'briefcase') {
          return {
            id: conv.id,
            type: 'briefcase',
            participantId: conv.business_id || conv.id,
            participantName: conv.business_name || 'Business',
            participantAvatar: conv.business_logo || null,
            lastMessage: conv.last_message_text || conv.last_message || 'No messages yet',
            timestamp: conv.updated_at,
            unreadCount,
            context: { itemTitle: conv.item_title, itemImage: conv.item_image, itemPrice: conv.item_price },
            deleted_by: conv.deleted_by || [],
          };
        }

        if (conv.type === 'marketplace') {
          return {
            id: conv.id,
            type: 'marketplace',
            participantId: otherId || conv.id,
            participantName: '',
            participantAvatar: conv.item_image || null,
            lastMessage: conv.last_message_text || conv.last_message || 'No messages yet',
            timestamp: conv.updated_at,
            unreadCount,
            context: { itemTitle: conv.item_title, itemImage: conv.item_image, itemPrice: conv.item_price },
            deleted_by: conv.deleted_by || [],
          };
        }

        return {
          id: conv.id,
          type: 'friend',
          participantId: otherId || conv.id,
          participantName: '',
          participantAvatar: null,
          lastMessage: conv.last_message_text || conv.last_message || 'No messages yet',
          timestamp: conv.updated_at,
          unreadCount,
          deleted_by: conv.deleted_by || [],
        };
      });

      setConversations(transformed);

      // Save to cache before resolving users (basic data available immediately)
      FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(transformed)).catch(() => {});

      // Resolve participant names/avatars for friend & marketplace convos
      const otherIds = transformed
        .filter((c) => c.type !== 'briefcase')
        .map((c) => c.participantId)
        .filter((id) => id && id !== user.id);

      if (otherIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', otherIds);

        if (usersData) {
          setConversations((prev) => {
            const resolved = prev.map((c) => {
              if (c.type === 'briefcase') return c;
              const u = usersData.find((u: any) => u.id === c.participantId);
              return u ? { ...c, participantName: u.name || 'Unknown', participantAvatar: u.avatar_url } : c;
            });
            // Update cache with resolved names
            FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(resolved)).catch(() => {});
            return resolved;
          });
        }
      }
    } catch (e) {
      console.error('Fetch conversations error:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchConversations(true);
    setRefreshing(false);
  }, [user]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (c.deleted_by && user && c.deleted_by.includes(user.id)) return false;
      if (profile?.blocked_users && profile.blocked_users.includes(c.participantId)) return false;

      const tabOk =
        activeFilter === 'all' ||
        (activeFilter === 'friends' && c.type === 'friend') ||
        (activeFilter === 'marketplace' && c.type === 'marketplace') ||
        (activeFilter === 'business' && c.type === 'briefcase');
      const q = searchQuery.toLowerCase();
      const searchOk = !q || 
        (c.participantName || '').toLowerCase().includes(q) || 
        (c.lastMessage || '').toLowerCase().includes(q);
      return tabOk && searchOk;
    });
  }, [conversations, activeFilter, searchQuery, profile?.blocked_users, user]);

  useEffect(() => {
    fetchConversations();

    // Realtime subscription
    if (!user) return;
    let chConv: any = null;
    let chMsg: any = null;
    try {
      const suffix = Math.random().toString(36).substring(7);
      chConv = supabase
        .channel(`conversations-mobile-${user.id}-${suffix}`)
        // @ts-ignore
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
        .subscribe();
        
      chMsg = supabase
        .channel(`messages-mobile-${user.id}-${suffix}`)
        // @ts-ignore
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchConversations)
        .subscribe();
    } catch (e) {
      console.error('Error subscribing to realtime:', e);
    }

    return () => {
      if (chConv) supabase.removeChannel(chConv);
      if (chMsg) supabase.removeChannel(chMsg);
    };
  }, [user]);

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'friends', label: 'Friends' },
    { key: 'marketplace', label: 'Market' },
    { key: 'business', label: 'Business' },
  ];

  const renderItem = ({ item }: { item: Conversation }) => {
    const unread = item.unreadCount > 0;
    const showItemImage = (item.type === 'marketplace' || item.type === 'briefcase') && item.context?.itemImage;

    const handleDelete = async () => {
      if (!user) return;
      try {
        const newDeletedBy = [...(item.deleted_by || []), user.id];
        await supabase.from('conversations').update({ deleted_by: newDeletedBy }).eq('id', item.id);
        setConversations(prev => prev.filter(c => c.id !== item.id));
      } catch (e) {
        console.error('Failed to delete conversation:', e);
      }
    };

    const handleLongPress = () => {
      if (!user) return;
      Alert.alert(
        'Delete Conversation',
        'Are you sure you want to delete this conversation for yourself?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: handleDelete }
        ]
      );
    };

    const renderRightActions = () => (
      <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
        <Feather name="trash-2" size={20} color="#FFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );

    return (
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER, backgroundColor: 'transparent' }}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
          onLongPress={handleLongPress}
          activeOpacity={0.8}
        >
        {/* Avatar / Item thumbnail */}
        <View style={{ position: 'relative', marginRight: 14 }}>
          {showItemImage ? (
            <Image source={{ uri: item.context!.itemImage }} style={{ width: 48, height: 48, borderRadius: 16 }} contentFit="cover" />
          ) : item.participantAvatar ? (
            <Image source={{ uri: item.participantAvatar }} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
          ) : (
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: G + '20', borderWidth: 1, borderColor: G + '30', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: G, fontFamily: 'Outfit-ExtraBold', fontSize: 18 }}>
                {(item.participantName || 'Unknown').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Type badge */}
          {item.type === 'marketplace' && (
            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: G, borderWidth: 1.5, borderColor: DARK, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="shopping-cart" size={9} color="#000" />
            </View>
          )}
          {item.type === 'briefcase' && (
            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#3B82F6', borderWidth: 1.5, borderColor: DARK, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="briefcase" size={9} color="#FFF" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={[{ fontFamily: 'Outfit-SemiBold', fontSize: 15, color: TEXT_PRIMARY }, unread && { fontFamily: 'Outfit-ExtraBold' }]} numberOfLines={1}>
              {item.participantName}
            </Text>

            <Text style={{ fontFamily: unread ? 'Inter-Bold' : 'Inter-Regular', fontSize: 11, color: unread ? G : MUTED }}>
              {timeLabel(item.timestamp)}
            </Text>
          </View>
          {item.context?.itemTitle && (
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, color: G, marginBottom: 2 }} numberOfLines={1}>
              Re: {item.context.itemTitle}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[{ flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED, marginRight: 8 }, unread && { color: TEXT_PRIMARY, fontFamily: 'Inter-SemiBold' }]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {unread && (
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: G, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#000', fontSize: 10, fontFamily: 'Outfit-ExtraBold' }}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        </TouchableOpacity>
      </Swipeable>
    );
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  const openNewChatModal = async () => {
    setIsModalOpen(true);
    if (!user) return;
    setFriendsLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('friends').eq('id', user.id).single();
      const arrayFriends: string[] = userData?.friends || [];

      const { data: acceptedReqs } = await supabase
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .eq('status', 'accepted')
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      const reqFriends = (acceptedReqs || []).map(r => r.from_user_id === user.id ? r.to_user_id : r.from_user_id);
      const allFriendIds = Array.from(new Set([...arrayFriends, ...reqFriends])).filter(id => id && id !== user.id);

      if (allFriendIds.length > 0) {
        const { data: friendUsers } = await supabase.from('users').select('id, name, avatar_url').in('id', allFriendIds);
        setFriendsList(friendUsers || []);
      } else {
        setFriendsList([]);
      }
    } catch (e) {
      console.error('Fetch friends for chat error:', e);
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleStartChatWithFriend = async (friend: { id: string; name: string; avatar_url: string | null }) => {
    setIsModalOpen(false);
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id])
        .contains('participant_ids', [friend.id])
        .eq('type', 'friend')
        .limit(1);

      if (existing && existing.length > 0) {
        router.push({ pathname: '/chat/[id]', params: { id: existing[0].id } });
      } else {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: 'new',
            type: 'friend',
            participant_id: friend.id,
            participantName: friend.name,
            participantAvatar: friend.avatar_url || '',
          }
        });
      }
    } catch (e) {
      console.error('Start chat error:', e);
    }
  };

  const filteredModalFriends = useMemo(() => {
    if (!modalSearch) return friendsList;
    return friendsList.filter(f => (f.name || '').toLowerCase().includes(modalSearch.toLowerCase()));
  }, [friendsList, modalSearch]);

  return (
    <View style={[styles.container, { backgroundColor: DARK, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 24, color: '#FFFFFF' }}>Messages</Text>
        <TouchableOpacity
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center' }}
          onPress={openNewChatModal}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, marginVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 20, paddingHorizontal: 14, height: 44 }}>
          <Feather name="search" size={18} color={LABEL} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: TEXT_PRIMARY }}
            placeholder="Search messages..."
            placeholderTextColor={LABEL}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: GLASS_BORDER }]}>
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, activeFilter === key && [styles.filterTabActive, { backgroundColor: G + '15' }]]}
            onPress={() => setActiveFilter(key)}
          >
            <Text style={[styles.filterTabText, { color: LABEL }, activeFilter === key && [styles.filterTabTextActive, { color: G }]]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={G} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="message-square" size={48} color={LABEL} />
          <Text style={[styles.emptyText, { color: LABEL }]}>
            {searchQuery ? 'No results found' : 'No conversations yet'}
          </Text>
        </View>
      ) : (
        <FlashList
          {...({ estimatedItemSize: 70 } as any)}
          data={filtered}
          keyExtractor={(item: any) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={G} />}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Message Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20, paddingBottom: insets.bottom + 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, color: TEXT_PRIMARY, fontFamily: 'Outfit-Bold' }}>New Message</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={{ padding: 4 }}>
                <Feather name="x" size={24} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {/* Friend Search */}
            <View style={[styles.searchContainer, { backgroundColor: SURFACE, borderColor: GLASS_BORDER, marginHorizontal: 0, marginBottom: 16 }]}>
              <Feather name="search" size={18} color={LABEL} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: TEXT_PRIMARY, fontFamily: 'Inter' }]}
                placeholder="Search friends..."
                placeholderTextColor={LABEL}
                value={modalSearch}
                onChangeText={setModalSearch}
              />
            </View>

            {/* Friends list */}
            {friendsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={G} />
              </View>
            ) : filteredModalFriends.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: MUTED, fontSize: 14, fontFamily: 'Inter' }}>
                  {modalSearch ? 'No friends match search' : 'No friends found'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredModalFriends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER }}
                    onPress={() => handleStartChatWithFriend(item)}
                  >
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(130, 219, 126, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                        <Text style={{ color: G, fontSize: 16, fontFamily: 'Outfit-Bold' }}>
                          {(item.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 16, color: TEXT_PRIMARY, flex: 1, fontFamily: 'Inter-SemiBold' }}>{item.name}</Text>
                    <Feather name="chevron-right" size={18} color={LABEL} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15 },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  filterTabText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  filterTabTextActive: { },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  convRowUnread: { borderLeftWidth: 3, paddingLeft: 12 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#FFF' },
  typeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  convContent: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  convName: { fontSize: 15, flex: 1 },
  convNameBold: { fontFamily: 'Outfit-Bold' },
  convRight: { flexDirection: 'row', alignItems: 'center' },
  convTime: { fontSize: 12, marginLeft: 8 },
  convItemTitle: { fontSize: 11, marginBottom: 2, fontStyle: 'italic' },
  convLastMsg: { fontSize: 13 },
  convLastMsgBold: { fontFamily: 'Inter-Medium' },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5, marginLeft: 8,
  },
  unreadBadgeText: { fontSize: 11, fontFamily: 'Outfit-Bold', color: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteActionText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    marginTop: 4,
  },
});
