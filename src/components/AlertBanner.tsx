import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../lib/alert-service';
import { G, MUTED, LABEL, GLASS_BORDER } from '../constants/tokens';

interface AlertBannerProps {
  alert: Alert;
  onPress: () => void;
  onDismiss?: () => void;
}

const SEVERITY_COLORS = {
  urgent: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#ef4444', icon: '#ef4444' },
  caution: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', icon: '#f59e0b' },
  information: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6', icon: '#3b82f6' },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onPress }) => {
  const isResolved = alert.status === 'resolved';
  
  // Map severity to standard colors, defaulting to 'information'
  const severityKey = ['urgent', 'caution'].includes(alert.severity || '') 
    ? alert.severity as keyof typeof SEVERITY_COLORS 
    : 'information';
  const c = SEVERITY_COLORS[severityKey];

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress}
      style={[
        styles.container, 
        { 
          backgroundColor: isResolved ? '#0a0a0a' : c.bg,
          borderColor: isResolved ? GLASS_BORDER : c.border,
          opacity: isResolved ? 0.6 : 1,
        }
      ]}
    >
      <Ionicons 
        name="warning-outline" 
        size={18} 
        color={isResolved ? LABEL : c.icon} 
        style={{ marginTop: 2 }}
      />
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.type, { color: isResolved ? LABEL : c.text }]}>
            {alert.type || alert.severity || 'ALERT'}
          </Text>
          <Text style={styles.time}>
            · {new Date(alert.created_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={[styles.title, { color: isResolved ? MUTED : '#FFF' }]} numberOfLines={1}>
          {alert.title}
        </Text>

        <Text style={styles.area} numberOfLines={1}>
          📍 {alert.last_seen_address || alert.area || 'Unknown Location'}
        </Text>
      </View>

      {isResolved && (
        <View style={styles.resolvedBadge}>
          <Text style={styles.resolvedText}>RESOLVED</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 20,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  type: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  time: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: LABEL,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  area: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: LABEL,
  },
  resolvedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(130,219,126,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.15)',
    flexShrink: 0,
  },
  resolvedText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10,
    color: G,
  },
});
