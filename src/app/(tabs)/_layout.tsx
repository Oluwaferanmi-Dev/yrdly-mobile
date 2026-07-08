import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { 
  HomeIcon, ExploreIcon, MessagesIcon, ProfileIcon 
} from '../../components/SvgIcons';

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppTheme();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.borderLight,
            paddingBottom: insets.bottom > 0 ? 0 : 10,
            height: insets.bottom + 60,
          },
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => <HomeIcon color={color} size={24} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: 'Catalog',
            tabBarIcon: ({ color, focused }) => <ExploreIcon color={color} size={24} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => <MessagesIcon color={color} size={24} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => <ProfileIcon color={color} size={24} filled={focused} />,
          }}
        />
      </Tabs>

      {/* Custom Floating Create Button Overlay */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 90 }]} pointerEvents="box-none">
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.createButton, { backgroundColor: '#10B981', shadowColor: '#10B981' }]}
          onPress={() => router.push('/create')}
        >
          <Plus size={28} color="#FFF" weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 100,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
