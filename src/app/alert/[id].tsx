import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Alert } from '../../lib/alert-service';

export default function AlertDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlert = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) {
        setAlert(data);
      } else {
        console.error('Alert not found:', error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAlert();
  }, [fetchAlert]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={G} />
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={[styles.container, { backgroundColor: DARK, paddingTop: insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER }}>
            <Ionicons name="chevron-back" size={18} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
          <Text style={[styles.emptyText, { color: LABEL }]}>Alert not found.</Text>
        </View>
      </View>
    );
  }

  const SEVERITY_COLORS = {
    urgent: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#ef4444', icon: '#ef4444' },
    caution: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', icon: '#f59e0b' },
    information: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6', icon: '#3b82f6' },
  };

  const isResolved = alert.status === 'resolved';
  const severityKey = ['urgent', 'caution'].includes(alert.severity || '') 
    ? alert.severity as keyof typeof SEVERITY_COLORS 
    : 'information';
  const c = SEVERITY_COLORS[severityKey];

  return (
    <View style={[styles.container, { backgroundColor: DARK, paddingTop: insets.top }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 34, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER }}>
          <Ionicons name="chevron-back" size={18} color={TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isResolved && (
          <View style={styles.resolutionBanner}>
            <Feather name="check" size={16} color={G} />
            <Text style={styles.resolutionText}>Resolved — This alert is no longer active.</Text>
          </View>
        )}

        {/* Hero */}
        <View style={[styles.hero, { 
          backgroundColor: isResolved ? '#0a0a0a' : c.bg, 
          borderColor: isResolved ? GLASS_BORDER : c.border 
        }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.typePill, { backgroundColor: `${c.icon}22`, borderColor: `${c.icon}44` }]}>
              <Text style={[styles.typeText, { color: isResolved ? LABEL : c.text }]}>
                {alert.type || alert.severity || 'ALERT'}
              </Text>
            </View>
            <Text style={styles.timeText}>{new Date(alert.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.title, { color: isResolved ? MUTED : '#FFF' }]}>{alert.title}</Text>
          <View style={styles.heroBottomRow}>
            <Text style={styles.areaText}>📍 {alert.last_seen_address || alert.area || 'Unknown Location'}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descLabel}>What Happened</Text>
          <Text style={styles.descText}>{alert.description}</Text>
        </View>

        {alert.subject_photo_url && (
          <Image source={{ uri: alert.subject_photo_url }} style={styles.photo} resizeMode="cover" />
        )}

        {(alert.subject_name || alert.source) && (
          <View style={styles.detailsCard}>
            {alert.subject_name && (
              <View style={styles.infoRow}>
                <Feather name="user" size={18} color={LABEL} />
                <Text style={styles.infoText}>
                  {alert.subject_name} {alert.subject_age ? `(${alert.subject_age} years old)` : ''}
                </Text>
              </View>
            )}
            {alert.source && (
              <View style={styles.infoRow}>
                <Feather name="info" size={18} color={LABEL} />
                <Text style={styles.infoText}>Source: {alert.source}</Text>
              </View>
            )}
          </View>
        )}

        {alert.contact_info && (
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: isResolved ? MUTED : c.icon }]}
            onPress={() => Linking.openURL(`tel:${alert.contact_info}`)}
            disabled={isResolved}
          >
            <Feather name="phone" size={18} color="#fff" />
            <Text style={styles.contactButtonText}>Contact {alert.contact_info}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 16, marginTop: 16, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16, paddingTop: 8 },
  resolutionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(130,219,126,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.2)',
    borderRadius: 14,
  },
  resolutionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: G,
  },
  hero: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderRadius: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: LABEL,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 8,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  areaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: LABEL,
  },
  descCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
  },
  descLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: LABEL,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  descText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 25,
  },
  detailsCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    gap: 16,
  },
  photo: { width: '100%', height: 300, borderRadius: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontFamily: 'Inter-Medium', fontSize: 15, color: TEXT_PRIMARY, flex: 1 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  contactButtonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
});
