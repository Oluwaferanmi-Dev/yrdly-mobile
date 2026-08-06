import { createStyleSheet, useStyles } from "react-native-unistyles";
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { useFriendshipGlobal } from '../hooks/use-friendship-global';
import { GlassCard } from './GlassCard';

interface DiscoverUserCardProps {
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    location?: {
      lga?: string;
      state?: string;
    };
  };
  context: 'neighbor' | 'mutual' | 'seller';
  mutualCount?: number;
  onPress: () => void;
}

export function DiscoverUserCard({ user, context, mutualCount, onPress }: DiscoverUserCardProps) {
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

  const { colors } = useAppTheme();
  const { status, isLoading, addFriend, cancelRequest, removeFriend } = useFriendshipGlobal(user.id);

  // Derive badge text/icon based on context
  let badgeIcon: keyof typeof Feather.glyphMap = 'map-pin';
  let badgeText = '';
  
  if (context === 'neighbor') {
    badgeIcon = 'map-pin';
    badgeText = user.location?.lga ? `${user.location.lga}, ${user.location.state}` : (user.location?.state || 'Nearby');
  } else if (context === 'mutual') {
    badgeIcon = 'users';
    badgeText = `${mutualCount || 1} mutual friend${(mutualCount || 1) !== 1 ? 's' : ''}`;
  } else if (context === 'seller') {
    badgeIcon = 'shopping-bag';
    badgeText = 'Active Seller';
  }

  // Handle friendship button action
  const handleAction = () => {
    if (status === 'none') {
      addFriend();
    } else if (status === 'request_sent' || status === 'request_received') {
      cancelRequest();
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={stylesheet.container}>
      <GlassCard intensity={80} style={StyleSheet.flatten([stylesheet.card, { borderColor: colors.border }])}>
        {user.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={[stylesheet.avatar, { backgroundColor: theme.colors.DARK }]}
            contentFit="cover"
          />
        ) : (
          <View style={[stylesheet.avatar, { backgroundColor: colors.tint, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: colors.background, fontSize: 20, fontWeight: '800' }}>
              {(user.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={stylesheet.content}>
          <Text style={[stylesheet.name, { color: colors.text }]} numberOfLines={1}>
            {user.name || 'Anonymous'}
          </Text>
          
          <View style={stylesheet.badgeRow}>
            <Feather name={badgeIcon} size={12} color={colors.textSecondary} />
            <Text style={[stylesheet.badgeText, { color: colors.textSecondary }]} numberOfLines={1}>
              {badgeText}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            stylesheet.actionButton, 
            status === 'friends' ? { backgroundColor: 'transparent' } : { backgroundColor: colors.tint + '15' },
            status === 'friends' && { borderColor: colors.border, borderWidth: 1 }
          ]} 
          onPress={handleAction}
          disabled={isLoading || status === 'friends'}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : status === 'friends' ? (
            <View style={stylesheet.friendsBadge}>
              <Feather name="check" size={14} color={colors.textSecondary} />
              <Text style={[stylesheet.friendsText, { color: colors.textSecondary }]}>Friends</Text>
            </View>
          ) : (status === 'request_sent' || status === 'request_received') ? (
            <Text style={[stylesheet.actionText, { color: colors.tint }]}>Pending</Text>
          ) : (
            <Text style={[stylesheet.actionText, { color: colors.tint }]}>Add</Text>
          )}
        </TouchableOpacity>
      </GlassCard>
    </TouchableOpacity>
  );
}

const _stylesheet = createStyleSheet(theme => ({
      container: {
        paddingHorizontal: 16,
        paddingVertical: 6,
      },
      card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
      },
      avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
      },
      content: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
      },
      name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
      },
      badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      },
      badgeText: {
        fontSize: 13,
      },
      actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
      },
      actionText: {
        fontSize: 13,
        fontWeight: '600',
      },
      friendsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      },
      friendsText: {
        fontSize: 13,
        fontWeight: '500',
      },
    }));
