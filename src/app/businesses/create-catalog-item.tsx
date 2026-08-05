import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { StorageService } from '../../lib/storage-service';
import { useAuth } from '../../hooks/use-supabase-auth';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';

const CATS = ['Food', 'Baked Goods', 'Drinks', 'Services', 'Other'];

export default function CreateCatalogItemScreen() {
  const router = useRouter();
  const { business_id: businessId, id: itemId } = useLocalSearchParams<{ business_id?: string; id?: string }>();
  const { user } = useAuth();
  
  const isEditMode = !!itemId;

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATS[0]);
  const [inStock, setInStock] = useState(true);
  const [quantity, setQuantity] = useState('1');
  
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEditMode);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      const { data, error } = await supabase.from('catalog_items').select('*').eq('id', itemId).maybeSingle();
      if (error || !data) {
        Alert.alert('Error', 'Could not load item.');
        router.back();
        return;
      }
      setTitle(data.title || '');
      setPrice(String(data.price || ''));
      setCategory(data.category || CATS[0]);
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

  const handleSave = async () => {
    if (!title.trim() || !price.trim()) {
      return Alert.alert('Error', 'Please enter a title and price.');
    }

    if (!isEditMode && (!businessId || typeof businessId !== 'string')) {
      return Alert.alert('Error', 'Invalid business context.');
    }

    setLoading(true);
    try {
      const fields = {
        title: title.trim(),
        description: '',
        price: parseFloat(price) || 0,
        category,
        in_stock: inStock,
        quantity: parseInt(quantity, 10) || 0,
      };

      let targetItemId = itemId;

      if (isEditMode) {
        const { error } = await supabase.from('catalog_items').update(fields).eq('id', itemId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('catalog_items').insert({ business_id: businessId, ...fields }).select('id').single();
        if (error) throw error;
        targetItemId = data.id;
      }

      const newUrls: string[] = [];
      if (imageUris.length > 0 && targetItemId) {
        const uploadBizId = businessId || 'catalog';
        for (let i = 0; i < imageUris.length; i++) {
          const { url } = await StorageService.uploadBusinessImage(uploadBizId, {
            uri: imageUris[i],
            name: `catalog_${targetItemId}_${Date.now()}_${i}.jpg`,
            type: 'image/jpeg',
          });
          if (url) newUrls.push(url);
        }
      }

      const finalImages = [...existingImageUrls, ...newUrls];
      if (finalImages.length > 0 || isEditMode) {
        await supabase.from('catalog_items').update({ images: finalImages }).eq('id', targetItemId);
      }

      setAdded(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save item.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={G} /></View>;
  }

  if (added) {
    return (
      <View style={[s.root, s.addedScreen]}>
        <View style={s.addedIconBox}>
          <Ionicons name="checkmark" size={24} color={G} />
        </View>
        <Text style={s.addedTitle}>Item {isEditMode ? 'Updated' : 'Added'}!</Text>
        <Text style={s.addedSubtitle}>"{title}" is now on your storefront.</Text>
        <TouchableOpacity style={s.addedBtn} onPress={() => router.back()}>
          <Text style={s.addedBtnTxt}>Back to Storefront</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasData = title.trim().length > 0 && price.trim().length > 0;
  const combinedImages = [...existingImageUrls.map(u => ({ url: u, isNew: false })), ...imageUris.map(u => ({ url: u, isNew: true }))];

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{isEditMode ? 'Edit Item' : 'Add Item'}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.contentPad} keyboardShouldPersistTaps="handled">
          
          {/* Photo Picker */}
          <View style={s.photoGrid}>
            {combinedImages.map((img, i) => (
              <View key={i} style={[s.photoBox, { borderColor: i === 0 ? G : 'transparent', borderWidth: 2 }]}>
                <Image source={{ uri: img.url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <TouchableOpacity 
                  style={s.removePhotoBtn} 
                  onPress={() => {
                    if (img.isNew) {
                      const newIdx = imageUris.indexOf(img.url);
                      removeNewImage(newIdx);
                    } else {
                      const oldIdx = existingImageUrls.indexOf(img.url);
                      removeExistingImage(oldIdx);
                    }
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addPhotoBtn} onPress={pickImage}>
              <Ionicons name="images-outline" size={22} color={LABEL} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Item Title</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Jollof Rice (Full Pot)" placeholderTextColor={MUTED} />
          </View>

          {/* Price */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Price (₦)</Text>
            <View style={s.priceBox}>
              <Text style={s.priceSymbol}>₦</Text>
              <TextInput 
                style={s.priceInput} 
                value={price} 
                onChangeText={setPrice} 
                placeholder="0" 
                placeholderTextColor={MUTED} 
                keyboardType="numeric" 
                selectionColor={G}
              />
            </View>
          </View>

          {/* Category */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Category</Text>
            <View style={s.catWrap}>
              {CATS.map(c => {
                const active = category === c;
                return (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => setCategory(c)} 
                    style={[s.catBtn, { 
                      backgroundColor: active ? 'rgba(130,219,126,0.15)' : SURFACE, 
                      borderColor: active ? 'rgba(130,219,126,0.35)' : GLASS_BORDER 
                    }]}
                  >
                    <Text style={[s.catTxt, { color: active ? G : MUTED }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* In Stock toggle */}
          <View style={s.stockRow}>
            <View>
              <Text style={s.stockTitle}>In Stock</Text>
              <Text style={s.stockDesc}>Visible and available to order</Text>
            </View>
            <Switch
              value={inStock}
              onValueChange={setInStock}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: G }}
              thumbColor="#fff"
              ios_backgroundColor="rgba(255,255,255,0.1)"
            />
          </View>
          
          {/* Quantity */}
          {inStock && (
            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>Inventory Count (Quantity)</Text>
              <TextInput 
                style={s.input} 
                value={quantity} 
                onChangeText={setQuantity} 
                placeholder="0" 
                placeholderTextColor={MUTED} 
                keyboardType="numeric" 
                selectionColor={G}
              />
            </View>
          )}
        </ScrollView>

        <View style={s.bottomArea}>
          <TouchableOpacity 
            style={[s.submitBtn, { backgroundColor: hasData ? G : 'rgba(130,219,126,0.2)' }]} 
            onPress={handleSave} 
            disabled={!hasData || loading}
          >
            {loading ? <ActivityIndicator size="small" color={hasData ? DARK : 'rgba(130,219,126,0.4)'} /> : (
              <Text style={[s.submitBtnTxt, { color: hasData ? DARK : 'rgba(130,219,126,0.4)' }]}>
                {isEditMode ? 'Save Changes' : 'Add to Storefront'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },

  contentPad: { paddingHorizontal: 20, paddingVertical: 20, gap: 20 },
  
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoBox: { width: '31%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { width: '31%', aspectRatio: 1, borderRadius: 14, backgroundColor: SURFACE, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  fieldBlock: {},
  fieldLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: LABEL, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, color: '#fff', fontFamily: 'Inter', fontSize: 15 },
  
  priceBox: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, paddingHorizontal: 16, gap: 8 },
  priceSymbol: { fontFamily: 'Outfit-Bold', fontSize: 18, color: LABEL },
  priceInput: { flex: 1, fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff', height: '100%' },

  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  catTxt: { fontFamily: 'Inter', fontSize: 13 },

  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: GLASS_BORDER, borderRadius: 18 },
  stockTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff' },
  stockDesc: { fontFamily: 'Inter', fontSize: 12, color: LABEL },

  bottomArea: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34, borderTopWidth: 1, borderTopColor: GLASS_BORDER },
  submitBtn: { width: '100%', paddingVertical: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submitBtnTxt: { fontFamily: 'Outfit-Bold', fontSize: 16 },

  addedScreen: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  addedIconBox: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(130,219,126,0.12)', borderWidth: 1, borderColor: 'rgba(130,219,126,0.25)', alignItems: 'center', justifyContent: 'center' },
  addedTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff' },
  addedSubtitle: { fontFamily: 'Inter', fontSize: 14, color: MUTED, textAlign: 'center' },
  addedBtn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, backgroundColor: G },
  addedBtnTxt: { fontFamily: 'Outfit-Bold', fontSize: 14, color: DARK },
});
