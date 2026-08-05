import { Tabs, useRouter } from 'expo-router';
import { View, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
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
import { G, GLOW_STRONG, GLASS_BG, GLASS_BORDER, DARK, MUTED, RED } from '../../constants/tokens';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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

/** Floating create button with spring press feedback */
function FloatingCreateButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedTouchableOpacity
      style={[styles.createButton, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Plus size={26} color="#FFF" weight="bold" />
    </AnimatedTouchableOpacity>
  );
}

const TAB_BAR_HEIGHT = 64;

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppTheme();
  const { user, profile } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchUnread = async () => {
      let unreadTotal = 0;
      
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, type, deleted_by, participant_ids')
        .contains('participant_ids', [user.id]);
        
      if (convs) {
        // Filter out deleted and blocked conversations
        const activeConvs = convs.filter(c => {
          if (c.deleted_by && c.deleted_by.includes(user.id)) return false;
          const otherId = c.participant_ids?.find((id: string) => id !== user.id);
          if (profile?.blocked_users && otherId && profile.blocked_users.includes(otherId)) return false;
          return true;
        });
        
        const activeConvIds = activeConvs.map(c => c.id);
          
        if (activeConvIds.length > 0) {
          const { data: unreadData } = await supabase
            .from('messages')
            .select('conversation_id')
            .eq('is_read', false)
            .neq('sender_id', user.id)
            .in('conversation_id', activeConvIds);
            
          if (unreadData) {
            const uniqueUnreadConvs = new Set(unreadData.map(m => m.conversation_id));
            unreadTotal += uniqueUnreadConvs.size;
          }
        }
      }
      
      setUnreadMessages(unreadTotal);
    };

    fetchUnread();

    const channel = supabase
      .channel('messages_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, fetchUnread)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.blocked_users]);

  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
            headerShown: false,
            tabBarShowLabel: true,
            tabBarStyle: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: tabBarHeight,
              backgroundColor: 'rgba(12,12,12,0.97)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
              paddingBottom: insets.bottom,
              elevation: 0,
            },
            tabBarActiveTintColor: G,
            tabBarInactiveTintColor: 'rgba(255,255,255,0.42)',
            tabBarLabelStyle: {
              fontFamily: 'Inter',
              fontSize: 10,
            },
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
                <HomeIcon color={focused ? G : color} size={26} filled={focused} />
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
                <ExploreIcon color={focused ? G : color} size={26} filled={focused} />
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
              <FloatingCreateButton onPress={() => router.push('/new-post' as any)} />
            ),
          }}
          listeners={{
            tabPress: (e: any) => {
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
                  <MessagesIcon color={focused ? G : color} size={26} filled={focused} />
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
                <ProfileIcon color={focused ? G : color} size={26} filled={focused} />
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
    backgroundColor: G,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: G,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: G,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: DARK,
  },
  badgeText: {
    color: DARK,
    fontSize: 9,
    fontFamily: 'Outfit',
    fontWeight: 'bold',
  },
});



