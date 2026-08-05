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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SceneBg, GlassCard, GlassInput, StepBar, PrimaryBtn } from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';
import { AuthService } from '@/lib/auth-service';
import { useAuth } from '@/hooks/use-supabase-auth';
import { Ionicons } from '@expo/vector-icons';

const { colors, radii } = ONBOARDING_THEME;

const ALL_NEIGHBOURHOODS = [
  'Victoria Island, Eti-Osa, Lagos',
  'Lekki Phase 1, Eti-Osa, Lagos',
  'Ikeja GRA, Ikeja, Lagos',
  'Surulere, Surulere, Lagos',
  'Yaba, Shomolu, Lagos',
  'Ikoyi, Eti-Osa, Lagos',
  'Gbagada, Kosofe, Lagos',
  'Ajah, Eti-Osa, Lagos',
  'Maryland, Ikeja, Lagos',
  'Festac Town, Amuwo-Odofin, Lagos',
  'Alimosho, Alimosho, Lagos',
  'Magodo, Kosofe, Lagos',
  'Opebi, Ikeja, Lagos',
  'Allen Avenue, Ikeja, Lagos',
  'Maitama, Abuja (FCT)',
  'Wuse II, Abuja (FCT)',
  'Gwarinpa, Abuja (FCT)',
  'Asokoro, Abuja (FCT)',
  'Jabi, Abuja (FCT)',
  'Port Harcourt City, Rivers',
  'Enugu North, Enugu',
  'Ibadan North, Oyo',
  'Benin City, Edo',
  'Calabar Municipal, Cross River',
  'Abeokuta South, Ogun',
  'Kaduna North, Kaduna',
  'Kano Municipal, Kano',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { phoneSkipped } = useLocalSearchParams();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 State
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');

  // Auto-populate username from signup / profile if available
  React.useEffect(() => {
    const existingUsername = profile?.username || user?.user_metadata?.username;
    if (existingUsername && !handle) {
      setHandle(`@${existingUsername.replace(/^@/, '')}`);
    }
  }, [profile, user]);

  // Step 2 State
  const [location, setLocation] = useState('');
  const [selectedLoc, setSelectedLoc] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

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

  const handleUseGPS = async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocLoading(false);
        setLocation('Victoria Island, Lagos');
        setSelectedLoc(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse && reverse.length > 0) {
        const place = reverse[0];
        const district = place.district || place.subregion || place.city;
        const region = place.region || place.city || 'Lagos';
        const formatted = district ? `${district}, ${region}` : 'Victoria Island, Lagos';
        setLocation(formatted);
        setSelectedLoc(true);
      } else {
        setLocation('Victoria Island, Lagos');
        setSelectedLoc(true);
      }
      setLocLoading(false);
    } catch (e) {
      setLocLoading(false);
      setLocation('Victoria Island, Lagos');
      setSelectedLoc(true);
    }
  };

  const [usernameError, setUsernameError] = useState('');

  const [isSaving, setIsSaving] = useState(false);

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

    setStep(2);
  };

  const handleCompleteSetup = async () => {
    if (user?.id) {
      setIsSaving(true);
      try {
        await AuthService.updateUserProfile(user.id, {
          ...(location ? { location: { state: location } } : {}),
        });
      } catch (e) {
        console.error('Error saving profile step 2 location:', e);
      } finally {
        setIsSaving(false);
      }
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <SceneBg
        photoId={step === 1 ? '1764921587464-f3cdd46fb4c9' : '1594538756542-8c88bda491c5'}
        pos={step === 1 ? 'center 20%' : 'center 50%'}
        gradientStart="25%"
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.topBar}>
            <StepBar
              step={step}
              total={2}
              label={step === 1 ? 'Personalize' : 'Your Neighbourhood'}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, minHeight: 40 }} />

            {step === 1 ? (
              <GlassCard>
                {phoneSkipped === 'true' && (
                  <View style={styles.verificationBanner}>
                    <Ionicons name="shield-outline" size={18} color={colors.WARNING} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyBannerTitle}>Verify your phone number</Text>
                      <Text style={styles.verifyBannerDesc}>Get your Verified Neighbour badge & buy/sell safely.</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(auth)/phone' as any)} style={styles.verifyNowBtn}>
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
                    style={styles.avatarWrapper}
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
                    placeholder="username"
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
            ) : (
              <GlassCard>
                <View style={styles.titleBox}>
                  <Text style={styles.cardTitle}>Where do you live?</Text>
                  <Text style={styles.cardSubtitle}>
                    Enter your address or estate to join your local neighbourhood group.
                  </Text>
                </View>

                {/* Location Input with Functional GPS */}
                <View style={{ zIndex: 50 }}>
                  <GlassInput
                    placeholder="Search your neighbourhood…"
                    value={location}
                    onChange={v => { setLocation(v); setSelectedLoc(false); }}
                    icon={<Ionicons name="location-outline" size={18} color={colors.LABEL} />}
                    right={
                      <TouchableOpacity
                        onPress={handleUseGPS}
                        disabled={locLoading}
                        style={styles.gpsPill}
                      >
                        {locLoading ? (
                          <ActivityIndicator size="small" color={colors.DARK} />
                        ) : (
                          <>
                            <Ionicons name="navigate-outline" size={11} color={colors.DARK} />
                            <Text style={styles.gpsText}>GPS</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    }
                  />

                  {location.length > 0 && !selectedLoc && (
                    <View style={styles.suggestionsBox}>
                      {ALL_NEIGHBOURHOODS.filter(s => s.toLowerCase().includes(location.toLowerCase())).slice(0, 6).map(s => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => { setLocation(s); setSelectedLoc(true); }}
                          style={styles.suggestionRow}
                        >
                          <Ionicons name="location-outline" size={16} color={colors.G} />
                          <Text style={styles.suggestionText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Privacy Note */}
                <View style={styles.privacyCard}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.G} style={{ marginTop: 1 }} />
                  <Text style={styles.privacyText}>
                    Exact house numbers are kept private. Neighbours only see your general neighbourhood area.
                  </Text>
                </View>

                <PrimaryBtn
                  label={`Complete Setup & Join${selectedLoc && location ? ' ' + location.split(',')[0] : ''}`}
                  onClick={handleCompleteSetup}
                  loading={isSaving}
                />
              </GlassCard>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
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
    justifyContent: 'flex-end',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,182,72,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,182,72,0.3)',
    marginBottom: 4,
  },
  verifyBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.WARNING,
  },
  verifyBannerDesc: {
    fontSize: 11,
    color: colors.LABEL,
    marginTop: 2,
    lineHeight: 16,
  },
  verifyNowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.WARNING,
    alignSelf: 'center',
  },
  verifyNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.DARK,
  },
  errorText: {
    color: colors.DANGER,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.LABEL,
    lineHeight: 22,
  },
  titleBox: {
    gap: 4,
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 8,
  },
  avatarWrapper: {
    position: 'relative',
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: colors.G,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.SURFACE,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarHintText: {
    fontSize: 12,
    color: colors.LABEL,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.G,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  inputStack: {
    gap: 12,
  },
  bioBox: {
    position: 'relative',
    height: 72,
    borderRadius: radii.input,
    backgroundColor: colors.SURFACE,
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
    padding: 14,
  },
  bioInput: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  bioCounter: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    fontSize: 11,
    color: colors.LABEL,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.G,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.DARK,
  },
  suggestionsBox: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,15,15,0.96)',
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
    borderRadius: radii.input,
    overflow: 'hidden',
    zIndex: 50,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.GLASS_BORDER,
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.SURFACE,
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: colors.LABEL,
    lineHeight: 18,
  },
});
