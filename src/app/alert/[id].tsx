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
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!alert) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Alert Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Alert not found.</Text>
        </View>
      </View>
    );
  }

  const getAlertColor = () => {
    switch (alert.type) {
      case 'amber': return '#ef4444'; // Red
      case 'missing_person': return '#f59e0b'; // Amber
      case 'community_safety': return '#3b82f6'; // Blue
      default: return colors.tint;
    }
  };

  const alertColor = getAlertColor();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Alert Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.banner, { backgroundColor: alertColor + '20', borderColor: alertColor }]}>
          <Ionicons name="alert-circle" size={24} color={alertColor} />
          <Text style={[styles.bannerText, { color: alertColor }]}>
            {alert.type === 'amber' ? 'AMBER ALERT' : 
             alert.type === 'missing_person' ? 'MISSING PERSON' : 'COMMUNITY SAFETY'}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{alert.title}</Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {new Date(alert.created_at).toLocaleString()}
        </Text>

        <Text style={[styles.description, { color: colors.text }]}>{alert.description}</Text>

        {alert.subject_photo_url && (
          <Image source={{ uri: alert.subject_photo_url }} style={styles.photo} resizeMode="cover" />
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {alert.subject_name && (
            <View style={styles.infoRow}>
              <Feather name="user" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {alert.subject_name} {alert.subject_age ? `(${alert.subject_age} years old)` : ''}
              </Text>
            </View>
          )}

          {alert.last_seen_address && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Last seen: {alert.last_seen_address}
              </Text>
            </View>
          )}

          {alert.source && (
            <View style={styles.infoRow}>
              <Feather name="info" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Source: {alert.source}
              </Text>
            </View>
          )}
        </View>

        {alert.contact_info && (
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: alertColor }]}
            onPress={() => Linking.openURL(`tel:${alert.contact_info}`)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18 },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 16, marginTop: 16, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: { fontFamily: 'Inter-Bold', fontSize: 14, marginLeft: 8 },
  title: { fontFamily: 'Inter-Bold', fontSize: 24, marginBottom: 8 },
  time: { fontFamily: 'Inter-Medium', fontSize: 14, marginBottom: 16 },
  description: { fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 24, marginBottom: 24 },
  photo: { width: '100%', height: 300, borderRadius: 12, marginBottom: 24 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24, gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontFamily: 'Inter-Medium', fontSize: 16, flex: 1 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
});
