import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React, { useState, useEffect } from 'react';
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
  // itemId is present when editing an existing item
  const { businessId, itemId } = useLocalSearchParams<{ businessId?: string; itemId?: string }>();
  const { user } = useAuth();

  const isEditMode = !!itemId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATALOG_CATEGORIES[0]);
  const [inStock, setInStock] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [imageUris, setImageUris] = useState<string[]>([]);
  // Existing remote URLs to keep (edit mode)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEditMode);

  // Pre-populate fields when editing
  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      if (error || !data) {
        Alert.alert('Error', 'Could not load item.');
        router.back();
        return;
      }
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPrice(String(data.price || ''));
      setCategory(data.category || CATALOG_CATEGORIES[0]);
      setInStock(data.in_stock ?? true);
      setQuantity(String(data.quantity ?? 1));
      let imgs: string[] = [];
      if (Array.isArray(data.images)) imgs = data.images;
      else if (typeof data.images === 'string') { try { imgs = JSON.parse(data.images); } catch (_) {} }
      setExistingImageUrls(imgs);
      setInitLoading(false);
    })();
  }, [itemId, isEditMode]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      setImageUris(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const removeNewImage = (index: number) => setImageUris(prev => prev.filter((_, i) => i !== index));
  const removeExistingImage = (index: number) => setExistingImageUrls(prev => prev.filter((_, i) => i !== index));

  const resolvedBusinessId = businessId || (isEditMode ? undefined : undefined);

  const handleSubmit = async () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert('Error', 'Please enter a title and price.');
      return;
    }

    const bizId = resolvedBusinessId;
    if (!isEditMode && (!bizId || typeof bizId !== 'string')) {
      Alert.alert('Error', 'Invalid business context.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    const qtyNum = isNaN(parsedQty) ? 1 : Math.max(0, parsedQty);

    setLoading(true);
    try {
      const fields = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        category,
        in_stock: inStock && qtyNum > 0,
        quantity: qtyNum,
      };

      let targetItemId = itemId;

      if (isEditMode) {
        // Update existing record
        const { error } = await supabase
          .from('catalog_items')
          .update(fields)
          .eq('id', itemId);
        if (error) throw error;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('catalog_items')
          .insert({ business_id: bizId, ...fields })
          .select('id')
          .single();
        if (error) throw error;
        targetItemId = data.id;
      }

      // Upload any new images
      const newUrls: string[] = [];
      if (imageUris.length > 0 && targetItemId) {
        const uploadBizId = bizId || 'catalog';
        for (let i = 0; i < imageUris.length; i++) {
          const { url } = await StorageService.uploadBusinessImage(uploadBizId, {
            uri: imageUris[i],
            name: `catalog_${targetItemId}_${Date.now()}_${i}.jpg`,
            type: 'image/jpeg',
          });
          if (url) newUrls.push(url);
        }
      }

      // Merge existing + new URLs and save
      const finalImages = [...existingImageUrls, ...newUrls];
      if (finalImages.length > 0 || isEditMode) {
        await supabase.from('catalog_items').update({ images: finalImages }).eq('id', targetItemId);
      }

      Alert.alert('Success', isEditMode ? 'Item updated!' : 'Item added to catalog!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save item.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <View style={[s.root, { backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={G} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: DARK }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { borderBottomColor: GLASS_BORDER }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: TEXT_PRIMARY }]}>
            {isEditMode ? 'Edit Catalog Item' : 'Add Catalog Item'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollPad} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <Text style={[s.label, { color: LABEL }]}>Item Title *</Text>
          <TextInput
            style={[s.input, { backgroundColor: SURFACE, color: TEXT_PRIMARY }]}
            placeholder="e.g. Handmade Soap"
            placeholderTextColor={MUTED}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[s.label, { color: LABEL }]}>Price (₦) *</Text>
          <TextInput
            style={[s.input, { backgroundColor: SURFACE, color: TEXT_PRIMARY }]}
            placeholder="e.g. 5000"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <Text style={[s.label, { color: LABEL }]}>Stock Quantity *</Text>
          <TextInput
            style={[s.input, { backgroundColor: SURFACE, color: TEXT_PRIMARY }]}
            placeholder="e.g. 5"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Text style={[s.label, { color: LABEL }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {CATALOG_CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat}
                style={[s.categoryChip, { backgroundColor: category === cat ? G : SURFACE }]}
                onPress={() => setCategory(cat)}
              >
                <Text style={{ color: category === cat ? '#000' : TEXT_PRIMARY, fontWeight: category === cat ? 'bold' : 'normal' }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.label, { color: LABEL }]}>Description</Text>
          <TextInput
            style={[s.input, s.textarea, { backgroundColor: SURFACE, color: TEXT_PRIMARY }]}
            placeholder="Describe the item..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <View style={s.switchRow}>
            <Text style={[s.label, { color: TEXT_PRIMARY, marginBottom: 0 }]}>In Stock</Text>
            <Switch
              value={inStock}
              onValueChange={setInStock}
              trackColor={{ false: GLASS_BORDER, true: G }}
            />
          </View>

          <Text style={[s.label, { color: LABEL, marginTop: 16 }]}>Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galleryScroll}>
            <TouchableOpacity style={[s.addGalleryBtn, { backgroundColor: SURFACE, borderColor: GLASS_BORDER }]} onPress={pickImage}>
              <Ionicons name="add" size={32} color={MUTED} />
            </TouchableOpacity>
            {/* Existing remote images */}
            {existingImageUrls.map((url, index) => (
              <View key={`existing-${index}`} style={s.galleryImgWrapper}>
                <Image source={{ uri: url }} style={s.galleryImg} />
                <TouchableOpacity style={s.removeGalleryBtn} onPress={() => removeExistingImage(index)}>
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
            {/* Newly picked local images */}
            {imageUris.map((uri, index) => (
              <View key={`new-${index}`} style={s.galleryImgWrapper}>
                <Image source={{ uri }} style={s.galleryImg} />
                <TouchableOpacity style={s.removeGalleryBtn} onPress={() => removeNewImage(index)}>
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity 
            style={[s.submitBtn, { backgroundColor: G, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[s.submitBtnTxt, { color: '#000' }]}>
                {isEditMode ? 'Save Changes' : 'Add to Catalog'}
              </Text>
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
