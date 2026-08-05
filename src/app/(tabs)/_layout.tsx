import { Tabs, useRouter } from 'expo-router';
import { View, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import {
  HomeIcon, ExploreIcon, MessagesIcon, ProfileIcon
} from '../../components/SvgIcons';
import { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import { PencilSimple, Storefront, CalendarBlank, WarningCircle, X } from 'phosphor-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
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

function CreateMenuOverlay({ visible, onClose, onSelect }: { visible: boolean, onClose: () => void, onSelect: (route: string) => void }) {
  if (!visible) return null;
  
  const OPTIONS = [
    { id: 'post', title: 'Create Post', desc: 'Share thoughts or photos', icon: PencilSimple, route: '/create-post' },
    { id: 'listing', title: 'Create Listing', desc: 'Sell or give away items', icon: Storefront, route: '/create-for-sale' },
    { id: 'event', title: 'Create Event', desc: 'Host a gathering or party', icon: CalendarBlank, route: '/create-event' },
    { id: 'alert', title: 'Publish Alert', desc: 'Notify neighbors of danger', icon: WarningCircle, route: '/create-alert' },
  ];

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </BlurView>
      <Animated.View entering={SlideInDown.duration(300).springify()} exiting={SlideOutDown.duration(200)} style={styles.overlayContent}>
        <View style={styles.optionsContainer}>
          {OPTIONS.map((opt, idx) => (
            <TouchableOpacity 
              key={opt.id} 
              activeOpacity={0.8} 
              style={styles.optionBtn}
              onPress={() => onSelect(opt.route)}
            >
              <View style={styles.optionIconWrap}>
                <opt.icon size={24} color={G} weight="regular" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={onClose}>
          <X size={24} color="#FFF" weight="bold" />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppTheme();
  const { user, profile } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

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
            tabBarLabel: ({ focused, color }) => (
              <Text style={{
                color,
                fontFamily: focused ? 'Inter-SemiBold' : 'Inter-Regular',
                fontSize: 10,
              }}>
                {/* The label text is determined by the route title or passed down */}
              </Text>
            ),
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
              <FloatingCreateButton onPress={() => setShowCreateMenu(true)} />
            ),
          }}
          listeners={{
            tabPress: (e: any) => {
              e.preventDefault();
              setShowCreateMenu(true);
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
        />
      </Tabs>

      <CreateMenuOverlay 
        visible={showCreateMenu} 
        onClose={() => setShowCreateMenu(false)} 
        onSelect={(route) => {
          setShowCreateMenu(false);
          router.push(route as any);
        }} 
      />
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
    fontFamily: 'Outfit-ExtraBold',
  },
  overlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 16,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(130,219,126,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#FFF',
    marginBottom: 2,
  },
  optionDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: MUTED,
  },
  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});



