import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { DARK, G, GLASS_BORDER, LABEL, MUTED, SURFACE } from '../../constants/tokens';

export default function SafetyAlertsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Safety Alerts</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.emptyState}>
          <View style={s.iconCircle}>
            <Feather name="alert-triangle" size={32} color={LABEL} />
          </View>
          <Text style={s.emptyTitle}>Safety Alerts</Text>
          <Text style={s.emptySub}>This section is currently under construction. Stay tuned for updates!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  content: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff', marginBottom: 8 },
  emptySub: { fontFamily: 'Inter', fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});
