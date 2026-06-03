import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Search, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { theme } from '../../theme';

export default function CommunityScreen() {
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
      <View style={styles.requestCard}>
        <TouchableOpacity style={styles.userInfo} onPress={() => router.push(`/profile/${sender.id}`)}>
          <View style={styles.avatar}>
            {sender.avatar_url ? (
              <Image source={{ uri: sender.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{sender.name ? sender.name.charAt(0).toUpperCase() : '?'}</Text>
            )}
          </View>
          <Text style={styles.userName}>{sender.name || 'Anonymous'}</Text>
        </TouchableOpacity>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => handleRequestAction(item.id, 'accepted')}>
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={() => handleRequestAction(item.id, 'declined')}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUser = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity style={styles.userCard} onPress={() => router.push(`/profile/${item.id}`)}>
        <View style={styles.avatarSmall}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarTextSmall}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
          )}
        </View>
        <Text style={styles.userNameSmall}>{item.name || 'Anonymous'}</Text>
        <ChevronRight size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={renderRequest}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }} />
        </View>
      )}

      <View style={[styles.section, { paddingHorizontal: 16 }]}>
        <Text style={styles.sectionTitle}>Discover Neighbors</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search" />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !searchQuery ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: theme.typography.sizes.lg, fontFamily: theme.typography.fonts.heading, color: theme.colors.textPrimary, flex: 1, textAlign: 'center' },
  listContent: { paddingBottom: 40 },
  listHeader: { paddingBottom: 10 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontFamily: theme.typography.fonts.heading, color: theme.colors.textPrimary, marginBottom: 12, paddingHorizontal: 16 },
  
  // Requests
  requestCard: {
    backgroundColor: theme.colors.card, borderRadius: theme.radius.base, padding: 16, marginRight: 12,
    width: 220, borderWidth: 1, borderColor: theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  userInfo: { alignItems: 'center', marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: theme.colors.background, fontSize: 24, fontFamily: theme.typography.fonts.heading },
  userName: { fontSize: theme.typography.sizes.base, fontFamily: theme.typography.fonts.heading, color: theme.colors.textPrimary },
  actionButtons: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: theme.colors.primary },
  acceptBtnText: { color: theme.colors.background, fontSize: theme.typography.sizes.xs, fontWeight: 'bold' },
  declineBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.error },
  declineBtnText: { color: theme.colors.error, fontSize: theme.typography.sizes.xs, fontWeight: 'bold' },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceDim, borderRadius: 8,
    paddingHorizontal: 12, height: 44, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: theme.typography.sizes.base, fontFamily: theme.typography.fonts.body, color: theme.colors.textPrimary },

  // User List
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card,
    padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: theme.radius.base,
    borderWidth: 1, borderColor: theme.colors.border
  },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarTextSmall: { color: theme.colors.background, fontSize: 16, fontFamily: theme.typography.fonts.heading },
  userNameSmall: { flex: 1, fontSize: theme.typography.sizes.base, fontFamily: theme.typography.fonts.body, color: theme.colors.textPrimary },
});
