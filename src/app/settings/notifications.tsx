import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  SafeAreaView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';

const GREEN = '#388E3C';

interface NotificationSettings {
  messages: boolean;
  friendRequests: boolean;
  postUpdates: boolean;
  comments: boolean;
  postLikes: boolean;
  eventInvites: boolean;
  orderUpdates: boolean;
  disputeUpdates: boolean;
  paymentReceived: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  messages: true,
  friendRequests: true,
  postUpdates: true,
  comments: true,
  postLikes: true,
  eventInvites: true,
  orderUpdates: true,
  disputeUpdates: true,
  paymentReceived: true,
};

const NOTIFICATION_GROUPS = [
  {
    title: 'Social',
    items: [
      { key: 'messages' as const, label: 'Messages', desc: 'When someone sends you a message', icon: 'chatbubble-outline' },
      { key: 'friendRequests' as const, label: 'Follow Requests', desc: 'When someone follows you', icon: 'person-add-outline' },
      { key: 'comments' as const, label: 'Comments', desc: 'When someone comments on your post', icon: 'chatbox-outline' },
      { key: 'postLikes' as const, label: 'Post Likes', desc: 'When someone likes your post', icon: 'heart-outline' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { key: 'orderUpdates' as const, label: 'Order Updates', desc: 'Transaction and escrow status changes', icon: 'receipt-outline' },
      { key: 'paymentReceived' as const, label: 'Payment Received', desc: 'When a buyer pays for your item', icon: 'cash-outline' },
      { key: 'disputeUpdates' as const, label: 'Dispute Updates', desc: 'Changes to your dispute cases', icon: 'warning-outline' },
    ],
  },
  {
    title: 'Events',
    items: [
      { key: 'eventInvites' as const, label: 'Event Invites', desc: 'Invitations to local events', icon: 'calendar-outline' },
      { key: 'postUpdates' as const, label: 'Post Activity', desc: 'Updates to posts you follow', icon: 'newspaper-outline' },
    ],
  },
];

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('notification_settings')
        .eq('id', user.id)
        .single();
      if (data?.notification_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.notification_settings });
      }
      setLoading(false);
    })();
  }, [user]);

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!user) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(key);
    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_settings: newSettings })
        .eq('id', user.id);
      if (error) throw error;
    } catch {
      // Revert on failure
      setSettings(settings);
      Alert.alert('Error', 'Failed to save notification preference.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Choose which notifications you receive. These apply to both push and in-app notifications.
          </Text>

          {NOTIFICATION_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
              <View style={styles.groupCard}>
                {group.items.map((item, index) => (
                  <View
                    key={item.key}
                    style={[styles.row, index < group.items.length - 1 && styles.rowDivider]}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons name={item.icon as any} size={20} color={GREEN} />
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      <Text style={styles.rowDesc}>{item.desc}</Text>
                    </View>
                    {saving === item.key ? (
                      <ActivityIndicator size="small" color={GREEN} />
                    ) : (
                      <Switch
                        value={settings[item.key]}
                        onValueChange={(v) => handleToggle(item.key, v)}
                        trackColor={{ false: '#E0E0E0', true: `${GREEN}66` }}
                        thumbColor={settings[item.key] ? GREEN : '#FFFFFF'}
                        ios_backgroundColor="#E0E0E0"
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 'bold', color: '#1C1C1C' },
  scroll: { padding: 16 },
  intro: { fontSize: 13, color: '#9E9E9E', marginBottom: 20, lineHeight: 18 },
  group: { marginBottom: 24 },
  groupTitle: {
    fontSize: 11, fontWeight: '800', color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  groupCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#1C1C1C', marginBottom: 2 },
  rowDesc: { fontSize: 12, color: '#9E9E9E' },
});
