import { Tabs, useRouter } from 'expo-router';
import { Map, Bell, House, Users, ShoppingBag, Calendar, Briefcase } from 'lucide-react-native';
import { View, TouchableOpacity, Text } from 'react-native';
import { theme } from '../../theme';

export default function TabLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fonts.body,
          fontSize: theme.typography.sizes.xs,
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.card,
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
              <Map size={24} color="#1C1C1C" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Bell size={24} color="#1C1C1C" />
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
            <House size={size} color={color} />
          ),
        }} />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          headerTitle: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }} />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Market',
          headerTitle: 'Market',
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag size={size} color={color} />
          ),
        }} />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerTitle: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }} />
      <Tabs.Screen
        name="businesses"
        options={{
          title: 'Business',
          headerTitle: 'Business',
          tabBarIcon: ({ color, size }) => (
            <Briefcase size={size} color={color} />
          ),
        }} />
    </Tabs>
  );
}
