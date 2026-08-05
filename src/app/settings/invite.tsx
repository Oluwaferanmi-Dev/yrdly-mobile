import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GLASS_BORDER, SURFACE, LABEL, G } from '../../constants/tokens';

export default function InviteScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Invite Neighbours</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={s.content}>
        <Text style={s.title}>Grow your community</Text>
        <Text style={s.subtitle}>
          Invite your friends and neighbours to join YRDLY and start building a stronger, safer local network together.
        </Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => {}}>
          <Text style={s.primaryBtnText}>Share Invite Link</Text>
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
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: LABEL, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  primaryBtn: { backgroundColor: G, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 100 },
  primaryBtnText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#000' }
});
