import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, ScrollView, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/use-supabase-auth';
import { AuthService } from '../../lib/auth-service';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { StorageService } from '../../lib/storage-service';

const GREEN = '#388E3C';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isDarkMode, toggleTheme } = useAppTheme();

  const [name, setName] = useState(profile?.name || user?.user_metadata?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
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
      mediaTypes: ['images'],
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
      const file = {
        uri: localUri,
        name: fileName,
        type: `image/${ext}`
      };

      const { url, error } = await StorageService.uploadUserAvatar(user.id, file);
      if (error) throw error;
      if (url) {
        setAvatarUrl(url);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
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

        {/* Commerce & Account */}
        <Text style={styles.sectionHeader}>Commerce & Account</Text>
        {[
          { icon: 'receipt-outline',   label: 'Transactions',       route: '/transactions' },
          { icon: 'wallet-outline',    label: 'Payouts',            route: '/settings/payouts' },
          { icon: 'business-outline',  label: 'Bank Account',       route: '/settings/payout-settings' },
          { icon: 'location-outline',  label: 'Location',           route: '/settings/location' },
        ].map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.navRow}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={styles.navIconWrap}>
              <Ionicons name={item.icon as any} size={20} color={GREEN} />
            </View>
            <Text style={styles.navLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
          </TouchableOpacity>
        ))}

        {/* Preferences */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/settings/notifications' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.navIconWrap}>
            <Ionicons name="notifications-outline" size={20} color={GREEN} />
          </View>
          <Text style={styles.navLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
        </TouchableOpacity>

        {/* Dark Mode Toggle */}
        <View style={styles.themeSection}>
          <View style={styles.themeRow}>
            <View style={styles.navIconWrap}>
              <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={20} color={GREEN} />
            </View>
            <Text style={styles.navLabel}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
              thumbColor={isDarkMode ? GREEN : '#FFFFFF'}
              ios_backgroundColor="#E0E0E0"
            />
          </View>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1,
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
  sectionHeader: {
    fontSize: 12, fontWeight: '800', color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12, marginTop: 8,
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  navIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1C1C1C' },

  // Dark mode toggle (reuses navRow pattern)
  themeSection: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
});
