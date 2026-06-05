import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../context/ThemeContext';

function GlassTabBarBackground() {
  const { isDarkMode } = useAppTheme();
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint={isDarkMode ? 'dark' : 'systemChromeMaterial'}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return null;
}

export default function TabLayout() {
  const router = useRouter();
  const { colors, isDarkMode } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Platform.OS === 'ios'
            ? (isDarkMode ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)')
            : colors.card,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0.5 },
          shadowOpacity: 0.1,
          shadowRadius: 0,
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
              <Ionicons name="map-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        ),
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          backgroundColor: Platform.OS === 'ios'
            ? 'transparent'
            : (isDarkMode ? colors.card : 'rgba(255,255,255,0.96)'),
          elevation: 8,
        },
        tabBarActiveTintColor: '#388E3C',
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Yrdly',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Explore',
          headerTitle: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          headerTitle: 'Create Post',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.createButton, focused && styles.createButtonActive]}>
              <Ionicons name="add" size={28} color="#FFF" />
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
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
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
    backgroundColor: '#388E3C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#388E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonActive: {
    backgroundColor: '#2E7D32',
  },
});
