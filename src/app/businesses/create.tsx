import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';

export default function CreateBusinessScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isVerified = (profile as any)?.verified_seller;

  if (!isVerified) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.tint} style={{ marginBottom: 16 }} />
        <Text style={[s.errorTxt, { color: colors.text }]}>Verification Required</Text>
        <Text style={[s.subErrorTxt, { color: colors.textMuted }]}>You must be a verified seller to create a business.</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.tint, marginTop: 24 }]} onPress={() => router.back()}>
          <Text style={[s.btnTxt, { color: '#000' }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCreate = async () => {
    if (!name.trim() || !category.trim() || !location.trim()) {
      Alert.alert('Error', 'Please fill out the name, category, and location.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: user?.id,
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          location: location.trim(),
          phone: phone.trim(),
          owner_name: profile?.name || user?.user_metadata?.name || 'Seller',
          owner_avatar: profile?.avatar_url || user?.user_metadata?.avatar_url,
          status: 'active'
        })
        .select('id')
        .single();

      if (error) throw error;
      
      Alert.alert('Success', 'Business created successfully!', [
        { text: 'OK', onPress: () => router.replace(`/businesses/${data.id}` as any) }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create business.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Create Business</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollPad} showsVerticalScrollIndicator={false}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Business Details</Text>
        
        <Text style={[s.label, { color: colors.textSecondary }]}>Business Name *</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="e.g. Jane's Bakery"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[s.label, { color: colors.textSecondary }]}>Category *</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="e.g. Food & Drinks"
          placeholderTextColor={colors.textMuted}
          value={category}
          onChangeText={setCategory}
        />

        <Text style={[s.label, { color: colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[s.input, s.textarea, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="Tell customers about your business..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 16 }]}>Contact Info</Text>

        <Text style={[s.label, { color: colors.textSecondary }]}>Location / Address *</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="e.g. 123 Main St, Lagos"
          placeholderTextColor={colors.textMuted}
          value={location}
          onChangeText={setLocation}
        />

        <Text style={[s.label, { color: colors.textSecondary }]}>Phone Number</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="+234..."
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TouchableOpacity 
          style={[s.submitBtn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]} 
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={[s.submitBtnTxt, { color: '#000' }]}>Create Business</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  scrollPad: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 },
  textarea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitBtnTxt: { fontSize: 16, fontWeight: '700' },
  errorTxt: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  subErrorTxt: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnTxt: { fontSize: 16, fontWeight: 'bold' }
});
