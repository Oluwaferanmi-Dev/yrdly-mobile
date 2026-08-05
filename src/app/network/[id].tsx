import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY, } from '../../constants/tokens';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, TextInput } from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');

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
        <TouchableOpacity onPress={() => router.push(`/profile/${item.id}` as any)} style={{ flexShrink: 0, marginRight: 12 }}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <View style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            {item.phone_verified && (
              <MaterialIcons name="verified" size={14} color={G} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={styles.userHandle} numberOfLines={1}>@{item.username || 'user'}</Text>
          {isFollower && isFollowing && !isCurrentUser && (
            <Text style={styles.mutualText}>Mutual</Text>
          )}
          {isFollower && !isFollowing && !isCurrentUser && (
            <Text style={styles.mutualText}>Follows you</Text>
          )}
        </View>

        {!isCurrentUser && (
          <TouchableOpacity 
            style={[
              styles.followBtn, 
              activeTab === 'followers' 
                ? { backgroundColor: SURFACE, borderColor: GLASS_BORDER } 
                : { backgroundColor: 'rgba(130,219,126,0.1)', borderColor: 'rgba(130,219,126,0.25)' }
            ]}
            onPress={() => handleToggleFollow(item.id)}
            disabled={actionLoading[item.id]}
          >
            {actionLoading[item.id] ? (
              <ActivityIndicator size="small" color={activeTab === 'followers' ? MUTED : G} />
            ) : (
              <Text style={[styles.followBtnText, activeTab === 'followers' ? { color: MUTED } : { color: G }]}>
                {activeTab === 'followers' ? 'Remove' : 'Following'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const filteredUsers = users.filter(u => {
    const matchName = u.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchHandle = u.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchHandle;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: DARK }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connections</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={14} color={LABEL} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or @username…"
          placeholderTextColor={LABEL}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabsWrap}>
        <TouchableOpacity
          style={[styles.tabBtn]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabTxt, { 
            color: activeTab === 'followers' ? '#fff' : LABEL, 
            fontFamily: activeTab === 'followers' ? 'Outfit-Bold' : 'Outfit-Medium' 
          }]}>
            Followers <Text style={{ color: activeTab === 'followers' ? G : LABEL }}>({activeTab === 'followers' ? filteredUsers.length : 0})</Text>
          </Text>
          {activeTab === 'followers' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabTxt, { 
            color: activeTab === 'following' ? '#fff' : LABEL, 
            fontFamily: activeTab === 'following' ? 'Outfit-Bold' : 'Outfit-Medium' 
          }]}>
            Following <Text style={{ color: activeTab === 'following' ? G : LABEL }}>({activeTab === 'following' ? filteredUsers.length : 0})</Text>
          </Text>
          {activeTab === 'following' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={G} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
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
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12, paddingTop: 10,
    borderBottomWidth: 1, borderBottomColor: GLASS_BORDER,
  },
  navBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderColor: GLASS_BORDER, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#fff' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 12, paddingHorizontal: 12,
    backgroundColor: SURFACE, borderColor: GLASS_BORDER, borderWidth: 1, borderRadius: 14, height: 40
  },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: '#fff' },
  tabsWrap: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  tabBtn: { flex: 1, paddingVertical: 12, position: 'relative' },
  tabTxt: { fontSize: 14, textAlign: 'center', textTransform: 'capitalize' },
  tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 99, backgroundColor: G },
  
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: G,
  },
  avatarFallbackText: {
    color: '#050505',
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  userName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  userHandle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: LABEL,
  },
  mutualText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: MUTED,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  followBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
