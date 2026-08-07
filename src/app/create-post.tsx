import { createStyleSheet, useStyles } from "react-native-unistyles";
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/use-supabase-auth';
import { usePosts } from '../hooks/use-posts';
import { MobileFile } from '../lib/storage-service';

export default function CreatePostScreen() {
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

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

  const categories = ['General', 'Wanted', 'Request', 'Recommendation', 'Giveaway'];

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
          category: category as any,
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
      <View style={[stylesheet.successContainer, { backgroundColor: theme.colors.DARK }]}>
        <View style={stylesheet.successIcon}>
          <Feather name="check" size={34} color={theme.colors.G} />
        </View>
        <Text style={stylesheet.successTitle}>Posted!</Text>
        <Text style={stylesheet.successDesc}>Your post is now live in your neighbourhood.</Text>
        <TouchableOpacity 
          style={stylesheet.backButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={stylesheet.backButtonText}>Back to Feed</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={stylesheet.headerBtn}>
          <Text style={stylesheet.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={stylesheet.headerTitle}>New Post</Text>
        <TouchableOpacity 
          onPress={doPost} 
          disabled={!hasContent || posting}
          style={[stylesheet.postButton, { backgroundColor: hasContent ? theme.colors.G : 'rgba(130,219,126,0.25)' }]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={theme.colors.DARK} />
          ) : (
            <Text style={[stylesheet.postButtonText, { color: hasContent ? theme.colors.DARK : 'rgba(130,219,126,0.5)' }]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={stylesheet.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={stylesheet.authorRow}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={stylesheet.avatarImage} />
          ) : (
            <View style={stylesheet.avatar}>
              <Text style={stylesheet.avatarText}>{(profile?.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={stylesheet.authorName}>{profile?.name || 'Neighbour'}</Text>
            <TouchableOpacity 
              style={stylesheet.areaPill}
              onPress={() => setShowCategoryMenu(!showCategoryMenu)}
            >
              <Ionicons name="pricetag-outline" size={12} color={theme.colors.G} />
              <Text style={stylesheet.areaText}>{category}</Text>
              <Ionicons name="chevron-down" size={12} color={theme.colors.MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {showCategoryMenu && (
          <View style={stylesheet.categoryMenu}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[stylesheet.categoryOption, category === cat && { backgroundColor: theme.colors.G + '20' }]}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryMenu(false);
                }}
              >
                <Text style={[stylesheet.categoryOptionText, category === cat && { color: theme.colors.G, fontFamily: 'Inter-Bold' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          style={stylesheet.input}
          placeholder="What's happening in your neighbourhood?"
          placeholderTextColor={theme.colors.MUTED}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          selectionColor={theme.colors.G}
        />

        {attachedFiles.length > 0 && (
          <View style={stylesheet.photosGrid}>
            {attachedFiles.map((file, i) => {
            return (
                          <View key={i} style={stylesheet.photoWrapper}>
                            <Image 
                              source={{ uri: file.uri }}
                              style={stylesheet.attachedImage}
                            />
                            <TouchableOpacity 
                              style={stylesheet.removePhotoBtn}
                              onPress={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                            >
                              <Feather name="x" size={14} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[stylesheet.toolbar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={stylesheet.addPhotoBtn} onPress={pickImages}>
          <Ionicons name="image-outline" size={22} color={theme.colors.G} />
          <Text style={{ color: theme.colors.TEXT_PRIMARY, fontFamily: 'Inter-Medium', fontSize: 13, marginLeft: 8 }}>Add Photos</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const _stylesheet = createStyleSheet(theme => ({
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
      cancelText: { fontFamily: 'Inter-Medium', fontSize: 15, color: theme.colors.MUTED },
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
        backgroundColor: theme.colors.G,
        justifyContent: 'center',
        alignItems: 'center',
      },
      avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
      },
      avatarText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: theme.colors.DARK },
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
        borderColor: theme.colors.GLASS_BORDER,
        alignSelf: 'flex-start',
      },
      areaText: { fontFamily: 'Inter-Medium', fontSize: 12, color: theme.colors.TEXT_PRIMARY },
      categoryMenu: {
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: theme.colors.SURFACE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
        overflow: 'hidden',
      },
      categoryOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.GLASS_BORDER,
      },
      categoryOptionText: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: theme.colors.TEXT_PRIMARY,
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
        borderTopColor: theme.colors.GLASS_BORDER,
        backgroundColor: theme.colors.DARK,
      },
      addPhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
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
      successDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: theme.colors.MUTED, textAlign: 'center', lineHeight: 22 },
      backButton: {
        marginTop: 8,
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: theme.colors.G,
      },
      backButtonText: { fontFamily: 'Outfit-Bold', fontSize: 15, color: theme.colors.DARK },
    }));
