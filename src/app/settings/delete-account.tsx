import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GLASS_BORDER, SURFACE, LABEL } from '../../constants/tokens';

export default function DeleteAccountScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Delete Account</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={s.content}>
        <View style={s.warningIcon}>
          <Ionicons name="warning" size={40} color="#ef4444" />
        </View>
        <Text style={s.title}>Request Account Deletion</Text>
        <Text style={s.subtitle}>
          Are you sure you want to delete your account? This action cannot be undone. All your posts, events, and marketplace listings will be permanently removed.
        </Text>
        <TouchableOpacity style={s.dangerBtn} onPress={() => {}}>
          <Text style={s.dangerBtnText}>Yes, Delete My Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  warningIcon: { marginBottom: 16 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: LABEL, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  dangerBtn: { backgroundColor: '#ef4444', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 100 },
  dangerBtnText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' }
});
