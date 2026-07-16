import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';

export default function NetworkScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { id, mode = 'followers' } = useLocalSearchParams<{ id: string; mode: 'followers' | 'following' }>();

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(mode as 'followers' | 'following');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
            .select('id, name, avatar_url')
            .in('id', userIds);
          
          setUsers(usersData || []);
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
  }, [id, activeTab]);

  const renderUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.userRow, { borderBottomColor: colors.borderLight }]}
      onPress={() => router.push(`/profile/${item.id}`)}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.tint }]}>
          <Text style={styles.avatarFallbackText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
      )}
      <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Network</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'followers' ? colors.tint : colors.textSecondary }]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'following' ? colors.tint : colors.textSecondary }]}>Following</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
