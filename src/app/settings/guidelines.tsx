import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GLASS_BORDER, SURFACE, LABEL } from '../../constants/tokens';

export default function GuidelinesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Neighbourhood Guidelines</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>What we stand for</Text>
        <Text style={s.subtitle}>
          YRDLY is built on trust, respect, and community. Please follow these guidelines to keep our platform safe and welcoming for everyone.
        </Text>
        
        <View style={s.card}>
          <Text style={s.cardTitle}>1. Be Respectful</Text>
          <Text style={s.cardText}>Treat all neighbours with kindness. Harassment, hate speech, or discrimination will not be tolerated.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>2. Keep it Local</Text>
          <Text style={s.cardText}>Focus on matters relevant to your neighbourhood. Avoid spam or overly promotional content.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>3. Promote Safety</Text>
          <Text style={s.cardText}>Report any suspicious activity or emergencies accurately without inciting panic.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  content: { padding: 24 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', marginBottom: 12 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: LABEL, lineHeight: 22, marginBottom: 24 },
  card: { backgroundColor: '#0f0f0f', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: GLASS_BORDER, marginBottom: 16 },
  cardTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff', marginBottom: 6 },
  cardText: { fontFamily: 'Inter-Regular', fontSize: 14, color: LABEL, lineHeight: 20 }
});
