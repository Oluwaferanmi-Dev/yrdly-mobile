import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED, TEXT_PRIMARY } from '../constants/tokens';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { StorageService, MobileFile } from '../lib/storage-service';

const STEPS = ['Photos', 'Details', 'Description', 'Review'];
const CATEGORIES = ['Fashion', 'Electronics', 'Home & Living', 'Vehicles', 'Food', 'Gaming', 'Books', 'Beauty', 'Services', 'Other'];
const CONDITIONS = ['New', 'Used – Like New', 'Used – Good', 'Fair'];

export default function CreateForSaleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  
  const [attachedFiles, setAttachedFiles] = useState<MobileFile[]>([]);
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(false);

  const progress = useSharedValue(0.25);

  React.useEffect(() => {
    progress.value = withTiming((step + 1) / STEPS.length);
  }, [step]);

  // Set default location from user profile
  React.useEffect(() => {
    if (profile?.location) {
      const locStr = [profile.location.ward, profile.location.lga, profile.location.state].filter(Boolean).join(', ');
      if (locStr) setLocation(locStr);
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
    title.trim() && price.trim() && category && condition,
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
          const uploadedImages = await Promise.all(
            attachedFiles.map((file) => StorageService.uploadPostImage(user.id, file))
          );
          imageUrls = uploadedImages.map(res => res.url).filter(Boolean) as string[];
        }

        const userLoc = profile.location as { state?: string; lga?: string; ward?: string } | undefined;

        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            author_name: profile.name || 'Seller',
            author_image: profile.avatar_url || '',
            category: 'For Sale',
            sub_category: category,
            title: title.trim(),
            text: desc.trim(),
            price: parseFloat(price) || 0,
            condition: condition,
            image_urls: imageUrls,
            is_sold: false,
            state: userLoc?.state || null,
            lga: userLoc?.lga || null,
            ward: userLoc?.ward || null,
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
      <View style={[styles.successContainer, { backgroundColor: DARK }]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={34} color={G} />
        </View>
        <Text style={styles.successTitle}>Item Listed!</Text>
        <Text style={styles.successDesc}>Your listing is now live in the neighbourhood marketplace.</Text>
        <TouchableOpacity 
          style={styles.btnPrimary}
          onPress={() => router.replace('/(tabs)/catalog')}
        >
          <Text style={styles.btnPrimaryText}>View Marketplace</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnText}>Back to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: DARK, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Item for Sale</Text>
          <Text style={styles.headerSubtitle}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
        </View>
      </View>

      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Add Photos</Text>
            <Text style={styles.stepDesc}>First photo becomes your listing cover.</Text>
            <View style={styles.photosGrid}>
              {attachedFiles.map((file, i) => (
                <View key={i} style={[styles.photoBox, i === 0 && { borderWidth: 2, borderColor: G }]}>
                  <Image source={{ uri: file.uri }} style={styles.photoImg} />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removePhoto}
                    onPress={() => setAttachedFiles(f => f.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBox} onPress={pickImages}>
                <Feather name="camera" size={24} color={LABEL} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Nike Air Max 90, Blue"
              placeholderTextColor={MUTED}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Price (₦)</Text>
            <TextInput
              style={[styles.input, { fontFamily: 'Outfit-Bold', fontSize: 18 }]}
              placeholder="₦ 0"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Condition</Text>
            <View style={styles.conditionList}>
              {CONDITIONS.map(cond => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.conditionRow, condition === cond && styles.conditionRowActive]}
                  onPress={() => setCondition(cond)}
                >
                  <View style={[styles.radioCircle, condition === cond && styles.radioCircleActive]}>
                    {condition === cond && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.conditionText, condition === cond && styles.conditionTextActive]}>{cond}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lekki Phase 1, Lagos"
              placeholderTextColor={MUTED}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Description</Text>
            <Text style={styles.stepDesc}>Describe condition, size, features, and pickup info.</Text>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write a clear description..."
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={desc}
              onChangeText={setDesc}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Review & Publish</Text>
            <Text style={styles.stepDesc}>Make sure everything looks accurate before posting.</Text>
            
            <View style={styles.reviewCard}>
              {attachedFiles.length > 0 ? (
                <Image source={{ uri: attachedFiles[0].uri }} style={styles.reviewImage} contentFit="cover" />
              ) : (
                <View style={[styles.reviewImage, { backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center' }]}>
                  <Feather name="image" size={32} color={MUTED} />
                </View>
              )}
              <View style={styles.reviewContent}>
                <Text style={styles.reviewTitle}>{title || 'Untitled Item'}</Text>
                <Text style={styles.reviewPrice}>₦{parseFloat(price || '0').toLocaleString()}</Text>
                
                <View style={styles.reviewMetaRow}>
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>{category || 'Category'}</Text>
                  </View>
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>{condition || 'Condition'}</Text>
                  </View>
                </View>
                
                <View style={styles.reviewLocationRow}>
                  <Ionicons name="location-outline" size={16} color={MUTED} />
                  <Text style={styles.reviewLocationText}>{location || 'Neighbourhood'}</Text>
                </View>
                
                {desc ? (
                  <View style={styles.reviewDescBox}>
                    <Text style={styles.reviewDescText} numberOfLines={3}>{desc}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.btnPrimary, !canNext && styles.btnDisabled]}
          disabled={!canNext || listing}
          onPress={handleNext}
        >
          {listing ? (
            <ActivityIndicator size="small" color={DARK} />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {step === STEPS.length - 1 ? 'Publish Listing' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: G,
    borderRadius: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff', marginBottom: 4 },
  stepDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL, marginBottom: 20 },
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
    backgroundColor: G,
  },
  coverBadgeText: { fontFamily: 'Outfit-Bold', fontSize: 9, color: DARK },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  addPhotoBox: {
    width: (Dimensions.get('window').width - 40 - 16) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: SURFACE,
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
    color: LABEL, 
    marginBottom: 8, 
    marginTop: 8,
    textTransform: 'uppercase', 
    letterSpacing: 0.96 
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#fff',
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
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  chipActive: {
    backgroundColor: 'rgba(130,219,126,0.15)',
    borderColor: 'rgba(130,219,126,0.35)',
  },
  chipText: { fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED },
  chipTextActive: { color: G },
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
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
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
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: G,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: G,
  },
  conditionText: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED },
  conditionTextActive: { color: '#fff' },
  reviewCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
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
  reviewTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff' },
  reviewPrice: { fontFamily: 'Outfit-ExtraBold', fontSize: 22, color: G },
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
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: MUTED,
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
    borderTopColor: GLASS_BORDER,
    backgroundColor: DARK,
  },
  btnPrimary: {
    backgroundColor: G,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
  btnText: { fontFamily: 'Inter-Medium', fontSize: 14, color: LABEL, textAlign: 'center', marginTop: 12 },
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
  successTitle: { fontFamily: 'Outfit-Bold', fontSize: 24, color: '#fff', textAlign: 'center' },
  successDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22 },
});
