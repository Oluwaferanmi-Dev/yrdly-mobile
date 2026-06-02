import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Text } from 'react-native';

export default function TabLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#388E3C', // Yrdly Green
        tabBarInactiveTintColor: '#616161', // Muted text
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 10,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
          height: 100, // accommodate safe area
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: '#1C1C1C',
        },
        headerTintColor: '#1C1C1C',
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 16 }}>
            <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.push('/map')}>
              <Ionicons name="map-outline" size={24} color="#1C1C1C" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={24} color="#1C1C1C" />
            </TouchableOpacity>
          </View>
        ),
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
          tabBarIcon: ({ color, size }) => (
            <View style={{ 
              backgroundColor: '#388E3C', 
              width: 44, 
              height: 44, 
              borderRadius: 22, 
              justifyContent: 'center', 
              alignItems: 'center',
              marginBottom: 4
            }}>
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
