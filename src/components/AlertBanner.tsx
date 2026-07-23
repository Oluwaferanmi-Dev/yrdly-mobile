import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../lib/alert-service';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';

interface AlertBannerProps {
  alert: Alert;
  onPress: () => void;
  onDismiss?: () => void; // Optional: Only community safety alerts might be dismissible
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onPress, onDismiss }) => {
  const isAmber = alert.type === 'amber';
  
  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons 
            name={isAmber ? "warning" : "alert-circle"} 
            size={20} 
            color={isAmber ? "#7f1d1d" : "#7c2d12"} 
          />
          <Text style={[styles.title, isAmber ? styles.amberText : styles.safetyText]}>
            {isAmber ? 'AMBER ALERT' : 'SAFETY ALERT'}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name="close" size={20} color={isAmber ? "#7f1d1d" : "#7c2d12"} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        {alert.subject_photo_url && (
          <Image 
            source={{ uri: alert.subject_photo_url }} 
            style={styles.photo}
            contentFit="cover"
            cachePolicy="disk"
          />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.alertTitle} numberOfLines={1}>{alert.title}</Text>
          <Text style={styles.description} numberOfLines={2}>{alert.description}</Text>
          {alert.last_seen_address && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={12} color="#4b5563" />
              <Text style={styles.locationText} numberOfLines={1}>
                {alert.last_seen_address}
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={styles.touchContainer}
    >
      {isLiquidGlassSupported ? (
        <LiquidGlassView
          {...({ intensity: 90, tint: "light", fallbackColor: isAmber ? 'rgba(254, 226, 226, 0.95)' : 'rgba(255, 237, 213, 0.95)' } as any)}
          style={[styles.container, isAmber ? styles.amberContainer : styles.safetyContainer]}
        >
          {content}
        </LiquidGlassView>
      ) : (
        <BlurView
          intensity={90}
          tint="light"
          style={[styles.container, isAmber ? styles.amberContainer : styles.safetyContainer]}
        >
          {content}
        </BlurView>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'visible',
  },
  container: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  amberContainer: {
    backgroundColor: 'rgba(254, 226, 226, 0.4)', // Liquid Glass Red
    borderColor: 'rgba(252, 165, 165, 0.5)',
  },
  safetyContainer: {
    backgroundColor: 'rgba(255, 237, 213, 0.4)', // Liquid Glass Orange
    borderColor: 'rgba(253, 186, 116, 0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  amberText: {
    color: '#7f1d1d',
  },
  safetyText: {
    color: '#7c2d12',
  },
  content: {
    flexDirection: 'row',
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  alertTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#4b5563',
    marginLeft: 4,
  },
});
