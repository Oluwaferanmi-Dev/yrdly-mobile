import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/use-supabase-auth';
import { AuthService } from '../lib/auth-service';
import { supabase } from '../lib/supabase';

const GREEN = '#388E3C';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [name, setName] = useState(profile?.full_name || user?.user_metadata?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || profile.name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to update your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (localUri: string) => {
    if (!user) return;
    setUploadingImage(true);
    try {
      const ext = localUri.split('.').pop()?.split('?')[0] || 'jpeg';
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const filePath = `avatars/${fileName}`;

      // Fetch the local file as a blob — no extra package needed
      const response = await fetch(localUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, blob, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      if (data.publicUrl) {
        setAvatarUrl(data.publicUrl);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Upload Failed', 'There was an error uploading your image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await AuthService.updateUserProfile(user.id, {
        name,
        bio,
        avatar_url: avatarUrl,
      });

      // Update auth metadata as well just in case
      await supabase.auth.updateUser({
        data: {
          name,
          avatar_url: avatarUrl,
        }
      });

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving || uploadingImage}>
          {saving ? <ActivityIndicator size="small" color={GREEN} /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={GREEN} />
              </View>
            )}
            {uploadingImage && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickImage} disabled={uploadingImage}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#9E9E9E"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell your neighbors about yourself..."
            placeholderTextColor="#9E9E9E"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2',
  },
  backBtn: { width: 60, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  saveBtn: { width: 60, justifyContent: 'center', alignItems: 'flex-end' },
  saveBtnText: { color: GREEN, fontSize: 16, fontWeight: 'bold' },
  content: { padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 16,
    position: 'relative'
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center'
  },
  changePhotoBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F2F2F2', borderRadius: 20 },
  changePhotoText: { color: '#1C1C1C', fontSize: 14, fontWeight: 'bold' },
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#616161', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1C1C1C'
  },
  textArea: { height: 100, textAlignVertical: 'top' },
});
