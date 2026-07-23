import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Platform, Share, Dimensions, FlatList } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';

type Tab = 'friends' | 'discover';

const { width } = Dimensions.get('window');

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
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({});

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);


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

      const { data: userData, error: userError } = await userQuery;
      if (userError) console.error('Error fetching users:', userError);

      const blocked = profile?.blocked_users || [];
      const myFriends = profile?.friends || [];
      
      const discoveredUsers = (userData || [])
        .filter(u => !blocked.includes(u.id))
        .filter(u => !myFriends.includes(u.id))
        .filter(u => u.discoverable !== false);

      const nearbyUsers = discoveredUsers.filter(u => {
        if (!targetLocation?.lga) return true;
        return u.location?.lga === targetLocation.lga;
      });
      setNeighbors(nearbyUsers);

      const mutualUsers = discoveredUsers.filter(u => {
        const theirFriends = u.friends || [];
        return theirFriends.some((fid: string) => myFriends.includes(fid));
      });
      setMutuals(mutualUsers);

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
  }, [currentUser, activeFilter, profile?.blocked_users]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      if (action === 'accepted') {
        await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
      } else {
        await supabase.from('friend_requests').delete().eq('id', requestId);
      }
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (action === 'accepted') fetchData();
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

  const handleFriendOptions = (friend: any) => {
    Alert.alert(
      friend.user.name || 'Friend Options',
      'Choose an action',
      [
        { text: 'Message', onPress: () => router.push(`/messages/${friend.user.id}` as any) },
        { text: 'View Profile', onPress: () => router.push(`/profile/${friend.user.id}`) },
        { text: 'Remove Friend', style: 'destructive', onPress: () => handleRemoveFriend(friend.reqId, friend.user.name) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleAddFriend = async (userId: string) => {
    if (!currentUser) return;
    setActionInProgress(prev => ({ ...prev, [userId]: true }));
    try {
      await supabase.from('friend_requests').insert({
        from_user_id: currentUser.id,
        to_user_id: userId,
        status: 'pending'
      });
      // Mock local state update to show "Requested"
      setNeighbors(prev => prev.filter(u => u.id !== userId));
      setMutuals(prev => prev.filter(u => u.id !== userId));
      setSellers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      console.error(e);
    } finally {
      setActionInProgress(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleInvite = async () => {
    const shareUrl = `https://yrdly.app/invite/${profile?.id}`;
    const message = Platform.OS === 'android' ? `Join me on YRDLY! ${shareUrl}` : `Join me on YRDLY!`;
    try {
      await Share.share({
        message,
        url: shareUrl,
        title: 'Join YRDLY',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    const lowerQuery = searchQuery.toLowerCase();
    return friends.filter(f => (f.user.name || '').toLowerCase().includes(lowerQuery));
  }, [friends, searchQuery]);

  // ── Renderers ────────────────────────────────────────────────
  const renderRequest = ({ item, index }: { item: any; index: number }) => {
    const sender = item.from_user;
    if (!sender) return null;
    return (
      <Animated.View entering={FadeInUp.delay(index * 100).springify()} style={[styles.premiumCard, styles.requestCard]}>
        <TouchableOpacity style={styles.userInfo} onPress={() => router.push(`/profile/${sender.id}`)}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
            {sender.avatar_url ? (
              <Image source={{ uri: sender.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.tint }]}>{sender.name ? sender.name.charAt(0).toUpperCase() : '?'}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.userName, { color: colors.text }]}>{sender.name || 'Anonymous'}</Text>
            <Text style={[styles.userSubtitle, { color: colors.textMuted }]}>Wants to be friends</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.premiumBtn, { backgroundColor: colors.tint }]}
            onPress={() => handleRequestAction(item.id, 'accepted')}
          >
            <Text style={styles.premiumBtnText}>Accept</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity
            style={[styles.premiumBtnOutline, { borderColor: '#E53935' }]}
            onPress={() => handleRequestAction(item.id, 'declined')}
          >
            <Text style={[styles.premiumBtnTextOutline, { color: '#E53935' }]}>Decline</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderFriend = ({ item, index }: { item: any, index: number }) => {
    const { reqId, user } = item;
    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()} layout={Layout.springify()}>
        <TouchableOpacity
          style={styles.premiumFriendCard}
          onPress={() => router.push(`/profile/${user.id}`)}
          onLongPress={() => handleFriendOptions(item)}
        >
          <View style={styles.friendRow}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarMedium, { backgroundColor: colors.tint + '30' }]}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarTextMedium, { color: colors.tint }]}>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</Text>
                )}
              </View>
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.friendInfo}>
              <Text style={[styles.userNameSmall, { color: colors.text }]}>{user.name || 'Anonymous'}</Text>
              <Text style={[styles.userSubtitle, { color: colors.textSecondary }]}>YRDLY User</Text>
            </View>
            {removingId === reqId ? (
              <ActivityIndicator size="small" color="#E53935" />
            ) : (
              <TouchableOpacity
                style={styles.iconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => handleFriendOptions(item)}
              >
                <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderDiscoverUser = ({ item, index }: { item: any, index: number }) => {
    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()} layout={Layout.springify()}>
        <View style={styles.premiumFriendCard}>
          <View style={styles.friendRow}>
            <TouchableOpacity style={styles.friendInfoRow} onPress={() => router.push(`/profile/${item.id}`)}>
              <View style={[styles.avatarMedium, { backgroundColor: colors.tint + '30' }]}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarTextMedium, { color: colors.tint }]}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
                )}
              </View>
              <View style={styles.friendInfo}>
                <Text style={[styles.userNameSmall, { color: colors.text }]}>{item.name || 'Anonymous'}</Text>
                <Text style={[styles.userSubtitle, { color: colors.textSecondary }]}>
                  {item.location?.lga ? `${item.location.lga} • ` : ''}Discover
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallActionBtn, { backgroundColor: colors.tint + '15' }]}
              onPress={() => handleAddFriend(item.id)}
              disabled={actionInProgress[item.id]}
            >
              {actionInProgress[item.id] ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Feather name="user-plus" size={16} color={colors.tint} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const friendsHeader = (
    <View style={styles.listHeaderContainer}>
      {requests.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitlePremium, { color: colors.text }]}>Requests ({requests.length})</Text>
          <FlatList
            data={requests}
            keyExtractor={(item: any) => item.id}
            renderItem={renderRequest}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.requestsContent}
          />
        </View>
      )}
      
      <Animated.View entering={FadeInDown.duration(400)} style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroTextContent}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>My Friends</Text>
            <Text style={[styles.heroSubtitle, { color: colors.tint }]}>{friends.length} connections</Text>
          </View>
          <View style={[styles.heroIconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Feather name="users" size={32} color={colors.tint} />
          </View>
        </View>
        <View style={[styles.searchContainerPremium, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
          <Feather name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInputPremium, { color: colors.text }]}
            placeholder="Search friends..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </Animated.View>

      <View style={styles.inviteCard}>
        <View style={[styles.inviteGlow, { borderColor: colors.tint }]} />
        <View style={styles.inviteContent}>
          <View style={styles.inviteTextRow}>
            <View style={[styles.inviteIconBg, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name="gift-outline" size={24} color={colors.tint} />
            </View>
            <View style={styles.inviteTexts}>
              <Text style={[styles.inviteTitle, { color: colors.text }]}>Invite Friends</Text>
              <Text style={[styles.inviteSubtitle, { color: colors.textSecondary }]}>Build your community on YRDLY.</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.tint }]} onPress={handleInvite}>
            <Text style={styles.inviteBtnText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const discoverHeader = (
    <View style={styles.discoverHeaderContainer}>
      <Text style={[styles.sectionTitlePremium, { color: colors.text, marginBottom: 16 }]}>Find People</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRowPremium}>
        {(['all', 'neighbors', 'mutuals', 'sellers'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.premiumChip,
              activeFilterTab === tab ? { backgroundColor: colors.tint, borderColor: colors.tint } : { backgroundColor: 'transparent', borderColor: colors.borderLight }
            ]}
            onPress={() => setActiveFilterTab(tab)}
          >
            <Text style={[
              styles.premiumChipText,
              activeFilterTab === tab ? { color: '#000' } : { color: colors.textSecondary }
            ]}>
              {tab === 'all' ? 'All' : tab === 'neighbors' ? 'Neighbors' : tab === 'mutuals' ? 'Mutuals' : 'Sellers'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDiscoverSections = () => {
    let combined: any[] = [];
    if (activeFilterTab === 'all') {
      const allDiscovered = [...mutuals, ...neighbors, ...sellers];
      const unique = Array.from(new Map(allDiscovered.map(item => [item.id, item])).values());
      combined = unique;
    } else if (activeFilterTab === 'mutuals') combined = mutuals;
    else if (activeFilterTab === 'neighbors') combined = neighbors;
    else if (activeFilterTab === 'sellers') combined = sellers;

    return (
      <FlatList
        data={combined}
        keyExtractor={(item: any) => item.id}
        renderItem={renderDiscoverUser}
        ListHeaderComponent={discoverHeader}
        contentContainerStyle={styles.listContentPremium}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainerPremium}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.card }]}>
              <Feather name="compass" size={40} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitlePremium, { color: colors.text }]}>No one found</Text>
            <Text style={[styles.emptySubtitlePremium, { color: colors.textMuted }]}>Try changing your filter or location.</Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#050505' }]}>
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.glassBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCenter}>
          <Text style={[styles.premiumHeaderTitle, { color: colors.text }]}>Community</Text>
          <Text style={[styles.premiumHeaderSubtitle, { color: colors.textSecondary }]}>Connect & discover</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addFriendBtn, { borderColor: colors.tint }]}
          onPress={() => setActiveTab('discover')}
        >
          <Feather name="user-plus" size={18} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControlContainer}>
        <View style={[styles.segmentedControl, { backgroundColor: '#111' }]}>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'friends' && { backgroundColor: 'rgba(255,255,255,0.05)' }]} 
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.segmentText, activeTab === 'friends' ? { color: colors.text } : { color: colors.textMuted }]}>Friends</Text>
            {activeTab === 'friends' && <Animated.View layout={Layout.springify()} style={[styles.activeIndicator, { backgroundColor: colors.tint }]} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'discover' && { backgroundColor: 'rgba(255,255,255,0.05)' }]} 
            onPress={() => setActiveTab('discover')}
          >
            <Text style={[styles.segmentText, activeTab === 'discover' ? { color: colors.text } : { color: colors.textMuted }]}>Discover</Text>
            {activeTab === 'discover' && <Animated.View layout={Layout.springify()} style={[styles.activeIndicator, { backgroundColor: colors.tint }]} />}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : activeTab === 'friends' ? (
        <FlashList
          {...({ estimatedItemSize: 80 } as any)}
          data={filteredFriends}
          keyExtractor={(item: any) => item.reqId}
          renderItem={renderFriend}
          ListHeaderComponent={friendsHeader}
          contentContainerStyle={styles.listContentPremium}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View entering={FadeInUp} style={styles.emptyContainerPremium}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.card }]}>
                <Feather name="users" size={40} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitlePremium, { color: colors.text }]}>No Friends Yet</Text>
              <Text style={[styles.emptySubtitlePremium, { color: colors.textMuted }]}>
                {searchQuery ? "No friends match your search." : "Discover neighbors and send friend requests to build your community."}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={[styles.premiumDiscoverBtn, { backgroundColor: colors.tint }]}
                  onPress={() => setActiveTab('discover')}
                >
                  <Text style={styles.premiumDiscoverBtnText}>Discover People</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          }
        />
      ) : (
        renderDiscoverSections()
      )}
    
      {/* Filter Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: '#111' }}
        handleIndicatorStyle={{ backgroundColor: '#333' }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />
        )}
      >
        <View style={styles.bottomSheetContent}>
          <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Filters</Text>
          <Text style={[styles.bottomSheetSubtitle, { color: colors.textSecondary }]}>Discover settings</Text>
          
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Distance</Text>
          <View style={styles.filterChipsRow}>
            {['500m', '1km', '5km', '10km'].map(d => (
              <TouchableOpacity key={d} style={styles.filterChip}>
                <Text style={{ color: colors.text }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Interests</Text>
          <View style={styles.filterChipsRow}>
            {['Anime', 'Gaming', 'Food', 'Business', 'Technology'].map(i => (
              <TouchableOpacity key={i} style={styles.filterChip}>
                <Text style={{ color: colors.text }}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.applyFilterBtn, { backgroundColor: colors.tint }]} onPress={() => bottomSheetModalRef.current?.dismiss()}>
            <Text style={styles.applyFilterBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  premiumHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  premiumHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addFriendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(130, 219, 126, 0.1)',
  },
  segmentedControlContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContentPremium: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listHeaderContainer: {
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitlePremium: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  requestsContent: {
    paddingRight: 16,
  },
  premiumCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  requestCard: {
    width: width * 0.75,
    marginRight: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  premiumBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  premiumBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  premiumBtnTextOutline: {
    fontWeight: '600',
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTextContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainerPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInputPremium: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  inviteCard: {
    position: 'relative',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  inviteGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderRadius: 20,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  inviteContent: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  inviteTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  inviteTexts: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  inviteSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  inviteBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  inviteBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
  premiumFriendCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarMedium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTextMedium: {
    fontSize: 18,
    fontWeight: '700',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#82DB7E',
    borderWidth: 2,
    borderColor: '#111',
  },
  friendInfo: {
    flex: 1,
  },
  userNameSmall: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  smallActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverHeaderContainer: {
    marginBottom: 16,
  },
  chipsRowPremium: {
    flexDirection: 'row',
  },
  premiumChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  premiumChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainerPremium: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitlePremium: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitlePremium: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
    lineHeight: 20,
  },
  premiumDiscoverBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  premiumDiscoverBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },

  discoverHeroCard: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  discoverHeroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  discoverHeroTextContent: {
    flex: 1,
    paddingRight: 16,
  },
  discoverHeroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  discoverHeroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  discoverHeroIconBg: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  discoverHeroIconGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
    zIndex: -1,
  },
  discoverSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoverSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    marginRight: 12,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartChipsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  smartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  smartChipTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  smartChipSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  discoverScrollContent: {
    paddingLeft: 16,
  },
  discoverSection: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingRight: 16,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nearbyCard: {
    width: 140,
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  nearbyAvatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  nearbyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyOnlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#82DB7E',
    borderWidth: 3,
    borderColor: '#111',
  },
  nearbyName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  nearbyDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nearbyDistanceText: {
    fontSize: 12,
    marginLeft: 4,
  },
  nearbyFollowBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  nearbyFollowBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  mutualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  mutualInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mutualInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mutualName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  mutualSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  smallFollowBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  smallFollowBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  threeDotBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerCard: {
    width: 240,
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  sellerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sellerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sellerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerStatsText: {
    fontSize: 12,
  },
  sellerShopBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  sellerShopBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 24,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  applyFilterBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  applyFilterBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
