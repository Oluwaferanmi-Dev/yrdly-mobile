import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function Profile2Screen() {
  const router = useRouter();
  const { user } = useAuth();

  const [location, setLocation] = useState('');
  const [selectedLoc, setSelectedLoc] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleCompleteSetup = async () => {
    if (user?.id) {
      setIsSaving(true);
      try {
        await AuthService.updateUserProfile(user.id, {
          ...(location ? { location: { state: location } } : {}),
          profile_completed: true,
        });
      } catch (e) {
        console.error('Error saving profile step 2 location:', e);
      } finally {
        setIsSaving(false);
      }
    }
    // Per user request, we skip permissions and go straight to tabs
    router.replace('/(tabs)' as any);
  };

  return (
    <View style={styles.container}>
      <SceneBg
        photoId="1594538756542-8c88bda491c5"
        pos="center 50%"
        gradientStart="30%"
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.topBar}>
            <StepBar step={2} total={2} label="Your Neighbourhood" />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, minHeight: 40 }} />

            <GlassCard>
              <View style={styles.titleBox}>
                <Text style={styles.cardTitle}>Where do you live?</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your address or estate to join your local neighbourhood group.
                </Text>
              </View>

              {/* Location Input with Functional GPS */}
              <View style={{ zIndex: 50, marginBottom: 12 }}>
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

              <View style={{ marginTop: 12 }}>
                <PrimaryBtn
                  label={`Complete Setup & Join${selectedLoc && location ? ' ' + location.split(',')[0] : ''}`}
                  onClick={handleCompleteSetup}
                  loading={isSaving}
                />
              </View>
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
  titleBox: {
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    color: theme.colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.LABEL,
    lineHeight: 22,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.G,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.input,
  },
  gpsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
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
    borderRadius: radii.card,
    overflow: 'hidden',
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
    color: theme.colors.TEXT_PRIMARY,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.SURFACE,
    borderWidth: 1,
    borderColor: colors.GLASS_BORDER,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  privacyText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.LABEL,
    lineHeight: 18,
  },
});
