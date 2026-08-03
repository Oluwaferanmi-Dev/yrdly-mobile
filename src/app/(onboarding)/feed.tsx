import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';
import { Ionicons } from '@expo/vector-icons';

const { colors, radii } = ONBOARDING_THEME;

const FEED_POSTS = [
  { avatar: '👩🏾', name: 'YRDLY Community', handle: '@yrdly', time: 'Just now', tag: 'Welcome', text: "Welcome to YRDLY! You're now part of the Victoria Island community. Say hi to your neighbours and explore what's happening around you. 🏡", likes: 0, comments: 0, isOfficial: true },
  { avatar: '👨🏾', name: 'Chukwuemeka Obi', handle: '@emeka_vi', time: '2m ago', tag: 'Neighbour', text: 'Anyone know a good plumber around VI? My kitchen pipe has been acting up since yesterday 🔧', likes: 3, comments: 5, isOfficial: false },
  { avatar: '👩🏿', name: 'Ngozi Adeyemi', handle: '@ngozi.bakes', time: '14m ago', tag: 'Marketplace', text: 'Fresh bread and pastries available this morning! First 10 orders get a free chin-chin. DM me to order 🍞🥐', likes: 24, comments: 12, isOfficial: false },
  { avatar: '🧑🏽', name: 'Tolu Fashola', handle: '@tolu_fashola', time: '1h ago', tag: 'Events', text: 'Street football this Sunday at the VI courts. All ages welcome. Bring water and wear cleats! ⚽', likes: 41, comments: 18, isOfficial: false },
];

const TAG_COLORS: Record<string, string> = {
  Welcome: colors.G,
  Neighbour: '#82B4DB',
  Marketplace: '#FFB648',
  Events: '#DB82C4',
};

export default function FeedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  const tabs = ['Home', 'Map', 'Market', 'Events', 'Profile'];
  const tabIcons: (keyof typeof Ionicons.glyphMap)[] = ['home-outline', 'map-outline', 'storefront-outline', 'calendar-outline', 'person-outline'];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Good morning 👋</Text>
            <Text style={styles.nameText}>Welcome, Amina!</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconCircle}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.avatarBadge}>
              <Text style={{ fontSize: 18 }}>👩🏾</Text>
            </View>
          </View>
        </View>

        {/* Connected Banner */}
        <View style={styles.connectedBanner}>
          <View style={styles.greenPulse} />
          <Text style={styles.connectedText}>
            You're connected to <Text style={{ fontWeight: '700' }}>Victoria Island</Text>
          </Text>
        </View>

        {/* Quick Start Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickStartScroll}>
          {[
            { emoji: '💬', label: 'Say Hi', action: 'Introduce yourself' },
            { emoji: '🛍️', label: 'Browse', action: 'Explore marketplace' },
            { emoji: '📅', label: 'Events', action: "See what's on" },
          ].map(c => (
            <View key={c.label} style={styles.quickCard}>
              <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
              <Text style={styles.quickAction}>{c.action}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)' as any)}>
                <Text style={styles.quickBtn}>{c.label} →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Feed Posts */}
        <ScrollView contentContainerStyle={styles.feedScroll} showsVerticalScrollIndicator={false}>
          {FEED_POSTS.map((post, i) => (
            <View key={i} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View
                  style={[
                    styles.postAvatar,
                    {
                      backgroundColor: post.isOfficial ? 'rgba(130,219,126,0.12)' : 'rgba(255,255,255,0.06)',
                      borderColor: post.isOfficial ? colors.G : colors.GLASS_BORDER,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{post.avatar}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.authorName}>{post.name}</Text>
                    <View
                      style={[
                        styles.tagBadge,
                        { backgroundColor: `${TAG_COLORS[post.tag]}18`, borderColor: `${TAG_COLORS[post.tag]}33` },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: TAG_COLORS[post.tag] }]}>
                        {post.tag.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.postMeta}>
                    {post.handle} · {post.time}
                  </Text>
                </View>
              </View>

              <Text style={styles.postText}>{post.text}</Text>

              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="heart-outline" size={16} color={colors.LABEL} />
                  <Text style={styles.actionCount}>{post.likes}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.LABEL} />
                  <Text style={styles.actionCount}>{post.comments}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginLeft: 'auto' }}>
                  <Ionicons name="share-outline" size={16} color={colors.LABEL} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              setActiveTab(i);
              if (i === 0) router.push('/(tabs)');
            }}
            style={styles.tabItem}
          >
            <Ionicons
              name={tabIcons[i]}
              size={20}
              color={i === activeTab ? colors.G : colors.LABEL}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: i === activeTab ? colors.G : colors.LABEL,
                  fontWeight: i === activeTab ? '600' : '400',
                },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.DARK,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  greetingText: {
    fontSize: 13,
    color: colors.LABEL,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(130,219,126,0.15)',
    borderWidth: 2,
    borderColor: colors.G,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(130,219,126,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.2)',
    borderRadius: 16,
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.G,
    shadowColor: colors.G,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  connectedText: {
    fontSize: 13,
    color: colors.G,
    fontWeight: '500',
  },
  quickStartScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
    marginBottom: 12,
  },
  quickCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
    borderRadius: radii.button,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    gap: 8,
  },
  quickAction: {
    fontSize: 12,
    color: colors.LABEL,
    lineHeight: 16,
  },
  quickBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.G,
  },
  feedScroll: {
    paddingHorizontal: 20,
    paddingBottom: 96,
    gap: 12,
  },
  postCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  postMeta: {
    fontSize: 12,
    color: colors.LABEL,
    marginTop: 2,
  },
  postText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    color: colors.LABEL,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(8,8,8,0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.GLASS_BORDER,
    paddingTop: 12,
    paddingBottom: 28,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
  },
  tabLabel: {
    fontSize: 10,
  },
});
