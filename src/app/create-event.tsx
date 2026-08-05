import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED } from '../constants/tokens';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

type TicketTier = { id: number; name: string; price: string; qty: string; desc: string; expanded: boolean };

const STEPS = ['Cover', 'Details', 'Date & Time', 'Location', 'Tickets', 'Review'];
const CATEGORIES = ['Party', 'Music', 'Sports', 'Food', 'Networking', 'Community', 'Arts', 'Tech'];
const COVER_ID = '1540575861846-d775fab174ef';

export default function CreateEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [area, setArea] = useState('');
  
  const [tiers, setTiers] = useState<TicketTier[]>([
    { id: 1, name: 'General Admission', price: '0', qty: '', desc: '', expanded: true }
  ]);
  const [nextTierId, setNextTierId] = useState(2);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const progress = useSharedValue(1 / STEPS.length);

  React.useEffect(() => {
    progress.value = withTiming((step + 1) / STEPS.length);
  }, [step]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  const canNext = [
    true,
    eventName.trim() && eventCategory,
    dateStr.trim() && startTime.trim(),
    venue.trim() && area.trim(),
    tiers.length > 0 && tiers.every(t => t.name.trim()),
    true,
  ][step];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setPublishing(true);
      setTimeout(() => {
        setPublishing(false);
        setPublished(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 1600);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    } else {
      router.back();
    }
  };

  const updateTier = (id: number, patch: Partial<TicketTier>) => {
    setTiers(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const deleteTier = (id: number) => setTiers(ts => ts.filter(t => t.id !== id));
  const addTier = () => {
    setTiers(ts => [...ts, { id: nextTierId, name: '', price: '0', qty: '', desc: '', expanded: true }]);
    setNextTierId(n => n + 1);
  };

  if (published) {
    return (
      <View style={[styles.successContainer, { backgroundColor: '#050505' }]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={34} color={G} />
        </View>
        <Text style={styles.successTitle}>Event Published!</Text>
        <Text style={styles.successDesc}>Your event is now live on YRDLY.</Text>
        <TouchableOpacity 
          style={styles.btnPrimary}
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Text style={styles.btnPrimaryText}>View My Events</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnText}>Back to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: '#050505', paddingTop: insets.top }]}
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
          <View>
            <Text style={styles.stepTitle}>Cover Image</Text>
            <Text style={styles.stepDesc}>A 16:9 banner that represents your event.</Text>
            <View style={styles.coverBox}>
              <Image source={{ uri: `https://images.unsplash.com/photo-${COVER_ID}?w=700&h=394&fit=crop&auto=format&q=80` }} style={styles.coverImg} />
              <TouchableOpacity style={styles.coverOverlay}>
                <View style={styles.changeCoverBadge}>
                  <Text style={styles.changeCoverText}>Change Cover</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.fieldLabel}>Event Name</Text>
              <TextInput style={styles.input} value={eventName} onChangeText={setEventName} placeholder="What's your event called?" placeholderTextColor={MUTED} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} value={eventDesc} onChangeText={setEventDesc} placeholder="What should people know about it?" placeholderTextColor={MUTED} multiline textAlignVertical="top" />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.pillContainer}>
                {CATEGORIES.map(c => {
                  const isSelected = eventCategory === c;
                  return (
                    <TouchableOpacity key={c} onPress={() => setEventCategory(c)} style={[styles.pill, isSelected && styles.pillSelected]}>
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput style={styles.input} value={dateStr} onChangeText={setDateStr} placeholder="e.g. Oct 31, 2026" placeholderTextColor={MUTED} />
            </View>
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Starts</Text>
                <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="9:00 PM" placeholderTextColor={MUTED} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Ends (Optional)</Text>
                <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="2:00 AM" placeholderTextColor={MUTED} />
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.fieldLabel}>Venue Name</Text>
              <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholder="e.g. Landmark Beach" placeholderTextColor={MUTED} />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Area / Neighbourhood</Text>
              <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="e.g. Victoria Island" placeholderTextColor={MUTED} />
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.stepTitle}>Tickets</Text>
              <Text style={styles.stepDesc}>Add free or paid ticket tiers.</Text>
            </View>
            {tiers.map((t, idx) => (
              <View key={t.id} style={styles.ticketTierCard}>
                <View style={styles.ticketTierHeader}>
                  <Text style={styles.ticketTierTitle}>Tier {idx + 1}</Text>
                  {tiers.length > 1 && (
                    <TouchableOpacity onPress={() => deleteTier(t.id)}>
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ gap: 12 }}>
                  <TextInput style={styles.input} value={t.name} onChangeText={v => updateTier(t.id, { name: v })} placeholder="Ticket Name (e.g. VIP)" placeholderTextColor={MUTED} />
                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                      <TextInput style={styles.input} value={t.price} onChangeText={v => updateTier(t.id, { price: v })} placeholder="Price (0 for free)" placeholderTextColor={MUTED} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput style={styles.input} value={t.qty} onChangeText={v => updateTier(t.id, { qty: v })} placeholder="Qty (Optional)" placeholderTextColor={MUTED} keyboardType="numeric" />
                    </View>
                  </View>
                  <TextInput style={styles.input} value={t.desc} onChangeText={v => updateTier(t.id, { desc: v })} placeholder="Description (Optional)" placeholderTextColor={MUTED} />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addTierBtn} onPress={addTier}>
              <Feather name="plus" size={16} color={G} />
              <Text style={styles.addTierText}>Add Ticket Tier</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={{ gap: 20 }}>
            <View>
              <Text style={styles.stepTitle}>Review</Text>
              <Text style={styles.stepDesc}>This is how your event will appear on the feed.</Text>
            </View>
            
            <View style={styles.previewCard}>
              <View style={styles.previewCoverBox}>
                <Image source={{ uri: `https://images.unsplash.com/photo-${COVER_ID}?w=600&h=338&fit=crop&auto=format&q=85` }} style={styles.previewMainImage} />
                <View style={styles.previewDateBadge}>
                  <Text style={styles.previewDateText}>OCT</Text>
                  <Text style={styles.previewDateNum}>31</Text>
                </View>
              </View>
              <View style={styles.previewContent}>
                <Text style={styles.previewTitle}>{eventName || 'Event Name'}</Text>
                <View style={styles.previewMeta}>
                  <Feather name="map-pin" size={12} color={LABEL} />
                  <Text style={styles.previewMetaText}>{venue || 'Venue'}, {area || 'Area'}</Text>
                </View>
                <View style={[styles.previewMeta, { marginTop: 4 }]}>
                  <Feather name="clock" size={12} color={LABEL} />
                  <Text style={styles.previewMetaText}>{startTime || 'Time'}</Text>
                </View>
              </View>
              <View style={styles.previewHostRow}>
                <Image source={{ uri: "https://images.unsplash.com/photo-1563132337-f159f484226c?w=40&h=40&fit=crop&auto=format" }} style={styles.previewAvatar} />
                <Text style={styles.previewHostText}>Hosted by <Text style={{ color: '#fff' }}>You</Text></Text>
              </View>
            </View>

            <View style={styles.reminderBox}>
              <Feather name="info" size={16} color={G} />
              <Text style={styles.reminderText}>Your event will be published to the community feed immediately.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
        <TouchableOpacity 
          style={[styles.continueBtn, !canNext && styles.continueBtnDisabled]}
          disabled={!canNext}
          onPress={handleNext}
        >
          <Text style={[styles.continueBtnText, !canNext && styles.continueBtnTextDisabled]}>
            {publishing ? 'Publishing…' : step < STEPS.length - 1 ? 'Continue' : 'Publish Event'}
          </Text>
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
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL, marginTop: 2 },
  progressBarBg: {
    marginHorizontal: 20,
    marginTop: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: G,
  },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  stepTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff', marginBottom: 4 },
  stepDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL, marginBottom: 20 },
  
  coverBox: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  coverImg: { width: '100%', height: '100%' },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeCoverBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  changeCoverText: { fontFamily: 'Outfit-Bold', fontSize: 14, color: '#fff' },
  
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: LABEL,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    color: '#fff',
    fontFamily: 'Inter-Regular',
    fontSize: 15,
  },
  textArea: { minHeight: 120 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  pillSelected: {
    backgroundColor: 'rgba(130,219,126,0.15)',
    borderColor: 'rgba(130,219,126,0.35)',
  },
  pillText: { fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED },
  pillTextSelected: { color: G },
  rowInputs: { flexDirection: 'row', gap: 12 },
  
  ticketTierCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    padding: 16,
  },
  ticketTierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTierTitle: { fontFamily: 'Outfit-Bold', fontSize: 15, color: '#fff' },
  addTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(130,219,126,0.05)',
  },
  addTierText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: G },

  previewCard: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewCoverBox: { position: 'relative', width: '100%', aspectRatio: 16/9 },
  previewMainImage: { width: '100%', height: '100%' },
  previewDateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 48,
    height: 52,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewDateText: { fontFamily: 'Outfit-Bold', fontSize: 10, color: '#fff' },
  previewDateNum: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff', marginTop: -2 },
  previewContent: { paddingHorizontal: 16, paddingVertical: 12 },
  previewTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: '#fff', marginBottom: 8 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewMetaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
  previewHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
  },
  previewAvatar: { width: 24, height: 24, borderRadius: 12 },
  previewHostText: { fontFamily: 'Inter-Regular', fontSize: 13, color: LABEL },

  reminderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(130,219,126,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(130,219,126,0.15)',
    borderRadius: 14,
  },
  reminderText: { fontFamily: 'Inter-Regular', fontSize: 13, color: MUTED, lineHeight: 20, flex: 1 },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: G,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: { backgroundColor: 'rgba(130,219,126,0.2)' },
  continueBtnText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: DARK },
  continueBtnTextDisabled: { color: 'rgba(130,219,126,0.4)' },

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
  btnPrimary: {
    marginTop: 8,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: G,
  },
  btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 15, color: DARK },
  btnText: { fontFamily: 'Inter-Regular', fontSize: 14, color: LABEL, marginTop: 8 },
});
