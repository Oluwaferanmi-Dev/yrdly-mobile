import { Tabs, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Platform, StyleSheet, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../context/ThemeContext';
import { useNotificationBadge } from '../../context/NotificationBadgeContext';
import { 
  HomeIcon, ExploreIcon, MessagesIcon, ProfileIcon, 
  MapIcon, NotificationsIcon 
} from '../../components/SvgIcons';

function GlassTabBarBackground() {
  const { isDarkMode } = useAppTheme();
  if (Platform.OS === 'ios' && !isDarkMode) {
    return (
      <BlurView
        intensity={80}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return null;
}

export default function TabLayout() {
  const router = useRouter();
  const { colors, isDarkMode } = useAppTheme();
  const { unreadCount } = useNotificationBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
        },
        headerTintColor: colors.text,
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 16 }}>
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
              <MapIcon size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
              <NotificationsIcon size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  right: -4,
                  top: -4,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 1.5,
                  borderColor: colors.background
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ),
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          backgroundColor: isDarkMode 
            ? colors.background 
            : (Platform.OS === 'ios' ? 'transparent' : 'rgba(255,255,255,0.96)'),
          elevation: 8,
        },
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <HomeIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <ExploreIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          headerTitle: 'Create Post',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.createButton,
              { backgroundColor: colors.tint, shadowColor: colors.tint },
              focused && styles.createButtonActive,
            ]}>
              <Feather name="plus" size={28} color="#FFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerTitle: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MessagesIcon size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          headerRight: () => (
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/settings')}>
              <Feather name="settings" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => (
            <ProfileIcon size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonActive: {
    backgroundColor: '#2E7D32',
  },
});
