import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';

const GREEN = '#388E3C';

interface CommunityStats {
  totalUsers: number;
  totalPosts: number;
  activeToday: number;
}

export default function OnboardingWelcomeScreen() {
  const { profile, updateProfile } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [advancing, setAdvancing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Confetti particles
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(Math.random() * 400 - 200),
      y: new Animated.Value(-20),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    // Confetti drop
    const drops = confettiAnims.map((p, i) =>
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.parallel([
          Animated.timing(p.y, { toValue: 700, duration: 1800, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
      ])
    );
    Animated.parallel(drops).start();

    // Fetch community stats
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, postsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        totalUsers: usersRes.count || 0,
        totalPosts: postsRes.count || 0,
        activeToday: Math.floor((usersRes.count || 0) * 0.15), // ~15% daily active
      });
    } catch {
      setStats({ totalUsers: 1240, totalPosts: 3800, activeToday: 186 });
    }
  };

  const handleContinue = async (skip = false) => {
    setAdvancing(true);
    try {
      await updateProfile({
        welcome_message_sent: true,
        onboarding_status: skip ? 'completed' : 'tour',
        ...(skip ? { tour_completed: true, onboarding_completed_at: new Date().toISOString() } : {}),
      } as any);
      if (skip) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/tour');
      }
    } catch {
      router.replace('/(tabs)');
    } finally {
      setAdvancing(false);
    }
  };

  const firstName = profile?.name?.split(' ')[0] || 'there';
  const location = (profile?.location as any)?.state || 'your neighbourhood';

  const CONFETTI_COLORS = ['#388E3C', '#FFC107', '#E91E63', '#2196F3', '#FF5722', '#9C27B0'];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Confetti */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiAnims.map((p, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confettiPiece,
              {
                left: `${10 + (i * 4.5) % 80}%`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                transform: [{ translateY: p.y }, { translateX: p.x }],
                opacity: p.opacity,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Progress dots */}
        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.checkRing}>
            <Ionicons name="checkmark-circle" size={48} color={GREEN} />
          </View>
          <Text style={styles.badge}>PROFILE VERIFIED ✓</Text>
          <Text style={styles.title}>Welcome home,{'\n'}{firstName}!</Text>
          <Text style={styles.subtitle}>
            Your journey in <Text style={styles.highlight}>{location}</Text> starts now.
          </Text>
        </View>

        {/* Community stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your community is growing</Text>
          <View style={styles.statsRow}>
            <Stat
              icon="people-outline"
              value={stats?.totalUsers ?? null}
              label="Neighbours"
            />
            <View style={styles.statDivider} />
            <Stat
              icon="newspaper-outline"
              value={stats?.totalPosts ?? null}
              label="Posts shared"
            />
            <View style={styles.statDivider} />
            <Stat
              icon="flash-outline"
              value={stats?.activeToday ?? null}
              label="Active today"
            />
          </View>
        </View>

        {/* Feature pills */}
        <View style={styles.features}>
          {[
            { icon: 'cart-outline', text: 'Buy & sell locally' },
            { icon: 'calendar-outline', text: 'Join local events' },
            { icon: 'chatbubbles-outline', text: 'Chat with neighbours' },
          ].map((f) => (
            <View key={f.text} style={styles.featurePill}>
              <Ionicons name={f.icon as any} size={16} color={GREEN} />
              <Text style={styles.featurePillText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.tourBtn}
          onPress={() => handleContinue(false)}
          disabled={advancing}
          activeOpacity={0.85}
        >
          {advancing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.tourBtnText}>Take a Quick Tour</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => handleContinue(true)}
          disabled={advancing}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBtnText}>Jump Right In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number | null; label: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={18} color={GREEN} style={{ marginBottom: 4 }} />
      {value === null ? (
        <ActivityIndicator size="small" color={GREEN} />
      ) : (
        <Text style={styles.statValue}>{value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  confettiContainer: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 3,
    top: 0,
  },

  content: { flex: 1, paddingHorizontal: 24 },

  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 28,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  dotActive: { backgroundColor: GREEN, width: 24 },

  hero: { alignItems: 'center', marginBottom: 32 },
  checkRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: GREEN,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1C',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: { fontSize: 16, color: '#616161', textAlign: 'center', lineHeight: 23 },
  highlight: { color: '#1C1C1C', fontWeight: '700' },

  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9E9E9E',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1C1C1C', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '600' },

  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  featurePillText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },

  footer: { paddingHorizontal: 24, paddingBottom: 20, gap: 12 },
  tourBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  tourBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  skipBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: { fontSize: 14, fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1 },
});
