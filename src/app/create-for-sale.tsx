import { createStyleSheet, useStyles } from "react-native-unistyles";
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { StorageService, MobileFile } from '../lib/storage-service';
import { MarketplaceItemCard } from '../components/MarketplaceItemCard';
import { ImageCarousel } from '../components/ImageCarousel';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { formatPrice } from '../lib/utils';
import { useCategories } from '../hooks/use-categories';

const STEPS = ['Photos', 'Details', 'Description', 'Review'];
const CONDITIONS = ['New', 'Used – Like New', 'Used – Good', 'Fair'];

export default function CreateForSaleScreen() {
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories('marketplace');
  const [step, setStep] = useState(0);

  const [listingType, setListingType] = useState('For Sale');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  
  const [attachedFiles, setAttachedFiles] = useState<MobileFile[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(false);

  const [postState, setPostState] = useState('');
  const [postLga, setPostLga] = useState('');
  const [postLat, setPostLat] = useState<number | null>(null);
  const [postLng, setPostLng] = useState<number | null>(null);

  const progress = useSharedValue(0.25);

  React.useEffect(() => {
    progress.value = withTiming((step + 1) / STEPS.length);
  }, [step]);

  // Set default location from user profile
  React.useEffect(() => {
    if (profile?.location) {
      const locStr = [profile.location.ward, profile.location.lga, profile.location.state].filter(Boolean).join(', ');
      if (locStr) {
        setLocation(locStr);
        setPostState(profile.location.state || '');
        setPostLga(profile.location.lga || '');
      }
    }
  }, [profile]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: MobileFile[] = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `item_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setAttachedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (e) {
      console.error('Pick image error:', e);
    }
  };

  const canNext = [
    true,
    title.trim() && (listingType === 'Giveaway' || price.trim()) && category && condition,
    desc.trim(),
    true,
  ][step];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      if (!user || !profile) {
        Alert.alert('Authentication required', 'Please sign in to list an item.');
        return;
      }

      setListing(true);
      try {
        let imageUrls: string[] = [];
        if (attachedFiles.length > 0) {
          const filesToUpload = [...attachedFiles];
          if (coverIndex > 0 && coverIndex < filesToUpload.length) {
            const cover = filesToUpload.splice(coverIndex, 1)[0];
            filesToUpload.unshift(cover);
          }
          const uploadedImages = await Promise.all(
            filesToUpload.map((file) => StorageService.uploadPostImage(user.id, file))
          );
          imageUrls = uploadedImages.map(res => res.url).filter(Boolean) as string[];
        }

        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            author_name: profile.name || 'Seller',
            author_image: profile.avatar_url || '',
            category: listingType === 'Giveaway' ? 'Giveaway' : 'For Sale',
            sub_category: category,
            title: title.trim(),
            text: desc.trim(),
            price: listingType === 'Giveaway' ? 0 : parseFloat(price) || 0,
            condition: condition,
            image_urls: imageUrls,
            is_sold: false,
            state: postState || null,
            lga: postLga || null,
            ward: null,
            location_geom: postLat !== null && postLng !== null ? `POINT(${postLng} ${postLat})` : null,
            timestamp: new Date().toISOString(),
            liked_by: [],
            comment_count: 0,
          });

        setListing(false);
        if (error) {
          Alert.alert('Error', error.message || 'Failed to publish listing.');
        } else {
          setListed(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err: any) {
        setListing(false);
        Alert.alert('Error', err?.message || 'Failed to create listing.');
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    } else {
      router.back();
    }
  };

  if (listed) {
    return (
      <View style={[stylesheet.successContainer, { backgroundColor: theme.colors.DARK }]}>
        <View style={stylesheet.successIcon}>
          <Feather name="check" size={34} color={theme.colors.G} />
        </View>
        <Text style={stylesheet.successTitle}>Item Listed!</Text>
        <Text style={stylesheet.successDesc}>Your listing is now live in the neighbourhood marketplace.</Text>
        <TouchableOpacity 
          style={stylesheet.btnPrimary}
          onPress={() => router.replace('/(tabs)/catalog')}
        >
          <Text style={stylesheet.btnPrimaryText}>View Marketplace</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={stylesheet.btnText}>Back to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[stylesheet.container, { backgroundColor: theme.colors.DARK, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={stylesheet.header}>
        <TouchableOpacity onPress={handleBack} style={stylesheet.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={stylesheet.headerTextContainer}>
          <Text style={stylesheet.headerTitle}>Item for Sale</Text>
          <Text style={stylesheet.headerSubtitle}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
        </View>
      </View>

      <View style={stylesheet.progressBarBg}>
        <Animated.View style={[stylesheet.progressBarFill, animatedProgressStyle]} />
      </View>

      <ScrollView contentContainerStyle={stylesheet.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text style={stylesheet.stepTitle}>Add Photos</Text>
            <Text style={stylesheet.stepDesc}>First photo becomes your listing cover.</Text>
            <View style={stylesheet.photosGrid}>
              {attachedFiles.map((file, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setCoverIndex(i)}
                  style={[stylesheet.photoBox, i === coverIndex && { borderWidth: 2, borderColor: theme.colors.G }]}
                >
                  <Image source={{ uri: file.uri }} style={stylesheet.photoImg} />
                  {i === coverIndex && (
                    <View style={stylesheet.coverBadge}>
                      <Text style={stylesheet.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={stylesheet.removePhoto}
                    onPress={() => {
                      setAttachedFiles(f => f.filter((_, idx) => idx !== i));
                      if (coverIndex === i) setCoverIndex(0);
                      else if (coverIndex > i) setCoverIndex(c => c - 1);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={stylesheet.addPhotoBox} onPress={pickImages}>
                <Feather name="camera" size={24} color={theme.colors.LABEL} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.label}>Listing Type</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={[stylesheet.chip, listingType === 'For Sale' && stylesheet.chipActive, { flex: 1, alignItems: 'center' }]}
                onPress={() => setListingType('For Sale')}
              >
                <Text style={[stylesheet.chipText, listingType === 'For Sale' && stylesheet.chipTextActive]}>Selling</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[stylesheet.chip, listingType === 'Giveaway' && stylesheet.chipActive, { flex: 1, alignItems: 'center' }]}
                onPress={() => { setListingType('Giveaway'); setPrice(''); }}
              >
                <Text style={[stylesheet.chipText, listingType === 'Giveaway' && stylesheet.chipTextActive]}>Giveaway</Text>
              </TouchableOpacity>
            </View>

            <Text style={stylesheet.label}>Title</Text>
            <TextInput
              style={stylesheet.input}
              placeholder="e.g. Nike Air Max 90, Blue"
              placeholderTextColor={theme.colors.MUTED}
              value={title}
              onChangeText={setTitle}
            />

            {listingType === 'For Sale' && (
              <>
                <Text style={stylesheet.label}>Price (₦)</Text>
                <TextInput
                  style={[stylesheet.input, { fontFamily: 'Outfit-Bold', fontSize: 18 }]}
                  placeholder="₦ 0"
                  placeholderTextColor={theme.colors.MUTED}
                  keyboardType="numeric"
                  value={price ? Number(price).toLocaleString('en-US') : ''}
                  onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
                />
              </>
            )}

            <Text style={stylesheet.label}>Category</Text>
            {categoriesLoading ? (
              <ActivityIndicator color={theme.colors.GOLD} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            ) : (
              <View style={stylesheet.chipGrid}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[stylesheet.chip, category === cat.name && stylesheet.chipActive]}
                    onPress={() => setCategory(cat.name)}
                  >
                    <Text style={[stylesheet.chipText, category === cat.name && stylesheet.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={stylesheet.label}>Condition</Text>
            <View style={stylesheet.conditionList}>
              {CONDITIONS.map(cond => (
                <TouchableOpacity
                  key={cond}
                  style={[stylesheet.conditionRow, condition === cond && stylesheet.conditionRowActive]}
                  onPress={() => setCondition(cond)}
                >
                  <View style={[stylesheet.radioCircle, condition === cond && stylesheet.radioCircleActive]}>
                    {condition === cond && <View style={stylesheet.radioDot} />}
                  </View>
                  <Text style={[stylesheet.conditionText, condition === cond && stylesheet.conditionTextActive]}>{cond}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={stylesheet.label}>Location</Text>
            <View style={{ zIndex: 10 }}>
              <GooglePlacesAutocomplete
                placeholder="Search for a location"
                fetchDetails={true}
                onPress={(data, details = null) => {
                  setLocation(data.description);
                  if (details?.geometry?.location) {
                    setPostLat(details.geometry.location.lat);
                    setPostLng(details.geometry.location.lng);
                  }
                  const d = data as any;
                  if (d.terms && d.terms.length > 0) {
                    const terms = d.terms;
                    const countryIdx = terms.findIndex((t: any) => t.value === 'Nigeria');
                    if (countryIdx > 0) {
                      setPostState(terms[countryIdx - 1]?.value || '');
                      if (countryIdx > 1) {
                        setPostLga(terms[countryIdx - 2]?.value || '');
                      }
                    } else {
                      setPostState(terms[terms.length - 1]?.value || '');
                      if (terms.length > 1) setPostLga(terms[terms.length - 2]?.value || '');
                    }
                  }
                }}
                query={{
                  key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
                  language: 'en',
                  components: 'country:ng',
                }}
                styles={{
                  textInput: stylesheet.input,
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
                    color: theme.colors.TEXT_PRIMARY,
                  },
                }}
                textInputProps={{
                  placeholderTextColor: theme.colors.MUTED,
                  value: location,
                  onChangeText: (text) => setLocation(text),
                }}
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Description</Text>
            <Text style={stylesheet.stepDesc}>Describe condition, size, features, and pickup info.</Text>
            
            <TextInput
              style={[stylesheet.input, stylesheet.textArea]}
              placeholder="Write a clear description..."
              placeholderTextColor={theme.colors.MUTED}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={desc}
              onChangeText={setDesc}
            />
          </View>
        )}

        {step === 3 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Review & Publish</Text>
            <Text style={stylesheet.stepDesc}>Make sure everything looks accurate before posting.</Text>
            
            <View style={{ marginTop: 10, borderRadius: 20, overflow: 'hidden', backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER }}>
              {attachedFiles.length > 0 ? (
                <ImageCarousel 
                  imageUrls={attachedFiles.map(f => f.uri)} 
                  height={300} 
                  autoPlay={false} 
                />
              ) : (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', height: 300, justifyContent: 'center', alignItems: 'center' }}>
                  <Feather name="image" size={64} color={theme.colors.LABEL} />
                </View>
              )}
              
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 24, color: theme.colors.TEXT_PRIMARY, flex: 1, paddingRight: 12 }}>{title.trim() || 'Untitled Item'}</Text>
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#F59E0B', fontSize: 10, fontFamily: 'Inter-Bold', textTransform: 'uppercase' }}>Preview</Text>
                  </View>
                </View>

                <Text style={{ fontFamily: 'Outfit-ExtraBold', fontSize: 28, color: theme.colors.G, marginBottom: 16 }}>
                  {price ? formatPrice(Number(price)) : '₦0'}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER }}>
                    <Text style={{ fontFamily: 'Inter-Medium', color: '#ccc', fontSize: 13 }}>{condition || 'Used'}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER }}>
                    <Text style={{ fontFamily: 'Inter-Medium', color: '#ccc', fontSize: 13 }}>{category || 'Other'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12 }}>
                  <Feather name="map-pin" size={16} color={theme.colors.LABEL} />
                  <Text style={{ fontFamily: 'Inter-Regular', color: theme.colors.LABEL, fontSize: 14 }}>
                    {postLga || 'TBA'}, {postState || 'TBA'}
                  </Text>
                </View>

                {desc.trim().length > 0 && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.SURFACE }}>
                    <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 16, color: theme.colors.TEXT_PRIMARY, marginBottom: 8 }}>Description</Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: '#aaa', lineHeight: 22 }}>
                      {desc.trim()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[stylesheet.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[stylesheet.btnPrimary, !canNext && stylesheet.btnDisabled]}
          disabled={!canNext || listing}
          onPress={handleNext}
        >
          {listing ? (
            <ActivityIndicator size="small" color={theme.colors.DARK} />
          ) : (
            <Text style={stylesheet.btnPrimaryText}>
              {step === STEPS.length - 1 ? 'Publish Listing' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const _stylesheet = createStyleSheet(theme => ({
      container: { flex: 1 },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
      },
      backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
      },
      headerTextContainer: { flex: 1 },
      headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: theme.colors.TEXT_PRIMARY },
      headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: theme.colors.LABEL },
      progressBarBg: {
        height: 3,
        backgroundColor: theme.colors.GLASS_BORDER,
        marginHorizontal: 20,
        marginTop: 14,
        borderRadius: 2,
      },
      progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.G,
        borderRadius: 2,
      },
      scrollContent: {
        padding: 20,
        paddingBottom: 40,
      },
      stepTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: theme.colors.TEXT_PRIMARY, marginBottom: 4 },
      stepDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: theme.colors.LABEL, marginBottom: 20 },
      photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      },
      photoBox: {
        width: (Dimensions.get('window').width - 40 - 16) / 3,
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 2,
        borderColor: 'transparent',
      },
      photoImg: { width: '100%', height: '100%' },
      coverBadge: {
        position: 'absolute',
        bottom: 5,
        alignSelf: 'center',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: theme.colors.G,
      },
      coverBadgeText: { fontFamily: 'Outfit-Bold', fontSize: 9, color: theme.colors.DARK },
      removePhoto: {
        position: 'absolute',
        top: 6,
        right: 6,
      },
      addPhotoBox: {
        width: (Dimensions.get('window').width - 40 - 16) / 3,
        aspectRatio: 1,
        borderRadius: 16,
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
      },
      formGroup: { gap: 12 },
      label: { 
        fontFamily: 'Inter-SemiBold', 
        fontSize: 12, 
        color: theme.colors.LABEL, 
        marginBottom: 8, 
        marginTop: 8,
        textTransform: 'uppercase', 
        letterSpacing: 0.96 
      },
      input: {
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: theme.colors.TEXT_PRIMARY,
      },
      textArea: {
        height: 120,
        textAlignVertical: 'top',
      },
      chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      },
      chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
      },
      chipActive: {
        backgroundColor: 'rgba(130,219,126,0.15)',
        borderColor: 'rgba(130,219,126,0.35)',
      },
      chipText: { fontFamily: 'Inter-Regular', fontSize: 13, color: theme.colors.MUTED },
      chipTextActive: { color: theme.colors.G },
      conditionList: {
        gap: 8,
      },
      conditionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
      },
      conditionRowActive: {
        backgroundColor: 'rgba(130,219,126,0.08)',
        borderColor: 'rgba(130,219,126,0.25)',
      },
      radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: theme.colors.GLASS_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
      },
      radioCircleActive: {
        borderColor: theme.colors.G,
      },
      radioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.G,
      },
      conditionText: { fontFamily: 'Inter-Regular', fontSize: 14, color: theme.colors.MUTED },
      conditionTextActive: { color: theme.colors.TEXT_PRIMARY },
      reviewCard: {
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
      },
      reviewImage: {
        width: '100%',
        height: 200,
      },
      reviewContent: {
        padding: 16,
        gap: 8,
      },
      reviewTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: theme.colors.TEXT_PRIMARY },
      reviewPrice: { fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: theme.colors.G },
      reviewMetaRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
      },
      reviewBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
      },
      reviewBadgeText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#ccc',
      },
      reviewLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
      },
      reviewLocationText: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: theme.colors.MUTED,
      },
      reviewDescBox: {
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
      },
      reviewDescText: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: '#aaa',
        lineHeight: 20,
      },
      footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.GLASS_BORDER,
        backgroundColor: theme.colors.DARK,
      },
      btnPrimary: {
        backgroundColor: theme.colors.G,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
      },
      btnDisabled: { opacity: 0.4 },
      btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: theme.colors.DARK },
      btnText: { fontFamily: 'Inter-Medium', fontSize: 14, color: theme.colors.LABEL, textAlign: 'center', marginTop: 12 },
      successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
      },
      successIcon: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: 'rgba(130,219,126,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(130,219,126,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      successTitle: { fontFamily: 'Outfit-Bold', fontSize: 24, color: theme.colors.TEXT_PRIMARY, textAlign: 'center' },
      successDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: theme.colors.MUTED, textAlign: 'center', lineHeight: 22 },
    }));
