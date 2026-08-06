import { createStyleSheet, useStyles } from "react-native-unistyles";
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
const CATEGORIES = [
  { label: 'Bug / Technical Issue', value: 'bug' },
  { label: 'Marketplace Dispute', value: 'marketplace' },
  { label: 'Neighbour Behaviour', value: 'behaviour' },
  { label: 'Safety Concern', value: 'safety' },
  { label: 'Other / Feedback', value: 'other' },
];

export default function ReportScreen() {
  const { styles: s, theme } = useStyles(sStylesheet);

  const router = useRouter();
  const { user } = useAuth();
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in both the subject and description.');
      return;
    }

    setLoading(true);
    try {
      // 1. Try to insert into reports table if it exists
      const { error } = await supabase
        .from('reports')
        .insert({
          user_id: user?.id || null,
          category,
          subject: subject.trim(),
          description: description.trim(),
          status: 'open',
        });

      if (error) {
        // Table probably doesn't exist or RLS issue. Fallback to Email Support.
        console.warn('DB report insert failed, falling back to email client:', error);
        
        const mailUrl = `mailto:support@yrdly.ng?subject=[Report - ${category}] ${encodeURIComponent(subject)}&body=${encodeURIComponent(description)}`;
        const supported = await Linking.canOpenURL(mailUrl);
        if (supported) {
          await Linking.openURL(mailUrl);
          Alert.alert('Open Mail', 'We opened your email app to send the report. Please send the pre-filled email.');
          router.back();
        } else {
          Alert.alert('Error', 'Unable to open email client. Please send your report directly to support@yrdly.ng');
        }
      } else {
        Alert.alert('Thank You', 'Your report has been submitted successfully. Our team will review it shortly.');
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryLabel = CATEGORIES.find(c => c.value === category)?.label || 'Select Category';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Report an Issue</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.desc}>
          If you run into technical bugs, have marketplace disputes, or wish to report inappropriate content or behaviour, let us know below.
        </Text>

        {/* Category Dropdown */}
        <Text style={s.inputLabel}>ISSUE CATEGORY</Text>
        <TouchableOpacity style={s.dropdownBtn} onPress={() => setShowDropdown(!showDropdown)}>
          <Text style={s.dropdownBtnText}>{selectedCategoryLabel}</Text>
          <Ionicons name={showDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.LABEL} />
        </TouchableOpacity>

        {showDropdown && (
          <View style={s.dropdownOptions}>
            {CATEGORIES.map((c, idx) => {
            return (
                          <React.Fragment key={c.value}>
                            {idx > 0 && <View style={s.divider} />}
                            <TouchableOpacity
                              style={s.optionItem}
                              onPress={() => {
                                setCategory(c.value);
                                setShowDropdown(false);
                              }}
                            >
                              <Text style={[s.optionText, c.value === category && { color: theme.colors.G, fontFamily: 'Inter-SemiBold' }]}>
                                {c.label}
                              </Text>
                              {c.value === category && <Ionicons name="checkmark" size={16} color={theme.colors.G} />}
                            </TouchableOpacity>
                          </React.Fragment>
                        );
            })}
          </View>
        )}

        {/* Subject */}
        <Text style={[s.inputLabel, { marginTop: 16 }]}>SUBJECT</Text>
        <View style={s.inputBox}>
          <TextInput
            placeholder="e.g. Can't link bank account"
            placeholderTextColor={theme.colors.LABEL}
            style={s.textInput}
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        {/* Description */}
        <Text style={[s.inputLabel, { marginTop: 16 }]}>DESCRIPTION</Text>
        <View style={[s.inputBox, { height: 140, alignItems: 'flex-start', paddingTop: 12 }]}>
          <TextInput
            placeholder="Describe the issue in detail..."
            placeholderTextColor={theme.colors.LABEL}
            style={[s.textInput, { height: '100%', textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const sStylesheet = createStyleSheet(theme => ({
      root: { flex: 1, backgroundColor: theme.colors.DARK },
      header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.GLASS_BORDER },
      backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
      headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
      content: { padding: 20 },
      desc: { fontFamily: 'Inter', fontSize: 14, color: theme.colors.MUTED, lineHeight: 22, marginBottom: 24 },
      inputLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: theme.colors.MUTED, letterSpacing: 0.8, marginBottom: 8 },
      dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, borderRadius: 12, height: 48, paddingHorizontal: 16, marginBottom: 8 },
      dropdownBtnText: { fontFamily: 'Inter', fontSize: 14, color: '#fff' },
      dropdownOptions: { backgroundColor: theme.colors.SURFACE, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, overflow: 'hidden', marginBottom: 8 },
      optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
      optionText: { fontFamily: 'Inter', fontSize: 14, color: '#fff' },
      divider: { height: 1, backgroundColor: theme.colors.GLASS_BORDER },
      inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, borderRadius: 12, height: 48, paddingHorizontal: 16 },
      textInput: { flex: 1, color: '#fff', fontFamily: 'Inter', fontSize: 14, height: '100%' },
      submitBtn: { height: 50, borderRadius: 25, backgroundColor: theme.colors.G, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
      submitBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
    }));
