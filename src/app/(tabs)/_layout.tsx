import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
          tabBarShowLabel: false,
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
          name="create"
          options={{
            title: 'Create',
            tabBarIcon: () => (
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#10B981',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Platform.OS === 'android' ? 24 : 0,
              }}>
                <Plus size={24} color="#FFF" weight="bold" />
              </View>
            ),
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
    </View>
  );
}

const styles = StyleSheet.create({
});
