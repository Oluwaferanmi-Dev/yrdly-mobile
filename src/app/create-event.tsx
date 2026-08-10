import { createStyleSheet, useStyles } from "react-native-unistyles";
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/use-supabase-auth';
import { StorageService, MobileFile } from '../lib/storage-service';
import { DateTimePickerModal } from '../components/DateTimePickerModal';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { resolveCoords } from '../lib/geocoding-service';
import * as FileSystem from 'expo-file-system';
import { formatPrice } from '../lib/utils';
import { EventCard } from '../components/EventCard';
import { ImageCarousel } from '../components/ImageCarousel';
import { useCategories } from '../hooks/use-categories';

const STEPS = ['Basic Info', 'Date & Time', 'Location', 'Tickets', 'Photos', 'Review'];

export default function CreateEventScreen() {
    const { styles: stylesheet, theme } = useStyles(_stylesheet);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories('event');
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
  
  const [postState, setPostState] = useState('');
  const [postLga, setPostLga] = useState('');
  const [postWard, setPostWard] = useState('');
  const [postLat, setPostLat] = useState<number | null>(null);
  const [postLng, setPostLng] = useState<number | null>(null);
  
  const [attachedFiles, setAttachedFiles] = useState<MobileFile[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  
  const [tiers, setTiers] = useState<Array<{ name: string; price: string; isFree: boolean; capacity: string }>>([
    { name: 'Standard Ticket', price: '0', isFree: true, capacity: '100' }
  ]);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const progress = useSharedValue(0.16);

  React.useEffect(() => {
    progress.value = withTiming((step + 1) / STEPS.length);
  }, [step]);

  React.useEffect(() => {
    const state = profile?.home_state || profile?.location?.state;
    const lga = profile?.home_lga || profile?.location?.lga;
    const ward = profile?.home_ward || profile?.location?.ward;
    if (state && lga) {
      setArea([ward, lga, state].filter(Boolean).join(', '));
      setPostState(state);
      setPostLga(lga);
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
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets) {
        let validFiles: MobileFile[] = [];
        let videoCount = attachedFiles.filter(f => f.type?.startsWith('video/')).length;
        
        for (const asset of result.assets) {
          const type = asset.type === 'video' ? 'video/mp4' : (asset.mimeType || 'image/jpeg');
          
          if (type.startsWith('video/')) {
            videoCount++;
            if (videoCount > 3) {
              Alert.alert('Limit Reached', 'You can only upload up to 3 videos.');
              continue;
            }
            if (asset.uri) {
              const fileInfo = await FileSystem.getInfoAsync(asset.uri);
              if (fileInfo.exists && fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
                Alert.alert('File too large', 'Each video must be under 50MB.');
                continue;
              }
            }
          }
          
          validFiles.push({
            uri: asset.uri,
            name: asset.fileName || `event_${Date.now()}`,
            type,
          });
        }
        setAttachedFiles(prev => [...prev, ...validFiles]);
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
    attachedFiles.some(f => f.type?.startsWith('image/')),
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
        let videoUrls: string[] = [];

        if (attachedFiles.length > 0) {
          const images = attachedFiles.filter(f => f.type?.startsWith('image/'));
          const videos = attachedFiles.filter(f => f.type?.startsWith('video/'));

          if (images.length > 0) {
            const filesToUpload = [...images];
            if (coverIndex > 0 && coverIndex < filesToUpload.length) {
              const cover = filesToUpload.splice(coverIndex, 1)[0];
              filesToUpload.unshift(cover);
            }
            const uploadedImages = await Promise.all(
              filesToUpload.map((file) => StorageService.uploadPostImage(user.id, file))
            );
            imageUrls = uploadedImages.map(res => res.url).filter(Boolean) as string[];
          }

          if (videos.length > 0) {
            const uploadedVideos = await Promise.all(
              videos.map((file) => StorageService.uploadPostVideo(user.id, file))
            );
            videoUrls = uploadedVideos.map(res => res.url).filter(Boolean) as string[];
          }
        }
        
        const coverUrl = imageUrls.length > 0 ? imageUrls[0] : '';
        
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
            video_urls: videoUrls,
            image_urls: imageUrls,
            start_time: startISO,
            end_time: endISO,
            location_address: venue.trim() || (isOnline ? 'Online Event' : 'TBA'),
            location_online: isOnline,
            online_link: isOnline ? onlineLink.trim() : null,
            state: postState || null,
            lga: postLga || null,
            ward: postWard || null,
            lat: postLat,
            lng: postLng,
            location_geom: postLat !== null && postLng !== null ? `POINT(${postLng} ${postLat})` : null,
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
          video_urls: videoUrls,
          state: postState || null,
          lga: postLga || null,
          ward: null,
          visibility: visibility,
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
      <View style={[stylesheet.successContainer, { backgroundColor: theme.colors.DARK }]}>
        <View style={stylesheet.successIcon}>
          <Feather name="calendar" size={34} color={theme.colors.G} />
        </View>
        <Text style={stylesheet.successTitle}>Event Published!</Text>
        <Text style={stylesheet.successDesc}>Your event is live and neighbours can now get tickets.</Text>
        <TouchableOpacity 
          style={stylesheet.btnPrimary}
          onPress={() => router.replace('/(tabs)/catalog')}
        >
          <Text style={stylesheet.btnPrimaryText}>Explore Events</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[stylesheet.container, { backgroundColor: theme.colors.DARK, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={stylesheet.header}>
        <TouchableOpacity onPress={handleBack} style={stylesheet.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={stylesheet.headerTextContainer}>
          <Text style={stylesheet.headerTitle}>Create Event</Text>
          <Text style={stylesheet.headerSubtitle}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Text>
        </View>
      </View>

      <View style={stylesheet.progressBarBg}>
        <Animated.View style={[stylesheet.progressBarFill, animatedProgressStyle]} />
      </View>

      <ScrollView contentContainerStyle={stylesheet.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Basic Info</Text>
            <Text style={stylesheet.stepDesc}>Give your event a clear name and category.</Text>

            <Text style={stylesheet.label}>Event Title</Text>
            <TextInput
              style={stylesheet.input}
              placeholder="e.g. Block Party & BBQ"
              placeholderTextColor={theme.colors.MUTED}
              value={eventName}
              onChangeText={setEventName}
            />

            <Text style={stylesheet.label}>Category</Text>
            {categoriesLoading ? (
              <ActivityIndicator color={theme.colors.GOLD} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={stylesheet.chipRow}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[stylesheet.chip, eventCategory === cat.name && stylesheet.chipActive]}
                    onPress={() => setEventCategory(cat.name)}
                  >
                    <Text style={[stylesheet.chipText, eventCategory === cat.name && stylesheet.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={stylesheet.label}>Description</Text>
            <TextInput
              style={[stylesheet.input, stylesheet.textArea]}
              placeholder="Tell guests what to expect..."
              placeholderTextColor={theme.colors.MUTED}
              multiline
              numberOfLines={4}
              value={desc}
              onChangeText={setDesc}
            />
          </View>
        )}

        {step === 1 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Date & Time</Text>
            <Text style={stylesheet.stepDesc}>When is your event taking place?</Text>

            <Text style={stylesheet.label}>Event Date</Text>
            <TouchableOpacity style={stylesheet.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: theme.colors.TEXT_PRIMARY }}>{eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </TouchableOpacity>
            <DateTimePickerModal
              visible={showDatePicker}
              mode="date"
              value={eventDate}
              onConfirm={(d) => { setEventDate(d); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
            />

            <Text style={stylesheet.label}>Start Time</Text>
            <TouchableOpacity style={stylesheet.input} onPress={() => setShowStartTimePicker(true)}>
              <Text style={{ color: theme.colors.TEXT_PRIMARY }}>{startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </TouchableOpacity>
            <DateTimePickerModal
              visible={showStartTimePicker}
              mode="time"
              value={startTime}
              onConfirm={(d) => { setStartTime(d); setShowStartTimePicker(false); }}
              onCancel={() => setShowStartTimePicker(false)}
            />

            <Text style={stylesheet.label}>End Time</Text>
            <TouchableOpacity style={stylesheet.input} onPress={() => setShowEndTimePicker(true)}>
              <Text style={{ color: theme.colors.TEXT_PRIMARY }}>{endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
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
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Location</Text>
            <Text style={stylesheet.stepDesc}>Where can attendees find your event?</Text>

            <View style={stylesheet.switchRow}>
              <Text style={{ fontFamily: 'Inter-Medium', color: theme.colors.TEXT_PRIMARY, fontSize: 15 }}>Online Event</Text>
              <Switch value={isOnline} onValueChange={setIsOnline} trackColor={{ false: theme.colors.SURFACE, true: theme.colors.G }} />
            </View>

            {isOnline ? (
              <>
                <Text style={stylesheet.label}>Stream / Meeting Link</Text>
                <TextInput
                  style={stylesheet.input}
                  placeholder="https://zoom.us/j/..."
                  placeholderTextColor={theme.colors.MUTED}
                  value={onlineLink}
                  onChangeText={setOnlineLink}
                />
              </>
            ) : (
              <>
                <Text style={stylesheet.label}>Venue Address</Text>
                <View style={{ zIndex: 10 }}>
                  <GooglePlacesAutocomplete
                    placeholder="Search for a venue or location"
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                      setVenue(data.description);
                      if (details?.geometry?.location) {
                        const lat = details.geometry.location.lat;
                        const lng = details.geometry.location.lng;
                        setPostLat(lat);
                        setPostLng(lng);
                        resolveCoords(lat, lng).then((match) => {
                          if (match) {
                            setPostState(match.state);
                            setPostLga(match.lga);
                            setPostWard(match.ward);
                            setArea(`${match.lga}, ${match.state}`);
                          }
                        });
                      }
                    }}
                    query={{
                      key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
                      language: 'en',
                      components: 'country:ng', // Limit to Nigeria
                    }}
                    styles={{
                      textInput: stylesheet.input,
                      listView: {
                        backgroundColor: theme.colors.SURFACE,
                        borderRadius: 12,
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.GLASS_BORDER,
                      },
                      row: {
                        backgroundColor: theme.colors.SURFACE,
                        padding: 13,
                        height: 44,
                        flexDirection: 'row',
                      },
                      description: {
                        color: theme.colors.TEXT_PRIMARY,
                      },
                    }}
                    textInputProps={{
                      placeholderTextColor: theme.colors.MUTED,
                      onChangeText: (text) => setVenue(text),
                    }}
                  />
                </View>

                <Text style={stylesheet.label}>Neighbourhood / Area</Text>
                <TextInput
                  style={stylesheet.input}
                  placeholder="e.g. Ikeja, Lagos"
                  placeholderTextColor={theme.colors.MUTED}
                  value={area}
                  onChangeText={setArea}
                />
              </>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Tickets</Text>
            <Text style={stylesheet.stepDesc}>Add the ticket tiers available for your event.</Text>

            {tiers.map((t, idx) => (
              <View key={idx} style={stylesheet.tierCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', color: theme.colors.TEXT_PRIMARY, fontSize: 16 }}>Ticket Tier {idx + 1}</Text>
                  {tiers.length > 1 && (
                    <TouchableOpacity onPress={() => removeTier(idx)} style={{ padding: 4 }}>
                      <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={stylesheet.tierLabel}>Ticket Name (e.g. Early Bird, VIP)</Text>
                <TextInput
                  style={stylesheet.input}
                  placeholder="e.g. VIP Access"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={t.name}
                  onChangeText={(val) => updateTier(idx, 'name', val)}
                />

                <View style={stylesheet.switchRow}>
                  <Text style={{ fontFamily: 'Inter-Medium', color: '#ccc', fontSize: 14 }}>Is this a Free Ticket?</Text>
                  <Switch value={t.isFree} onValueChange={(val) => updateTier(idx, 'isFree', val)} trackColor={{ false: theme.colors.SURFACE, true: theme.colors.G }} />
                </View>

                {!t.isFree && (
                  <>
                    <Text style={stylesheet.tierLabel}>Ticket Price (₦)</Text>
                    <TextInput
                      style={stylesheet.input}
                      placeholder="e.g. 5000"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="numeric"
                      value={t.price ? Number(t.price).toLocaleString('en-US') : ''}
                      onChangeText={(val) => updateTier(idx, 'price', val.replace(/[^0-9]/g, ''))}
                    />
                  </>
                )}

                <Text style={stylesheet.tierLabel}>Total Number of Tickets Available</Text>
                <TextInput
                  style={stylesheet.input}
                  placeholder="e.g. 100"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={t.capacity}
                  onChangeText={(val) => updateTier(idx, 'capacity', val)}
                />
              </View>
            ))}

            <TouchableOpacity style={stylesheet.addTierBtn} onPress={addTier}>
              <Ionicons name="add" size={20} color={theme.colors.G} />
              <Text style={{ fontFamily: 'Outfit-Bold', color: theme.colors.G, fontSize: 14 }}>Add Ticket Tier</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Media</Text>
            <Text style={stylesheet.stepDesc}>Add eye-catching photos/videos for your event. At least one image is required.</Text>

            <View style={stylesheet.photosGrid}>
              {attachedFiles.map((f, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setCoverIndex(i)}
                  style={[stylesheet.photoBox, i === coverIndex && { borderWidth: 2, borderColor: theme.colors.G }]}
                >
                  <Image source={{ uri: f.uri }} style={stylesheet.photoImg} />
                  {f.type?.startsWith('video/') && (
                    <View style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)'}}>
                      <Ionicons name="play-circle" size={32} color="#fff" />
                    </View>
                  )}
                  {i === coverIndex && (
                    <View style={stylesheet.coverBadge}>
                      <Text style={stylesheet.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={stylesheet.removePhoto} 
                    onPress={() => {
                      setAttachedFiles(f => f.filter((_, idx) => idx !== i));
                      if (coverIndex === i) setCoverIndex(0);
                      else if (coverIndex > i) setCoverIndex(c => c - 1);
                    }}
                  >
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}>
                      <Feather name="x" size={14} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              {attachedFiles.length < 5 && (
                <TouchableOpacity style={stylesheet.addPhotoBox} onPress={pickImages}>
                  <Feather name="image" size={24} color={theme.colors.LABEL} />
                  <Text style={{ color: theme.colors.LABEL, fontSize: 12, marginTop: 4, fontFamily: 'Inter-Regular' }}>Add Media</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={stylesheet.formGroup}>
            <Text style={stylesheet.stepTitle}>Review & Publish</Text>
            <Text style={stylesheet.stepDesc}>Verify details before publishing live. Here's a preview of how it will look:</Text>

            <View style={{ marginTop: 10, borderRadius: 20, overflow: 'hidden', backgroundColor: theme.colors.SURFACE, borderWidth: 1, borderColor: theme.colors.GLASS_BORDER }}>
              {attachedFiles.length > 0 ? (
                <ImageCarousel 
                  imageUrls={attachedFiles.map(f => f.uri)} 
                  height={250} 
                  autoPlay={false} 
                />
              ) : (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', height: 250, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="calendar-outline" size={64} color={theme.colors.LABEL} />
                </View>
              )}
              
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 22, color: theme.colors.TEXT_PRIMARY, flex: 1 }}>{eventName.trim() || 'Untitled Event'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity 
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: visibility === 'private' ? 'rgba(255, 165, 0, 0.15)' : 'rgba(130,219,126,0.15)' }}
                      onPress={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
                    >
                      <Ionicons name={visibility === 'public' ? "earth" : "people"} size={12} color={visibility === 'public' ? theme.colors.G : '#FFA500'} style={{ marginRight: 6 }} />
                      <Text style={{ color: visibility === 'public' ? theme.colors.G : '#FFA500', fontSize: 12, fontFamily: 'Inter-Medium' }}>
                        {visibility === 'public' ? 'Public' : 'Friends Only'}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: '#F59E0B', fontSize: 10, fontFamily: 'Inter-Bold', textTransform: 'uppercase' }}>Preview</Text>
                    </View>
                  </View>
                </View>

                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="calendar" size={18} color={theme.colors.G} />
                    </View>
                    <View>
                      <Text style={{ fontFamily: 'Inter-Medium', color: theme.colors.LABEL, fontSize: 12 }}>Date</Text>
                      <Text style={{ fontFamily: 'Inter-Medium', color: theme.colors.TEXT_PRIMARY, fontSize: 14 }}>
                        {eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="clock" size={18} color={theme.colors.G} />
                    </View>
                    <View>
                      <Text style={{ fontFamily: 'Inter-Medium', color: theme.colors.LABEL, fontSize: 12 }}>Time</Text>
                      <Text style={{ fontFamily: 'Inter-Medium', color: theme.colors.TEXT_PRIMARY, fontSize: 14 }}>
                        {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(130,219,126,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name={isOnline ? "video" : "map-pin"} size={18} color={theme.colors.G} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Inter-Medium', color: theme.colors.LABEL, fontSize: 12 }}>{isOnline ? 'Platform' : 'Location'}</Text>
                      <Text style={{ fontFamily: 'Inter-Medium', color: theme.colors.TEXT_PRIMARY, fontSize: 14 }} numberOfLines={2}>
                        {isOnline ? 'Online Event' : (venue.trim() ? `${venue.trim()}\n${postLga || 'TBA'}, ${postState || 'TBA'}` : 'Location TBA')}
                      </Text>
                    </View>
                  </View>
                </View>

                {desc.trim().length > 0 && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.SURFACE }}>
                    <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 16, color: theme.colors.TEXT_PRIMARY, marginBottom: 8 }}>About this event</Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: theme.colors.LABEL, lineHeight: 22 }}>
                      {desc.trim()}
                    </Text>
                  </View>
                )}

                {tiers.length > 0 && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.SURFACE }}>
                    <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 16, color: theme.colors.TEXT_PRIMARY, marginBottom: 8 }}>Tickets</Text>
                    {tiers.map((t, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: t.isFree ? theme.colors.G : 'rgba(255,255,255,0.05)' }}>
                        <View>
                          <Text style={{ fontFamily: 'Inter-SemiBold', color: theme.colors.TEXT_PRIMARY, fontSize: 14 }}>{t.name || `Tier ${idx + 1}`}</Text>
                          <Text style={{ fontFamily: 'Inter-Regular', color: theme.colors.LABEL, fontSize: 12, marginTop: 2 }}>{t.capacity || 0} Available</Text>
                        </View>
                        <Text style={{ fontFamily: 'Outfit-Bold', color: t.isFree ? theme.colors.G : theme.colors.TEXT_PRIMARY, fontSize: 16 }}>
                          {t.isFree ? 'FREE' : formatPrice(Number(t.price))}
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

      <View style={[stylesheet.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[stylesheet.btnPrimary, !canNext && stylesheet.btnDisabled]}
          disabled={!canNext || publishing}
          onPress={handleNext}
        >
          {publishing ? (
            <ActivityIndicator size="small" color={theme.colors.DARK} />
          ) : (
            <Text style={stylesheet.btnPrimaryText}>
              {step === STEPS.length - 1 ? 'Publish Event' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const _stylesheet = createStyleSheet(theme => ({
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
        backgroundColor: theme.colors.SURFACE,
        justifyContent: 'center',
        alignItems: 'center',
      },
      headerTextContainer: { flex: 1 },
      headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: theme.colors.TEXT_PRIMARY },
      headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: theme.colors.MUTED },
      progressBarBg: {
        height: 3,
        backgroundColor: theme.colors.GLASS_BORDER,
        width: '100%',
      },
      progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.G,
      },
      scrollContent: {
        padding: 20,
        paddingBottom: 40,
      },
      stepTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: theme.colors.TEXT_PRIMARY, marginBottom: 4 },
      stepDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: theme.colors.MUTED, marginBottom: 20 },
      formGroup: { gap: 12 },
      label: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#ccc', marginTop: 8 },
      input: {
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: 'Inter-Regular',
        fontSize: 15,
        color: theme.colors.TEXT_PRIMARY,
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
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
        marginRight: 8,
      },
      chipActive: {
        backgroundColor: theme.colors.G + '20',
        borderColor: theme.colors.G,
      },
      chipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: theme.colors.MUTED },
      chipTextActive: { color: theme.colors.G },
      switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
      },
      tierCard: {
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
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
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
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
        backgroundColor: theme.colors.G,
      },
      coverBadgeText: { fontFamily: 'Outfit-Bold', fontSize: 9, color: theme.colors.DARK },
      removePhoto: {
        position: 'absolute',
        top: 6,
        right: 6,
      },
      addPhotoBox: {
        width: (Dimensions.get('window').width - 40 - 16) / 3,
        aspectRatio: 1,
        borderRadius: 16,
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
      },
      reviewCard: {
        backgroundColor: theme.colors.SURFACE,
        borderWidth: 1,
        borderColor: theme.colors.GLASS_BORDER,
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
      reviewTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: theme.colors.TEXT_PRIMARY },
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
        borderColor: theme.colors.GLASS_BORDER,
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
        color: theme.colors.MUTED,
      },
      footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.GLASS_BORDER,
        backgroundColor: theme.colors.DARK,
      },
      btnPrimary: {
        backgroundColor: theme.colors.G,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
      },
      btnDisabled: { opacity: 0.4 },
      btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: theme.colors.DARK },
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
      successTitle: { fontFamily: 'Outfit-Bold', fontSize: 24, color: theme.colors.TEXT_PRIMARY, textAlign: 'center' },
      successDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: theme.colors.MUTED, textAlign: 'center', lineHeight: 22 },
    }));
