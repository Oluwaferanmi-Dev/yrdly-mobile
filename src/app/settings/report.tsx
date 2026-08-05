import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GLASS_BORDER, SURFACE, LABEL, G } from '../../constants/tokens';

export default function ReportScreen() {
  const router = useRouter();
  const [issue, setIssue] = useState('');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Report an Issue</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>What is the problem?</Text>
          <Text style={s.subtitle}>
            Please describe the issue or inappropriate content you encountered. We review all reports carefully.
          </Text>
          
          <TextInput
            style={s.input}
            placeholder="Type your report here..."
            placeholderTextColor={LABEL}
            multiline
            value={issue}
            onChangeText={setIssue}
          />
          
          <TouchableOpacity style={[s.primaryBtn, { opacity: issue.trim() ? 1 : 0.5 }]} onPress={() => router.back()} disabled={!issue.trim()}>
            <Text style={s.primaryBtnText}>Submit Report</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  content: { padding: 24, flexGrow: 1 },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', marginBottom: 12 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: LABEL, lineHeight: 22, marginBottom: 24 },
  input: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24
  },
  primaryBtn: { backgroundColor: G, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 100, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#000' }
});
