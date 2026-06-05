import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';

const GREEN = '#388E3C';

// ── Types ─────────────────────────────────────────────────────────
type ConvType = 'friend' | 'marketplace' | 'business';
type FilterTab = 'all' | 'friends' | 'marketplace' | 'businesses';

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
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id])
        .order('updated_at', { ascending: false });

      if (error || !data) return;

      // Transform raw DB rows into Conversation objects
      const transformed: Conversation[] = data.map((conv: any) => {
        const otherId = conv.participant_ids?.find((id: string) => id !== user.id);

        if (conv.type === 'business') {
          return {
            id: conv.id,
            type: 'business',
            participantId: conv.business_id || conv.id,
            participantName: conv.business_name || 'Business',
            participantAvatar: conv.business_logo || null,
            lastMessage: conv.last_message_text || conv.last_message || 'No messages yet',
            timestamp: conv.updated_at,
            unreadCount: 0,
            context: { itemTitle: conv.item_title, itemImage: conv.item_image, itemPrice: conv.item_price },
          };
        }

        if (conv.type === 'marketplace') {
          return {
            id: conv.id,
            type: 'marketplace',
            participantId: otherId || conv.id,
            participantName: 'Loading...',
            participantAvatar: conv.item_image || null,
            lastMessage: conv.last_message_text || conv.last_message || 'No messages yet',
            timestamp: conv.updated_at,
            unreadCount: 0,
            context: { itemTitle: conv.item_title, itemImage: conv.item_image, itemPrice: conv.item_price },
          };
        }

        return {
          id: conv.id,
          type: 'friend',
          participantId: otherId || conv.id,
          participantName: 'Loading...',
          participantAvatar: null,
          lastMessage: conv.last_message_text || conv.last_message || 'No messages yet',
          timestamp: conv.updated_at,
          unreadCount: 0,
        };
      });

      setConversations(transformed);

      // Resolve participant names/avatars for friend & marketplace convos
      const otherIds = transformed
        .filter((c) => c.type !== 'business')
        .map((c) => c.participantId)
        .filter((id) => id && id !== user.id);

      if (otherIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', otherIds);

        if (usersData) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.type === 'business') return c;
              const u = usersData.find((u: any) => u.id === c.participantId);
              return u ? { ...c, participantName: u.name || 'Unknown', participantAvatar: u.avatar_url } : c;
            })
          );
        }
      }
    } catch (e) {
      console.error('Fetch conversations error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      const tabOk =
        activeFilter === 'all' ||
        (activeFilter === 'friends' && c.type === 'friend') ||
        (activeFilter === 'marketplace' && c.type === 'marketplace') ||
        (activeFilter === 'businesses' && c.type === 'business');
      const q = searchQuery.toLowerCase();
      const searchOk = !q || 
        (c.participantName || '').toLowerCase().includes(q) || 
        (c.lastMessage || '').toLowerCase().includes(q);
      return tabOk && searchOk;
    });
  }, [conversations, activeFilter, searchQuery]);

  useEffect(() => {
    fetchConversations();

    // Realtime subscription
    if (!user) return;
    let ch: any = null;
    try {
      ch = supabase
        .channel(`conversations-mobile-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
        .subscribe();
    } catch (e) {
      console.error('Error subscribing to conversations realtime:', e);
    }

    return () => {
      if (ch) {
        try {
          supabase.removeChannel(ch);
        } catch (e) {
          console.error('Error removing conversations channel:', e);
        }
      }
    };
  }, [user]);

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'friends', label: 'Friends' },
    { key: 'marketplace', label: 'Market' },
    { key: 'businesses', label: 'Business' },
  ];

  const renderItem = ({ item }: { item: Conversation }) => {
    const unread = item.unreadCount > 0;
    const showItemImage = (item.type === 'marketplace' || item.type === 'business') && item.context?.itemImage;

    return (
      <TouchableOpacity
        style={[styles.convRow, unread && styles.convRowUnread]}
        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
        activeOpacity={0.8}
      >
        {/* Avatar / Item thumbnail */}
        <View style={styles.avatarContainer}>
          {showItemImage ? (
            <Image source={{ uri: item.context!.itemImage }} style={styles.avatar} contentFit="cover" />
          ) : item.participantAvatar ? (
            <Image source={{ uri: item.participantAvatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {(item.participantName || 'Unknown').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Type badge */}
          {item.type === 'marketplace' && (
            <View style={styles.typeBadge}>
              <Ionicons name="cart" size={9} color="#FFF" />
            </View>
          )}
          {item.type === 'business' && (
            <View style={[styles.typeBadge, { backgroundColor: '#1565C0' }]}>
              <Ionicons name="business" size={9} color="#FFF" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.convContent}>
          <View style={styles.convTopRow}>
            <Text style={[styles.convName, unread && styles.convNameBold]} numberOfLines={1}>
              {item.participantName}
            </Text>
            <Text style={[styles.convTime, unread && { color: GREEN }]}>
              {timeLabel(item.timestamp)}
            </Text>
          </View>
          {item.context?.itemTitle && (
            <Text style={styles.convItemTitle} numberOfLines={1}>
              Re: {item.context.itemTitle}
            </Text>
          )}
          <Text style={[styles.convLastMsg, unread && styles.convLastMsgBold]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>

        {/* Unread badge */}
        {unread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9E9E9E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#9E9E9E"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, activeFilter === key && styles.filterTabActive]}
            onPress={() => setActiveFilter(key)}
          >
            <Text style={[styles.filterTabText, activeFilter === key && styles.filterTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color="#BDBDBD" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No results found' : 'No conversations yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#1C1C1C' },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F2F2F2',
    borderRadius: 10,
    padding: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#9E9E9E' },
  filterTabTextActive: { color: GREEN },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  convRowUnread: { borderLeftWidth: 3, borderLeftColor: GREEN, paddingLeft: 12 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8F5E9' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: GREEN },
  avatarFallbackText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  typeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  convContent: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  convName: { fontSize: 15, color: '#1C1C1C', flex: 1 },
  convNameBold: { fontWeight: 'bold' },
  convTime: { fontSize: 12, color: '#9E9E9E', marginLeft: 8 },
  convItemTitle: { fontSize: 11, color: GREEN, marginBottom: 2, fontStyle: 'italic' },
  convLastMsg: { fontSize: 13, color: '#9E9E9E' },
  convLastMsgBold: { color: '#424242', fontWeight: '500' },
  unreadBadge: {
    backgroundColor: GREEN, borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5, marginLeft: 8,
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9E9E9E', marginTop: 12 },
});
