import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, DARK, GLASS_BG, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, BLUE, AMBER } from '../../constants/tokens';

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

export default function MessagesTab() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'friends', label: 'Friends' },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'business', label: 'Business' },
  ];

  const fetchConversations = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id])
        .order('updated_at', { ascending: false });

      if (error || !data) return;

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

      const otherUserIds = Array.from(
        new Set(
          data.map((c: any) => c.participant_ids?.find((id: string) => id !== user.id)).filter(Boolean)
        )
      ) as string[];

      let usersMap = new Map();
      if (otherUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', otherUserIds);

        if (usersData) {
          usersMap = new Map(usersData.map((u: any) => [u.id, u]));
        }
      }

      const formatted: Conversation[] = data
        .filter((c: any) => !c.deleted_by?.includes(user.id))
        .map((c: any) => {
          const otherId = c.participant_ids?.find((id: string) => id !== user.id);
          const otherUser = usersMap.get(otherId);

          let convType: ConvType = 'friend';
          if (c.type === 'marketplace' || c.item_id) convType = 'marketplace';
          else if (c.type === 'briefcase' || c.type === 'business') convType = 'briefcase';

          return {
            id: c.id,
            type: convType,
            participantId: otherId || '',
            participantName: otherUser?.name || c.context?.itemTitle || 'Neighbour',
            participantAvatar: (otherUser?.avatar_url && !otherUser.avatar_url.startsWith('file://')) ? otherUser.avatar_url : null,
            lastMessage: c.last_message || 'Tap to chat',
            timestamp: c.updated_at || c.created_at,
            unreadCount: unreadCounts[c.id] || 0,
            context: c.context,
          };
        });

      setConversations(formatted);
    } catch (e) {
      console.error('Fetch conversations error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    if (!user) return;
    const channel = supabase
      .channel('conversations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter === 'friends' && c.type !== 'friend') return false;
      if (activeFilter === 'marketplace' && c.type !== 'marketplace') return false;
      if (activeFilter === 'business' && c.type !== 'briefcase') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.participantName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [conversations, activeFilter, searchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  return (
    <View style={[styles.container, { backgroundColor: DARK, paddingTop: insets.top }]}>
      
      {/* ── Header (Figma 1:1 Matching) ── */}
      <View style={styles.header}>
        {searching ? (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search-outline" size={16} color={LABEL} style={{ marginRight: 8 }} />
              <TextInput
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search messages..."
                placeholderTextColor={MUTED}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={LABEL} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => { setSearching(false); setSearchQuery(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.headerTitle}>Messages</Text>
              {totalUnread > 0 && (
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>{totalUnread}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity 
                style={styles.headerIconBtn}
                onPress={() => setSearching(true)}
              >
                <Ionicons name="search-outline" size={18} color={TEXT_PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerIconBtn, { backgroundColor: G, borderWidth: 0 }]}
                onPress={() => router.push('/community')}
              >
                <Ionicons name="create-outline" size={18} color={DARK} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Filter Pills (Figma 1:1 Matching) ── */}
      {!searching && (
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTERS}
            keyExtractor={item => item.key}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const active = activeFilter === item.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    active && styles.filterPillActive
                  ]}
                  onPress={() => setActiveFilter(item.key)}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ── Conversations List ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={G} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubbles-outline" size={32} color={LABEL} />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Say hello to someone in your neighbourhood.</Text>
          <TouchableOpacity 
            style={styles.startBtn}
            onPress={() => router.push('/community')}
          >
            <Text style={styles.startBtnText}>Start a Conversation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchConversations(true)} tintColor={G} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.convoRow,
                item.unreadCount > 0 && { backgroundColor: 'rgba(130,219,126,0.03)' }
              ]}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {item.participantAvatar && !item.participantAvatar.startsWith('file://') ? (
                  <Image source={{ uri: item.participantAvatar }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{item.participantName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>

              {/* Convo Details */}
              <View style={styles.convoInfo}>
                <View style={styles.convoTopRow}>
                  <Text style={[styles.name, item.unreadCount > 0 && { fontFamily: 'Outfit-Bold' }]} numberOfLines={1}>
                    {item.participantName}
                  </Text>
                  <Text style={[styles.time, item.unreadCount > 0 && { color: G, fontFamily: 'Inter-Medium' }]}>
                    {timeLabel(item.timestamp)}
                  </Text>
                </View>

                <View style={styles.convoBottomRow}>
                  <Text style={[styles.lastMsg, item.unreadCount > 0 && { color: TEXT_PRIMARY, fontFamily: 'Inter-Medium' }]} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>

                {item.context?.itemTitle && (
                  <View style={styles.listingContextPill}>
                    <Ionicons name="bag-handle-outline" size={10} color={LABEL} />
                    <Text style={styles.listingContextText} numberOfLines={1}>
                      {item.context.itemTitle}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTitle: { fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: '#FFFFFF' },
  totalBadge: {
    backgroundColor: G,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  totalBadgeText: { fontFamily: 'Outfit-Bold', fontSize: 11, color: DARK },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 21,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#FFFFFF',
  },
  cancelText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: G },
  filterPill: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(130,219,126,0.1)',
    borderColor: 'rgba(130,219,126,0.25)',
  },
  filterPillText: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL },
  filterPillTextActive: { fontFamily: 'Inter-SemiBold', color: G },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 90 },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 14,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 24 },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: 'rgba(130,219,126,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontFamily: 'Outfit-Bold', fontSize: 18, color: G },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: G,
    borderWidth: 2,
    borderColor: DARK,
  },
  convoInfo: { flex: 1 },
  convoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  name: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: '#FFFFFF', flex: 1 },
  time: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
  convoBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL, flex: 1, marginRight: 8 },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: G,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { fontFamily: 'Outfit-Bold', fontSize: 10, color: DARK },
  listingContextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  listingContextText: { fontFamily: 'Inter-Regular', fontSize: 11, color: LABEL },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#FFFFFF', marginBottom: 6 },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: LABEL, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  startBtn: {
    backgroundColor: G,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  startBtnText: { fontFamily: 'Outfit-Bold', fontSize: 14, color: DARK },
});
