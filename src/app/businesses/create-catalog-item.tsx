import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { StorageService } from '../../lib/storage-service';
import { useAuth } from '../../hooks/use-supabase-auth';

const CATALOG_CATEGORIES = ['Product', 'Service', 'Digital', 'Other'];

export default function CreateCatalogItemScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { businessId } = useLocalSearchParams();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATALOG_CATEGORIES[0]);
  const [inStock, setInStock] = useState(true);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setImageUris(prev => [...prev, ...uris]);
    }
  };

  const removeImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert('Error', 'Please enter a title and price.');
      return;
    }
    if (!businessId || typeof businessId !== 'string') {
      Alert.alert('Error', 'Invalid business context.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the catalog item record first
      const { data, error } = await supabase
        .from('catalog_items')
        .insert({
          business_id: businessId,
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
          category,
          in_stock: inStock,
        })
        .select('id')
        .single();

      if (error) throw error;
      const itemId = data.id;

      // 2. Upload images
      const imageUrls: string[] = [];
      if (imageUris.length > 0) {
        for (let i = 0; i < imageUris.length; i++) {
          // Re-use uploadBusinessImage or use uploadPostImage
          const { url } = await StorageService.uploadBusinessImage(businessId, { uri: imageUris[i], name: `catalog_${itemId}_${i}.jpg`, type: 'image/jpeg' });
          if (url) imageUrls.push(url);
        }
      }

      // 3. Update the record with image URLs
      if (imageUrls.length > 0) {
        await supabase.from('catalog_items').update({
          images: imageUrls
        }).eq('id', itemId);
      }

      Alert.alert('Success', 'Item added to catalog!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add item to catalog.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Add Catalog Item</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollPad} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Text style={[s.label, { color: colors.textSecondary }]}>Item Title *</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="e.g. Handmade Soap"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[s.label, { color: colors.textSecondary }]}>Price (₦) *</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="e.g. 5000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <Text style={[s.label, { color: colors.textSecondary }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {CATALOG_CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat}
                style={[
                  s.categoryChip, 
                  { backgroundColor: category === cat ? colors.tint : colors.inputBackground }
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={{ 
                  color: category === cat ? '#000' : colors.text,
                  fontWeight: category === cat ? 'bold' : 'normal'
                }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[s.input, s.textarea, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Describe the item..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <View style={s.switchRow}>
            <Text style={[s.label, { color: colors.text, marginBottom: 0 }]}>In Stock</Text>
            <Switch
              value={inStock}
              onValueChange={setInStock}
              trackColor={{ false: colors.borderLight, true: colors.tint }}
            />
          </View>

          <Text style={[s.label, { color: colors.textSecondary, marginTop: 16 }]}>Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galleryScroll}>
            <TouchableOpacity style={[s.addGalleryBtn, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]} onPress={pickImage}>
              <Ionicons name="add" size={32} color={colors.textMuted} />
            </TouchableOpacity>
            {imageUris.map((uri, index) => (
              <View key={index} style={s.galleryImgWrapper}>
                <Image source={{ uri }} style={s.galleryImg} />
                <TouchableOpacity style={s.removeGalleryBtn} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity 
            style={[s.submitBtn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[s.submitBtnTxt, { color: '#000' }]}>Add to Catalog</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  scrollPad: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 },
  textarea: { height: 100, textAlignVertical: 'top' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  submitBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  submitBtnTxt: { fontSize: 16, fontWeight: '700' },
  galleryScroll: { flexDirection: 'row', marginBottom: 20 },
  addGalleryBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  galleryImgWrapper: { width: 80, height: 80, borderRadius: 12, marginRight: 12 },
  galleryImg: { width: '100%', height: '100%', borderRadius: 12 },
  removeGalleryBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
});
