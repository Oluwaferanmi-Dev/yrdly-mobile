import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet } from 'react-native';
import { Plus } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import {
  HomeIcon, ExploreIcon, MessagesIcon, ProfileIcon
} from '../../components/SvgIcons';

const TAB_BAR_HEIGHT = 64;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useAppTheme();

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
            tabBarIcon: ({ color, focused }) => <HomeIcon color={color} size={26} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => <ExploreIcon color={color} size={26} filled={focused} />,
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
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => <MessagesIcon color={color} size={26} filled={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => <ProfileIcon color={color} size={26} filled={focused} />,
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
});


