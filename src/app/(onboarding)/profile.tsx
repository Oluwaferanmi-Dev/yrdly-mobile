import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SceneBg, GlassCard, GlassInput, StepBar, PrimaryBtn } from '@/components/onboarding/primitives';
import { ONBOARDING_THEME } from '@/constants/onboarding-theme';
import { Ionicons } from '@expo/vector-icons';

const { colors, radii } = ONBOARDING_THEME;

const AVATARS = ['👩🏾', '👨🏾', '👩🏿', '👨🏿', '👩🏽', '👨🏽'];
const SUGGESTIONS = ['Victoria Island, Lagos', 'Lekki Phase 1, Lagos', 'Surulere, Lagos', 'Ikeja GRA, Lagos'];

export default function ProfileScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 State
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  // Step 2 State
  const [location, setLocation] = useState('');
  const [selectedLoc, setSelectedLoc] = useState(false);

  const handleNextStep1 = () => {
    setStep(2);
  };

  const handleCompleteSetup = () => {
    router.push('/(onboarding)/permissions' as any);
  };

  return (
    <View style={styles.container}>
      <SceneBg
        photoId={step === 1 ? '1764921587464-f3cdd46fb4c9' : '1594538756542-8c88bda491c5'}
        pos={step === 1 ? 'center 20%' : 'center 50%'}
        gradientStart="25%"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <StepBar
            step={step}
            total={2}
            label={step === 1 ? 'Personalize' : 'Your Neighbourhood'}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, minHeight: 40 }} />

          {step === 1 ? (
            <GlassCard>
              <Text style={styles.cardTitle}>Tell us about yourself</Text>

              {/* Avatar Selection */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarRing}>
                  {selectedAvatar !== null ? (
                    <Text style={{ fontSize: 36 }}>{AVATARS[selectedAvatar]}</Text>
                  ) : (
                    <Ionicons name="camera-outline" size={26} color={colors.LABEL} />
                  )}
                  <View style={styles.plusBadge}>
                    <Ionicons name="add" size={12} color={colors.DARK} />
                  </View>
                </View>

                {/* Avatar Row Selector */}
                <View style={styles.avatarRow}>
                  {AVATARS.map((emoji, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedAvatar(idx)}
                      style={[
                        styles.avatarOption,
                        selectedAvatar === idx && styles.avatarSelected,
                      ]}
                    >
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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

              <PrimaryBtn label="Next: Choose Neighbourhood →" onClick={handleNextStep1} />
            </GlassCard>
          ) : (
            <GlassCard>
              <View style={styles.titleBox}>
                <Text style={styles.cardTitle}>Where do you live?</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your address or estate to join your local neighbourhood group.
                </Text>
              </View>

              {/* Location Input with GPS */}
              <View style={{ zIndex: 50 }}>
                <GlassInput
                  placeholder="Search your neighbourhood…"
                  value={location}
                  onChange={v => { setLocation(v); setSelectedLoc(false); }}
                  icon={<Ionicons name="location-outline" size={18} color={colors.LABEL} />}
                  right={
                    <TouchableOpacity style={styles.gpsPill}>
                      <Ionicons name="navigate-outline" size={11} color={colors.DARK} />
                      <Text style={styles.gpsText}>GPS</Text>
                    </TouchableOpacity>
                  }
                />

                {location.length > 0 && !selectedLoc && (
                  <View style={styles.suggestionsBox}>
                    {SUGGESTIONS.filter(s => s.toLowerCase().includes(location.toLowerCase())).map(s => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { setLocation(s); setSelectedLoc(true); }}
                        style={styles.suggestionRow}
                      >
                        <Ionicons name="location-outline" size={16} color={colors.LABEL} />
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
                label={`Complete Setup & Join${selectedLoc ? ' ' + location.split(',')[0] : ''}`}
                onClick={handleCompleteSetup}
              />
            </GlassCard>
          )}
        </ScrollView>
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
    gap: 16,
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
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.G,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  avatarOption: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: colors.G,
    backgroundColor: 'rgba(130,219,126,0.1)',
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
    paddingVertical: 4,
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
