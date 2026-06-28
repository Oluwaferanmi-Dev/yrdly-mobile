import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  Easing, 
  withDelay 
} from 'react-native-reanimated';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export function BusinessComingSoon() {
  const { colors } = useAppTheme();
  
  // Animations
  const pulseScale = useSharedValue(1);
  const floatY = useSharedValue(0);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacity3 = useSharedValue(0);

  useEffect(() => {
    // Pulse animation for the main icon background
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Floating animation for the icon
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Staggered fade in for floating elements
    opacity1.value = withDelay(300, withTiming(1, { duration: 800 }));
    opacity2.value = withDelay(600, withTiming(1, { duration: 800 }));
    opacity3.value = withDelay(900, withTiming(1, { duration: 800 }));
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const opacity1Style = useAnimatedStyle(() => ({
    opacity: opacity1.value,
  }));
  const opacity2Style = useAnimatedStyle(() => ({
    opacity: opacity2.value,
  }));
  const opacity3Style = useAnimatedStyle(() => ({
    opacity: opacity3.value,
  }));

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Animated Centerpiece */}
      <View style={styles.iconContainer}>
        {/* Background pulse rings */}
        <Animated.View style={[styles.pulseRing, { backgroundColor: colors.tint + '15' }, pulseStyle]} />
        <Animated.View style={[styles.pulseRingInner, { backgroundColor: colors.tint + '25' }, pulseStyle]} />
        
        {/* Main Icon */}
        <Animated.View style={[styles.mainIconWrapper, { backgroundColor: colors.tint }, floatStyle]}>
          <Feather name="briefcase" size={38} color="#FFFFFF" />
        </Animated.View>

        {/* Floating Accent Icons */}
        <Animated.View style={[styles.accentIcon, styles.accent1, { backgroundColor: colors.card, shadowColor: colors.text }, opacity1Style]}>
          <Feather name="trending-up" size={16} color={colors.tint} />
        </Animated.View>
        <Animated.View style={[styles.accentIcon, styles.accent2, { backgroundColor: colors.card, shadowColor: colors.text }, opacity2Style]}>
          <Feather name="star" size={18} color="#FFC107" />
        </Animated.View>
        <Animated.View style={[styles.accentIcon, styles.accent3, { backgroundColor: colors.card, shadowColor: colors.text }, opacity3Style]}>
          <Feather name="map-pin" size={16} color="#FF5252" />
        </Animated.View>
      </View>

      {/* Text Content */}
      <Text style={[styles.title, { color: colors.text }]}>
        Yrdly <Text style={{ color: colors.tint }}>Businesses</Text>
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        We are building a vibrant new space for you to discover, connect with, and support your favorite local shops and services.
      </Text>

      {/* Features List */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: colors.inputBackground }]}>
            <Feather name="search" size={16} color={colors.tint} />
          </View>
          <Text style={[styles.featureText, { color: colors.text }]}>Find local services near you</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: colors.inputBackground }]}>
            <Feather name="message-square" size={16} color={colors.tint} />
          </View>
          <Text style={[styles.featureText, { color: colors.text }]}>Connect directly with owners</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: colors.inputBackground }]}>
            <Feather name="star" size={16} color={colors.tint} />
          </View>
          <Text style={[styles.featureText, { color: colors.text }]}>Read and leave trusted reviews</Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity 
        style={[styles.notifyButton, { backgroundColor: colors.tint }]}
        activeOpacity={0.8}
      >
        <Feather name="bell" size={18} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.notifyButtonText}>Notify me when it's live</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  pulseRingInner: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  mainIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ rotate: '-3deg' }]
  },
  accentIcon: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  accent1: { top: 20, left: 16 },
  accent2: { top: 40, right: 10 },
  accent3: { bottom: 20, left: 24 },
  
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
    gap: 16,
    paddingHorizontal: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  notifyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
