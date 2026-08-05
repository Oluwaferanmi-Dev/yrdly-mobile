import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { DARK, G, GLASS_BORDER, LABEL, MUTED, SURFACE } from '../../constants/tokens';

export default function GuidelinesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Community Guidelines</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.tagline}>Welcome to your neighbourhood group! Our guidelines help keep our community safe, clean, and friendly.</Text>

        {/* Card 1 */}
        <View style={s.sectionCard}>
          <View style={s.cardHeader}>
            <Feather name="smile" size={20} color={G} />
            <Text style={s.cardTitle}>Be Helpful & Respectful</Text>
          </View>
          <Text style={s.cardBody}>
            Treat your neighbours with kindness. We have zero tolerance for harassment, discrimination, or hate speech. Always communicate constructively in discussions and transactions.
          </Text>
        </View>

        {/* Card 2 */}
        <View style={s.sectionCard}>
          <View style={s.cardHeader}>
            <Feather name="shield" size={20} color={G} />
            <Text style={s.cardTitle}>Trade Safely & Honestly</Text>
          </View>
          <Text style={s.cardBody}>
            Describe items honestly in the marketplace. Meet in public, well-lit spaces for handovers. Use our integrated escrow payments to protect your transactions from fraud.
          </Text>
        </View>

        {/* Card 3 */}
        <View style={s.sectionCard}>
          <View style={s.cardHeader}>
            <Feather name="map-pin" size={20} color={G} />
            <Text style={s.cardTitle}>Keep it Local & Relevant</Text>
          </View>
          <Text style={s.cardBody}>
            Post announcements, events, and listings that directly affect your local community. Do not spam groups with external advertising, links, or off-topic discussions.
          </Text>
        </View>

        {/* Card 4 */}
        <View style={s.sectionCard}>
          <View style={s.cardHeader}>
            <Feather name="flag" size={20} color={G} />
            <Text style={s.cardTitle}>Report Suspicious Activity</Text>
          </View>
          <Text style={s.cardBody}>
            Help us protect the neighbourhood. If you notice listings that look like scams, or users acting inappropriately, flag them immediately using the "Report" button.
          </Text>
        </View>

        <Text style={s.footerText}>
          By participating in YRDLY, you agree to uphold these standards. Violating community guidelines may lead to account suspension or ban.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  tagline: { fontFamily: 'Inter', fontSize: 14, color: MUTED, lineHeight: 22, marginBottom: 24, textAlign: 'center', paddingHorizontal: 12 },
  sectionCard: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: GLASS_BORDER, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' },
  cardBody: { fontFamily: 'Inter', fontSize: 13, color: LABEL, lineHeight: 20 },
  footerText: { fontFamily: 'Inter', fontSize: 12, color: MUTED, lineHeight: 18, textAlign: 'center', marginTop: 16, paddingHorizontal: 16 },
});
