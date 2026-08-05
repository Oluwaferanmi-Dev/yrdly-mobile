import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED } from '../constants/tokens';
import * as Haptics from 'expo-haptics';

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);

  // Mock available photos to attach
  const photos = ['1531746020798-c70a81bd6a52', '1529156069898-49953e39b3ac'];

  const doPost = () => {
    if (!text.trim() && attachedPhotos.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPosting(true);
    setTimeout(() => {
      setPosting(false);
      setPosted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  const hasContent = text.trim().length > 0 || attachedPhotos.length > 0;

  if (posted) {
    return (
      <View style={[styles.successContainer, { backgroundColor: '#050505' }]}>
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
      style={[styles.container, { backgroundColor: '#050505', paddingTop: insets.top }]}
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
            <Text style={[styles.postButtonText, { color: DARK }]}>...</Text>
          ) : (
            <Text style={[styles.postButtonText, { color: hasContent ? DARK : 'rgba(130,219,126,0.5)' }]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>YO</Text>
          </View>
          <View>
            <Text style={styles.authorName}>Your Name</Text>
            <View style={styles.areaPill}>
              <Feather name="target" size={10} color={MUTED} />
              <Text style={styles.areaText}>Neighbourhood</Text>
            </View>
          </View>
        </View>

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

        {attachedPhotos.length > 0 && (
          <View style={styles.photosGrid}>
            {attachedPhotos.map((pid, i) => (
              <View key={i} style={styles.photoWrapper}>
                <Image 
                  source={{ uri: `https://images.unsplash.com/photo-${pid}?w=200&h=200&fit=crop&auto=format&q=80` }}
                  style={styles.attachedImage}
                />
                <TouchableOpacity 
                  style={styles.removePhotoBtn}
                  onPress={() => setAttachedPhotos(p => p.filter((_, j) => j !== i))}
                >
                  <Feather name="x" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.toolbar, { paddingBottom: insets.bottom || 20 }]}>
        {photos.map((pid, i) => {
          const isSelected = attachedPhotos.includes(pid);
          return (
            <TouchableOpacity 
              key={i} 
              style={[styles.toolbarPhoto, { borderColor: isSelected ? G : 'transparent' }]}
              onPress={() => {
                Haptics.selectionAsync();
                setAttachedPhotos(p => isSelected ? p : [...p, pid]);
              }}
            >
              <Image 
                source={{ uri: `https://images.unsplash.com/photo-${pid}?w=88&h=88&fit=crop&auto=format&q=80` }}
                style={styles.toolbarImage}
              />
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.addPhotoBtn}>
          <Feather name="image" size={20} color={MUTED} />
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
  avatarText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
  authorName: { fontFamily: 'Outfit-Bold', fontSize: 15, color: '#fff', marginBottom: 2 },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignSelf: 'flex-start',
  },
  areaText: { fontFamily: 'Inter-Regular', fontSize: 11, color: MUTED },
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
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
    backgroundColor: '#050505',
  },
  toolbarPhoto: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  toolbarImage: { width: '100%', height: '100%' },
  addPhotoBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
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
