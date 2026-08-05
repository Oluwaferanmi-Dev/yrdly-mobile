import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/use-supabase-auth';
import { supabase } from '../../lib/supabase';
import { StorageService } from '../../lib/storage-service';
import { AuthService } from '../../lib/auth-service';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [name, setName] = useState((profile as any)?.name || user?.user_metadata?.name || '');
  const [bio, setBio] = useState((profile as any)?.bio || '');
  const [username, setUsername] = useState((profile as any)?.username || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayAvatar = avatarUri || (profile as any)?.avatar_url || user?.user_metadata?.avatar_url || null;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is required to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }

    setLoading(true);
    try {
      let finalAvatarUrl = (profile as any)?.avatar_url;

      if (avatarUri) {
        const file = { uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' };
        const { url } = await StorageService.uploadUserAvatar(user.id, file);
        if (url) finalAvatarUrl = url;
      }

      await AuthService.updateUserProfile(user.id, {
        name: name.trim(),
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: finalAvatarUrl,
      });

      if (finalAvatarUrl) {
        await supabase.auth.updateUser({
          data: { avatar_url: finalAvatarUrl, name: name.trim() },
        });
      }

      Alert.alert('Success', 'Profile updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: 'Outfit' }]}>Edit Profile</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={G} />
              : <Text style={[styles.saveBtnText, { color: G, fontFamily: 'Outfit' }]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Avatar picker */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper} activeOpacity={0.8}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={[styles.avatarInitial, { color: G, fontFamily: 'Outfit' }]}>
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={[styles.avatarOverlay, { backgroundColor: G }]}>
                <Feather name="camera" size={16} color="#000000" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarHint, { color: MUTED, fontFamily: 'Inter' }]}>Tap to change photo</Text>
          </View>

          {/* Fields */}
          <View style={styles.fieldsContainer}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: LABEL, fontFamily: 'Outfit' }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: TEXT_PRIMARY, backgroundColor: SURFACE, borderColor: GLASS_BORDER, fontFamily: 'Inter' }]}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={LABEL}
                maxLength={60}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: LABEL, fontFamily: 'Outfit' }]}>Username</Text>
              <TextInput
                style={[styles.input, { color: TEXT_PRIMARY, backgroundColor: SURFACE, borderColor: GLASS_BORDER, fontFamily: 'Inter' }]}
                value={username}
                onChangeText={setUsername}
                placeholder="@handle"
                placeholderTextColor={LABEL}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: LABEL, fontFamily: 'Outfit' }]}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput, { color: TEXT_PRIMARY, backgroundColor: SURFACE, borderColor: GLASS_BORDER, fontFamily: 'Inter' }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell your neighborhood about yourself..."
                placeholderTextColor={LABEL}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: MUTED, fontFamily: 'Inter' }]}>{bio.length}/200</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: GLASS_BORDER,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
  saveBtn: { width: 60, alignItems: 'flex-end' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },

  scroll: { paddingBottom: 60 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarWrapper: { position: 'relative', width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: 'bold' },
  avatarOverlay: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30,
    borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: DARK,
  },
  avatarHint: { fontSize: 13 },

  fieldsContainer: { paddingHorizontal: 16, gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  bioInput: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 2 },
});
