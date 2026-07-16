/**
 * ForSaleForm.tsx
 * Premium presentation layer for the "Sell an Item" flow.
 * All business logic (upload, submit, validation) remains in create.tsx.
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Animated, Dimensions, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48 - 24) / 3; // 3-up with margins

// ── Sub-categories ────────────────────────────────────────────────────────────
export const MARKETPLACE_CATEGORIES = [
  'Electronics', 'Fashion', 'Vehicles', 'Furniture',
  'Books', 'Sports', 'Food', 'Services', 'Real Estate', 'Other',
];

// ── Conditions ────────────────────────────────────────────────────────────────
export const ITEM_CONDITIONS = ['New', 'Like New', 'Good', 'Used', 'Refurbished'];

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PostImage {
  uri: string;
  width: number;
  height: number;
  type?: 'image' | 'video';
  thumbnailUri?: string;
}

export interface ForSaleFormValues {
  title: string;
  text: string;
  price: string;
  subCategory: string;
  condition: string;
  negotiable: boolean;
  images: PostImage[];
}

interface ForSaleFormProps {
  values: ForSaleFormValues;
  onChange: (patch: Partial<ForSaleFormValues>) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  profile?: { name?: string; avatar_url?: string; location?: { ward?: string; lga?: string; state?: string } } | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

// ── Animated segmented control ────────────────────────────────────────────────
function PriceTypeSelector({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useAppTheme();
  const slide = useRef(new Animated.Value(value ? 1 : 0)).current;

  const select = (negotiable: boolean) => {
    Animated.spring(slide, { toValue: negotiable ? 1 : 0, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
    onChange(negotiable);
  };

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, (width - 64) / 2] });

  return (
    <View style={[pt.wrap, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}>
      <Animated.View style={[pt.indicator, { backgroundColor: colors.tint, transform: [{ translateX }] }]} />
      <TouchableOpacity style={pt.btn} onPress={() => select(false)}>
        <Text style={[pt.label, { color: !value ? '#0B0D0B' : colors.textMuted }]}>Fixed Price</Text>
      </TouchableOpacity>
      <TouchableOpacity style={pt.btn} onPress={() => select(true)}>
        <Text style={[pt.label, { color: value ? '#0B0D0B' : colors.textMuted }]}>Negotiable</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Dropdown helper ────────────────────────────────────────────────────────────
function Dropdown({
  label, value, placeholder, options, onSelect, icon,
}: {
  label: string; value: string; placeholder: string;
  options: string[]; onSelect: (v: string) => void; icon: string;
}) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    if (open) {
      Animated.timing(heightAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setOpen(false));
    } else {
      setOpen(true);
      Animated.timing(heightAnim, { toValue: Math.min(options.length * 44, 220), duration: 220, useNativeDriver: false }).start();
    }
  };

  return (
    <View style={{ zIndex: open ? 20 : 1 }}>
      <View style={[dd.row, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={dd.labelRow}>
          <Ionicons name={icon as any} size={16} color={colors.tint} />
          <Text style={[dd.label, { color: colors.text }]}>{label}</Text>
        </View>
        <TouchableOpacity style={dd.valueRow} onPress={toggle}>
          <Text style={[dd.value, { color: value ? colors.text : colors.textMuted }]}>
            {value || placeholder}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {open && (
        <Animated.View style={[dd.menu, { backgroundColor: colors.card, borderColor: colors.borderLight, maxHeight: heightAnim }]}>
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {options.map(opt => (
              <TouchableOpacity key={opt} style={[dd.item, { borderBottomColor: colors.borderLight }]}
                onPress={() => { onSelect(opt); toggle(); }}>
                <Text style={[dd.itemTxt, { color: opt === value ? colors.tint : colors.text, fontWeight: opt === value ? '700' : '400' }]}>
                  {opt}
                </Text>
                {opt === value && <Ionicons name="checkmark" size={16} color={colors.tint} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

// ── Photo gallery ─────────────────────────────────────────────────────────────
function PhotoGallery({ images, onAdd, onRemove, colors }: {
  images: PostImage[]; onAdd: () => void; onRemove: (i: number) => void; colors: any;
}) {
  const [activeDot, setActiveDot] = useState(0);

  return (
    <View style={pg.wrap}>
      <View style={pg.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="camera-outline" size={16} color={colors.tint} />
          <Text style={[pg.title, { color: colors.text }]}>Add Photos</Text>
          <Text style={[pg.req, { color: '#ef4444' }]}> *</Text>
        </View>
        <Text style={[pg.hint, { color: colors.textMuted }]}>Add up to 10 photos</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={pg.scroll}
        onMomentumScrollEnd={e => setActiveDot(Math.round(e.nativeEvent.contentOffset.x / (PHOTO_SIZE + 10)))}>

        {/* Add photo slot */}
        <TouchableOpacity onPress={onAdd} style={[pg.addSlot, { borderColor: colors.tint, backgroundColor: colors.card }]}>
          <Ionicons name="camera-outline" size={28} color={colors.tint} />
          <Text style={[pg.addLabel, { color: colors.tint }]}>Add Photo</Text>
        </TouchableOpacity>

        {/* Uploaded images */}
        {images.map((img, i) => (
          <View key={i} style={pg.imgWrap}>
            <Image source={{ uri: img.thumbnailUri || img.uri }} style={pg.img} contentFit="cover" transition={200} />
            {img.type === 'video' && (
              <View style={pg.videoIcon}><Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.9)" /></View>
            )}
            <TouchableOpacity style={[pg.removeBtn, { backgroundColor: colors.background }]}
              onPress={() => onRemove(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close" size={12} color={colors.text} />
            </TouchableOpacity>
            {i === 0 && (
              <View style={pg.coverBadge}><Text style={pg.coverBadgeTxt}>Cover</Text></View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      {images.length > 0 && (
        <View style={pg.dots}>
          {[...Array(Math.min(images.length + 1, 6))].map((_, i) => (
            <View key={i} style={[pg.dot, { backgroundColor: i === activeDot ? colors.tint : colors.borderLight }]} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main ForSaleForm ──────────────────────────────────────────────────────────
export function ForSaleForm({ values, onChange, onAddPhoto, onRemovePhoto, profile, isSubmitting, onSubmit }: ForSaleFormProps) {
  const { colors } = useAppTheme();

  const locationLabel = profile?.location
    ? [profile.location.ward, profile.location.lga, profile.location.state].filter(Boolean).join(', ')
    : 'No location set';

  const canSubmit = values.title.trim().length > 0
    && values.price.trim().length > 0
    && values.images.length > 0
    && !isSubmitting;

  const pressScale = useRef(new Animated.Value(1)).current;
  const onBtnIn = () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onBtnOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <>
      {/* ── Seller card ── */}
      <View style={[s.sellerCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        {profile?.avatar_url
          ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} contentFit="cover" />
          : <View style={[s.avatar, s.avatarFallback, { backgroundColor: colors.tint }]}>
              <Text style={s.avatarLetter}>{(profile?.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
        }
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.sellerName, { color: colors.text }]}>{profile?.name || 'You'}</Text>
            <View style={[s.forSalePill, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '60' }]}>
              <Ionicons name="pricetag-outline" size={10} color={colors.tint} />
              <Text style={[s.forSaleLabel, { color: colors.tint }]}>For Sale</Text>
              <Ionicons name="chevron-down" size={10} color={colors.tint} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Text style={[s.sellerLocation, { color: colors.textMuted }]}>{locationLabel}</Text>
            <Text style={[s.sellerLocation, { color: colors.textMuted }]}>·</Text>
            <Ionicons name="globe-outline" size={12} color={colors.tint} />
            <Text style={[s.sellerLocation, { color: colors.tint }]}>Public</Text>
          </View>
        </View>
      </View>

      {/* ── Photo gallery ── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <PhotoGallery images={values.images} onAdd={onAddPhoto} onRemove={onRemovePhoto} colors={colors} />
      </View>

      {/* ── Title ── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={s.fieldHeader}>
          <Ionicons name="diamond-outline" size={15} color={colors.tint} />
          <Text style={[s.fieldLabel, { color: colors.text }]}>Title</Text>
          <Text style={s.required}> *</Text>
        </View>
        <TextInput
          style={[s.titleInput, { color: colors.text }]}
          placeholder="e.g. iPhone 15 Pro 256GB"
          placeholderTextColor={colors.textMuted}
          value={values.title}
          onChangeText={t => onChange({ title: t.slice(0, 80) })}
          returnKeyType="next"
          maxLength={80}
        />
        <Text style={[s.charCount, { color: colors.textMuted }]}>{values.title.length}/80</Text>
      </View>

      {/* ── Price + Category side by side ── */}
      <View style={s.row}>
        <View style={[s.card, s.half, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={s.fieldHeader}>
            <Ionicons name="add-circle-outline" size={15} color={colors.tint} />
            <Text style={[s.fieldLabel, { color: colors.text }]}>Price</Text>
            <Text style={s.required}> *</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.currency, { color: colors.textMuted }]}>₦</Text>
            <TextInput
              style={[s.priceInput, { color: colors.text }]}
              placeholder="250,000"
              placeholderTextColor={colors.textMuted}
              value={values.price}
              onChangeText={t => onChange({ price: t.replace(/[^0-9.]/g, '') })}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={[s.card, s.half, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={s.fieldHeader}>
            <Ionicons name="grid-outline" size={15} color={colors.tint} />
            <Text style={[s.fieldLabel, { color: colors.text }]}>Category</Text>
            <Text style={s.required}> *</Text>
          </View>
          <Dropdown
            label="" value={values.subCategory} placeholder="Select category"
            options={MARKETPLACE_CATEGORIES} icon="grid-outline"
            onSelect={v => onChange({ subCategory: v })}
          />
        </View>
      </View>

      {/* ── Description ── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={s.fieldHeader}>
          <Ionicons name="document-text-outline" size={15} color={colors.tint} />
          <Text style={[s.fieldLabel, { color: colors.text }]}>Description</Text>
          <Text style={s.required}> *</Text>
        </View>
        <TextInput
          style={[s.descInput, { color: colors.text }]}
          placeholder={"Describe your item, its condition, features and anything buyers should know..."}
          placeholderTextColor={colors.textMuted}
          value={values.text}
          onChangeText={t => onChange({ text: t.slice(0, 1000) })}
          multiline textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={[s.charCount, { color: colors.textMuted }]}>{values.text.length}/1000</Text>
      </View>

      {/* ── Location (settings row style) ── */}
      <View style={[s.settingsCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={s.settingsRow}>
          <View style={[s.settingsIcon, { backgroundColor: 'rgba(130,219,126,0.12)' }]}>
            <Ionicons name="location-outline" size={18} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.settingsLabel, { color: colors.text }]}>Location <Text style={s.required}>*</Text></Text>
            <Text style={[s.settingsValue, { color: colors.textMuted }]} numberOfLines={1}>{locationLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>

      {/* ── Condition ── */}
      <View style={[s.settingsCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Dropdown
          label="Condition" value={values.condition} placeholder="Select condition"
          options={ITEM_CONDITIONS} icon="shield-checkmark-outline"
          onSelect={v => onChange({ condition: v })}
        />
      </View>

      {/* ── Price type ── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={s.fieldHeader}>
          <Ionicons name="pricetag-outline" size={15} color={colors.tint} />
          <Text style={[s.fieldLabel, { color: colors.text }]}>Set Price Type</Text>
        </View>
        <Text style={[s.fieldHint, { color: colors.textMuted }]}>Choose how you want to sell this item</Text>
        <View style={{ marginTop: 12 }}>
          <PriceTypeSelector value={values.negotiable} onChange={v => onChange({ negotiable: v })} />
        </View>
      </View>

      {/* ── Submit ── */}
      <Animated.View style={{ transform: [{ scale: pressScale }], marginTop: 8, marginBottom: 32 }}>
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: canSubmit ? colors.tint : colors.tint + '55', shadowColor: colors.tint }]}
          disabled={!canSubmit}
          onPress={onSubmit}
          onPressIn={onBtnIn}
          onPressOut={onBtnOut}
          activeOpacity={1}
        >
          {isSubmitting
            ? <Ionicons name="sync-outline" size={20} color="#0B0D0B" style={{ marginRight: 8 }} />
            : <Ionicons name="pricetag-outline" size={18} color="#0B0D0B" style={{ marginRight: 10 }} />
          }
          <Text style={s.submitLabel}>
            {isSubmitting ? 'Listing…' : 'List Item for Sale'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  settingsCard: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingsIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  settingsLabel: { fontSize: 14, fontWeight: '700' },
  settingsValue: { fontSize: 12, marginTop: 1 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sellerName: { fontSize: 16, fontWeight: '800' },
  forSalePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  forSaleLabel: { fontSize: 11, fontWeight: '800' },
  sellerLocation: { fontSize: 12 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  fieldHint: { fontSize: 12, marginTop: -4 },
  required: { color: '#ef4444', fontWeight: '700' },
  titleInput: { fontSize: 17, fontWeight: '500', paddingVertical: Platform.OS === 'ios' ? 4 : 0 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  half: { flex: 1, marginBottom: 12 },
  currency: { fontSize: 20, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 20, fontWeight: '700', paddingVertical: Platform.OS === 'ios' ? 4 : 0 },
  descInput: { fontSize: 15, minHeight: 110, lineHeight: 22, paddingVertical: 0 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 32, paddingVertical: 18,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  submitLabel: { color: '#0B0D0B', fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
});

// Price type segment styles
const pt = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 28, borderWidth: 1, overflow: 'hidden', position: 'relative', height: 44 },
  indicator: { position: 'absolute', top: 0, bottom: 0, width: '50%', borderRadius: 28 },
  btn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
});

// Photo gallery styles
const pg = StyleSheet.create({
  wrap: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '700' },
  req: { fontWeight: '700' },
  hint: { fontSize: 12 },
  scroll: { gap: 10, paddingVertical: 4 },
  addSlot: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 14, borderWidth: 1.5,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  addLabel: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  imgWrap: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  img: { width: '100%', height: '100%' },
  videoIcon: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  coverBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  coverBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});

// Dropdown styles
const dd = StyleSheet.create({
  row: { borderRadius: 12, borderWidth: 1, padding: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 14 },
  menu: {
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
    marginTop: 4, zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
  },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  itemTxt: { fontSize: 14 },
});
