import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { useAppTheme } from '../context/ThemeContext';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFriendshipGlobal } from '../hooks/use-friendship-global';

// Per-row component so each can call useFriendshipGlobal independently
function FriendRequestRow({ req, colors, router }: {
  req: any;
  colors: any;
  router: ReturnType<typeof useRouter>;
}) {
  const friendship = useFriendshipGlobal(req.from_user_id);

  return (
    <View style={styles.requestRow}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/profile/${req.from_user_id}`)}
      >
        {req.user?.avatar_url ? (
          <Image source={{ uri: req.user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.fallbackAvatar, { backgroundColor: colors.tint }]}>
            <Text style={styles.fallbackText}>
              {req.user?.name ? req.user.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {req.user?.name || 'Unknown'}
        </Text>
      </TouchableOpacity>

      <View style={styles.actionBtns}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.tint }]}
          onPress={friendship.acceptRequest}
          disabled={friendship.isLoading}
        >
          {friendship.isLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="check" size={14} color="#fff" />}
          <Text style={styles.btnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.borderLight }]}
          onPress={friendship.declineRequest}
          disabled={friendship.isLoading}
        >
          <Feather name="x" size={14} color={colors.textSecondary} />
          <Text style={[styles.btnText, { color: colors.textSecondary }]}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function PendingFriendRequestsBanner() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useAppTheme();
  const [requests, setRequests] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select('id, from_user_id')
          .eq('to_user_id', user.id)
          .eq('status', 'pending');
          
        if (error || !data || data.length === 0) {
          setRequests([]);
          return;
        }

        const fromIds = data.map(r => r.from_user_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .in('id', fromIds);

        const usersMap = new Map();
        if (usersData) {
          usersData.forEach(u => usersMap.set(u.id, u));
        }

        const enriched = data.map(req => ({
          ...req,
          user: usersMap.get(req.from_user_id)
        }));
        
        setRequests(enriched);
      } catch (e) {
        console.error('Failed to fetch friend requests', e);
      }
    };

    fetchRequests();

    const channel = supabase.channel('friend_requests_banner')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friend_requests', 
        filter: `to_user_id=eq.${user.id}` 
      }, fetchRequests)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (requests.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}>
      <View style={styles.header}>
        <Feather name="users" size={16} color={colors.text} style={{ marginRight: 6 }} />
        <Text style={[styles.title, { color: colors.text }]}>
          {requests.length} Pending Friend Request{requests.length > 1 ? 's' : ''}
        </Text>
      </View>
      
      {requests.slice(0, 2).map((req) => (
        <FriendRequestRow key={req.id} req={req} colors={colors} router={router} />
      ))}
      
      {requests.length > 2 && (
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.viewAllWrapper}>
          <Text style={[styles.viewAll, { color: colors.tint }]}>View all {requests.length} requests</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  fallbackAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewAllWrapper: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

