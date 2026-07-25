import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as ImagePicker from 'expo-image-picker';
import { StorageService } from '../../lib/storage-service';

const CATEGORIES = ['Food & Drinks', 'Retail', 'Services', 'Tech', 'Health', 'Fashion', 'Beauty', 'Entertainment', 'Other'];

export default function CreateBusinessScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [hours, setHours] = useState('');
  
  const [dayPreset, setDayPreset] = useState('Mon - Fri');
  const [openTime, setOpenTime] = useState('9:00 AM');
  const [closeTime, setCloseTime] = useState('5:00 PM');
  const [isCustomHours, setIsCustomHours] = useState(false);

  useEffect(() => {
    if (!isCustomHours) {
      if (dayPreset === '24/7') {
        setHours('Open 24/7');
      } else {
        setHours(`${dayPreset}: ${openTime} - ${closeTime}`);
      }
    }
  }, [dayPreset, openTime, closeTime, isCustomHours]);
  
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [galleryUris, setGalleryUris] = useState<string[]>([]);
  
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

  const pickImage = async (type: 'logo' | 'cover' | 'gallery') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: type !== 'gallery',
      aspect: type === 'cover' ? [16, 9] : [1, 1],
      quality: 0.8,
      allowsMultipleSelection: type === 'gallery',
    });

    if (!result.canceled) {
      if (type === 'logo') setLogoUri(result.assets[0].uri);
      if (type === 'cover') setCoverUri(result.assets[0].uri);
      if (type === 'gallery') {
        const uris = result.assets.map(a => a.uri);
        setGalleryUris(prev => [...prev, ...uris]);
      }
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryUris(prev => prev.filter((_, i) => i !== index));
  };

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
          email: email.trim(),
          website: website.trim() || null,
          hours: hours.trim() || null,
          owner_name: profile?.name || user?.user_metadata?.name || 'Seller',
          owner_avatar: profile?.avatar_url || user?.user_metadata?.avatar_url
        })
        .select('id')
        .single();

      if (error) throw error;
      
      const businessId = data.id;

      let logoUrl = null;
      let coverUrl = null;
      let imageUrls: string[] = [];

      if (logoUri) {
        const { url } = await StorageService.uploadBusinessImage(businessId, { uri: logoUri, name: 'logo.jpg', type: 'image/jpeg' });
        if (url) logoUrl = url;
      }

      if (coverUri) {
        const { url } = await StorageService.uploadBusinessImage(businessId, { uri: coverUri, name: 'cover.jpg', type: 'image/jpeg' });
        if (url) coverUrl = url;
      }

      if (galleryUris.length > 0) {
        for (let i = 0; i < galleryUris.length; i++) {
          const { url } = await StorageService.uploadBusinessImage(businessId, { uri: galleryUris[i], name: `gallery_${i}.jpg`, type: 'image/jpeg' });
          if (url) imageUrls.push(url);
        }
      }

      if (logoUrl || coverUrl || imageUrls.length > 0) {
        const finalImageUrls = imageUrls.length > 0 ? imageUrls : (coverUrl ? [coverUrl] : null);
        await supabase.from('businesses').update({
          logo: logoUrl,
          cover_image: coverUrl,
          image_urls: finalImageUrls
        }).eq('id', businessId);
      }
      
      Alert.alert('Success', 'Business created successfully!', [
        { text: 'OK', onPress: () => router.replace(`/businesses/${businessId}` as any) }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create business.');
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Create Business</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollPad} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <Text style={[s.sectionTitle, { color: colors.text }]}>Branding</Text>
        
        <View style={s.brandingRow}>
          <View style={s.logoContainer}>
            <Text style={[s.label, { color: colors.textSecondary, textAlign: 'center' }]}>Logo</Text>
            <TouchableOpacity style={[s.logoPicker, { backgroundColor: colors.inputBackground }]} onPress={() => pickImage('logo')}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={s.logoPreview} />
              ) : (
                <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={s.coverContainer}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Cover Image</Text>
            <TouchableOpacity style={[s.coverPicker, { backgroundColor: colors.inputBackground }]} onPress={() => pickImage('cover')}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={s.coverPreview} />
              ) : (
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 16 }]}>Business Details</Text>
        
        <Text style={[s.label, { color: colors.textSecondary }]}>Business Name *</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="e.g. Jane's Bakery"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[s.label, { color: colors.textSecondary }]}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {CATEGORIES.map(cat => (
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
          placeholder="Tell customers about your business..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 16 }]}>Contact Info</Text>

        <Text style={[s.label, { color: colors.textSecondary }]}>Location / Address *</Text>
        <View style={{ zIndex: 50 }}>
          <GooglePlacesAutocomplete
            placeholder="e.g. 123 Main St, Lagos"
            fetchDetails={false}
            onPress={(data) => {
              setLocation(data.description);
            }}
            query={{ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, language: 'en', components: 'country:ng' }}
            styles={{
              container: { flex: 0, marginBottom: 20 },
              textInputContainer: { width: '100%' },
              textInput: [s.input, { backgroundColor: colors.inputBackground, color: colors.text, marginBottom: 0 }],
              row: { backgroundColor: colors.background, padding: 13, minHeight: 44, flexDirection: 'row' },
              description: { color: colors.text },
              listView: { backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, marginTop: 4, position: 'absolute', top: '100%', width: '100%', zIndex: 100 },
            }}
            textInputProps={{ 
              placeholderTextColor: colors.textMuted,
              onChangeText: (text) => setLocation(text),
              value: location
            }}
            enablePoweredByContainer={false}
          />
        </View>

        <Text style={[s.label, { color: colors.textSecondary }]}>Phone Number</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="+234..."
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={[s.label, { color: colors.textSecondary }]}>Email Address</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="e.g. contact@business.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[s.label, { color: colors.textSecondary }]}>Website</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          placeholder="e.g. https://mybusiness.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="url"
          autoCapitalize="none"
          value={website}
          onChangeText={setWebsite}
        />

        <Text style={[s.label, { color: colors.textSecondary }]}>Operating Hours</Text>
        
        {/* Days Presets */}
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>Select Days</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['Mon - Fri', 'Mon - Sat', 'Everyday', 'Weekends', '24/7'].map(preset => (
            <TouchableOpacity
              key={preset}
              style={[
                s.categoryChip,
                { backgroundColor: dayPreset === preset && !isCustomHours ? colors.tint : colors.inputBackground }
              ]}
              onPress={() => {
                setIsCustomHours(false);
                setDayPreset(preset);
              }}
            >
              <Text style={{ 
                color: dayPreset === preset && !isCustomHours ? '#000' : colors.text,
                fontWeight: dayPreset === preset && !isCustomHours ? 'bold' : 'normal',
                fontSize: 13
              }}>
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {dayPreset !== '24/7' && !isCustomHours && (
          <View style={{ marginBottom: 16 }}>
            {/* Open Time */}
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>Opening Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {['7:00 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '11:00 AM'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    s.categoryChip,
                    { backgroundColor: openTime === t ? colors.tint : colors.inputBackground, paddingHorizontal: 12, paddingVertical: 6 }
                  ]}
                  onPress={() => setOpenTime(t)}
                >
                  <Text style={{ color: openTime === t ? '#000' : colors.text, fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Close Time */}
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>Closing Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    s.categoryChip,
                    { backgroundColor: closeTime === t ? colors.tint : colors.inputBackground, paddingHorizontal: 12, paddingVertical: 6 }
                  ]}
                  onPress={() => setCloseTime(t)}
                >
                  <Text style={{ color: closeTime === t ? '#000' : colors.text, fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Display hours result / Custom toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="time-outline" size={16} color={colors.tint} />
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{hours || 'Not set'}</Text>
          </View>
          <TouchableOpacity onPress={() => setIsCustomHours(!isCustomHours)}>
            <Text style={{ color: colors.tint, fontSize: 12 }}>{isCustomHours ? 'Use Presets' : 'Custom Text'}</Text>
          </TouchableOpacity>
        </View>

        {isCustomHours && (
          <TextInput
            style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="e.g. Mon-Fri: 9AM - 5PM, Sat: 10AM - 2PM"
            placeholderTextColor={colors.textMuted}
            value={hours}
            onChangeText={setHours}
          />
        )}

        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 16 }]}>Gallery</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galleryScroll}>
          <TouchableOpacity style={[s.addGalleryBtn, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]} onPress={() => pickImage('gallery')}>
            <Ionicons name="add" size={32} color={colors.textMuted} />
          </TouchableOpacity>
          {galleryUris.map((uri, index) => (
            <View key={index} style={s.galleryImgWrapper}>
              <Image source={{ uri }} style={s.galleryImg} />
              <TouchableOpacity style={s.removeGalleryBtn} onPress={() => removeGalleryImage(index)}>
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
            <Text style={[s.submitBtnTxt, { color: '#000' }]}>Create Business</Text>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 },
  textarea: { height: 100, textAlignVertical: 'top' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  submitBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  submitBtnTxt: { fontSize: 16, fontWeight: '700' },
  errorTxt: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  subErrorTxt: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnTxt: { fontSize: 16, fontWeight: 'bold' },
  brandingRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  logoContainer: { alignItems: 'center' },
  coverContainer: { flex: 1 },
  logoPicker: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoPreview: { width: '100%', height: '100%' },
  coverPicker: { height: 80, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverPreview: { width: '100%', height: '100%' },
  galleryScroll: { flexDirection: 'row', marginBottom: 20 },
  addGalleryBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  galleryImgWrapper: { width: 80, height: 80, borderRadius: 12, marginRight: 12 },
  galleryImg: { width: '100%', height: '100%', borderRadius: 12 },
  removeGalleryBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
});

