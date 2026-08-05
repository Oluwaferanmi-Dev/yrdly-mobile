import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED, TEXT_PRIMARY } from '../constants/tokens';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/use-supabase-auth';
import { usePosts } from '../hooks/use-posts';
import { MobileFile } from '../lib/storage-service';

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { createPost } = usePosts();

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<MobileFile[]>([]);
  const [category, setCategory] = useState('General');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const categories = ['General', 'Recommendation', 'Safety', 'Lost & Found', 'Trade'];

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
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setAttachedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (e) {
      console.error('Pick image error:', e);
    }
  };

  const doPost = async () => {
    if (!text.trim() && attachedFiles.length === 0) return;
    if (!user || !profile) {
      Alert.alert('Authentication required', 'Please sign in to post.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPosting(true);

    try {
      await createPost(
        {
          text: text.trim(),
          category,
        },
        undefined,
        attachedFiles.length > 0 ? attachedFiles : undefined
      );

      setPosting(false);
      setPosted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setPosting(false);
      Alert.alert('Error', error?.message || 'Failed to create post. Please try again.');
    }
  };

  const hasContent = text.trim().length > 0 || attachedFiles.length > 0;

  if (posted) {
    return (
      <View style={[styles.successContainer, { backgroundColor: DARK }]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={34} color={G} />
        </View>
        <Text style={styles.successTitle}>Posted!</Text>
        <Text style={styles.successDesc}>Your post is now live in your neighbourhood.</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.backButtonText}>Back to Feed</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity 
          onPress={doPost} 
          disabled={!hasContent || posting}
          style={[styles.postButton, { backgroundColor: hasContent ? G : 'rgba(130,219,126,0.25)' }]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={DARK} />
          ) : (
            <Text style={[styles.postButtonText, { color: hasContent ? DARK : 'rgba(130,219,126,0.5)' }]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.authorRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(profile?.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{profile?.name || 'Neighbour'}</Text>
            <TouchableOpacity 
              style={styles.areaPill}
              onPress={() => setShowCategoryMenu(!showCategoryMenu)}
            >
              <Ionicons name="pricetag-outline" size={12} color={G} />
              <Text style={styles.areaText}>{category}</Text>
              <Ionicons name="chevron-down" size={12} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {showCategoryMenu && (
          <View style={styles.categoryMenu}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryOption, category === cat && { backgroundColor: G + '20' }]}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryMenu(false);
                }}
              >
                <Text style={[styles.categoryOptionText, category === cat && { color: G, fontFamily: 'Inter-Bold' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="What's happening in your neighbourhood?"
          placeholderTextColor={MUTED}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          selectionColor={G}
        />

        {attachedFiles.length > 0 && (
          <View style={styles.photosGrid}>
            {attachedFiles.map((file, i) => (
              <View key={i} style={styles.photoWrapper}>
                <Image 
                  source={{ uri: file.uri }}
                  style={styles.attachedImage}
                />
                <TouchableOpacity 
                  style={styles.removePhotoBtn}
                  onPress={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                >
                  <Feather name="x" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
          <Ionicons name="image-outline" size={22} color={G} />
          <Text style={{ color: TEXT_PRIMARY, fontFamily: 'Inter-Medium', fontSize: 13, marginLeft: 8 }}>Add Photos</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerBtn: { paddingVertical: 8, paddingRight: 16 },
  cancelText: { fontFamily: 'Inter-Medium', fontSize: 15, color: MUTED },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff' },
  postButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: { fontFamily: 'Outfit-Bold', fontSize: 14 },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: G,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
  authorName: { fontFamily: 'Outfit-Bold', fontSize: 15, color: '#fff', marginBottom: 2 },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignSelf: 'flex-start',
  },
  areaText: { fontFamily: 'Inter-Medium', fontSize: 12, color: TEXT_PRIMARY },
  categoryMenu: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    overflow: 'hidden',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
  },
  categoryOptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  input: {
    paddingHorizontal: 20,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    minHeight: 150,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  photoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  attachedImage: { width: '100%', height: '100%' },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
    backgroundColor: DARK,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
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
  backButton: {
    marginTop: 8,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: G,
  },
  backButtonText: { fontFamily: 'Outfit-Bold', fontSize: 15, color: DARK },
});
