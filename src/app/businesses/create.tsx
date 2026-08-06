import { createStyleSheet, useStyles } from "react-native-unistyles";
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { StorageService } from '../../lib/storage-service';
import * as ImagePicker from 'expo-image-picker';
import { OpeningHoursPicker } from '../../components/OpeningHoursPicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const CATS = ['Food & Catering', 'Restaurant', 'Shopping', 'Beauty & Salon', 'Local Services', 'Tech & Repair'];

export default function BusinessEditScreen() {
    const { styles: sStylesheet, theme } = useStyles(stylesheet);

  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState(CATS[0]);
  const [hours, setHours] = useState('09:00 AM - 05:00 PM');
  const [location, setLocation] = useState('');
  
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
            setHours(data.hours || '09:00 AM - 05:00 PM');
            setLocation(data.location || '');
            setCoverUri(data.cover_image || data.image_urls?.[0] || null);
            setLogoUri(data.logo_url || data.logo || null);
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
        location: location.trim() || 'Location not specified',
        is_active: true
      };

      if (!id) {
        // Create new
        const { data, error } = await supabase.from('businesses').insert({
          ...payload,
          owner_id: user?.id,
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
          await supabase.from('businesses').update({ logo_url: url }).eq('id', businessId);
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
    return <View style={{ flex: 1, backgroundColor: theme.colors.DARK, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={theme.colors.G} /></View>;
  }

  return (
    <SafeAreaView style={sStylesheet.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header */}
        <View style={sStylesheet.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={sStylesheet.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={sStylesheet.headerTitle}>{id ? 'Edit Business' : 'Create Business'}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={sStylesheet.saveBtn} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={theme.colors.DARK} /> : (
              <Text style={sStylesheet.saveBtnTxt}>{saved ? '✓ Saved' : (id ? 'Save' : 'Create')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sStylesheet.contentPad}>
          
          {/* Cover */}
          <View style={sStylesheet.coverContainer}>
            <Image source={{ uri: coverUri || 'https://via.placeholder.com/700x240' }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} contentFit="cover" />
            <TouchableOpacity style={sStylesheet.coverOverlay} onPress={pickImage} activeOpacity={0.8}>
              <View style={sStylesheet.changeCoverBadge}>
                <Text style={sStylesheet.changeCoverTxt}>Change Cover</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={sStylesheet.logoSection}>
            <View style={sStylesheet.logoWrap}>
              <Image source={{ uri: logoUri || 'https://via.placeholder.com/150' }} style={sStylesheet.logoImg} contentFit="cover" />
              <TouchableOpacity style={sStylesheet.changeLogoBtn} onPress={pickLogo}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={sStylesheet.logoLabel}>Business Logo</Text>
              <Text style={sStylesheet.logoDesc}>This will be displayed on your profile and catalog.</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={sStylesheet.fieldBlock}>
            <Text style={sStylesheet.fieldLabel}>Business Name</Text>
            <TextInput style={sStylesheet.input} value={name} onChangeText={setName} placeholder="Your business name" placeholderTextColor={theme.colors.MUTED} />
          </View>

          <View style={sStylesheet.fieldBlock}>
            <Text style={sStylesheet.fieldLabel}>Phone Number</Text>
            <TextInput style={sStylesheet.input} value={phone} onChangeText={setPhone} placeholder="+234..." placeholderTextColor={theme.colors.MUTED} />
          </View>

          <View style={sStylesheet.fieldBlock}>
            <Text style={sStylesheet.fieldLabel}>Website (optional)</Text>
            <TextInput style={sStylesheet.input} value={website} onChangeText={setWebsite} placeholder="https://..." placeholderTextColor={theme.colors.MUTED} />
          </View>

          <View style={[sStylesheet.fieldBlock, { zIndex: 10 }]}>
            <Text style={sStylesheet.fieldLabel}>Location</Text>
            <GooglePlacesAutocomplete
              placeholder={location || "Search for a business location"}
              onPress={(data, details = null) => {
                setLocation(data.description);
              }}
              query={{
                key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
                language: 'en',
                components: 'country:ng',
              }}
              styles={{
                textInput: sStylesheet.input,
                listView: {
                  backgroundColor: theme.colors.SURFACE,
                  borderRadius: 12,
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.GLASS_BORDER,
                },
                row: {
                  backgroundColor: theme.colors.SURFACE,
                  padding: 13,
                  height: 44,
                  flexDirection: 'row',
                },
                description: {
                  color: '#fff',
                },
              }}
              textInputProps={{
                placeholderTextColor: location ? '#fff' : theme.colors.MUTED,
                onChangeText: (text) => setLocation(text),
              }}
            />
          </View>

          <View style={sStylesheet.fieldBlock}>
            <Text style={sStylesheet.fieldLabel}>Opening Hours</Text>
            <OpeningHoursPicker value={hours} onChange={setHours} />
          </View>

          <View style={sStylesheet.fieldBlock}>
            <Text style={sStylesheet.fieldLabel}>Category</Text>
            <View style={sStylesheet.catWrap}>
              {CATS.map(c => {
                  const { styles: s } = useStyles(sStylesheet);

                const active = category === c;
                return (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => setCategory(c)} 
                    style={[sStylesheet.catBtn, { 
                      backgroundColor: active ? 'rgba(130,219,126,0.15)' : theme.colors.SURFACE, 
                      borderColor: active ? 'rgba(130,219,126,0.35)' : theme.colors.GLASS_BORDER 
                    }]}
                  >
                    <Text style={[sStylesheet.catTxt, { color: active ? theme.colors.G : theme.colors.MUTED }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={sStylesheet.fieldBlock}>
            <Text style={sStylesheet.fieldLabel}>Description</Text>
            <TextInput 
              style={[sStylesheet.input, sStylesheet.textarea]} 
              value={desc} 
              onChangeText={setDesc} 
              multiline 
              numberOfLines={4} 
              placeholder="Tell customers about your business..." 
              placeholderTextColor={theme.colors.MUTED} 
            />
          </View>
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const stylesheet = createStyleSheet(theme => ({
      root: { flex: 1, backgroundColor: '#050505' },
      header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.GLASS_BORDER },
      backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
      headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
      saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.G },
      saveBtnTxt: { fontFamily: 'Outfit-Bold', fontSize: 14, color: theme.colors.DARK },
      
      contentPad: { paddingHorizontal: 20, paddingVertical: 20, gap: 24 },
      coverContainer: { position: 'relative', height: 140, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: theme.colors.GLASS_BORDER },
      coverOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
      changeCoverBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
      changeCoverTxt: { fontFamily: 'Outfit-Bold', fontSize: 13, color: '#fff' },
      
      logoSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f0f0f', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, marginTop: -10 },
      logoWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.SURFACE, borderWidth: 2, borderColor: theme.colors.G, position: 'relative' },
      logoImg: { width: '100%', height: '100%', borderRadius: 36 },
      changeLogoBtn: { position: 'absolute', bottom: -4, right: -4, backgroundColor: theme.colors.SURFACE, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#050505' },
      logoLabel: { fontFamily: 'Outfit-Bold', fontSize: 15, color: '#fff', marginBottom: 4 },
      logoDesc: { fontFamily: 'Inter', fontSize: 12, color: theme.colors.MUTED, lineHeight: 18 },
      
      fieldBlock: {},
      fieldLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: theme.colors.LABEL, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
      input: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER, color: '#fff', fontFamily: 'Inter', fontSize: 15 },
      textarea: { height: 120, textAlignVertical: 'top' },
      
      catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
      catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
      catTxt: { fontFamily: 'Inter', fontSize: 13 },
    }));
