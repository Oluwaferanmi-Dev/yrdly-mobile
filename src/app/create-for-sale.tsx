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
          const { urls, error: uploadErr } = await StorageService.uploadPostImages(user.id, attachedFiles);
          if (!uploadErr && urls) {
            imageUrls = urls;
          }
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
                <View key={i} style={styles.photoBox}>
                  <Image source={{ uri: file.uri }} style={styles.photoImg} />
                  <TouchableOpacity 
                    style={styles.removePhoto}
                    onPress={() => setAttachedFiles(f => f.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBox} onPress={pickImages}>
                <Ionicons name="camera-outline" size={28} color={G} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Item Details</Text>
            <Text style={styles.stepDesc}>Provide key information for buyers.</Text>
            
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Vintage Leather Jacket"
              placeholderTextColor={MUTED}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Price (₦)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CONDITIONS.map(cond => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.chip, condition === cond && styles.chipActive]}
                  onPress={() => setCondition(cond)}
                >
                  <Text style={[styles.chipText, condition === cond && styles.chipTextActive]}>{cond}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
            <Text style={styles.stepDesc}>Make sure everything looks accurate.</Text>
            
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>{title || 'Untitled Item'}</Text>
              <Text style={styles.reviewPrice}>₦{parseFloat(price || '0').toLocaleString()}</Text>
              <Text style={styles.reviewMeta}>{category} · {condition}</Text>
              <Text style={styles.reviewMeta}>Location: {location || 'Neighbourhood'}</Text>
              {desc ? <Text style={styles.reviewDesc}>{desc}</Text> : null}
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
    borderRadius: 18,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: MUTED },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: G,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', marginBottom: 4 },
  stepDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED, marginBottom: 20 },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  addPhotoBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: { fontFamily: 'Inter-Medium', fontSize: 11, color: G },
  formGroup: { gap: 12 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#ccc', marginTop: 8 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: G + '20',
    borderColor: G,
  },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
  chipTextActive: { color: G },
  reviewCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  reviewTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  reviewPrice: { fontFamily: 'Outfit-ExtraBold', fontSize: 20, color: G },
  reviewMeta: { fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED },
  reviewDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#ccc', marginTop: 8 },
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
  btnText: { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 12 },
  successContainer: {
    flex: 1,
    justify.content: 'center',
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
