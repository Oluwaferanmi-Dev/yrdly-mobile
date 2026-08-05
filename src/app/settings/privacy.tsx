import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED } from '../../constants/tokens';

export default function PrivacyScreen() {
  const router = useRouter();

  const [search, setSearch] = useState(true);
  const [dms, setDms] = useState(true);
  const [gps, setGps] = useState(false);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy & Discoverability</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}>
        
        {/* Visibility */}
        <Text style={s.sectionTitle}>VISIBILITY</Text>
        <View style={s.sectionCard}>
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="user" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Show Profile in Local Search</Text>
              <Text style={s.rowSub}>Neighbours can find you by name or handle</Text>
            </View>
            <Switch
              value={search}
              onValueChange={setSearch}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="message-square" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Allow Direct Messages</Text>
              <Text style={s.rowSub}>From verified neighbours only</Text>
            </View>
            <Switch
              value={dms}
              onValueChange={setDms}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
        </View>

        {/* Location */}
        <Text style={s.sectionTitle}>LOCATION</Text>
        <View style={s.sectionCard}>
          <View style={s.row}>
            <View style={s.iconWrap}>
              <Feather name="map-pin" size={18} color="#fff" />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>Share Live GPS Location</Text>
              <Text style={s.rowSub}>For proximity feed — never stored</Text>
            </View>
            <Switch
              value={gps}
              onValueChange={setGps}
              trackColor={{ false: '#353534', true: G }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#353534"
            />
          </View>
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerTxt}>
            🔒 Your exact address is never visible to other users. YRDLY only shares your general neighbourhood zone (e.g., "Victoria Island") unless you explicitly opt in to GPS sharing above.
          </Text>
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

  disclaimer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginTop: 8 },
  disclaimerTxt: { fontFamily: 'Inter', fontSize: 12, color: LABEL, lineHeight: 19.8 }, // 1.65 * 12
});
