import { DARK, SURFACE } from '../../../constants/tokens';
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
import { useAppTheme } from '../../context/ThemeContext';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useAppTheme();

  const [name, setName] = useState((profile as any)?.name || user?.user_metadata?.name || '');
  const [bio, setBio] = useState((profile as any)?.bio || '');
  const [username, setUsername] = useState((profile as any)?.username || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const existingAvatar = (profile as any)?.avatar_url || user?.user_metadata?.avatar_url || null;
  const displayAvatar = avatarUri || existingAvatar;

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    if (cleanUsername) {
      const isAvailable = await AuthService.checkUsernameAvailability(cleanUsername, user.id);
      if (!isAvailable) {
        Alert.alert('Error', `The username @${cleanUsername} is already taken. Please choose another.`);
        return;
      }
    }

    setLoading(true);
    try {
      let avatarUrl = existingAvatar;

      if (avatarUri) {
        const file = { uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' };
        const { url, error } = await StorageService.uploadUserAvatar(user.id, file);
        if (url) avatarUrl = url;
        if (error) console.warn('Avatar upload error:', error);
      }

      const updates: Record<string, any> = {
        name: name.trim(),
        bio: bio.trim() || null,
        username: username.trim() || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={colors.tint} />
              : <Text style={[s.saveBtnText, { color: colors.tint }]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Avatar picker */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={s.avatarWrapper} activeOpacity={0.8}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={[s.avatar, s.avatarPlaceholder]}>
                  <Text style={[s.avatarInitial, { color: colors.tint }]}>
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={[s.avatarOverlay, { backgroundColor: colors.tint + 'CC' }]}>
                <Feather name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[s.avatarHint, { color: colors.textSecondary }]}>Tap to change photo</Text>
          </View>

          {/* Fields */}
          <View style={s.fieldsContainer}>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Name *</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: SURFACE, borderColor: colors.borderLight }]}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
                maxLength={60}
              />
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Username</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: SURFACE, borderColor: colors.borderLight }]}
                value={username}
                onChangeText={setUsername}
                placeholder="@handle"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                maxLength={30}
              />
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Bio</Text>
              <TextInput
                style={[s.input, s.bioInput, { color: colors.text, backgroundColor: SURFACE, borderColor: colors.borderLight }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell your neighborhood about yourself..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={[s.charCount, { color: colors.textSecondary }]}>{bio.length}/200</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
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
    borderWidth: 2, borderColor: colors.background,
  },
  avatarHint: { fontSize: 13 },

  fieldsContainer: { paddingHorizontal: 16, gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16,
  },
  bioInput: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  charCount: { fontSize: 12, textAlign: 'right' },
});
