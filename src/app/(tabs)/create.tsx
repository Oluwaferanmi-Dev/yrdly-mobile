import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { useAppTheme } from '../../context/ThemeContext';

type PostCategory = 'General' | 'For Sale' | 'Event';

export default function CreateTab() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<PostCategory>('General');
  const categories: PostCategory[] = ['General', 'For Sale', 'Event'];
  
  const slideX = useSharedValue(0);

  useEffect(() => {
    const index = categories.indexOf(category);
    slideX.value = withSpring(index, { damping: 15, stiffness: 120 });
  }, [category]);

  const pillAnimatedStyle = useAnimatedStyle(() => {
    // The width of the container is roughly width - 32 (padding 16*2)
    // The width of each pill is (width - 32) / 3
    const tabWidth = (width - 32) / 3;
    return {
      transform: [{ translateX: slideX.value * tabWidth }],
      width: tabWidth,
    };
  });

  const handleCategoryPress = (cat: PostCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(cat);
  };

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  interface PostImage {
    uri: string;
    width: number;
    height: number;
  }
  const [images, setImages] = useState<PostImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      }));
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  // ── Upload image to Supabase Storage ─────────────────────────────
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      // Read the file as base64 and decode to ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);

      // Build a unique file path: posts/<user_id>/<timestamp>.jpg
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `posts/${user!.id}/${Date.now()}.${ext}`;
      const mimeExt = ext === 'jpg' ? 'jpeg' : ext;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, arrayBuffer, { contentType: `image/${mimeExt}`, upsert: false });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      console.error('Image upload error:', e);
      return null;
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

    setIsSubmitting(true);
    try {
      // 1. Upload images (if any) and collect public URLs
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        for (const img of images) {
          const url = await uploadImage(img.uri);
          if (url) {
            uploadedUrls.push(url);
          }
        }
        if (uploadedUrls.length === 0) {
          Alert.alert('Upload Failed', 'Could not upload your images. Please try again.');
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
        image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
        image_urls: uploadedUrls,
        image_width: images.length > 0 ? images[0].width : null,
        image_height: images.length > 0 ? images[0].height : null,
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

      // 4. Success — reset form and navigate to home feed
      Alert.alert('Posted! 🎉', 'Your post is now live on Yrdly.', [
        {
          text: 'View Feed',
          onPress: () => {
            setTitle('');
            setText('');
            setPrice('');
            setImages([]);
            setLocationData(null);
            setEventDate(new Date());
            router.push('/');
          },
        },
      ]);
    } catch (e: any) {
      console.error('Post submit error:', e);
      Alert.alert('Error', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Category Selector */}
          <View style={[styles.categoryRow, { backgroundColor: colors.inputBackground }]}>
            <Animated.View style={[styles.activePill, { backgroundColor: colors.background, shadowColor: colors.text }, pillAnimatedStyle]} />
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                activeOpacity={1}
                style={styles.categoryButton}
                onPress={() => handleCategoryPress(cat)}
              >
                <Text style={[styles.categoryText, { color: category === cat ? colors.text : colors.textSecondary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Fields (Borderless) */}
          <View style={styles.formGroup}>
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

            {category === 'For Sale' && (
              <TextInput
                style={[styles.inputPrice, { color: colors.tint, borderBottomColor: colors.borderLight }]}
                placeholder="Price (₦)"
                placeholderTextColor={colors.textMuted}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            )}

            {category === 'Event' && (
              <View style={{ zIndex: 10 }}>
                <View style={{ minHeight: 40, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 8, marginBottom: 12 }}>
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
                      textInput: [styles.inputBody, { color: colors.text, margin: 0, padding: 0 }],
                      textInputContainer: { backgroundColor: 'transparent' },
                      row: { backgroundColor: colors.background },
                      description: { color: colors.text },
                    }}
                    textInputProps={{
                      placeholderTextColor: colors.textMuted,
                    }}
                  />
                </View>
                <TextInput
                  style={[styles.inputPrice, { color: colors.tint, borderBottomColor: colors.borderLight }]}
                  placeholder="Ticket Price (₦) - Leave empty if free"
                  placeholderTextColor={colors.textMuted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />

                {Platform.OS === 'ios' ? (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Date & Time:</Text>
                    <DateTimePicker
                      value={eventDate}
                      mode="datetime"
                      display="compact"
                      onChange={(e, d) => d && setEventDate(d)}
                      themeVariant={colors.background === '#121212' ? 'dark' : 'light'}
                    />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <TouchableOpacity style={[styles.dateButton, { borderColor: colors.borderLight }]} onPress={() => setShowDatePicker(true)}>
                      <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                      <Text style={{ color: colors.text, marginLeft: 8 }}>
                        {eventDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.dateButton, { borderColor: colors.borderLight }]} onPress={() => setShowTimePicker(true)}>
                      <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                      <Text style={{ color: colors.text, marginLeft: 8 }}>
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
          </View>

          {/* Media Picker */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Add Media</Text>
            {images.length > 0 && images.length < 5 && (
              <TouchableOpacity onPress={pickImage}>
                <Text style={[styles.addMoreText, { color: colors.tint }]}>+ Add More</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: img.uri }} style={[styles.previewImage, { borderColor: colors.borderLight }]} contentFit="cover" />
                  <TouchableOpacity style={[styles.removeIconBtn, { backgroundColor: colors.card }]} onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    removeImage(index);
                  }}>
                    <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              pickImage();
            }}>
              <View style={styles.imagePlaceholder}>
                <Ionicons name="images-outline" size={32} color={colors.tint} />
                <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>Add photos...</Text>
              </View>
            </TouchableOpacity>
          )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 24,
  },
  inputTitle: {
    fontSize: 28,
    fontWeight: '800',
    paddingVertical: 4,
    marginBottom: 8,
  },
  inputBody: {
    fontSize: 18,
    minHeight: 120,
    paddingVertical: 4,
    lineHeight: 24,
  },
  inputPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: 12,
    marginTop: 8,
  },
  imagePicker: {
    height: 160,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
  },
  removeIconBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
  },
  removeImageText: {
    color: '#E53935',
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 24,
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
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
});
