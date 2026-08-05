import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/use-supabase-auth';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED } from '../../constants/tokens';

export default function LocationSettingsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [radius, setRadius] = useState('3km');
  const radii = ['1km', '3km', '5km', '10km'];

  const lga = (profile?.location as any)?.lga || 'Eti-Osa LGA';
  const state = (profile?.location as any)?.state || 'Lagos State';
  const neighborhood = (profile as any)?.neighborhood || 'Victoria Island';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Location</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10, gap: 20 }}>
        
        {/* Current Neighbourhood */}
        <View style={s.card}>
          <Text style={s.cardTitle}>VERIFIED NEIGHBOURHOOD</Text>
          <View style={s.currentWrap}>
            <View style={s.iconWrap}>
              <Feather name="map-pin" size={18} color={G} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.neighName}>{neighborhood}</Text>
              <Text style={s.neighRegion}>{lga}, {state}</Text>
            </View>
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedTxt}>VERIFIED</Text>
            </View>
          </View>
          <TouchableOpacity style={s.refreshBtn}>
            <Ionicons name="navigate-outline" size={16} color={MUTED} style={{ marginRight: 6 }} />
            <Text style={s.refreshBtnTxt}>Refresh GPS Location</Text>
          </TouchableOpacity>
        </View>

        {/* Proximity Radius */}
        <View>
          <Text style={s.cardTitle}>PROXIMITY RADIUS</Text>
          <Text style={s.radiusDesc}>Content and neighbours within this distance will appear in your local feed.</Text>
          <View style={s.radiiWrap}>
            {radii.map(r => {
              const isSel = radius === r;
              return (
                <TouchableOpacity 
                  key={r} 
                  onPress={() => setRadius(r)} 
                  style={[s.radiusBtn, isSel ? { backgroundColor: G, borderColor: G } : { backgroundColor: '#0f0f0f', borderColor: GLASS_BORDER }]}
                >
                  <Text style={[s.radiusBtnTxt, isSel ? { color: DARK } : { color: LABEL }]}>{r}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerTxt}>
            📍 Your exact coordinates are never stored or shared. YRDLY uses approximate location to match you with the right neighbourhood community.
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

  card: { backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 24, padding: 20 },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: 11, color: LABEL, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  
  currentWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.08)', alignItems: 'center', justifyContent: 'center' },
  neighName: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' },
  neighRegion: { fontFamily: 'Inter', fontSize: 12, color: LABEL },
  
  verifiedBadge: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(130,219,126,0.1)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.2)' },
  verifiedTxt: { fontFamily: 'Inter-Bold', fontSize: 11, color: G },

  refreshBtn: { width: '100%', height: 44, borderRadius: 14, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  refreshBtnTxt: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },

  radiusDesc: { fontFamily: 'Inter', fontSize: 13, color: LABEL, marginBottom: 14, lineHeight: 20 },
  radiiWrap: { flexDirection: 'row', gap: 12 },
  radiusBtn: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  radiusBtnTxt: { fontFamily: 'Outfit-Bold', fontSize: 14 },

  disclaimer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: GLASS_BORDER, padding: 16 },
  disclaimerTxt: { fontFamily: 'Inter', fontSize: 12, color: LABEL, lineHeight: 19.8 },
});
