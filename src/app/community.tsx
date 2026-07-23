import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { SectionHeader } from '../components/SectionHeader';
import { DiscoverUserCard } from '../components/DiscoverUserCard';

type Tab = 'friends' | 'discover';

export default function CommunityScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user: currentUser, profile } = useAuth();
  const { activeFilter } = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Friends State
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  
  // Discover State
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'neighbors' | 'mutuals' | 'sellers'>('all');
  const [neighbors, setNeighbors] = useState<any[]>([]);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // ── Pending friend requests ────────────────────────────────
      const { data: reqData } = await supabase
        .from('friend_requests')
        .select(`*, from_user:users!friend_requests_from_user_id_fkey(id, name, avatar_url)`)
        .eq('to_user_id', currentUser.id)
        .eq('status', 'pending');
      setRequests(reqData || []);

      // ── Accepted friends (both directions) ────────────────────
      const [{ data: sentFriends }, { data: receivedFriends }] = await Promise.all([
        supabase
          .from('friend_requests')
          .select(`id, to_user:users!friend_requests_to_user_id_fkey(id, name, avatar_url)`)
          .eq('from_user_id', currentUser.id)
          .eq('status', 'accepted'),
        supabase
          .from('friend_requests')
          .select(`id, from_user:users!friend_requests_from_user_id_fkey(id, name, avatar_url)`)
          .eq('to_user_id', currentUser.id)
          .eq('status', 'accepted'),
      ]);

      const friendList = [
        ...(sentFriends || []).map((r: any) => ({ reqId: r.id, user: r.to_user })),
        ...(receivedFriends || []).map((r: any) => ({ reqId: r.id, user: r.from_user })),
      ].filter(f => f.user);
      setFriends(friendList);

      // ── Community discovery ────────────────────────────────────
      const targetLocation = activeFilter || profile?.location;
      
      let userQuery = supabase
        .from('users')
        .select('id, name, avatar_url, location, friends, discoverable')
        .neq('id', currentUser.id)
        .limit(100);

      if (targetLocation) {
        if (targetLocation.state) userQuery = userQuery.eq('location->>state', targetLocation.state);
      }
      if (searchQuery) userQuery = userQuery.ilike('name', `%${searchQuery}%`);

      const { data: userData, error: userError } = await userQuery;
      if (userError) console.error('Error fetching users:', userError);

      const blocked = profile?.blocked_users || [];
      const myFriends = profile?.friends || [];
      
      // Filter out blocked, existing friends, and non-discoverable
      const discoveredUsers = (userData || [])
        .filter(u => !blocked.includes(u.id))
        .filter(u => !myFriends.includes(u.id))
        .filter(u => u.discoverable !== false); // Backward compatible if column doesn't exist

      // 1. Neighbors (Location matches exactly)
      const nearbyUsers = discoveredUsers.filter(u => {
        if (!targetLocation?.lga) return true; // If no specific LGA selected, show all in state
        return u.location?.lga === targetLocation.lga;
      });
      setNeighbors(nearbyUsers);

      // 2. Mutuals (Shared friends)
      const mutualUsers = discoveredUsers.filter(u => {
        const theirFriends = u.friends || [];
        return theirFriends.some((fid: string) => myFriends.includes(fid));
      });
      setMutuals(mutualUsers);

      // 3. Sellers (Active For Sale posts in area)
      let activeSellers: any[] = [];
      if (targetLocation?.state) {
        const { data: postData } = await supabase
          .from('posts')
          .select('user_id')
          .eq('category', 'For Sale')
          .eq('is_sold', false)
          .eq('state', targetLocation.state)
          .limit(100);
          
        if (postData) {
          const sellerIds = Array.from(new Set(postData.map(p => p.user_id)));
          activeSellers = discoveredUsers.filter(u => sellerIds.includes(u.id));
        }
      }
      setSellers(activeSellers);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, searchQuery, activeFilter, profile?.blocked_users]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      if (action === 'accepted') {
        await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
      } else {
        await supabase.from('friend_requests').delete().eq('id', requestId);
      }
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (action === 'accepted') fetchData(); // refresh friends list
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFriend = (reqId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(reqId);
            try {
              await supabase.from('friend_requests').delete().eq('id', reqId);
              setFriends(prev => prev.filter(f => f.reqId !== reqId));
            } catch (e) {
              console.error(e);
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Renderers ────────────────────────────────────────────────
  const renderRequest = ({ item }: { item: any }) => {
    const sender = item.from_user;
    if (!sender) return null;
    return (
      <View style={[styles.requestCard, { borderColor: colors.borderLight }]}>
        <TouchableOpacity style={styles.userInfo} onPress={() => router.push(`/profile/${sender.id}`)}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            {sender.avatar_url ? (
              <Image source={{ uri: sender.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{sender.name ? sender.name.charAt(0).toUpperCase() : '?'}</Text>
            )}
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{sender.name || 'Anonymous'}</Text>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.tint }]}
            onPress={() => handleRequestAction(item.id, 'accepted')}
          >
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { borderColor: '#E53935', borderWidth: 1, backgroundColor: 'transparent' }]}
            onPress={() => handleRequestAction(item.id, 'declined')}
          >
            <Text style={{ color: '#E53935', fontSize: 12, fontWeight: 'bold' }}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFriend = ({ item }: { item: any }) => {
    const { reqId, user } = item;
    return (
      <TouchableOpacity
        style={[styles.userCard, { borderBottomColor: colors.borderLight }]}
        onPress={() => router.push(`/profile/${user.id}`)}
      >
        <View style={[styles.avatarSmall, { backgroundColor: colors.tint + '30' }]}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarTextSmall, { color: colors.tint }]}>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</Text>
          )}
        </View>
        <Text style={[styles.userNameSmall, { color: colors.text }]}>{user.name || 'Anonymous'}</Text>
        {removingId === reqId ? (
          <ActivityIndicator size="small" color="#E53935" />
        ) : (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => handleRemoveFriend(reqId, user.name || 'this user')}
          >
            <Feather name="user-minus" size={18} color="#E53935" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderDiscoverUser = ({ item }: { item: any }) => (
    <DiscoverUserCard
      user={item}
      context="neighbor"
      onPress={() => router.push(`/profile/${item.id}`)}
    />
  );

  // ── Friends tab header: pending requests ─────────────────────
  const friendsHeader = requests.length > 0 ? (
    <View style={[styles.section, { marginBottom: 8 }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Requests ({requests.length})</Text>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={renderRequest}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      />
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
        My Friends ({friends.length})
      </Text>
    </View>
  ) : (
    <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 16, marginTop: 16, marginBottom: 4 }]}>
      My Friends ({friends.length})
    </Text>
  );

  // ── Discover tab header: search & chips ──────────────────────
  const discoverHeader = (
    <View style={[styles.section, { paddingHorizontal: 16, marginBottom: 8 }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
        <Feather name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {(['all', 'neighbors', 'mutuals', 'sellers'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.filterChip,
              activeFilterTab === tab ? { backgroundColor: colors.tint } : { backgroundColor: colors.card, borderColor: colors.borderLight, borderWidth: 1 }
            ]}
            onPress={() => setActiveFilterTab(tab)}
          >
            <Text style={[
              styles.filterChipText,
              activeFilterTab === tab ? { color: '#0B0D0B' } : { color: colors.textSecondary }
            ]}>
              {tab === 'all' ? 'All' : tab === 'neighbors' ? 'Neighbors' : tab === 'mutuals' ? 'Mutual Friends' : 'Active Sellers'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDiscoverSections = () => {
    return (
      <FlatList
        data={[{ key: 'dummy' }]} // We render sections manually in ListHeaderComponent
        keyExtractor={item => item.key}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {discoverHeader}
            
            {/* Mutuals Section */}
            {(activeFilterTab === 'all' || activeFilterTab === 'mutuals') && mutuals.length > 0 && (
              <View style={styles.listSection}>
                <SectionHeader title="Suggested for You" emoji="🤝" count={mutuals.length} />
                {mutuals.map(user => (
                  <DiscoverUserCard
                    key={user.id}
                    user={user}
                    context="mutual"
                    mutualCount={user.friends?.filter((fid: string) => profile?.friends?.includes(fid)).length || 1}
                    onPress={() => router.push(`/profile/${user.id}`)}
                  />
                ))}
              </View>
            )}

            {/* Sellers Section */}
            {(activeFilterTab === 'all' || activeFilterTab === 'sellers') && sellers.length > 0 && (
              <View style={styles.listSection}>
                <SectionHeader title="Active Sellers Near You" emoji="🛍️" count={sellers.length} />
                {sellers.map(user => (
                  <DiscoverUserCard
                    key={user.id}
                    user={user}
                    context="seller"
                    onPress={() => router.push(`/profile/${user.id}`)}
                  />
                ))}
              </View>
            )}

            {/* Neighbors Section */}
            {(activeFilterTab === 'all' || activeFilterTab === 'neighbors') && (
              <View style={styles.listSection}>
                <SectionHeader 
                  title={activeFilter?.lga ? `Neighbors in ${activeFilter.lga}` : "Discover Neighbors"} 
                  emoji="📍" 
                  count={neighbors.length} 
                />
                {neighbors.length > 0 ? (
                  neighbors.map(user => (
                    <DiscoverUserCard
                      key={user.id}
                      user={user}
                      context="neighbor"
                      onPress={() => router.push(`/profile/${user.id}`)}
                    />
                  ))
                ) : (
                  <View style={styles.emptyInline}>
                    <Text style={[styles.emptyInlineText, { color: colors.textMuted }]}>No neighbors found in this area.</Text>
                  </View>
                )}
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && { borderBottomColor: colors.tint }]}
          onPress={() => setActiveTab('friends')}
        >
          <Feather name="users" size={14} color={activeTab === 'friends' ? colors.tint : colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, { color: activeTab === 'friends' ? colors.tint : colors.textMuted }]}>
            Friends {friends.length > 0 ? `(${friends.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && { borderBottomColor: colors.tint }]}
          onPress={() => setActiveTab('discover')}
        >
          <Feather name="compass" size={14} color={activeTab === 'discover' ? colors.tint : colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.tabText, { color: activeTab === 'discover' ? colors.tint : colors.textMuted }]}>Discover</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : activeTab === 'friends' ? (
        <FlashList
          {...({ estimatedItemSize: 60 } as any)}
          data={friends}
          keyExtractor={(item: any) => item.reqId}
          renderItem={renderFriend}
          ListHeaderComponent={friendsHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={56} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Friends Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {requests.length > 0
                  ? 'You have pending requests above — accept them to connect!'
                  : 'Discover neighbors and send friend requests to connect.'}
              </Text>
              <TouchableOpacity
                style={[styles.discoverBtn, { backgroundColor: colors.tint }]}
                onPress={() => setActiveTab('discover')}
              >
                <Feather name="compass" size={16} color="#0B0D0B" style={{ marginRight: 6 }} />
                <Text style={styles.discoverBtnText}>Discover People</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        renderDiscoverSections()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    marginRight: 24, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 15, fontWeight: '600' },
  listContent: { paddingBottom: 60 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, paddingHorizontal: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginTop: 12 },

  // Requests
  requestCard: {
    padding: 16, marginRight: 12, width: 200,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
  },
  userInfo: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  userName: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  acceptBtnText: { color: '#0B0D0B', fontSize: 12, fontWeight: 'bold' },

  // Search & Filters
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 8,
    paddingHorizontal: 12, height: 44, marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listSection: {
    marginBottom: 16,
  },
  emptyInline: {
    padding: 24,
    alignItems: 'center',
  },
  emptyInlineText: {
    fontSize: 14,
  },

  // User List
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarSmall: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarTextSmall: { fontSize: 16, fontWeight: 'bold' },
  userNameSmall: { flex: 1, fontSize: 15, fontWeight: '600' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  discoverBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  discoverBtnText: { color: '#0B0D0B', fontWeight: 'bold', fontSize: 15 },
});
