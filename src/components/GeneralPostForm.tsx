import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const IMG_W = (width - 32 - 24) / 3;

export interface GeneralPostImage {
  uri: string; width: number; height: number;
  type?: 'image' | 'video'; thumbnailUri?: string;
}

export interface GeneralPostFormValues {
  text: string;
  title: string;
  images: GeneralPostImage[];
}

interface Props {
  values: GeneralPostFormValues;
  onChange: (p: Partial<GeneralPostFormValues>) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (i: number) => void;
  profile?: any;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCategoryChange: () => void; // open category menu
  showCategoryMenu: boolean;
  categories: string[];
  onSelectCategory: (cat: string) => void;
}

export function GeneralPostForm({
  values, onChange, onAddPhoto, onRemovePhoto,
  profile, isSubmitting, onSubmit,
  onCategoryChange, showCategoryMenu, categories, onSelectCategory,
}: Props) {
  const { colors } = useAppTheme();
  const pressScale = useRef(new Animated.Value(1)).current;
  const [menuScale] = useState(new Animated.Value(showCategoryMenu ? 1 : 0));

  const locLabel = profile?.location
    ? [profile.location.ward, profile.location.lga].filter(Boolean).join(', ')
    : '';

  const canPost = values.text.trim().length > 0 && !isSubmitting;

  const onBtnIn = () => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onBtnOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <>
      {/* ── Profile row ── */}
      <View style={s.profileRow}>
        <View>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} contentFit="cover" />
            : <View style={[s.avatar, { backgroundColor: colors.tint, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{(profile?.name || '?').charAt(0)}</Text>
              </View>
          }
          <View style={[s.cameraBtn, { backgroundColor: colors.tint }]}>
            <Ionicons name="camera" size={8} color="#0B0D0B" />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.name, { color: colors.text }]}>{profile?.name || 'You'}</Text>
            {/* Category pill */}
            <View style={{ position: 'relative', zIndex: 50 }}>
              <TouchableOpacity
                style={[s.pill, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '60' }]}
                onPress={onCategoryChange}>
                <Text style={[s.pillTxt, { color: colors.tint }]}>General</Text>
                <Ionicons name="chevron-down" size={11} color={colors.tint} />
              </TouchableOpacity>
              {showCategoryMenu && (
                <View style={[s.menu, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                  {categories.map(cat => (
                    <TouchableOpacity key={cat} style={s.menuItem} onPress={() => onSelectCategory(cat)}>
                      <Text style={{ color: colors.text, fontSize: 14 }}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {!!locLabel && <Text style={[s.sub, { color: colors.textMuted }]}>{locLabel}</Text>}
            {!!locLabel && <Text style={[s.sub, { color: colors.textMuted }]}>·</Text>}
            <Ionicons name="globe-outline" size={11} color={colors.tint} />
            <Text style={[s.sub, { color: colors.tint }]}>Public</Text>
          </View>
        </View>
      </View>

      {/* ── Composer card ── */}
      <View style={[s.composerCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <TextInput
          style={[s.composerInput, { color: colors.text }]}
          placeholder="What's happening nearby?"
          placeholderTextColor={colors.textMuted}
          value={values.text}
          onChangeText={t => onChange({ text: t.slice(0, 2000) })}
          multiline textAlignVertical="top"
          maxLength={2000}
        />
        <View style={[s.composerFooter, { borderTopColor: colors.borderLight }]}>
          <TouchableOpacity style={[s.pollBtn, { borderColor: colors.tint + '60' }]}>
            <Ionicons name="stats-chart-outline" size={13} color={colors.tint} />
            <Text style={[s.pollTxt, { color: colors.tint }]}>Add poll</Text>
          </TouchableOpacity>
          <Text style={[s.charCount, { color: colors.textMuted }]}>{values.text.length}/2000</Text>
        </View>
      </View>

      {/* ── Media toolbar ── */}
      <View style={[s.toolbarCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        {([
          ['image-outline', 'Photo'],
          ['videocam-outline', 'Video'],
          ['location-outline', 'Location'],
        ] as [string, string][]).map(([icon, label]) => (
          <TouchableOpacity key={label} style={s.toolBtn}
            onPress={label !== 'Location' ? onAddPhoto : undefined}>
            <View style={[s.toolIcon, { borderColor: label === 'Photo' ? colors.tint : colors.borderLight, backgroundColor: label === 'Photo' ? colors.tint + '15' : 'transparent' }]}>
              <Ionicons name={icon as any} size={22} color={label === 'Photo' ? colors.tint : colors.textMuted} />
            </View>
            <Text style={[s.toolLabel, { color: label === 'Photo' ? colors.tint : colors.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Add Location row ── */}
      <TouchableOpacity style={[s.rowCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Ionicons name="location-outline" size={20} color={colors.tint} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.rowTitle, { color: colors.text }]}>Add Location</Text>
          <Text style={[s.rowSub, { color: colors.textMuted }]}>Help others find your post</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ── Image preview ── */}
      {values.images.length > 0 && (
        <View style={s.imgGrid}>
          {values.images.slice(0, 2).map((img, i) => (
            <View key={i} style={s.imgWrap}>
              <Image source={{ uri: img.thumbnailUri || img.uri }} style={s.img} contentFit="cover" transition={200} />
              <TouchableOpacity style={s.imgRemove} onPress={() => onRemovePhoto(i)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {/* "Add more" slot */}
          <TouchableOpacity onPress={onAddPhoto}
            style={[s.addMore, { borderColor: colors.borderLight }]}>
            <Ionicons name="add" size={24} color={colors.textMuted} />
            <Text style={[s.addMoreTxt, { color: colors.textMuted }]}>Add more</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Visibility row ── */}
      <View style={[s.rowCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <View style={[s.visIcon, { borderColor: colors.tint }]}>
          <Ionicons name="globe-outline" size={18} color={colors.tint} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.rowTitle, { color: colors.text }]}>Who can see this?</Text>
          <Text style={[s.rowSub, { color: colors.textMuted }]}>Anyone on Yrdly</Text>
        </View>
        <View style={[s.visPill, { borderColor: colors.tint }]}>
          <Text style={[s.visPillTxt, { color: colors.tint }]}>Public</Text>
          <Ionicons name="chevron-down" size={12} color={colors.tint} />
        </View>
      </View>

      {/* ── Post button ── */}
      <Animated.View style={[{ transform: [{ scale: pressScale }] }, s.submitWrap]}>
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: canPost ? colors.tint : colors.tint + '50', shadowColor: colors.tint }]}
          disabled={!canPost}
          onPress={onSubmit}
          onPressIn={onBtnIn}
          onPressOut={onBtnOut}
          activeOpacity={1}>
          <Ionicons name="send-outline" size={18} color="#0B0D0B" style={{ marginRight: 10 }} />
          <Text style={s.submitTxt}>{isSubmitting ? 'Posting…' : 'Post to Yrdly'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  pillTxt: { fontSize: 12, fontWeight: '800' },
  menu: { position: 'absolute', top: 30, left: 0, width: 140, borderRadius: 12, borderWidth: 1, zIndex: 100, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  menuItem: { paddingVertical: 10, paddingHorizontal: 16 },
  composerCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  composerInput: { fontSize: 18, minHeight: 140, lineHeight: 26, textAlignVertical: 'top' },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10 },
  pollBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pollTxt: { fontSize: 12, fontWeight: '700' },
  charCount: { fontSize: 12 },
  toolbarCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, gap: 8 },
  toolBtn: { flex: 1, alignItems: 'center', gap: 8 },
  toolIcon: { width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  toolLabel: { fontSize: 12, fontWeight: '600' },
  rowCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 1 },
  visIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  visPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  visPillTxt: { fontSize: 13, fontWeight: '700' },
  imgGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  imgWrap: { width: IMG_W, height: IMG_W, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgRemove: { position: 'absolute', top: 4, right: 4 },
  addMore: { width: IMG_W, height: IMG_W, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addMoreTxt: { fontSize: 11, fontWeight: '600' },
  submitWrap: { marginTop: 8, marginBottom: 32 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 32, paddingVertical: 18,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  submitTxt: { color: '#0B0D0B', fontSize: 17, fontWeight: '900' },
});
