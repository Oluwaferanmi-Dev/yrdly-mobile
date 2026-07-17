import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet, Text } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import {
  HomeIcon, ExploreIcon, MessagesIcon, ProfileIcon
} from '../../components/SvgIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';

/** Wraps any tab icon with a spring scale animation on focus */
function TabIconWrapper({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = focused
      ? withSpring(1.22, { damping: 12, stiffness: 260 })
      : withSpring(1,    { damping: 14, stiffness: 200 });
  }, [focused]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.View style={style}>{children}</Animated.View>;
}


import { useRouter } from 'expo-router';

const TAB_BAR_HEIGHT = 64;

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppTheme();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchUnread = async () => {
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);
        
      let chatCount = 0;
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, type')
        .contains('participant_ids', [user.id]);
        
      if (convs) {
        for (const conv of convs) {
          if (conv.type === 'marketplace' || conv.type === 'briefcase') {
            const { data: msgs } = await supabase
              .from('chat_messages')
              .select('sender_id, metadata')
              .eq('chat_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (msgs && msgs.sender_id !== user.id && !msgs.metadata?.isRead) {
              chatCount++;
            }
          }
        }
      }
      
      setUnreadMessages((msgCount || 0) + chatCount);
    };

    fetchUnread();

    const channel = supabase
      .channel('messages_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: tabBarHeight,
            backgroundColor: isDarkMode ? 'rgba(18, 18, 18, 0.97)' : 'rgba(255, 255, 255, 0.97)',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            paddingBottom: insets.bottom,
            elevation: 0,
          },
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
          tabBarItemStyle: {
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWrapper focused={focused}>
                <HomeIcon color={color} size={26} filled={focused} />
              </TabIconWrapper>
            ),
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWrapper focused={focused}>
                <ExploreIcon color={color} size={26} filled={focused} />
              </TabIconWrapper>
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create',
            tabBarItemStyle: {
              // Push the item down so the circle floats above the bar
              paddingTop: Platform.OS === 'ios' ? 0 : 4,
            },
            tabBarIcon: () => (
              <View style={styles.createButton}>
                <Plus size={26} color="#FFF" weight="bold" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.push('/new-post' as any);
            },
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWrapper focused={focused}>
                <View>
                  <MessagesIcon color={color} size={26} filled={focused} />
                  {unreadMessages > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
                    </View>
                  )}
                </View>
              </TabIconWrapper>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWrapper focused={focused}>
                <ProfileIcon color={color} size={26} filled={focused} />
              </TabIconWrapper>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    // Elevate it slightly above the bar
    marginBottom: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});


