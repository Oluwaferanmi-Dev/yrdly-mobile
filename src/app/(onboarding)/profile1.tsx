import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { SceneBg, GlassCard, GlassInput, StepBar, PrimaryBtn } from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';
import { AuthService } from '@/lib/auth-service';
import { useAuth } from '@/hooks/use-supabase-auth';
import { Ionicons } from '@expo/vector-icons';

const { colors, radii } = ONBOARDING_THEME;

export default function Profile1Screen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { phoneSkipped } = useLocalSearchParams();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-populate username from signup / profile if available
  React.useEffect(() => {
    const existingUsername = profile?.username || user?.user_metadata?.username;
    if (existingUsername && !handle) {
      setHandle(`@${existingUsername.replace(/^@/, '')}`);
    }
    const existingName = profile?.name || user?.user_metadata?.name;
    if (existingName && !name) {
      setName(existingName);
    }
  }, [profile, user]);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access photos is required.');
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
    } catch (e) {
      console.log('Error picking image:', e);
    }
  };

  const handleNextStep1 = async () => {
    const clean = handle.replace(/^@/, '').trim();
    const existing = (profile?.username || user?.user_metadata?.username || '').replace(/^@/, '').trim();

    if (clean && clean.toLowerCase() !== existing.toLowerCase()) {
      setUsernameError('');
      const available = await AuthService.checkUsernameAvailability(clean, user?.id);
      if (!available) {
        setUsernameError(`The username @${clean} is already taken. Please choose another.`);
        return;
      }
    }

    if (user?.id) {
      setIsSaving(true);
      try {
        let finalAvatarUrl: string | undefined = undefined;
        if (avatarUri) {
          const uploaded = await AuthService.uploadAvatar(user.id, avatarUri);
          if (uploaded) finalAvatarUrl = uploaded;
        }

        await AuthService.updateUserProfile(user.id, {
          ...(name ? { name } : {}),
          ...(clean ? { username: clean } : {}),
          ...(bio ? { bio } : {}),
          ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {}),
        });
      } catch (e) {
        console.error('Error saving profile step 1:', e);
      } finally {
        setIsSaving(false);
      }
    }

    router.push('/(onboarding)/profile2');
  };

  return (
    <View style={styles.container}>
      <SceneBg
        photoId="1764921587464-f3cdd46fb4c9"
        pos="center 20%"
        gradientStart="25%"
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.topBar}>
            <StepBar step={1} total={2} label="Personalize" />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, minHeight: 40 }} />

            <GlassCard>
              {phoneSkipped === 'true' && (
                <View style={styles.verificationBanner}>
                  <Ionicons name="shield-outline" size={18} color={colors.WARNING} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifyBannerTitle}>Verify your phone number</Text>
                    <Text style={styles.verifyBannerDesc}>Get your Verified Neighbour badge & buy/sell safely.</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(auth)/phone')} style={styles.verifyNowBtn}>
                    <Text style={styles.verifyNowText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.cardTitle}>Tell us about yourself</Text>

              {/* Avatar Ring with ImagePicker */}
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePickAvatar}
                  style={[styles.avatarWrapper, avatarUri ? { backgroundColor: 'rgba(130,219,126,0.08)' } : undefined]}
                >
                  <View style={styles.avatarRing}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="camera-outline" size={26} color={colors.LABEL} />
                    )}
                  </View>
                  <View style={styles.plusBadge}>
                    <Ionicons name="add" size={14} color={colors.DARK} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.avatarHintText}>
                  {avatarUri ? 'Tap to change photo' : 'Tap to add profile photo'}
                </Text>
              </View>

              {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

              <View style={styles.inputStack}>
                <GlassInput
                  placeholder="Display name (e.g. Amina Bello)"
                  value={name}
                  onChange={setName}
                  icon={<Ionicons name="person-outline" size={18} color={colors.LABEL} />}
                />
                
                <GlassInput
                  placeholder="@username"
                  value={handle}
                  onChange={v => setHandle(v.startsWith('@') ? v : '@' + v)}
                  icon={<Ionicons name="at-outline" size={18} color={colors.LABEL} />}
                />

                <View style={styles.bioBox}>
                  <TextInput
                    placeholder="Short bio (optional)"
                    placeholderTextColor={colors.LABEL}
                    value={bio}
                    onChangeText={v => v.length <= 140 && setBio(v)}
                    multiline
                    numberOfLines={3}
                    style={styles.bioInput}
                  />
                  <Text style={styles.bioCounter}>{bio.length}/140</Text>
                </View>
              </View>

              <PrimaryBtn label="Next: Choose Neighbourhood →" onClick={handleNextStep1} loading={isSaving} />
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e0e',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(235, 179, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(235, 179, 74, 0.2)',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 20,
  },
  verifyBannerTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.WARNING,
    marginBottom: 4,
  },
  verifyBannerDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.LABEL,
    lineHeight: 18,
  },
  verifyNowBtn: {
    backgroundColor: 'rgba(235, 179, 74, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  verifyNowText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.WARNING,
  },
  cardTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.SURFACE,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: colors.G,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.G,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111',
  },
  avatarHintText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.LABEL,
  },
  errorText: {
    color: colors.DANGER,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  inputStack: {
    gap: 12,
    marginBottom: 24,
  },
  bioBox: {
    position: 'relative',
  },
  bioInput: {
    width: '100%',
    minHeight: 72,
    backgroundColor: colors.SURFACE,
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
    borderRadius: radii.md,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    textAlignVertical: 'top',
  },
  bioCounter: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    fontSize: 11,
    color: colors.LABEL,
    fontFamily: 'Inter-Regular',
  },
});
