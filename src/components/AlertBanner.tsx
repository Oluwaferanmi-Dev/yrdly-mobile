import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../lib/alert-service';

interface AlertBannerProps {
  alert: Alert;
  onPress: () => void;
  onDismiss?: () => void; // Optional: Only community safety alerts might be dismissible
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onPress, onDismiss }) => {
  const isAmber = alert.type === 'amber';
  
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={[styles.container, isAmber ? styles.amberContainer : styles.safetyContainer]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons 
            name={isAmber ? "warning" : "shield-alert"} 
            size={20} 
            color={isAmber ? "#7f1d1d" : "#7c2d12"} 
          />
          <Text style={[styles.title, isAmber ? styles.amberText : styles.safetyText]}>
            {isAmber ? 'AMBER ALERT' : 'SAFETY ALERT'}
          </Text>
        </View>
        {onDismiss && !isAmber && (
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  amberContainer: {
    backgroundColor: '#fee2e2', // Red for missing child
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  safetyContainer: {
    backgroundColor: '#ffedd5', // Orange for safety
    borderWidth: 1,
    borderColor: '#fdba74',
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
