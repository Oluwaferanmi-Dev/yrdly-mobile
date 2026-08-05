import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED, TEXT_PRIMARY } from '../constants/tokens';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { StorageService, MobileFile } from '../lib/storage-service';

const STEPS = ['Basic Info', 'Date & Time', 'Location', 'Tickets', 'Cover Photo', 'Review'];
const CATEGORIES = ['Party / Social', 'Sports & Fitness', 'Workshop', 'Concert / Music', 'Community / Meetup', 'Religious', 'Business', 'Other'];

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);

  // Form State
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [desc, setDesc] = useState('');
  
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [venue, setVenue] = useState('');
  const [area, setArea] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineLink, setOnlineLink] = useState('');
  
  const [coverFile, setCoverFile] = useState<MobileFile | null>(null);
  
  const [tiers, setTiers] = useState<Array<{ name: string; price: string; isFree: boolean; capacity: string }>>([
    { name: 'Standard Ticket', price: '0', isFree: true, capacity: '100' }
  ]);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const progress = useSharedValue(0.16);

  React.useEffect(() => {
    progress.value = withTiming((step + 1) / STEPS.length);
  }, [step]);

  React.useEffect(() => {
    if (profile?.location) {
      const locStr = [profile.location.ward, profile.location.lga, profile.location.state].filter(Boolean).join(', ');
      if (locStr) setArea(locStr);
    }
  }, [profile]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const pickCover = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCoverFile({
          uri: asset.uri,
          name: asset.fileName || `cover_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (e) {
      console.error('Pick cover error:', e);
    }
  };

  const addTier = () => {
    setTiers(prev => [...prev, { name: 'VIP Ticket', price: '1000', isFree: false, capacity: '50' }]);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: string, value: any) => {
    setTiers(prev => prev.map((t, i) => {
      if (i !== index) return t;
      if (field === 'isFree') return { ...t, isFree: value, price: value ? '0' : t.price };
      return { ...t, [field]: value };
    }));
  };

  const canNext = [
    eventName.trim() && eventCategory,
    dateStr.trim() && startTime.trim(),
    isOnline ? true : (venue.trim() && area.trim()),
    tiers.length > 0 && tiers.every(t => t.name.trim()),
    true,
    true,
  ][step];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      if (!user || !profile) {
        Alert.alert('Authentication required', 'Please sign in to create an event.');
        return;
      }

      setPublishing(true);
      try {
        let coverUrl = '';
        if (coverFile) {
          const { url, error: uploadErr } = await StorageService.uploadPostImage(user.id, coverFile);
          if (!uploadErr && url) {
            coverUrl = url;
          }
        }

        const userLoc = profile.location as { state?: string; lga?: string; ward?: string } | undefined;
        
        // Parse start and end time ISOs safely
        const startISO = new Date(`${dateStr}T${startTime}:00`).toISOString();
        const endISO = endTime ? new Date(`${dateStr}T${endTime}:00`).toISOString() : undefined;

        const { data: newEvent, error: eventErr } = await supabase
          .from('events')
          .insert({
            organizer_id: user.id,
            title: eventName.trim(),
            category: eventCategory,
            description: desc.trim(),
            cover_image_url: coverUrl,
            start_time: startISO,
            end_time: endISO,
            location_address: venue.trim() || (isOnline ? 'Online Event' : 'TBA'),
            location_online: isOnline,
            online_link: isOnline ? onlineLink.trim() : null,
            state: userLoc?.state || null,
            lga: userLoc?.lga || null,
            ward: userLoc?.ward || null,
            status: 'PUBLISHED',
          })
          .select()
          .single();

        if (eventErr || !newEvent) {
          throw new Error(eventErr?.message || 'Failed to create event.');
        }

        // Insert ticket tiers
        const tierInserts = tiers.map(t => ({
          event_id: newEvent.id,
          name: t.name.trim(),
          price: t.isFree ? 0 : (parseFloat(t.price) || 0),
          capacity: t.capacity ? parseInt(t.capacity) : null,
          sold: 0,
        }));

        await supabase.from('ticket_tiers').insert(tierInserts);

        // Create feed post for the event
        await supabase.from('posts').insert({
          user_id: user.id,
          author_name: profile.name || 'Organizer',
          author_image: profile.avatar_url || '',
          category: 'Event',
          title: eventName.trim(),
          text: desc.trim(),
          event_date: startISO,
          event_time: startTime,
          event_location: { address: venue.trim() },
          event_link: `/events/${newEvent.id}`,
          image_urls: coverUrl ? [coverUrl] : [],
          state: userLoc?.state || null,
          lga: userLoc?.lga || null,
          ward: userLoc?.ward || null,
          timestamp: new Date().toISOString(),
          liked_by: [],
          comment_count: 0,
        });

        setPublishing(false);
        setPublished(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        setPublishing(false);
        Alert.alert('Error', err?.message || 'Failed to create event. Please check inputs.');
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    } else {
      router.back();
    }
  };

  if (published) {
    return (
      <View style={[styles.successContainer, { backgroundColor: DARK }]}>
        <View style={styles.successIcon}>
          <Feather name="calendar" size={34} color={G} />
        </View>
        <Text style={styles.successTitle}>Event Published!</Text>
        <Text style={styles.successDesc}>Your event is live and neighbours can now get tickets.</Text>
        <TouchableOpacity 
          style={styles.btnPrimary}
          onPress={() => router.replace('/(tabs)/catalog')}
        >
          <Text style={styles.btnPrimaryText}>Explore Events</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: DARK, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Create Event</Text>
          <Text style={styles.headerSubtitle}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
        </View>
      </View>

      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Basic Info</Text>
            <Text style={styles.stepDesc}>Give your event a clear name and category.</Text>

            <Text style={styles.label}>Event Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Block Party & BBQ"
              placeholderTextColor={MUTED}
              value={eventName}
              onChangeText={setEventName}
            />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, eventCategory === cat && styles.chipActive]}
                  onPress={() => setEventCategory(cat)}
                >
                  <Text style={[styles.chipText, eventCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell guests what to expect..."
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={4}
              value={desc}
              onChangeText={setDesc}
            />
          </View>
        )}

        {step === 1 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Date & Time</Text>
            <Text style={styles.stepDesc}>When is your event taking place?</Text>

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-09-15"
              placeholderTextColor={MUTED}
              value={dateStr}
              onChangeText={setDateStr}
            />

            <Text style={styles.label}>Start Time (HH:MM e.g. 18:00)</Text>
            <TextInput
              style={styles.input}
              placeholder="18:00"
              placeholderTextColor={MUTED}
              value={startTime}
              onChangeText={setStartTime}
            />

            <Text style={styles.label}>End Time (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="22:00"
              placeholderTextColor={MUTED}
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Location</Text>
            <Text style={styles.stepDesc}>Where can attendees find your event?</Text>

            <View style={styles.switchRow}>
              <Text style={{ fontFamily: 'Inter-Medium', color: '#fff', fontSize: 15 }}>Online Event</Text>
              <Switch value={isOnline} onValueChange={setIsOnline} trackColor={{ false: SURFACE, true: G }} />
            </View>

            {isOnline ? (
              <>
                <Text style={styles.label}>Stream / Meeting Link</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://zoom.us/j/..."
                  placeholderTextColor={MUTED}
                  value={onlineLink}
                  onChangeText={setOnlineLink}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Venue Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 12 Community Hall Way"
                  placeholderTextColor={MUTED}
                  value={venue}
                  onChangeText={setVenue}
                />

                <Text style={styles.label}>Neighbourhood / Area</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ikeja, Lagos"
                  placeholderTextColor={MUTED}
                  value={area}
                  onChangeText={setArea}
                />
              </>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Ticket Tiers</Text>
            <Text style={styles.stepDesc}>Configure free or paid entry options.</Text>

            {tiers.map((tier, idx) => (
              <View key={idx} style={styles.tierCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', color: '#fff', fontSize: 16 }}>Tier #{idx + 1}</Text>
                  {tiers.length > 1 && (
                    <TouchableOpacity onPress={() => removeTier(idx)}>
                      <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Tier Name (e.g. Early Bird)"
                  placeholderTextColor={MUTED}
                  value={tier.name}
                  onChangeText={v => updateTier(idx, 'name', v)}
                />

                <View style={styles.switchRow}>
                  <Text style={{ fontFamily: 'Inter-Medium', color: '#ccc', fontSize: 14 }}>Free Ticket</Text>
                  <Switch value={tier.isFree} onValueChange={v => updateTier(idx, 'isFree', v)} trackColor={{ false: SURFACE, true: G }} />
                </View>

                {!tier.isFree && (
                  <TextInput
                    style={styles.input}
                    placeholder="Price (₦)"
                    placeholderTextColor={MUTED}
                    keyboardType="numeric"
                    value={tier.price}
                    onChangeText={v => updateTier(idx, 'price', v)}
                  />
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Total Capacity (e.g. 100)"
                  placeholderTextColor={MUTED}
                  keyboardType="numeric"
                  value={tier.capacity}
                  onChangeText={v => updateTier(idx, 'capacity', v)}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.addTierBtn} onPress={addTier}>
              <Ionicons name="add" size={20} color={G} />
              <Text style={{ fontFamily: 'Outfit-Bold', color: G, fontSize: 14 }}>Add Ticket Tier</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Cover Photo</Text>
            <Text style={styles.stepDesc}>Upload an eye-catching banner image.</Text>

            {coverFile ? (
              <View style={styles.coverPreviewBox}>
                <Image source={{ uri: coverFile.uri }} style={styles.coverImg} />
                <TouchableOpacity style={styles.removeCover} onPress={() => setCoverFile(null)}>
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadCoverBox} onPress={pickCover}>
                <Ionicons name="image-outline" size={36} color={G} />
                <Text style={{ fontFamily: 'Outfit-Bold', color: '#fff', fontSize: 16 }}>Upload Cover Image</Text>
                <Text style={{ fontFamily: 'Inter-Regular', color: MUTED, fontSize: 12 }}>16:9 Aspect Ratio Recommended</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 5 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Review & Publish</Text>
            <Text style={styles.stepDesc}>Verify details before publishing live.</Text>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>{eventName}</Text>
              <Text style={styles.reviewMeta}>{eventCategory} · {dateStr} at {startTime}</Text>
              <Text style={styles.reviewMeta}>{isOnline ? 'Online Event' : venue}</Text>
              <Text style={{ fontFamily: 'Outfit-Bold', color: G, marginTop: 8 }}>{tiers.length} Ticket Tier(s)</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.btnPrimary, !canNext && styles.btnDisabled]}
          disabled={!canNext || publishing}
          onPress={handleNext}
        >
          {publishing ? (
            <ActivityIndicator size="small" color={DARK} />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {step === STEPS.length - 1 ? 'Publish Event' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: MUTED },
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: G,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', marginBottom: 4 },
  stepDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED, marginBottom: 20 },
  formGroup: { gap: 12 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#ccc', marginTop: 8 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: G + '20',
    borderColor: G,
  },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
  chipTextActive: { color: G },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tierCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  addTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    gap: 8,
  },
  uploadCoverBox: {
    height: 180,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverPreviewBox: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImg: { width: '100%', height: '100%' },
  removeCover: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  reviewCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  reviewTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff' },
  reviewMeta: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
    backgroundColor: DARK,
  },
  btnPrimary: {
    backgroundColor: G,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
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
});
