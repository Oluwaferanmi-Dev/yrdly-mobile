import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

function GlassTabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint="systemChromeMaterial"
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return null;
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        // Solid header — no transparent overlay so content starts below it
        headerStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : '#FFFFFF',
          borderBottomWidth: 0.5,
          borderBottomColor: 'rgba(0,0,0,0.1)',
          // iOS shadow-based border instead of a hard line
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0.5 },
          shadowOpacity: 0.1,
          shadowRadius: 0,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: '#1C1C1C',
        },
        headerTintColor: '#1C1C1C',
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 16 }}>
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
              <Ionicons name="map-outline" size={24} color="#1C1C1C" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color="#1C1C1C" />
            </TouchableOpacity>
          </View>
        ),
        // Glass tab bar using tabBarBackground (preserves layout space, no overlap)
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(0,0,0,0.1)',
          backgroundColor: Platform.OS === 'ios'
            ? 'transparent'   // BlurView fills it
            : 'rgba(255,255,255,0.96)',
          elevation: 8,
        },
        tabBarActiveTintColor: '#388E3C',
        tabBarInactiveTintColor: Platform.OS === 'ios'
          ? 'rgba(60,60,67,0.45)'
          : '#9E9E9E',
        tabBarShowLabel: false,  // icon-only pill look
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
