import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, useWindowDimensions, LogBox, Modal, Keyboard } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ForSaleForm, type ForSaleFormValues, type PostImage as FSPostImage } from '../../components/ForSaleForm';
import { CreateEventForm, type CreateEventFormValues, type TicketTierInput as CETicketTier } from '../../components/CreateEventForm';
import { GeneralPostForm, type GeneralPostFormValues, type GeneralPostImage } from '../../components/GeneralPostForm';

type PostCategory = 'General' | 'For Sale' | 'Event';

LogBox.ignoreLogs([/VirtualizedLists should never be nested/]);

export default function CreateTab() {
  const { colors, isDarkMode } = useAppTheme();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<PostCategory>('General');
  const categories: PostCategory[] = ['General', 'For Sale', 'Event'];
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [eventCategory, setEventCategory] = useState('');
  const [isTicketed, setIsTicketed] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  interface PostImage {
    uri: string;
    width: number;
    height: number;
    type?: 'image' | 'video';
    thumbnailUri?: string;
  }
  const [images, setImages] = useState<PostImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Post success overlay animation
  const successOverlayOp = useSharedValue(0);
  const successSheetY    = useSharedValue(300);
  const successContentOp = useSharedValue(0);
  const successOverlayStyle = useAnimatedStyle(() => ({ opacity: successOverlayOp.value }));
  const successSheetStyle   = useAnimatedStyle(() => ({ transform: [{ translateY: successSheetY.value }] }));
  const successContentStyle = useAnimatedStyle(() => ({ opacity: successContentOp.value }));

  function showPostSuccess() {
    setPostSuccess(true);
    successOverlayOp.value = withTiming(1, { duration: 250 });
    successSheetY.value    = withSpring(0, { damping: 22, stiffness: 200 });
    successContentOp.value = withDelay(300, withTiming(1, { duration: 400 }));
    // Auto-navigate after 2.2s
    setTimeout(() => {
      setTitle('');
      setText('');
      setPrice('');
      setSubCategory('');
      setCondition('');
      setNegotiable(false);
      setImages([]);
      setLocationData(null);
      setEventDate(new Date());
      
      setPostSuccess(false);
      successOverlayOp.value = 0;
      successSheetY.value = 300;
      successContentOp.value = 0;
      
      router.navigate({ pathname: '/(tabs)/', params: { scrollToTop: 'true' } } as any);
    }, 2200);
  }

  // Event specific state
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locationData, setLocationData] = useState<{address: string, lat: number, lng: number} | null>(null);

  interface TicketTierInput {
    id: string;
    name: string;
    price: string;
    capacity: string;
  }
  const [ticketTiers, setTicketTiers] = useState<TicketTierInput[]>([
    { id: '1', name: 'General Admission', price: '0', capacity: '' }
  ]);

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only select up to 5 images.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library in Settings.');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImages = await Promise.all(result.assets.map(async (asset) => {
          let thumbnailUri = asset.uri;
          const type = asset.type || (asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov') ? 'video' : 'image');
          if (type === 'video') {
            try {
              const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
                time: 1000,
              });
              thumbnailUri = uri;
            } catch (e) {
              console.warn("Could not generate thumbnail for video in preview", e);
            }
          }
          return {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            type: type as 'image' | 'video',
            thumbnailUri: thumbnailUri
          };
        }));
        setImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (e) {
      console.log("ImagePicker error:", e);
      Alert.alert('Error', 'Could not access the selected photo/video. Please try another one.');
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  // ── Upload media to Supabase Storage ─────────────────────────────
  const uploadMedia = async (uri: string): Promise<{ url: string | null; type: 'image' | 'video' }> => {
    try {
      // Read the file as base64 and decode to ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);

      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const isVideo = ext === 'mp4' || ext === 'mov' || ext === 'quicktime';
      const bucketName = isVideo ? 'post-videos' : 'post-images';
      const filePath = `posts/${user!.id}/${Date.now()}.${ext}`;

      let contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      if (isVideo) {
        contentType = ext === 'quicktime' || ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      }

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: false,
          cacheControl: isVideo ? '604800' : '604800',
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return { url: data.publicUrl, type: isVideo ? 'video' : 'image' };
    } catch (e) {
      console.error('Media upload error:', e);
      return { url: null, type: 'image' };
    }
  };

  const isSubmittingRef = useRef(false);

  // ── Submit post to Supabase ───────────────────────────────────────
  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    Keyboard.dismiss();
    if (!user) {
      Alert.alert('Not signed in', 'You must be logged in to create a post.');
      return;
    }
    if (!text.trim() && !title.trim()) {
      Alert.alert('Missing Content', 'Please add some text before posting.');
      return;
    }
    if ((category === 'For Sale' || category === 'Event') && images.length === 0) {
      Alert.alert('Image Required', `Please add at least one image for your ${category === 'For Sale' ? 'marketplace item' : 'event'}.`);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 1. Upload media (if any) and collect public URLs
      let uploadedImageUrls: string[] = [];
      let videoUrl: string | null = null;
      let videoThumbnailUrl: string | null = null;

      if (images.length > 0) {
        for (const img of images) {
          const { url, type } = await uploadMedia(img.uri);
          if (url) {
            if (type === 'video') {
              videoUrl = url;
              // Generate and upload thumbnail for the video
              try {
                const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(img.uri, { time: 1000 });
                const { url: thumbUrl } = await uploadMedia(thumbUri);
                if (thumbUrl) videoThumbnailUrl = thumbUrl;
              } catch (e) {
                console.error('Failed to generate/upload video thumbnail:', e);
              }
            } else {
              uploadedImageUrls.push(url);
            }
          }
        }
        if (uploadedImageUrls.length === 0 && !videoUrl) {
          Alert.alert('Upload Failed', 'Could not upload your media. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Build the post record matching the web app's schema
      const postData: Record<string, unknown> = {
        user_id: user.id,
        author_name: user.user_metadata?.name || user.email,
        author_image: user.user_metadata?.avatar_url || null,
        text: text.trim() || '',
        title: title.trim() || '',
        category,
        image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        image_urls: uploadedImageUrls,
        image_width: images.length > 0 ? images[0].width : null,
        image_height: images.length > 0 ? images[0].height : null,
        video_url: videoUrl,
        video_thumbnail_url: videoThumbnailUrl,
        state: profile?.location?.state || null,
        lga: profile?.location?.lga || null,
        ward: profile?.location?.ward || null,
        timestamp: new Date().toISOString(),
        liked_by: [],
        comment_count: 0,
        is_sold: false,
        visibility: category === 'General' ? visibility : 'public',
      };

      // Add specific fields for category
      if (category === 'For Sale') {
        postData.price = price ? parseFloat(price) : 0;
        postData.sub_category = subCategory || null;
        postData.condition = condition || null;
        postData.negotiable = negotiable;
        const { error: insertError } = await supabase.from('posts').insert(postData);
        if (insertError) throw insertError;
      } else if (category === 'Event') {
        const formattedTiers = ticketTiers.map(t => ({
          name: t.name,
          price: parseFloat(t.price) || 0,
          capacity: t.capacity ? parseInt(t.capacity) : undefined,
        }));
        
        await api.post('/api/events/create', {
          title: title.trim() || 'Untitled Event',
          description: text.trim() || '',
          category: 'Event',
          subCategory: eventCategory || null,
          coverImageUrl: uploadedImageUrls[0] || null,
          imageUrls: uploadedImageUrls,
          locationAddress: locationData?.address || profile?.location?.state || '',
          lat: locationData?.lat,
          lng: locationData?.lng,
          ward: profile?.location?.ward,
          lga: profile?.location?.lga,
          state: profile?.location?.state,
          startTime: eventDate.toISOString(),
          timezone: 'Africa/Lagos',
          publish: true,
          ticketTiers: formattedTiers,
        });
      } else {
        const { error: insertError } = await supabase.from('posts').insert(postData);
        if (insertError) throw insertError;
      }

      // 4. Success — show animated overlay then navigate
      Keyboard.dismiss();
      showPostSuccess();
    } catch (e: any) {
      console.error('Post submit error:', e);
      Alert.alert('Error', e?.message || 'Something went wrong. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  // ── ForSale form values bridge ─────────────────────────────────────────
  const forSaleValues: ForSaleFormValues = {
    title, text, price, subCategory, condition, negotiable,
    images: images as FSPostImage[],
  };
  // Event form bridge
  const eventFormValues: CreateEventFormValues = {
    title, text, images: images as any,
    eventDate, locationData,
    ticketTiers: ticketTiers as CETicketTier[],
    eventCategory, isTicketed,
  };
  const handleEventFormChange = (patch: Partial<CreateEventFormValues>) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.text !== undefined) setText(patch.text);
    if (patch.images !== undefined) setImages(patch.images as any);
    if (patch.eventDate !== undefined) setEventDate(patch.eventDate);
    if (patch.locationData !== undefined) setLocationData(patch.locationData);
    if (patch.ticketTiers !== undefined) setTicketTiers(patch.ticketTiers as any);
    if (patch.eventCategory !== undefined) setEventCategory(patch.eventCategory);
    if (patch.isTicketed !== undefined) setIsTicketed(patch.isTicketed);
  };

  // General form bridge
  const generalFormValues: GeneralPostFormValues = {
    title, text, images: images as GeneralPostImage[], visibility,
  };
  const handleGeneralFormChange = (patch: Partial<GeneralPostFormValues>) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.text !== undefined) setText(patch.text);
    if (patch.images !== undefined) setImages(patch.images as any);
    if (patch.visibility !== undefined) setVisibility(patch.visibility);
  };

  const handleForSaleChange = (patch: Partial<ForSaleFormValues>) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.text !== undefined) setText(patch.text);
    if (patch.price !== undefined) setPrice(patch.price);
    if (patch.subCategory !== undefined) setSubCategory(patch.subCategory);
    if (patch.condition !== undefined) setCondition(patch.condition);
    if (patch.negotiable !== undefined) setNegotiable(patch.negotiable);
    if (patch.images !== undefined) setImages(patch.images as typeof images);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={category === 'For Sale' ? 'Sell an Item' : category === 'Event' ? 'Create Event' : 'Create Post'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {/* ── PREMIUM FOR SALE FLOW ── */}
        {category === 'For Sale' ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ForSaleForm
              values={forSaleValues}
              onChange={handleForSaleChange}
              onAddPhoto={pickImage}
              onRemovePhoto={index => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeImage(index); }}
              profile={profile}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              showCategoryMenu={showCategoryMenu}
              onCategoryChange={() => setShowCategoryMenu(!showCategoryMenu)}
              categories={categories}
              onSelectCategory={(cat) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategory(cat as any);
                setShowCategoryMenu(false);
              }}
            />
          </ScrollView>
        ) : category === 'Event' ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <CreateEventForm
              values={eventFormValues}
              onChange={handleEventFormChange}
              onAddPhoto={pickImage}
              onRemovePhoto={index => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeImage(index); }}
              profile={profile}
              isDarkMode={isDarkMode}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              showCategoryMenu={showCategoryMenu}
              onCategoryChange={() => setShowCategoryMenu(!showCategoryMenu)}
              categories={categories}
              onSelectCategory={(cat) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategory(cat as any);
                setShowCategoryMenu(false);
              }}
            />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <GeneralPostForm
              values={generalFormValues}
              onChange={handleGeneralFormChange}
              onAddPhoto={pickImage}
              onRemovePhoto={index => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeImage(index); }}
              profile={profile}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              showCategoryMenu={showCategoryMenu}
              onCategoryChange={() => setShowCategoryMenu(!showCategoryMenu)}
              categories={categories}
              onSelectCategory={(cat) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategory(cat as any);
                setShowCategoryMenu(false);
              }}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* ── Post Success Overlay ──────────────── */}
      <Modal visible={postSuccess} transparent={true} animationType="none" onRequestClose={() => {}}>
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 200, justifyContent: 'flex-end' }, successOverlayStyle]}>
          <View style={styles.postSuccessBackdrop} />
          <Animated.View style={[styles.postSuccessSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 90 }, successSheetStyle]}>
            <View style={styles.postSuccessHandle} />
            <LottieView
              autoPlay
              loop={false}
              style={{ width: 160, height: 160 }}
              source={{ uri: 'https://lottie.host/3acad958-cd8e-424a-a1c9-58e8bff45d87/XvFdYxtUDF.json' }}
            />
            <Animated.View style={[{ alignItems: 'center', paddingHorizontal: 32 }, successContentStyle]}>
              <Text style={[styles.postSuccessTitle, { color: colors.text }]}>Posted! 🎉</Text>
              <Text style={[styles.postSuccessBody, { color: colors.textMuted }]}>
                Your post is live on Yrdly. Taking you to the feed…
              </Text>
            </Animated.View>
            <View style={{ height: 40 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  postSuccessBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  postSuccessSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 20,
  },
  postSuccessHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)', marginBottom: 8,
  },
  postSuccessTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  postSuccessBody: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryMenu: {
    position: 'absolute',
    top: 30,
    left: 8,
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingVertical: 4,
  },
  categoryMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  authorLocation: {
    fontSize: 13,
    marginTop: 2,
  },
  inputTitle: {
    fontSize: 24,
    fontWeight: '800',
    paddingVertical: 4,
    marginBottom: 4,
  },
  inputBody: {
    fontSize: 18,
    minHeight: 120,
    paddingVertical: 4,
    lineHeight: 24,
  },
  addonCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  addonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addonInput: {
    fontSize: 18,
    paddingVertical: 8,
  },
  addonDateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tierHelperText: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  locationButton: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, padding: 16,
  },
  ticketTiersContainer: {
    marginTop: 16,
  },
  ticketTiersHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  ticketTiersTitle: { fontSize: 16, fontWeight: '700' },
  ticketTierCard: {
    borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12,
  },
  tierNameInput: {
    fontSize: 16, fontWeight: '600', flex: 1,
  },
  tierLabel: { fontSize: 12, marginBottom: 4, fontWeight: '500' },
  tierInput: {
    borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    marginTop: 16,
  },
  actionIconButton: {
    marginRight: 24,
  },
  imageList: {
    flexDirection: 'row',
    marginTop: 20,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  removeIconBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 32,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
