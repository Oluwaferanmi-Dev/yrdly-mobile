import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { DisputeService } from '../../../lib/dispute-service';

const GREEN = '#388E3C';

const DISPUTE_REASONS = [
  { value: 'item_not_received', label: 'Item Not Received' },
  { value: 'item_not_as_described', label: 'Item Not as Described' },
  { value: 'counterfeit_item', label: 'Counterfeit / Fake Item' },
  { value: 'damaged_item', label: 'Item Arrived Damaged' },
  { value: 'seller_unresponsive', label: 'Seller is Unresponsive' },
  { value: 'other', label: 'Other' },
];

export default function DisputeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo access to attach evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      uploadPhotos(uris);
    }
  };

  const uploadPhotos = async (uris: string[]) => {
    if (!user) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const uri of uris) {
        const ext = uri.split('.').pop()?.split('?')[0] || 'jpeg';
        const fileName = `dispute_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `disputes/${fileName}`;
        const response = await fetch(uri);
        const blob = await response.blob();
        const { error } = await supabase.storage
          .from('images')
          .upload(filePath, blob, { contentType: `image/${ext}`, upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('images').getPublicUrl(filePath);
          if (data.publicUrl) uploaded.push(data.publicUrl);
        }
      }
      setPhotos(prev => [...prev, ...uploaded]);
    } catch (e) {
      Alert.alert('Upload Failed', 'Some photos could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !id) return;
    if (!selectedReason) {
      Alert.alert('Missing Reason', 'Please select a reason for the dispute.');
      return;
    }
    if (description.trim().length < 20) {
      Alert.alert('More Detail Needed', 'Please describe the issue in at least 20 characters.');
      return;
    }

    Alert.alert(
      'Open Dispute?',
      'This will pause the transaction while our team reviews your case. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Dispute',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await DisputeService.openDispute(id, user.id, selectedReason, {
                description: description.trim(),
                photos,
              });
              Alert.alert(
                'Dispute Opened',
                'Our team will review your case and get back to you within 24 hours.',
                [{ text: 'OK', onPress: () => { router.back(); router.back(); } }]
              );
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not open dispute. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open Dispute</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#1565C0" />
          <Text style={styles.infoText}>
            Disputes are reviewed by our team within 24 hours. The transaction will be paused until resolved.
          </Text>
        </View>

        {/* Reason Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REASON FOR DISPUTE</Text>
          {DISPUTE_REASONS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.reasonRow, selectedReason === r.value && styles.reasonRowSelected]}
              onPress={() => setSelectedReason(r.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.radio, selectedReason === r.value && styles.radioSelected]}>
                {selectedReason === r.value && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.reasonLabel, selectedReason === r.value && styles.reasonLabelSelected]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DESCRIBE THE ISSUE</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us what happened in as much detail as possible..."
            placeholderTextColor="#9E9E9E"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{description.length}/2000</Text>
        </View>

        {/* Photo Evidence */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PHOTO EVIDENCE (OPTIONAL)</Text>
          <Text style={styles.sectionSub}>Attach photos of the item or chat screenshots (max 5)</Text>
          <View style={styles.photosRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)}>
                  <Ionicons name="close-circle" size={20} color="#B71C1C" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhotos} disabled={uploading}>
                {uploading
                  ? <ActivityIndicator size="small" color={GREEN} />
                  : <Ionicons name="add" size={28} color={GREEN} />
                }
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!selectedReason || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedReason || submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.submitBtnText}>Open Dispute</Text>
          }
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F4' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 'bold', color: '#1C1C1C' },
  scroll: { padding: 16 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1565C0', lineHeight: 18 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  sectionSub: { fontSize: 12, color: '#9E9E9E', marginBottom: 12, marginTop: -8 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  reasonRowSelected: { borderColor: GREEN, backgroundColor: '#F1F8F1' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#BDBDBD',
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: GREEN },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },
  reasonLabel: { fontSize: 15, color: '#424242', fontWeight: '500' },
  reasonLabelSelected: { color: '#1C1C1C', fontWeight: '700' },
  textArea: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0E0E0',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#1C1C1C',
    minHeight: 130,
  },
  charCount: { fontSize: 11, color: '#BDBDBD', textAlign: 'right', marginTop: 4 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrapper: { position: 'relative', width: 80, height: 80 },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },
  removePhoto: { position: 'absolute', top: -8, right: -8 },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0E0E0',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#B71C1C', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#BDBDBD' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
