import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Animated, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const SLIDES = [
  {
    id: 'feed',
    icon: 'home' as const,
    color: '#388E3C',
    bg: '#E8F5E9',
    title: 'Your Neighbourhood Feed',
    description:
      'See what\'s happening right around you. Share updates, ask for help, and stay connected with the people next door.',
  },
  {
    id: 'marketplace',
    icon: 'shopping-cart' as const,
    color: '#1976D2',
    bg: '#E3F2FD',
    title: 'Buy & Sell Locally',
    description:
      'List items you no longer need or find great deals from neighbours. Safe, simple, and community-first commerce.',
  },
  {
    id: 'events',
    icon: 'calendar' as const,
    color: '#E64A19',
    bg: '#FBE9E7',
    title: 'Local Events',
    description:
      'Discover markets, meetups, and celebrations in your area. Host your own event and invite the community.',
  },
  {
    id: 'messages',
    icon: 'message-square' as const,
    color: '#6A1B9A',
    bg: '#F3E5F5',
    title: 'Connect Directly',
    description:
      'Chat with neighbours, negotiate on marketplace listings, and build real relationships — all in one place.',
  },
];

export default function OnboardingTourScreen() {
  const { colors } = useAppTheme();
  const { updateProfile } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setActiveIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await updateProfile({
        tour_completed: true,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date().toISOString(),
      } as any);
    } catch {
      // continue regardless
    } finally {
      setFinishing(false);
      router.replace('/(tabs)');
    }
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Progress */}
      <View style={styles.progress}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive, { backgroundColor: colors.tint }]} />
      </View>

      {/* Skip */}
      <TouchableOpacity style={styles.skipTop} onPress={handleFinish} disabled={finishing}>
        <Text style={[styles.skipTopText, { color: colors.textMuted }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.flex}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={styles.slide}>
            {/* Icon bubble */}
            <View style={[styles.iconBubble, { backgroundColor: slide.bg }]}>
              <Feather name={slide.icon} size={56} color={slide.color} />
            </View>

            {/* Slide number */}
            <Text style={[styles.slideNumber, { color: colors.textMuted }]}>{i + 1} / {SLIDES.length}</Text>

            <Text style={[styles.slideTitle, { color: slide.color }]}>{slide.title}</Text>
            <Text style={[styles.slideDesc, { color: colors.textMuted }]}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.indicators}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              scrollRef.current?.scrollTo({ x: i * width, animated: true });
              setActiveIndex(i);
            }}
          >
            <Animated.View
              style={[
                styles.indicator,
                i === activeIndex && [styles.indicatorActive, { backgroundColor: colors.tint }],
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }, isLast && styles.finishBtn]}
          onPress={handleNext}
          disabled={finishing}
          activeOpacity={0.85}
        >
          {finishing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {isLast ? "Let's Go! 🎉" : 'Next'}
              </Text>
              {!isLast && (
                <Feather name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 8 }} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  dotActive: { width: 24 },

  skipTop: { position: 'absolute', top: 56, right: 24, zIndex: 10, paddingVertical: 6, paddingHorizontal: 12 },
  skipTopText: { fontSize: 14, fontWeight: '600' },

  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconBubble: {
    width: 140, height: 140, borderRadius: 70,
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  slideNumber: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  slideTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16, lineHeight: 36 },
  slideDesc: { fontSize: 16, textAlign: 'center', lineHeight: 25, maxWidth: 300 },

  indicators: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  indicatorActive: { width: 24 },

  footer: { paddingHorizontal: 24, paddingBottom: 20 },
  nextBtn: {
    borderRadius: 14, height: 56, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  finishBtn: { shadowOpacity: 0.45 },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
});
