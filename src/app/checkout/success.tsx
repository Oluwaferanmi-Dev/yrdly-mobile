import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withDelay, withSequence,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { formatPrice } from '../../lib/utils';
import { useAppTheme } from '../../context/ThemeContext';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const LOTTIE_SUCCESS = {
  uri: 'https://lottie.host/3acad958-cd8e-424a-a1c9-58e8bff45d87/XvFdYxtUDF.json',
};
const LOTTIE_CONFETTI = {
  uri: 'https://lottie.host/ea97d544-2453-48db-8cdb-7a35e9821946/LwHylkZ0X9.json',
};

const STEPS = [
  { icon: 'shield-checkmark-outline' as const, label: 'Funds\nsecured' },
  { icon: 'cube-outline' as const,             label: 'Seller\nships' },
  { icon: 'checkmark-done-outline' as const,   label: 'You\nconfirm' },
];

export default function CheckoutSuccessScreen() {
  const { colors, isDarkMode } = useAppTheme();
  const router = useRouter();
  const { transactionId, itemTitle, amount } = useLocalSearchParams<{
    transactionId: string; itemTitle: string; amount: string;
  }>();

  // ── Sheet slide-up ────────────────────────────────────────────
  const sheetY    = useSharedValue(0);
  const overlayOp = useSharedValue(1);

  // ── Content sequence ──────────────────────────────────────────
  const lottieOp  = useSharedValue(1);
  const titleOp   = useSharedValue(1);
  const titleY    = useSharedValue(0);
  const stepperOp = useSharedValue(1);
  const stepperY  = useSharedValue(0);
  const footerOp  = useSharedValue(1);
  const footerY   = useSharedValue(0);

  const lottieRef = useRef<LottieView>(null);

  function triggerHaptic() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  useEffect(() => {
    triggerHaptic();
  }, []);

  // ── Animated styles ───────────────────────────────────────────
  const overlayStyle  = useAnimatedStyle(() => ({ opacity: overlayOp.value }));
  const sheetStyle    = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const lottieStyle   = useAnimatedStyle(() => ({ opacity: lottieOp.value }));
  const titleStyle    = useAnimatedStyle(() => ({ opacity: titleOp.value, transform: [{ translateY: titleY.value }] }));
  const stepperStyle  = useAnimatedStyle(() => ({ opacity: stepperOp.value, transform: [{ translateY: stepperY.value }] }));
  const footerStyle   = useAnimatedStyle(() => ({ opacity: footerOp.value, transform: [{ translateY: footerY.value }] }));

  const amountNum = Number(amount ?? 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Confetti — full screen */}
      <LottieView
        autoPlay
        loop={false}
        style={styles.confetti}
        source={LOTTIE_CONFETTI}
        resizeMode="cover"
      />

      {/* Main content area */}
      <Animated.View style={[styles.sheet, { backgroundColor: colors.background, flex: 1 }, sheetStyle]}>
        <SafeAreaView edges={['bottom', 'top']} style={{ flex: 1, paddingTop: 40 }}>

          {/* ── Lottie hero ─────────────────────────── */}
          <Animated.View style={[styles.lottieWrapper, lottieStyle]}>
            <LottieView
              ref={lottieRef}
              autoPlay
              loop={false}
              style={styles.lottie}
              source={LOTTIE_SUCCESS}
            />
          </Animated.View>

          {/* ── Title + pill ─────────────────────────── */}
          <Animated.View style={[styles.titleBlock, titleStyle]}>
            <Text style={[styles.title, { color: colors.text }]}>Payment Successful!</Text>

            <View style={[styles.escrowPill, {
              backgroundColor: colors.tint + '15',
              borderColor: colors.tint + '35',
            }]}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.tint} style={{ marginRight: 5 }} />
              <Text style={[styles.pillText, { color: colors.tint }]}>
                {formatPrice(amountNum)} held in escrow
              </Text>
            </View>

            {!!itemTitle && (
              <Text style={[styles.itemLabel, { color: colors.textMuted }]} numberOfLines={2}>
                for <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{itemTitle}</Text>
              </Text>
            )}

            <Text style={[styles.body, { color: colors.textMuted }]}>
              Your funds are protected until you confirm receipt of the item.
            </Text>
          </Animated.View>

          {/* ── Stepper ───────────────────────────────── */}
          <Animated.View style={[styles.stepper, stepperStyle]}>
            {STEPS.map((step, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={styles.stepTrack}>
                  {i > 0 && (
                    <View style={[styles.stepLine, { backgroundColor: colors.tint + '35' }]} />
                  )}
                  <View style={[styles.stepDot, {
                    backgroundColor: isDarkMode ? colors.tint + '20' : colors.tint + '12',
                    borderColor: colors.tint + '50',
                  }]}>
                    <Ionicons name={step.icon} size={15} color={colors.tint} />
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: colors.tint + '35' }]} />
                  )}
                </View>
                <Text style={[styles.stepLabel, { color: colors.textMuted }]}>{step.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* ── Footer buttons ────────────────────────── */}
          <Animated.View style={[styles.footer, footerStyle]}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.tint, shadowColor: colors.tint }]}
              onPress={() => router.replace(`/transactions/${transactionId}` as any)}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, { color: '#fff' }]}>View Transaction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/(tabs)/' as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>

        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#111', // Solid background so it's not transparent over nothing
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
  },
  confetti: {
    position: 'absolute',
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: 0,
    pointerEvents: 'none',
  },

  // Sheet
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 24,
    zIndex: 10,
    // subtle shadow above sheet
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },

  // Drag handle
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },

  // Lottie
  lottieWrapper: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  lottie: {
    width: 180,
    height: 180,
  },

  // Title block
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  escrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemLabel: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
  },
  stepDot: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  stepLabel: {
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },

  // Footer
  footer: {
    gap: 8,
    paddingBottom: 8,
  },
  primaryBtn: {
    height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});
