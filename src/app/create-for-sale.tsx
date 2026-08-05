import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED } from '../constants/tokens';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming, useSharedValue, useEffect } from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

const STEPS = ['Photos', 'Details', 'Description', 'Review'];
const CATEGORIES = ['Fashion', 'Electronics', 'Home & Living', 'Vehicles', 'Food', 'Gaming', 'Books', 'Beauty', 'Services', 'Other'];
const CONDITIONS = ['New', 'Used – Like New', 'Used – Good', 'Fair'];
const PHOTO_IDS = ['1556742049-0cfed4f6a45d', '1523275335684-37898b6baf30', '1585386959984-a4155224a1ad'];

export default function CreateForSaleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(false);

  const progress = useSharedValue(0.25);

  React.useEffect(() => {
    progress.value = withTiming((step + 1) / STEPS.length);
  }, [step]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  const canNext = [
    true,
    title.trim() && price.trim() && category && condition && location,
    desc.trim(),
    true,
  ][step];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setListing(true);
      setTimeout(() => {
        setListing(false);
        setListed(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 1600);
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
      <View style={[styles.successContainer, { backgroundColor: '#050505' }]}>
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
      style={[styles.container, { backgroundColor: '#050505', paddingTop: insets.top }]}
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
              {PHOTO_IDS.map((pid, i) => (
                <View key={i} style={[styles.photoBox, i === 0 && styles.photoBoxCover]}>
                  <Image source={{ uri: `https://images.unsplash.com/photo-${pid}?w=200&h=200&fit=crop&auto=format&q=80` }} style={styles.photoImg} />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBox}>
                <Feather name="plus" size={24} color={LABEL} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Nike Air Max 90, Blue" placeholderTextColor={MUTED} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Price (₦)</Text>
              <TextInput style={[styles.input, styles.inputPrice]} value={price} onChangeText={setPrice} placeholder="₦ 0" placeholderTextColor={MUTED} keyboardType="numeric" />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.pillContainer}>
                {CATEGORIES.map(c => {
                  const isSelected = category === c;
                  return (
                    <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.pill, isSelected && styles.pillSelected]}>
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View>
              <Text style={styles.fieldLabel}>Condition</Text>
              <View style={{ gap: 8 }}>
                {CONDITIONS.map(c => {
                  const isSelected = condition === c;
                  return (
                    <TouchableOpacity key={c} onPress={() => setCondition(c)} style={[styles.radioRow, isSelected && styles.radioRowSelected]}>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View>
              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Lekki Phase 1, Lagos" placeholderTextColor={MUTED} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Description</Text>
            <Text style={styles.stepDesc}>Describe the item — condition, features, why you're selling.</Text>
            <TextInput style={[styles.input, styles.textArea]} value={desc} onChangeText={setDesc} placeholder="e.g. Barely used, bought last year. No scratches..." placeholderTextColor={MUTED} multiline textAlignVertical="top" />
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.stepTitle}>Preview</Text>
              <Text style={styles.stepDesc}>This is how your listing appears on the feed and marketplace.</Text>
            </View>
            
            <View style={styles.previewCard}>
              <View style={styles.previewAuthorRow}>
                <Image source={{ uri: "https://images.unsplash.com/photo-1563132337-f159f484226c?w=80&h=80&fit=crop&auto=format" }} style={styles.previewAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewAuthorName}>Amina Bello</Text>
                  <Text style={styles.previewAuthorTime}>Just now {location ? `· ${location}` : ''}</Text>
                </View>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>For Sale</Text>
                </View>
              </View>
              <View style={styles.previewImageContainer}>
                <Image source={{ uri: `https://images.unsplash.com/photo-${PHOTO_IDS[0]}?w=600&h=450&fit=crop&auto=format&q=85` }} style={styles.previewMainImage} />
                {price ? (
                  <View style={styles.previewPriceBadge}>
                    <Text style={styles.previewPriceText}>₦{Number(price).toLocaleString()}</Text>
                  </View>
                ) : null}
                {condition ? (
                  <View style={styles.previewCondBadge}>
                    <Text style={styles.previewCondText}>{condition}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.previewContent}>
                <Text style={styles.previewTitle}>{title || 'Item Title'}</Text>
                <View style={styles.previewMeta}>
                  {category ? <Text style={styles.previewMetaPill}>{category}</Text> : null}
                  {location ? <Text style={styles.previewMetaText}>{location}</Text> : null}
                </View>
                {desc ? (
                  <Text style={styles.previewDesc}>{desc.slice(0, 120)}{desc.length > 120 ? '…' : ''}</Text>
                ) : null}
              </View>
            </View>

            {PHOTO_IDS.length > 1 && (
              <View>
                <Text style={styles.photoCountText}>{PHOTO_IDS.length} photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {PHOTO_IDS.map((pid, i) => (
                    <View key={i} style={[styles.stripPhotoBox, i === 0 && { borderWidth: 2, borderColor: G }]}>
                      <Image source={{ uri: `https://images.unsplash.com/photo-${pid}?w=160&h=160&fit=crop&auto=format&q=80` }} style={styles.photoImg} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.reminderBox}>
              <Feather name="info" size={16} color={G} />
              <Text style={styles.reminderText}>Your listing will appear on the neighbourhood feed and marketplace as soon as you tap <Text style={{ color: '#fff', fontFamily: 'Inter-Bold' }}>List Item</Text>.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
        <TouchableOpacity 
          style={[styles.continueBtn, !canNext && styles.continueBtnDisabled]}
          disabled={!canNext}
          onPress={handleNext}
        >
          <Text style={[styles.continueBtnText, !canNext && styles.continueBtnTextDisabled]}>
            {listing ? 'Listing…' : step < STEPS.length - 1 ? 'Continue' : 'List Item'}
          </Text>
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
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
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
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 },
  progressBarBg: {
    marginHorizontal: 20,
    marginTop: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: G,
  },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  stepTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff', marginBottom: 4 },
  stepDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL, marginBottom: 20 },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoBox: {
    width: (screenWidth - 40 - 16) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoBoxCover: { borderColor: G },
  photoImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: G,
  },
  coverBadgeText: { fontFamily: 'Outfit-Bold', fontSize: 9, color: DARK },
  addPhotoBox: {
    width: (screenWidth - 40 - 16) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: LABEL,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    color: '#fff',
    fontFamily: 'Inter-Regular',
    fontSize: 15,
  },
  inputPrice: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  textArea: { minHeight: 150 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  pillSelected: {
    backgroundColor: 'rgba(130,219,126,0.15)',
    borderColor: 'rgba(130,219,126,0.35)',
  },
  pillText: { fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED },
  pillTextSelected: { color: G },
  radioRow: {
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
  radioRowSelected: {
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
  radioCircleSelected: { borderColor: G },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: G },
  radioText: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED },
  radioTextSelected: { color: '#fff' },
  
  previewCard: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewAvatar: { width: 36, height: 36, borderRadius: 18 },
  previewAuthorName: { fontFamily: 'Outfit-Bold', fontSize: 14, color: '#fff' },
  previewAuthorTime: { fontFamily: 'Inter-Regular', fontSize: 11, color: LABEL },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  previewBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewImageContainer: { position: 'relative', width: '100%', aspectRatio: 4/3, overflow: 'hidden' },
  previewMainImage: { width: '100%', height: '100%' },
  previewPriceBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: G,
  },
  previewPriceText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
  previewCondBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  previewCondText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#fff' },
  previewContent: { paddingHorizontal: 16, paddingVertical: 12 },
  previewTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff', marginBottom: 4 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  previewMetaPill: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: LABEL,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  previewMetaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
  previewDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED, lineHeight: 20, marginTop: 8 },
  photoCountText: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginBottom: 10 },
  stripPhotoBox: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden' },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(130,219,126,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.15)',
    borderRadius: 14,
  },
  reminderText: { fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED, lineHeight: 20, flex: 1 },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: G,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: { backgroundColor: 'rgba(130,219,126,0.2)' },
  continueBtnText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
  continueBtnTextDisabled: { color: 'rgba(130,219,126,0.4)' },
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
  btnPrimary: {
    marginTop: 8,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: G,
  },
  btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 15, color: DARK },
  btnText: { fontFamily: 'Inter-Regular', fontSize: 14, color: LABEL, marginTop: 8 },
});
