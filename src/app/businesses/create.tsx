import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { StorageService } from '../../lib/storage-service';
import * as ImagePicker from 'expo-image-picker';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import { OpeningHoursPicker } from '../../components/OpeningHoursPicker';

const CATS = ['Food & Catering', 'Restaurant', 'Shopping', 'Beauty & Salon', 'Local Services', 'Tech & Repair'];

export default function BusinessEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState(CATS[0]);
  const [hours, setHours] = useState('');
  
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchBiz = async () => {
        try {
          const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single();
          if (data) {
            setName(data.name || '');
            setDesc(data.description || '');
            setPhone(data.phone || '');
            setWebsite(data.website || '');
            setCategory(data.category || CATS[0]);
            setHours(data.hours || '');
            setCoverUri(data.cover_image || data.image_urls?.[0] || null);
            setLogoUri(data.logo || null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setFetching(false);
        }
      };
      fetchBiz();
    } else {
      setFetching(false);
    }
  }, [id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name is required');
    
    setLoading(true);
    try {
      let finalCover = coverUri;
      let finalLogo = logoUri;
      let businessId = id;
      
      const payload = {
        name: name.trim(),
        description: desc.trim(),
        phone: phone.trim(),
        website: website.trim(),
        category,
        hours: hours.trim(),
        is_active: true
      };

      if (!id) {
        // Create new
        const { data, error } = await supabase.from('businesses').insert({
          ...payload,
          owner_id: user?.id,
          location: 'Location not specified', // simple fallback
        }).select('id').single();
        if (error) throw error;
        businessId = data.id;
      } else {
        // Update existing
        const { error } = await supabase.from('businesses').update(payload).eq('id', id);
        if (error) throw error;
      }

      if (businessId && coverUri && coverUri.startsWith('file://')) {
        const { url } = await StorageService.uploadBusinessImage(businessId, { uri: coverUri, name: 'cover.jpg', type: 'image/jpeg' });
        if (url) {
          finalCover = url;
          await supabase.from('businesses').update({ cover_image: url }).eq('id', businessId);
        }
      }

      if (businessId && logoUri && logoUri.startsWith('file://')) {
        const { url } = await StorageService.uploadBusinessImage(businessId, { uri: logoUri, name: 'logo.jpg', type: 'image/jpeg' });
        if (url) {
          finalLogo = url;
          await supabase.from('businesses').update({ logo: url }).eq('id', businessId);
        }
      }

      setSaved(true);
      setTimeout(() => {
        if (id) {
          router.back();
        } else {
          router.replace(`/businesses/${businessId}` as any);
        }
      }, 1000);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save business');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <View style={{ flex: 1, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={G} /></View>;
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{id ? 'Edit Business' : 'Create Business'}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={s.saveBtn} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={DARK} /> : (
              <Text style={s.saveBtnTxt}>{saved ? '✓ Saved' : (id ? 'Save' : 'Create')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.contentPad}>
          
          {/* Cover */}
          <View style={s.coverContainer}>
            <Image source={{ uri: coverUri || 'https://via.placeholder.com/700x240' }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <TouchableOpacity style={s.coverOverlay} onPress={pickImage} activeOpacity={0.8}>
              <View style={s.changeCoverBadge}>
                <Text style={s.changeCoverTxt}>Change Cover</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={s.logoSection}>
            <View style={s.logoWrap}>
              <Image source={{ uri: logoUri || 'https://via.placeholder.com/150' }} style={s.logoImg} contentFit="cover" />
              <TouchableOpacity style={s.changeLogoBtn} onPress={pickLogo}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.logoLabel}>Business Logo</Text>
              <Text style={s.logoDesc}>This will be displayed on your profile and catalog.</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Business Name</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your business name" placeholderTextColor={MUTED} />
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Phone Number</Text>
            <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+234..." placeholderTextColor={MUTED} />
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Website (optional)</Text>
            <TextInput style={s.input} value={website} onChangeText={setWebsite} placeholder="https://..." placeholderTextColor={MUTED} />
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Opening Hours</Text>
            <OpeningHoursPicker value={hours} onChange={setHours} />
          </View>

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

          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Description</Text>
            <TextInput 
              style={[s.input, s.textarea]} 
              value={desc} 
              onChangeText={setDesc} 
              multiline 
              numberOfLines={4} 
              placeholder="Tell customers about your business..." 
              placeholderTextColor={MUTED} 
            />
          </View>
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
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, backgroundColor: G },
  saveBtnTxt: { fontFamily: 'Outfit-Bold', fontSize: 14, color: DARK },
  
  contentPad: { paddingHorizontal: 20, paddingVertical: 20, gap: 20 },
  coverContainer: { position: 'relative', height: 120, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  changeCoverBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  changeCoverTxt: { fontFamily: 'Outfit-Bold', fontSize: 13, color: '#fff' },
  
  logoSection: { flexDirection: 'row', alignItems: 'center' },
  logoWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  changeLogoBtn: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', height: 26, alignItems: 'center', justifyContent: 'center' },
  logoLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#fff', marginBottom: 4 },
  logoDesc: { fontFamily: 'Inter', fontSize: 12, color: MUTED },
  
  fieldBlock: {},
  fieldLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: LABEL, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER, color: '#fff', fontFamily: 'Inter', fontSize: 15 },
  textarea: { height: 120, textAlignVertical: 'top' },
  
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  catTxt: { fontFamily: 'Inter', fontSize: 13 },
});
