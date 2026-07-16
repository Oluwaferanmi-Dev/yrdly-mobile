import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Switch, Animated, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '../context/ThemeContext';

export const EVENT_CATEGORIES = ['Party','Music','Sports','Food','Networking','Community','Education','Arts','Tech','Other'];

export interface TicketTierInput { id: string; name: string; price: string; capacity: string; }
export interface EventImage { uri: string; width: number; height: number; type?: 'image'|'video'; thumbnailUri?: string; }

export interface CreateEventFormValues {
  title: string;
  text: string;
  images: EventImage[];
  eventDate: Date;
  locationData: { address: string; lat: number; lng: number } | null;
  ticketTiers: TicketTierInput[];
  eventCategory: string;
  isTicketed: boolean;
}

interface Props {
  values: CreateEventFormValues;
  onChange: (p: Partial<CreateEventFormValues>) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (i: number) => void;
  profile?: any;
  isDarkMode: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

// Collapsible ticket card
function TicketCard({ tier, idx, onChange, onRemove, colors }: any) {
  const [open, setOpen] = useState(true);
  const rot = useRef(new Animated.Value(open ? 1 : 0)).current;
  const toggle = () => {
    Animated.spring(rot, { toValue: open ? 0 : 1, useNativeDriver: true, speed: 30 }).start();
    setOpen(o => !o);
  };
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <View style={[tk.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <TouchableOpacity style={tk.header} onPress={toggle}>
        <View style={[tk.iconWrap, { backgroundColor: colors.tint + '20' }]}>
          <Ionicons name="ticket-outline" size={16} color={colors.tint} />
        </View>
        <Text style={[tk.name, { color: colors.text }]}>{tier.name || `Ticket ${idx + 1}`}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {!open && <Text style={[tk.price, { color: colors.tint }]}>{tier.price === '0' || !tier.price ? 'Free' : `₦${tier.price}`}</Text>}
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Animated.View>
        </View>
      </TouchableOpacity>
      {open && (
        <View style={tk.body}>
          <TextInput style={[tk.input, { color: colors.text, borderColor: colors.borderLight }]}
            value={tier.name} onChangeText={v => onChange({ ...tier, name: v })}
            placeholder="Ticket name (e.g. VIP)" placeholderTextColor={colors.textMuted} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[tk.label, { color: colors.textMuted }]}>Price (₦)</Text>
              <TextInput style={[tk.input, { color: colors.text, borderColor: colors.borderLight }]}
                value={tier.price} onChangeText={v => onChange({ ...tier, price: v.replace(/[^0-9.]/g,'') })}
                keyboardType="numeric" placeholder="0 for Free" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[tk.label, { color: colors.textMuted }]}>Capacity</Text>
              <TextInput style={[tk.input, { color: colors.text, borderColor: colors.borderLight }]}
                value={tier.capacity} onChangeText={v => onChange({ ...tier, capacity: v.replace(/[^0-9]/g,'') })}
                keyboardType="numeric" placeholder="Unlimited" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
          <TouchableOpacity style={tk.removeBtn} onPress={() =>
            Alert.alert('Remove Ticket','Remove this ticket type?',[
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: onRemove }
            ])}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
            <Text style={tk.removeTxt}>Remove ticket</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function CreateEventForm({ values, onChange, onAddPhoto, onRemovePhoto, profile, isDarkMode, isSubmitting, onSubmit }: Props) {
  const { colors } = useAppTheme();
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  const locationLabel = values.locationData?.address || 'Add venue or address';
  const dateLabel = values.eventDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = values.eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const locFromProfile = [profile?.location?.ward, profile?.location?.lga, profile?.location?.state].filter(Boolean).join(', ');

  const pressScale = useRef(new Animated.Value(1)).current;
  const canPublish = values.title.trim() && values.images.length > 0;

  const addTier = () => onChange({ ticketTiers: [...values.ticketTiers, { id: Date.now().toString(), name: '', price: '0', capacity: '' }] });
  const updateTier = (i: number, t: TicketTierInput) => { const ts = [...values.ticketTiers]; ts[i] = t; onChange({ ticketTiers: ts }); };
  const removeTier = (i: number) => onChange({ ticketTiers: values.ticketTiers.filter((_, x) => x !== i) });

  return (
    <>
      {/* Host card */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} contentFit="cover" />
            : <View style={[s.avatar, { backgroundColor: colors.tint, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{(profile?.name || '?').charAt(0)}</Text>
              </View>}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.hostName, { color: colors.text }]}>{profile?.name || 'You'}</Text>
              <View style={[s.pill, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '50' }]}>
                <Ionicons name="calendar-outline" size={10} color={colors.tint} />
                <Text style={[s.pillTxt, { color: colors.tint }]}>Event</Text>
                <Ionicons name="chevron-down" size={10} color={colors.tint} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Text style={[s.hostSub, { color: colors.textMuted }]}>{locFromProfile}</Text>
              <Text style={[s.hostSub, { color: colors.textMuted }]}>·</Text>
              <Ionicons name="globe-outline" size={11} color={colors.tint} />
              <Text style={[s.hostSub, { color: colors.tint }]}>Public</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cover */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="image-outline" size={15} color={colors.tint} />
            <Text style={[s.fieldLabel, { color: colors.text }]}>Event Cover <Text style={s.req}>*</Text></Text>
          </View>
          <Text style={[s.charCount, { color: colors.textMuted }]}>{values.images.length}/10</Text>
        </View>
        <Text style={[s.hint, { color: colors.textMuted }]}>Add a cover photo for your event</Text>

        {values.images.length === 0 ? (
          <TouchableOpacity onPress={onAddPhoto} style={[s.coverEmpty, { borderColor: colors.tint }]}>
            <Ionicons name="image-outline" size={32} color={colors.tint} />
            <Text style={[s.coverEmptyLabel, { color: colors.text }]}>Add Cover Photo</Text>
            <Text style={[s.hint, { color: colors.textMuted }]}>JPG, PNG or WebP. Max 10MB</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.coverPreview}>
            <Image source={{ uri: values.images[0].thumbnailUri || values.images[0].uri }}
              style={s.coverImg} contentFit="cover" transition={200} />
            <TouchableOpacity style={s.coverRemove} onPress={() => onRemovePhoto(0)}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[s.mediaRow, { borderTopColor: colors.borderLight }]}>
          {[['image-outline','Photos'],['videocam-outline','Video'],['location-outline','Location'],['calendar-outline','Date & Time']].map(([icon, label]) => (
            <TouchableOpacity key={label} style={s.mediaBtn} onPress={label === 'Photos' || label === 'Video' ? onAddPhoto : undefined}>
              <Ionicons name={icon as any} size={14} color={colors.textMuted} />
              <Text style={[s.mediaBtnTxt, { color: colors.textMuted }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Title */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ionicons name="pricetag-outline" size={15} color={colors.tint} />
          <Text style={[s.fieldLabel, { color: colors.text }]}>Event Title <Text style={s.req}>*</Text></Text>
        </View>
        <TextInput style={[s.titleInput, { color: colors.text }]}
          placeholder="e.g. Community Football Tournament"
          placeholderTextColor={colors.textMuted}
          value={values.title} onChangeText={t => onChange({ title: t.slice(0, 80) })} maxLength={80} />
        <Text style={[s.charCount, { color: colors.textMuted }]}>{values.title.length}/80</Text>
      </View>

      {/* Description */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ionicons name="document-text-outline" size={15} color={colors.tint} />
          <Text style={[s.fieldLabel, { color: colors.text }]}>Event Description <Text style={s.req}>*</Text></Text>
        </View>
        <TextInput style={[s.descInput, { color: colors.text }]}
          placeholder="Tell people about your event..."
          placeholderTextColor={colors.textMuted}
          value={values.text} onChangeText={t => onChange({ text: t.slice(0, 1000) })}
          multiline textAlignVertical="top" maxLength={1000} />
        <Text style={[s.charCount, { color: colors.textMuted }]}>{values.text.length}/1000</Text>
      </View>

      {/* Date + Time */}
      <View style={s.row}>
        <View style={[s.card, s.half, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="calendar-outline" size={14} color={colors.tint} />
            <Text style={[s.fieldLabel, { color: colors.text }]}>Date <Text style={s.req}>*</Text></Text>
          </View>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={values.eventDate} mode="date" display="compact"
              onChange={(_, d) => d && onChange({ eventDate: d })}
              themeVariant={isDarkMode ? 'dark' : 'light'} accentColor={colors.tint} />
          ) : (
            <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.borderLight }]} onPress={() => setShowDate(true)}>
              <Text style={[s.pickerTxt, { color: values.eventDate ? colors.text : colors.textMuted }]}>{dateLabel}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={[s.card, s.half, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="time-outline" size={14} color={colors.tint} />
            <Text style={[s.fieldLabel, { color: colors.text }]}>Time <Text style={s.req}>*</Text></Text>
          </View>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={values.eventDate} mode="time" display="compact"
              onChange={(_, d) => d && onChange({ eventDate: d })}
              themeVariant={isDarkMode ? 'dark' : 'light'} accentColor={colors.tint} />
          ) : (
            <TouchableOpacity style={[s.pickerBtn, { borderColor: colors.borderLight }]} onPress={() => setShowTime(true)}>
              <Text style={[s.pickerTxt, { color: colors.text }]}>{timeLabel}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {Platform.OS === 'android' && showDate && (
        <DateTimePicker value={values.eventDate} mode="date" display="default"
          onChange={(_, d) => { setShowDate(false); if (d) { const nd = new Date(values.eventDate); nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); onChange({ eventDate: nd }); }}} />
      )}
      {Platform.OS === 'android' && showTime && (
        <DateTimePicker value={values.eventDate} mode="time" display="default"
          onChange={(_, d) => { setShowTime(false); if (d) { const nd = new Date(values.eventDate); nd.setHours(d.getHours(), d.getMinutes()); onChange({ eventDate: nd }); }}} />
      )}

      {/* Location */}
      <View style={[s.settingsCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <TouchableOpacity style={s.settingsRow} onPress={() => setShowLocation(o => !o)}>
          <View style={[s.settingsIcon, { backgroundColor: colors.tint + '15' }]}>
            <Ionicons name="location-outline" size={18} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.fieldLabel, { color: colors.text }]}>Location <Text style={s.req}>*</Text></Text>
            <Text style={[s.hint, { color: colors.textMuted }]} numberOfLines={1}>{locationLabel}</Text>
          </View>
          <Ionicons name={showLocation ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.textMuted} />
        </TouchableOpacity>
        {showLocation && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 12, zIndex: 20 }}>
            <GooglePlacesAutocomplete
              placeholder="Search venue or address"
              fetchDetails onPress={(data, details) => {
                if (details?.geometry?.location) {
                  onChange({ locationData: { address: data.description, lat: details.geometry.location.lat, lng: details.geometry.location.lng } });
                  setShowLocation(false);
                }
              }}
              query={{ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, language: 'en' }}
              styles={{
                textInput: [s.googleInput, { color: colors.text, backgroundColor: colors.inputBackground || colors.background }],
                row: { backgroundColor: colors.background },
                description: { color: colors.text },
                listView: { backgroundColor: colors.background, zIndex: 100 },
              }}
              textInputProps={{ placeholderTextColor: colors.textMuted }}
            />
          </View>
        )}
      </View>

      {/* Category */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Ionicons name="grid-outline" size={15} color={colors.tint} />
          <Text style={[s.fieldLabel, { color: colors.text }]}>Category <Text style={s.req}>*</Text></Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {EVENT_CATEGORIES.map(cat => {
            const active = values.eventCategory === cat;
            return (
              <TouchableOpacity key={cat} onPress={() => onChange({ eventCategory: cat })}
                style={[s.chip, { backgroundColor: active ? colors.tint : colors.card, borderColor: active ? colors.tint : colors.borderLight }]}>
                <Text style={[s.chipTxt, { color: active ? '#0B0D0B' : colors.textSecondary }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Ticketed toggle */}
      <View style={[s.settingsCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={[s.settingsRow, { paddingVertical: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.fieldLabel, { color: colors.text }]}>Is this a ticketed event?</Text>
            <Text style={[s.hint, { color: colors.textMuted }]}>Charge for entry and manage tickets</Text>
          </View>
          <Switch value={values.isTicketed}
            onValueChange={v => {
              if (!v) onChange({ isTicketed: false, ticketTiers: [{ id: '1', name: 'Free Admission', price: '0', capacity: '' }] });
              else onChange({ isTicketed: true, ticketTiers: [{ id: '1', name: 'General Admission', price: '', capacity: '' }] });
            }}
            trackColor={{ false: colors.borderLight, true: colors.tint }}
            thumbColor="#fff" />
        </View>
      </View>

      {/* Tickets */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="ticket-outline" size={15} color={colors.tint} />
            <Text style={[s.fieldLabel, { color: colors.text }]}>Ticket Settings</Text>
          </View>
          {values.isTicketed && (
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={addTier}>
              <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
              <Text style={[s.hint, { color: colors.tint, fontWeight: '700' }]}>Add Tickets</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[s.hint, { color: colors.textMuted, marginBottom: 12 }]}>Add tickets, pricing and availability</Text>
        {values.ticketTiers.map((tier, i) => (
          <TicketCard key={tier.id} tier={tier} idx={i}
            onChange={(t: TicketTierInput) => updateTier(i, t)}
            onRemove={() => removeTier(i)} colors={colors} />
        ))}
        {!values.isTicketed && (
          <Text style={[s.hint, { color: colors.textMuted }]}>Free entry — no ticketing required</Text>
        )}
        {values.isTicketed && (
          <Text style={[s.hint, { color: colors.textMuted, marginTop: 4 }]}>Paid tickets require a linked bank account in Payout Settings.</Text>
        )}
      </View>

      {/* Publish */}
      <Animated.View style={{ transform: [{ scale: pressScale }], marginBottom: 32 }}>
        <TouchableOpacity
          disabled={!canPublish || isSubmitting} onPress={onSubmit}
          onPressIn={() => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()}
          onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50 }).start()}
          activeOpacity={1}
          style={[s.publishBtn, { backgroundColor: canPublish ? colors.tint : colors.tint + '50', shadowColor: colors.tint }]}>
          <Ionicons name="calendar-outline" size={18} color="#0B0D0B" style={{ marginRight: 10 }} />
          <Text style={s.publishTxt}>{isSubmitting ? 'Creating Event…' : 'Create Event'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  settingsCard: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  settingsIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  hostName: { fontSize: 16, fontWeight: '800' },
  hostSub: { fontSize: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  pillTxt: { fontSize: 11, fontWeight: '800' },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12 },
  req: { color: '#ef4444', fontWeight: '700' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },
  coverEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, height: 160, justifyContent: 'center', alignItems: 'center', gap: 8, marginVertical: 10 },
  coverEmptyLabel: { fontSize: 15, fontWeight: '700' },
  coverPreview: { height: 180, borderRadius: 14, overflow: 'hidden', marginVertical: 10, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  coverRemove: { position: 'absolute', top: 8, right: 8 },
  mediaRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4, gap: 4 },
  mediaBtn: { flex: 1, alignItems: 'center', gap: 4 },
  mediaBtnTxt: { fontSize: 10, fontWeight: '600' },
  titleInput: { fontSize: 17, fontWeight: '500', paddingVertical: Platform.OS === 'ios' ? 2 : 0 },
  descInput: { fontSize: 15, minHeight: 100, lineHeight: 22 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, padding: 10 },
  pickerTxt: { fontSize: 13, flex: 1 },
  googleInput: { fontSize: 14, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontSize: 13, fontWeight: '600' },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 32, paddingVertical: 18,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  publishTxt: { color: '#0B0D0B', fontSize: 17, fontWeight: '900' },
});

const tk = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  name: { flex: 1, fontSize: 14, fontWeight: '700' },
  price: { fontSize: 13, fontWeight: '800' },
  body: { paddingHorizontal: 12, paddingBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
  removeTxt: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
