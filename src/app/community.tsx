import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';

export default function CommunityScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunityData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      // 1. Fetch pending friend requests
      const { data: reqData } = await supabase
        .from('friend_requests')
        .select(`*, from_user:users!friend_requests_from_user_id_fkey(id, name, avatar_url)`)
        .eq('to_user_id', currentUser.id)
        .eq('status', 'pending');
      
      setRequests(reqData || []);

      // 2. Fetch all users (excluding self) - limited for performance
      let userQuery = supabase
        .from('users')
        .select('id, name, avatar_url')
        .neq('id', currentUser.id)
        .limit(50);
      
      if (searchQuery) {
        userQuery = userQuery.ilike('name', `%${searchQuery}%`);
      }

      const { data: userData } = await userQuery;
      setUsers(userData || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, searchQuery]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      if (action === 'accepted') {
        await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
      } else {
        await supabase.from('friend_requests').delete().eq('id', requestId);
      }
      // Optimistic remove
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (e) {
      console.error(e);
    }
  };

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
            style={[styles.btn, styles.acceptBtn, { backgroundColor: colors.tint }]} 
            onPress={() => handleRequestAction(item.id, 'accepted')}
          >
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btn, styles.declineBtn, { borderColor: '#E53935' }]} 
            onPress={() => handleRequestAction(item.id, 'declined')}
          >
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUser = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={[styles.userCard, { borderBottomColor: colors.borderLight }]} 
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <View style={[styles.avatarSmall, { backgroundColor: colors.tint }]}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarTextSmall}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
          )}
        </View>
        <Text style={[styles.userNameSmall, { color: colors.text }]}>{item.name || 'Anonymous'}</Text>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Friend Requests</Text>
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={renderRequest}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      <View style={[styles.section, { paddingHorizontal: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Discover Neighbors</Text>
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
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !searchQuery ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlashList
          data={users}
          estimatedItemSize={65}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  listContent: { paddingBottom: 40 },
  listHeader: { paddingBottom: 10 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 16 },
  
  // Requests
  requestCard: {
    padding: 16, marginRight: 12, width: 220, 
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
  },
  userInfo: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: {},
  acceptBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  declineBtn: { backgroundColor: 'transparent', borderWidth: 1 },
  declineBtnText: { color: '#E53935', fontSize: 12, fontWeight: 'bold' },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 8,
    paddingHorizontal: 12, height: 44, marginBottom: 16
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },

  // User List
  userCard: {
    flexDirection: 'row', alignItems: 'center', 
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarTextSmall: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  userNameSmall: { flex: 1, fontSize: 16, fontWeight: 'bold' },
});
