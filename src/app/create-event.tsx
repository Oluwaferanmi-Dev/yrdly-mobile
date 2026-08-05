import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch, Dimensions } from 'react-native';
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
import { DateTimePickerModal } from '../components/DateTimePickerModal';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { EventCard } from '../components/EventCard';
import { ImageCarousel } from '../components/ImageCarousel';

const STEPS = ['Basic Info', 'Date & Time', 'Location', 'Tickets', 'Photos', 'Review'];
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
  
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const [venue, setVenue] = useState('');
  const [area, setArea] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineLink, setOnlineLink] = useState('');
  
  const [attachedFiles, setAttachedFiles] = useState<MobileFile[]>([]);
  
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

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: MobileFile[] = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName || `event_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setAttachedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (e) {
      console.error('Pick image error:', e);
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
    true, // date/time always valid due to Date object
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
        let imageUrls: string[] = [];
        if (attachedFiles.length > 0) {
          const uploadedImages = await Promise.all(
            attachedFiles.map((file) => StorageService.uploadPostImage(user.id, file))
          );
          imageUrls = uploadedImages.map(res => res.url).filter(Boolean) as string[];
        }
        
        const coverUrl = imageUrls.length > 0 ? imageUrls[0] : '';

        const userLoc = profile.location as { state?: string; lga?: string; ward?: string } | undefined;
        
        // Parse start and end time ISOs safely
        const startISO = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), startTime.getHours(), startTime.getMinutes()).toISOString();
        const endISO = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), endTime.getHours(), endTime.getMinutes()).toISOString();

        const { data: newEvent, error: eventErr } = await supabase
          .from('events')
          .insert({
            organizer_id: user.id,
            title: eventName.trim(),
            category: eventCategory,
            description: desc.trim(),
            cover_image_url: coverUrl,
            image_urls: imageUrls,
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
          event_time: startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          event_location: { address: venue.trim() },
          event_link: `/events/${newEvent.id}`,
          image_urls: imageUrls,
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

            <Text style={styles.label}>Event Date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: '#fff' }}>{eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </TouchableOpacity>
            <DateTimePickerModal
              visible={showDatePicker}
              mode="date"
              value={eventDate}
              onConfirm={(d) => { setEventDate(d); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
            />

            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowStartTimePicker(true)}>
              <Text style={{ color: '#fff' }}>{startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </TouchableOpacity>
            <DateTimePickerModal
              visible={showStartTimePicker}
              mode="time"
              value={startTime}
              onConfirm={(d) => { setStartTime(d); setShowStartTimePicker(false); }}
              onCancel={() => setShowStartTimePicker(false)}
            />

            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowEndTimePicker(true)}>
              <Text style={{ color: '#fff' }}>{endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </TouchableOpacity>
            <DateTimePickerModal
              visible={showEndTimePicker}
              mode="time"
              value={endTime}
              onConfirm={(d) => { setEndTime(d); setShowEndTimePicker(false); }}
              onCancel={() => setShowEndTimePicker(false)}
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
                <View style={{ zIndex: 10 }}>
                  <GooglePlacesAutocomplete
                    placeholder="Search for a venue or location"
                    onPress={(data, details = null) => {
                      setVenue(data.description);
                      if (data.terms && data.terms.length > 1) {
                        setArea(data.terms[data.terms.length - 2].value);
                      }
                    }}
                    query={{
                      key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
                      language: 'en',
                      components: 'country:ng', // Limit to Nigeria
                    }}
                    styles={{
                      textInput: styles.input,
                      listView: {
                        backgroundColor: SURFACE,
                        borderRadius: 12,
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: GLASS_BORDER,
                      },
                      row: {
                        backgroundColor: SURFACE,
                        padding: 13,
                        height: 44,
                        flexDirection: 'row',
                      },
                      description: {
                        color: '#fff',
                      },
                    }}
                    textInputProps={{
                      placeholderTextColor: MUTED,
                      onChangeText: (text) => setVenue(text),
                    }}
                  />
                </View>

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
            <Text style={styles.stepTitle}>Tickets</Text>
            <Text style={styles.stepDesc}>Add the ticket tiers available for your event.</Text>

            {tiers.map((t, idx) => (
              <View key={idx} style={styles.tierCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', color: '#fff', fontSize: 16 }}>Ticket Tier {idx + 1}</Text>
                  {tiers.length > 1 && (
                    <TouchableOpacity onPress={() => removeTier(idx)} style={{ padding: 4 }}>
                      <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.tierLabel}>Ticket Name (e.g. Early Bird, VIP)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. VIP Access"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={t.name}
                  onChangeText={(val) => updateTier(idx, 'name', val)}
                />

                <View style={styles.switchRow}>
                  <Text style={{ fontFamily: 'Inter-Medium', color: '#ccc', fontSize: 14 }}>Is this a Free Ticket?</Text>
                  <Switch value={t.isFree} onValueChange={(val) => updateTier(idx, 'isFree', val)} trackColor={{ false: SURFACE, true: G }} />
                </View>

                {!t.isFree && (
                  <>
                    <Text style={styles.tierLabel}>Ticket Price (₦)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 5000"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="numeric"
                      value={t.price}
                      onChangeText={(val) => updateTier(idx, 'price', val)}
                    />
                  </>
                )}

                <Text style={styles.tierLabel}>Total Number of Tickets Available</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 100"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={t.capacity}
                  onChangeText={(val) => updateTier(idx, 'capacity', val)}
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
            <Text style={styles.stepTitle}>Photos</Text>
            <Text style={styles.stepDesc}>Add eye-catching photos for your event. The first photo will be the cover.</Text>

            <View style={styles.photosGrid}>
              {attachedFiles.map((f, i) => (
                <View key={i} style={styles.photoBox}>
                  <Image source={{ uri: f.uri }} style={styles.photoImg} />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removePhoto} onPress={() => setAttachedFiles(f => f.filter((_, idx) => idx !== i))}>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}>
                      <Feather name="x" size={14} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
              {attachedFiles.length < 5 && (
                <TouchableOpacity style={styles.addPhotoBox} onPress={pickImages}>
                  <Feather name="image" size={24} color={LABEL} />
                  <Text style={{ color: LABEL, fontSize: 12, marginTop: 4, fontFamily: 'Inter-Regular' }}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.formGroup}>
            <Text style={styles.stepTitle}>Review & Publish</Text>
            <Text style={styles.stepDesc}>Verify details before publishing live. Here's a preview of how it will look:</Text>

            <View style={{ marginTop: 10, borderRadius: 20, overflow: 'hidden', backgroundColor: SURFACE, borderWidth: 1, borderColor: GLASS_BORDER }}>
              {attachedFiles.length > 0 ? (
                <ImageCarousel 
                  imageUrls={attachedFiles.map(f => f.uri)} 
                  height={250} 
                  autoPlay={false} 
                />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: 'rgba(0,0,0,0.2)', height: 250, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="calendar-outline" size={64} color={LABEL} />
                </View>
              )}
              
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 22, color: TEXT_PRIMARY, flex: 1 }}>{eventName.trim() || 'Untitled Event'}</Text>
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#F59E0B', fontSize: 10, fontFamily: 'Inter-Bold', textTransform: 'uppercase' }}>Preview</Text>
                  </View>
                </View>

                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="calendar" size={18} color={G} />
                    </View>
                    <View>
                      <Text style={{ fontFamily: 'Inter-Medium', color: LABEL, fontSize: 12 }}>Date</Text>
                      <Text style={{ fontFamily: 'Inter-Medium', color: TEXT_PRIMARY, fontSize: 14 }}>
                        {eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="clock" size={18} color={G} />
                    </View>
                    <View>
                      <Text style={{ fontFamily: 'Inter-Medium', color: LABEL, fontSize: 12 }}>Time</Text>
                      <Text style={{ fontFamily: 'Inter-Medium', color: TEXT_PRIMARY, fontSize: 14 }}>
                        {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name={isOnline ? "video" : "map-pin"} size={18} color={G} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter-Medium', color: LABEL, fontSize: 12 }}>{isOnline ? 'Platform' : 'Location'}</Text>
                      <Text style={{ fontFamily: 'Inter-Medium', color: TEXT_PRIMARY, fontSize: 14 }} numberOfLines={2}>
                        {isOnline ? 'Online Event' : (venue.trim() || 'Location TBA')}
                      </Text>
                    </View>
                  </View>
                </View>

                {desc.trim().length > 0 && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                    <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 16, color: TEXT_PRIMARY, marginBottom: 8 }}>About this event</Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: LABEL, lineHeight: 22 }}>
                      {desc.trim()}
                    </Text>
                  </View>
                )}

                {tiers.length > 0 && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                    <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 16, color: TEXT_PRIMARY, marginBottom: 8 }}>Tickets</Text>
                    {tiers.map((t, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: t.isFree ? G : 'rgba(255,255,255,0.05)' }}>
                        <View>
                          <Text style={{ fontFamily: 'Inter-SemiBold', color: TEXT_PRIMARY, fontSize: 14 }}>{t.name || `Tier ${idx + 1}`}</Text>
                          <Text style={{ fontFamily: 'Inter-Regular', color: LABEL, fontSize: 12, marginTop: 2 }}>{t.capacity || 0} Available</Text>
                        </View>
                        <Text style={{ fontFamily: 'Outfit-Bold', color: t.isFree ? G : TEXT_PRIMARY, fontSize: 16 }}>
                          {t.isFree ? 'FREE' : `₦${t.price || 0}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
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
  tierLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#ccc', marginTop: 12, marginBottom: 8 },
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoBox: {
    width: (Dimensions.get('window').width - 40 - 16) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: G,
  },
  coverBadgeText: { fontFamily: 'Outfit-Bold', fontSize: 9, color: DARK },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  addPhotoBox: {
    width: (Dimensions.get('window').width - 40 - 16) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  reviewImageScroll: {
    width: '100%',
    height: 200,
  },
  reviewImage: {
    width: Dimensions.get('window').width - 40,
    height: 200,
  },
  reviewContent: {
    padding: 16,
    gap: 8,
  },
  reviewTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff' },
  reviewMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  reviewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reviewBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#ccc',
  },
  reviewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reviewLocationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: MUTED,
  },
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
