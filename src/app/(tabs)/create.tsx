import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, useWindowDimensions, LogBox } from 'react-native';
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
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';
import { ScreenHeader } from '../../components/ScreenHeader';

type PostCategory = 'General' | 'For Sale' | 'Event';

LogBox.ignoreLogs([/VirtualizedLists should never be nested/]);

export default function CreateTab() {
  const { colors } = useAppTheme();
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
      setImages([]);
      setLocationData(null);
      setEventDate(new Date());
      router.replace('/(tabs)/' as any);
    }, 2200);
  }

  // Event specific state
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locationData, setLocationData] = useState<{address: string, lat: number, lng: number} | null>(null);

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

  // ── Submit post to Supabase ───────────────────────────────────────
  const handleSubmit = async () => {
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
      };

      // Add specific fields for category
      if (category === 'For Sale') {
        postData.price = price ? parseFloat(price) : 0;
      } else if (category === 'Event') {
        postData.event_date = eventDate.toISOString();
        postData.event_location = locationData;
        postData.price = price ? parseFloat(price) : 0;
      }

      // 3. Insert into the posts table
      const { error: insertError } = await supabase.from('posts').insert(postData);
      if (insertError) throw insertError;

      // 4. Success — show animated overlay then navigate
      showPostSuccess();
    } catch (e: any) {
      console.error('Post submit error:', e);
      Alert.alert('Error', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Create Post" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Form Fields (Borderless) */}
          <View style={styles.formGroup}>
            {/* User Info & Category Header */}
            <View style={[styles.authorHeader, { zIndex: 50 }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.authorAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.authorAvatar, styles.avatarFallback, { backgroundColor: colors.tint }]}>
                  <Text style={styles.avatarFallbackText}>
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              
              <View style={[styles.authorInfo, { zIndex: 50 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 50 }}>
                  <Text style={[styles.authorName, { color: colors.text }]}>{profile?.name || 'Anonymous'}</Text>
                  
                  {/* Category Dropdown Badge */}
                  <View style={{ zIndex: 50 }}>
                    <TouchableOpacity 
                      style={[styles.categoryBadge, { backgroundColor: colors.tint + '15' }]} 
                      onPress={() => setShowCategoryMenu(!showCategoryMenu)}
                    >
                      <Text style={[styles.categoryBadgeText, { color: colors.tint }]}>{category}</Text>
                      <Ionicons name="chevron-down" size={12} color={colors.tint} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    {showCategoryMenu && (
                      <View style={[styles.categoryMenu, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                        {categories.map((cat) => (
                          <TouchableOpacity 
                            key={cat} 
                            style={styles.categoryMenuItem} 
                            onPress={() => { 
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setCategory(cat); 
                              setShowCategoryMenu(false); 
                            }}
                          >
                            <Text style={{ color: colors.text, fontWeight: category === cat ? 'bold' : 'normal', fontSize: 14 }}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {profile?.location && (profile.location.ward || profile.location.lga || profile.location.state) && (
                  <Text style={[styles.authorLocation, { color: colors.textMuted }]}>
                    {[profile.location.ward, profile.location.lga || profile.location.state].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            </View>

            <TextInput
              style={[styles.inputTitle, { color: colors.text }]}
              placeholder="Give it a title (optional)"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.inputBody, { color: colors.text }]}
              placeholder={category === 'General' ? "What's going on?" : "Describe it..."}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />

            {/* Conditional Fields (Sleek Add-on Cards) */}
            {category === 'For Sale' && (
              <View style={[styles.addonCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <View style={styles.addonHeader}>
                  <Ionicons name="pricetag" size={16} color={colors.tint} />
                  <Text style={[styles.addonTitle, { color: colors.text }]}>Set Price</Text>
                </View>
                <TextInput
                  style={[styles.addonInput, { color: colors.text }]}
                  placeholder="e.g. 5000 (₦)"
                  placeholderTextColor={colors.textMuted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
            )}

            {category === 'Event' && (
              <View style={[styles.addonCard, { backgroundColor: colors.card, borderColor: colors.borderLight, zIndex: 10 }]}>
                <View style={styles.addonHeader}>
                  <Ionicons name="calendar" size={16} color={colors.tint} />
                  <Text style={[styles.addonTitle, { color: colors.text }]}>Event Details</Text>
                </View>

                {/* Location Autocomplete */}
                <View style={{ zIndex: 10, marginTop: 8 }}>
                  <ScrollView horizontal scrollEnabled={false} style={{ width: '100%' }} contentContainerStyle={{ width: '100%' }} keyboardShouldPersistTaps="handled">
                    <View style={{ width: '100%', minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight, marginBottom: 12 }}>
                      <GooglePlacesAutocomplete
                        placeholder="Location / Address"
                        fetchDetails={true}
                        onPress={(data, details = null) => {
                          if (details?.geometry?.location) {
                            setLocationData({
                              address: data.description,
                              lat: details.geometry.location.lat,
                              lng: details.geometry.location.lng,
                            });
                          }
                        }}
                        query={{
                          key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
                          language: 'en',
                        }}
                        styles={{
                          textInput: [styles.addonInput, { color: colors.text, margin: 0, padding: 0, backgroundColor: 'transparent', minHeight: 40 }],
                          textInputContainer: { backgroundColor: 'transparent', borderTopWidth: 0, borderBottomWidth: 0 },
                          row: { backgroundColor: colors.background },
                          description: { color: colors.text },
                          listView: { backgroundColor: colors.background, elevation: 4, zIndex: 100 },
                        }}
                        textInputProps={{
                          placeholderTextColor: colors.textMuted,
                        }}
                      />
                    </View>
                  </ScrollView>
                </View>

                <TextInput
                  style={[styles.addonInput, { color: colors.text, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight, marginBottom: 12, paddingBottom: 12 }]}
                  placeholder="Ticket Price (₦) - Leave empty if free"
                  placeholderTextColor={colors.textMuted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />

                {/* Date & Time Pickers */}
                {Platform.OS === 'ios' ? (
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '500', fontSize: 14 }}>Date & Time:</Text>
                    <DateTimePicker
                      value={eventDate}
                      mode="datetime"
                      display="compact"
                      onChange={(e, d) => d && setEventDate(d)}
                      themeVariant={colors.background === '#121212' ? 'dark' : 'light'}
                    />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                    <TouchableOpacity style={[styles.addonDateButton, { backgroundColor: colors.inputBackground }]} onPress={() => setShowDatePicker(true)}>
                      <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                      <Text style={{ color: colors.text, marginLeft: 8, fontSize: 14 }}>
                        {eventDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addonDateButton, { backgroundColor: colors.inputBackground }]} onPress={() => setShowTimePicker(true)}>
                      <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                      <Text style={{ color: colors.text, marginLeft: 8, fontSize: 14 }}>
                        {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        const newDate = new Date(eventDate);
                        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                        setEventDate(newDate);
                      }
                    }}
                  />
                )}
                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={eventDate}
                    mode="time"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowTimePicker(false);
                      if (selectedDate) {
                        const newDate = new Date(eventDate);
                        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                        setEventDate(newDate);
                      }
                    }}
                  />
                )}
              </View>
            )}

            {/* Action Row */}
            <View style={[styles.actionRow, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity style={styles.actionIconButton} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => setCategory(category === 'For Sale' ? 'General' : 'For Sale')}>
                <Ionicons name="pricetag-outline" size={24} color={category === 'For Sale' ? colors.tint : colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconButton} onPress={() => setCategory(category === 'Event' ? 'General' : 'Event')}>
                <Ionicons name="calendar-outline" size={24} color={category === 'Event' ? colors.tint : colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Selected Images Preview */}
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: img.thumbnailUri || img.uri }} style={[styles.previewImage, { borderColor: colors.borderLight }]} contentFit="cover" />
                    {img.type === 'video' && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
                        <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.9)" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4 }} />
                      </View>
                    )}
                    <TouchableOpacity style={[styles.removeIconBtn, { backgroundColor: colors.card }]} onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeImage(index);
                    }}>
                      <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity style={[styles.addImageBtn, { borderColor: colors.borderLight }]} onPress={pickImage}>
                    <Ionicons name="add" size={28} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: colors.tint, shadowColor: colors.tint }, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Post to Yrdly</Text>
            )}
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Post Success Overlay ──────────────── */}
      {postSuccess && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 200, justifyContent: 'flex-end' }, successOverlayStyle]}>
          <View style={styles.postSuccessBackdrop} />
          <Animated.View style={[styles.postSuccessSheet, { backgroundColor: colors.card }, successSheetStyle]}>
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
      )}
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
    paddingBottom: 40,
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
