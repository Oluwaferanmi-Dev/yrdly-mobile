import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/use-supabase-auth';
import { AuthService } from '../../lib/auth-service';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { StorageService } from '../../lib/storage-service';


export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useAppTheme();

  const [name, setName] = useState(profile?.name || user?.user_metadata?.name || '');
  const [legalName, setLegalName] = useState(profile?.legal_name || user?.user_metadata?.legal_name || '');
  const [hasLegalName, setHasLegalName] = useState(!!(profile?.legal_name || user?.user_metadata?.legal_name));
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [shareLocation, setShareLocation] = useState<boolean>(profile?.share_location ?? false);
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setLegalName(profile.legal_name || '');
      setHasLegalName(!!profile.legal_name);
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setShareLocation(profile.share_location ?? false);
    }
  }, [profile]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to update your avatar.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (!result.canceled && result.assets[0].uri) {
        uploadAvatar(result.assets[0]);
      }
    } catch (e) {
      console.log("ImagePicker error:", e);
      Alert.alert('Error', 'Could not access the selected photo. Please try another one.');
    }
  };

  const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!user) return;
    setUploadingImage(true);
    try {
      if (avatarUrl && avatarUrl.includes('user-avatars/')) {
        try {
          const oldPath = avatarUrl.split('user-avatars/')[1];
          if (oldPath) {
            await StorageService.deleteFile('user-avatars', oldPath);
          }
        } catch (e) {
          console.log("Failed to delete old avatar:", e);
        }
      }

      const localUri = asset.uri;
      const mimeType = asset.mimeType || 'image/jpeg';
      const extMatch = asset.fileName?.match(/\.([^.]+)$/) || localUri.match(/\.([^.]+)$/);
      let ext = extMatch ? extMatch[1].split('?')[0].toLowerCase() : (mimeType.split('/')[1] || 'jpeg');
      
      if (ext === 'heic' || ext === 'heif') {
        ext = 'jpg';
      }

      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const file = {
        uri: localUri,
        name: fileName,
        type: mimeType
      };

      const { url, error } = await StorageService.uploadUserAvatar(user.id, file);
      if (error) throw error;
      if (url) {
        setAvatarUrl(url);
        await AuthService.updateUserProfile(user.id, { avatar_url: url });
        await supabase.auth.updateUser({ data: { avatar_url: url } });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Upload Failed', 'There was an error uploading your image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleShareLocationToggle = async (value: boolean) => {
    setShareLocation(value);
    if (!user) return;
    setSavingLocation(true);
    try {
      await AuthService.updateUserProfile(user.id, { share_location: value });
    } catch (e) {
      console.error(e);
      setShareLocation(!value); // revert on error
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: any = {
        name,
        bio,
        avatar_url: avatarUrl,
      };
      if (!hasLegalName && legalName) {
        updates.legal_name = legalName;
      }

      await AuthService.updateUserProfile(user.id, updates);

      const authUpdates: any = {
        name,
        avatar_url: avatarUrl,
      };
      if (!hasLegalName && legalName) {
        authUpdates.legal_name = legalName;
      }

      await supabase.auth.updateUser({
        data: authUpdates
      });
      
      if (!hasLegalName && legalName) {
        setHasLegalName(true);
      }

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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || uploadingImage} style={styles.headerIconBtn}>
          {saving ? <ActivityIndicator size="small" color={colors.tint} /> : <Text style={[styles.saveText, { color: colors.tint }]}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} disabled={uploadingImage}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={[styles.avatarImage, { borderColor: colors.borderLight }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { borderColor: colors.borderLight, backgroundColor: 'rgba(130, 225, 87, 0.1)' }]}>
                <Ionicons name="person" size={32} color={colors.tint} />
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.tint, borderColor: colors.card }]}>
              <Ionicons name="pencil" size={12} color={colors.background} />
            </View>
            {uploadingImage && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <TextInput
              style={[styles.nameInput, { color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
              placeholderTextColor={colors.textMuted}
            />
            {hasLegalName ? (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                <Ionicons name="shield-checkmark" size={12} color={colors.tint} style={{marginRight: 4}} />
                <Text style={{fontSize: 12, color: colors.textMuted, fontWeight: '500'}}>
                  {legalName}
                </Text>
              </View>
            ) : (
              <TextInput
                style={[styles.bioInput, { color: colors.text, marginBottom: 6, fontSize: 13 }]}
                value={legalName}
                onChangeText={setLegalName}
                placeholder="Add Legal Name (Required for Payouts)"
                placeholderTextColor={colors.tint}
              />
            )}
            <View style={styles.locationBadgeRow}>
              <Ionicons name="location" size={12} color={colors.tint} style={{marginRight: 4}} />
              <TextInput
                style={[styles.bioInput, { color: colors.textSecondary }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Add a bio or location..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.memberBadge}>
              <Ionicons name="people" size={12} color={colors.tint} style={{marginRight: 6}} />
              <Text style={[styles.memberBadgeText, { color: colors.tint }]}>Yrdly member</Text>
            </View>
          </View>
        </View>

        {/* Stronger Together Banner */}
        <View style={[styles.bannerContainer, { backgroundColor: isDarkMode ? '#121A10' : '#E8F5E9', borderColor: 'rgba(130, 225, 87, 0.2)' }]}>
          <View style={[styles.bannerIconWrap, { backgroundColor: 'rgba(130, 225, 87, 0.15)', borderColor: 'rgba(130, 225, 87, 0.3)' }]}>
            <Ionicons name="home-outline" size={24} color={colors.tint} />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={[styles.bannerTitle, { color: colors.tint }]}>Stronger together.</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>Buy, sell, connect and look out for your neighborhood.</Text>
          </View>
        </View>

        {/* Commerce & Account */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>COMMERCE & ACCOUNT</Text>
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          {[
            { icon: 'bag-handle-outline', label: 'Transactions', subtext: 'Track your orders and activity', route: '/transactions' },
            { icon: 'wallet-outline', label: 'Payouts', subtext: 'Manage your earnings', route: '/settings/payouts' },
            { icon: 'business-outline', label: 'Bank Account', subtext: 'Manage your linked account', route: '/settings/payout-settings' },
            { icon: 'location-outline', label: 'Location', subtext: 'Your neighbourhood and alerts', route: '/settings/location', isLast: true },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.navRow, !item.isLast && styles.navRowBorder, !item.isLast && { borderBottomColor: colors.borderLight }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconGlow, { backgroundColor: 'rgba(130, 225, 87, 0.1)' }]}>
                <Ionicons name={item.icon as any} size={24} color={colors.tint} />
              </View>
              <View style={styles.navTextWrap}>
                <Text style={[styles.navLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.navSubtext, { color: colors.textSecondary }]}>{item.subtext}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PRIVACY</Text>
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[styles.navRow, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/settings/privacy' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconGlow, { backgroundColor: 'rgba(130, 225, 87, 0.1)' }]}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.tint} />
            </View>
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: colors.text }]}>Privacy & Discoverability</Text>
              <Text style={[styles.navSubtext, { color: colors.textSecondary }]}>Manage location sharing and visibility</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PREFERENCES</Text>
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[styles.navRow, styles.navRowBorder, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/settings/notifications' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapPlain, { backgroundColor: isDarkMode ? '#222' : '#F5F5F5' }]}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </View>
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.navSubtext, { color: colors.textSecondary }]}>Choose what you want to hear</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.navRow}>
            <View style={[styles.iconWrapPlain, { backgroundColor: isDarkMode ? '#222' : '#F5F5F5' }]}>
              <Ionicons name="moon-outline" size={24} color={colors.text} />
            </View>
            <View style={styles.navTextWrap}>
              <Text style={[styles.navLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.navSubtext, { color: colors.textSecondary }]}>Keep it easy on your eyes</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#353534', true: colors.tint }}
              thumbColor={'#FFFFFF'}
              ios_backgroundColor="#353534"
            />
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDarkMode ? 'rgba(26, 17, 17, 0.4)' : '#FFF5F5', borderColor: 'rgba(229, 62, 62, 0.2)' }]} onPress={handleSignOut} disabled={authLoading}>
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
          </View>
          <View style={styles.navTextWrap}>
            <Text style={[styles.logoutLabel, { color: '#E53E3E' }]}>Sign Out</Text>
            <Text style={[styles.navSubtext, { color: colors.textSecondary }]}>Log out of your yrdly account</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(229, 62, 62, 0.4)" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D0B' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  saveText: { color: '#82E157', fontSize: 16, fontWeight: 'bold' },
  
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 },
  
  profileCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 28,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 80, height: 80,
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 80, height: 80,
    borderRadius: 40,
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(130, 225, 87, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#82E157',
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#1C1C1C',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  nameInput: {
    fontSize: 20, fontWeight: '700', color: '#FFFFFF',
    marginBottom: 2, padding: 0,
  },
  locationBadgeRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8,
  },
  bioInput: {
    fontSize: 14, color: '#A6A6A6',
    flex: 1, padding: 0,
  },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(130, 225, 87, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 12,
    borderColor: 'rgba(130, 225, 87, 0.2)',
    borderWidth: 1,
  },
  memberBadgeText: {
    color: '#82E157', fontSize: 11, fontWeight: '600'
  },
  
  bannerContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#121A10',
    borderRadius: 24, padding: 20,
    borderColor: 'rgba(130, 225, 87, 0.1)', borderWidth: 1,
    marginBottom: 24,
  },
  bannerIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(130, 225, 87, 0.1)',
    borderColor: 'rgba(130, 225, 87, 0.2)', borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { color: '#82E157', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  bannerSubtitle: { color: '#A6A6A6', fontSize: 12, lineHeight: 16 },

  sectionHeader: {
    color: '#A6A6A6', fontSize: 12, fontWeight: '700',
    letterSpacing: 1.2, marginLeft: 8, marginBottom: 12,
  },
  glassCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 24,
    borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16,
  },
  navRowBorder: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  iconGlow: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(130, 225, 87, 0.1)',
  },
  iconWrapPlain: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  navTextWrap: { flex: 1 },
  navLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  navSubtext: { color: '#A6A6A6', fontSize: 12 },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(26, 17, 17, 0.4)',
    borderColor: 'rgba(229, 62, 62, 0.2)', borderWidth: 1,
    borderRadius: 24, padding: 16,
  },
  logoutIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  logoutLabel: { color: '#E53E3E', fontSize: 16, fontWeight: '600', marginBottom: 2 },
});
