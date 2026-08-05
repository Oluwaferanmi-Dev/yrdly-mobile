import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/use-supabase-auth';

export default function NetworkScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { id, mode = 'followers' } = useLocalSearchParams<{ id: string; mode: 'followers' | 'following' }>();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(mode as 'followers' | 'following');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentUserFollowing, setCurrentUserFollowing] = useState<Set<string>>(new Set());
  const [currentUserFollowers, setCurrentUserFollowers] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      if (!id) return;
      setLoading(true);
      try {
        let userIds: string[] = [];

        if (activeTab === 'followers') {
          // Users who follow 'id'
          const { data } = await supabase
            .from('followers')
            .select('follower_id')
            .eq('following_id', id);
          if (data) {
            userIds = data.map(d => d.follower_id);
          }
        } else {
          // Users whom 'id' follows
          const { data } = await supabase
            .from('followers')
            .select('following_id')
            .eq('follower_id', id);
          if (data) {
            userIds = data.map(d => d.following_id);
          }
        }

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name, avatar_url, phone_verified')
            .in('id', userIds);
          
          setUsers(usersData || []);

          if (currentUser) {
            // Fetch current user's follow status with these users
            const [{ data: followingData }, { data: followersData }] = await Promise.all([
              supabase.from('followers').select('following_id').eq('follower_id', currentUser.id).in('following_id', userIds),
              supabase.from('followers').select('follower_id').eq('following_id', currentUser.id).in('follower_id', userIds)
            ]);
            
            if (followingData) {
              setCurrentUserFollowing(new Set(followingData.map(d => d.following_id)));
            }
            if (followersData) {
              setCurrentUserFollowers(new Set(followersData.map(d => d.follower_id)));
            }
          }

        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching network:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [id, activeTab, currentUser]);

  const handleToggleFollow = async (targetId: string) => {
    if (!currentUser) return;
    setActionLoading(prev => ({ ...prev, [targetId]: true }));
    
    try {
      const isFollowing = currentUserFollowing.has(targetId);
      
      if (isFollowing) {
        await supabase.from('followers')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId);
          
        setCurrentUserFollowing(prev => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        await supabase.from('followers')
          .insert({ follower_id: currentUser.id, following_id: targetId });
          
        setCurrentUserFollowing(prev => {
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });
      }
    } catch (e) {
      console.error('Follow error:', e);
    } finally {
      setActionLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const renderUser = ({ item }: { item: any }) => {
    const isCurrentUser = currentUser?.id === item.id;
    const isFollowing = currentUserFollowing.has(item.id);
    const isFollower = currentUserFollowers.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.userRow, { borderBottomColor: GLASS_BORDER }]}
        onPress={() => router.push(`/profile/${item.id}` as any)}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: G }]}>
            <Text style={[styles.avatarFallbackText, { color: '#000000', fontFamily: 'Outfit' }]}>
              {item.name ? item.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.userName, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]} numberOfLines={1}>{item.name}</Text>
            {item.phone_verified && (
              <MaterialIcons name="verified" size={14} color={G} style={{ marginLeft: 4 }} />
            )}
          </View>
          {isFollower && isFollowing && !isCurrentUser && (
            <Text style={[styles.mutualText, { color: MUTED, fontFamily: 'Inter' }]}>Mutual</Text>
          )}
          {isFollower && !isFollowing && !isCurrentUser && (
            <Text style={[styles.mutualText, { color: MUTED, fontFamily: 'Inter' }]}>Follows you</Text>
          )}
        </View>

        {!isCurrentUser && (
          <TouchableOpacity 
            style={[
              styles.followBtn, 
              { backgroundColor: isFollowing ? SURFACE : G, borderWidth: isFollowing ? 1 : 0, borderColor: GLASS_BORDER }
            ]}
            onPress={() => handleToggleFollow(item.id)}
            disabled={actionLoading[item.id]}
          >
            {actionLoading[item.id] ? (
              <ActivityIndicator size="small" color={isFollowing ? TEXT_PRIMARY : '#000'} />
            ) : (
              <Text style={[styles.followBtnText, { color: isFollowing ? TEXT_PRIMARY : '#000', fontFamily: 'Outfit' }]}>
                {isFollowing ? 'Following' : isFollower ? 'Follow Back' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]}>
      <View style={[styles.header, { borderBottomColor: GLASS_BORDER }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TEXT_PRIMARY, fontFamily: 'Outfit' }]}>Network</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabs, { borderBottomColor: GLASS_BORDER }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && { borderBottomColor: G, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'followers' ? G : LABEL, fontFamily: 'Outfit' }]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && { borderBottomColor: G, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'following' ? G : LABEL, fontFamily: 'Outfit' }]}>Following</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={G} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: MUTED, fontFamily: 'Inter' }]}>
                {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  mutualText: {
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
});
