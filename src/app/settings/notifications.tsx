import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL } from '../../constants/tokens';

export default function NotificationsScreen() {
  const router = useRouter();
  
  const [notifs, setNotifs] = useState({ inquiries: true, offers: true, rsvp: true, hostUpdates: false, mentions: true, alerts: true });
  
  const toggle = (k: keyof typeof notifs) => setNotifs(p => ({ ...p, [k]: !p[k] }));

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}>
        
        {/* Marketplace */}
        <Text style={s.sectionTitle}>MARKETPLACE</Text>
        <View style={s.sectionCard}>
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="shopping-bag" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Item Inquiries</Text>
              <Text style={s.rowSub}>When someone messages about your listing</Text>
            </View>
            <Switch
              value={notifs.inquiries}
              onValueChange={() => toggle('inquiries')}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="tag" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Offers & Bids</Text>
              <Text style={s.rowSub}>Price offers on your items</Text>
            </View>
            <Switch
              value={notifs.offers}
              onValueChange={() => toggle('offers')}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
        </View>

        {/* Events */}
        <Text style={s.sectionTitle}>EVENTS</Text>
        <View style={s.sectionCard}>
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="calendar" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>RSVP Reminders</Text>
              <Text style={s.rowSub}>Upcoming events you've joined</Text>
            </View>
            <Switch
              value={notifs.rsvp}
              onValueChange={() => toggle('rsvp')}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="bell" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Host Updates</Text>
              <Text style={s.rowSub}>Changes to events you're attending</Text>
            </View>
            <Switch
              value={notifs.hostUpdates}
              onValueChange={() => toggle('hostUpdates')}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
        </View>

        {/* Community */}
        <Text style={s.sectionTitle}>COMMUNITY</Text>
        <View style={s.sectionCard}>
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="message-circle" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Mentions & Replies</Text>
              <Text style={s.rowSub}>When neighbours mention or reply to you</Text>
            </View>
            <Switch
              value={notifs.mentions}
              onValueChange={() => toggle('mentions')}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="shield" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Local Emergency Alerts</Text>
              <Text style={s.rowSub}>Safety alerts from your neighbourhood</Text>
            </View>
            <Switch
              value={notifs.alerts}
              onValueChange={() => toggle('alerts')}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#111', borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' },

  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 11, color: LABEL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16, marginLeft: 4 },
  sectionCard: { backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 24, overflow: 'hidden', marginBottom: 12 },
  
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText: { flex: 1, marginRight: 12 },
  rowTitle: { fontFamily: 'Outfit-Medium', fontSize: 15, color: '#fff', marginBottom: 2 },
  rowSub: { fontFamily: 'Inter', fontSize: 13, color: LABEL },
  divider: { height: 1, backgroundColor: GLASS_BORDER, marginHorizontal: 16 },
});
