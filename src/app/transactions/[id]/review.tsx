import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/use-supabase-auth';
import { ReviewService } from '../../../lib/review-service';
import { useAppTheme } from '../../../context/ThemeContext';


interface TxInfo {
  id: string;
  seller_id: string;
  seller: { id: string; name: string; avatar_url: string | null } | null;
  item: { id: string; title: string; images: string[] | null } | null;
}

export default function ReviewScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [tx, setTx] = useState<TxInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('escrow_transactions')
          .select('id, seller_id, seller:users!escrow_transactions_seller_id_fkey(id, name, avatar_url), item:posts(id, title, images)')
          .eq('id', id)
          .single();
        if (error) throw error;
        const normalised = {
          ...data,
          seller: Array.isArray(data.seller) ? data.seller[0] ?? null : data.seller,
          item: Array.isArray(data.item) ? data.item[0] ?? null : data.item,
        } as TxInfo;
        setTx(normalised);

        const { data: biz } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', normalised.seller_id)
          .maybeSingle();

        if (biz) {
          setBusinessId(biz.id);
          const { canReview: eligible } = await ReviewService.canUserReviewBusiness(user.id, biz.id, id);
          setCanReview(eligible);
        }
      } catch {
        Alert.alert('Error', 'Could not load transaction.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const handleSubmit = async () => {
    if (!user || !businessId || !id) return;
    if (rating === 0) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    setSubmitting(true);
    try {
      await ReviewService.submitReview(businessId, user.id, id, rating, comment.trim() || undefined);
      Alert.alert('Thank You!', 'Your review has been submitted.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></SafeAreaView>;

  const thumb = tx?.item?.images?.[0];
  const LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent!'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Leave a Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card }]}
>
          {thumb
            ? <Image source={{ uri: thumb }} style={styles.itemImage} contentFit="cover" />
            : <View style={[styles.itemImage, styles.imgPlaceholder, { backgroundColor: colors.borderLight }]}><Feather name="box" size={28} color={colors.textMuted} /></View>
          }
          <View style={styles.cardInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>{tx?.item?.title || 'Item'}</Text>
            <View style={styles.sellerRow}>
              {tx?.seller?.avatar_url
                ? <Image source={{ uri: tx.seller.avatar_url }} style={styles.avatar} contentFit="cover" />
                : <View style={[styles.avatar, styles.avatarFallback]}><Text style={[styles.avatarInitial, { color: colors.tint }]}>{tx?.seller?.name?.[0]?.toUpperCase() ?? '?'}</Text></View>
              }
              <Text style={[styles.sellerName, { color: colors.textMuted }]}>Sold by {tx?.seller?.name ?? 'Seller'}</Text>
            </View>
          </View>
        </View>

        {!canReview && !loading ? (
          <View style={styles.alreadyBox}>
            <Feather name="check-circle" size={52} color={colors.tint} />
            <Text style={[styles.alreadyTitle, { color: colors.text }]}>Already Reviewed</Text>
            <Text style={[styles.alreadySub, { color: colors.textMuted }]}>You've already submitted a review for this transaction.</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR RATING</Text>
              <View style={styles.starsRow}>
                {[1,2,3,4,5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
                    <Feather name={s <= rating ? 'star' : 'star'} size={44} color={s <= rating ? '#FFC107' : colors.border} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>{LABELS[rating] || 'Tap to rate'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR REVIEW (OPTIONAL)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience with this seller..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={[styles.charCount, { color: colors.textMuted }]}>{comment.length}/500</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.tint }, (rating === 0 || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={rating === 0 || submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitText}>Submit Review</Text>}
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 'bold' },
  scroll: { padding: 16 },
  card: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 20, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  itemImage: { width: 72, height: 72, borderRadius: 10 },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 8 },
  itemTitle: { fontSize: 15, fontWeight: 'bold' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  avatarFallback: { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 11, fontWeight: 'bold' },
  sellerName: { fontSize: 13 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  ratingLabel: { textAlign: 'center', fontSize: 15, fontWeight: '600' },
  textArea: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 110 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#BDBDBD' },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  alreadyBox: { alignItems: 'center', paddingTop: 48, gap: 12 },
  alreadyTitle: { fontSize: 22, fontWeight: 'bold' },
  alreadySub: { fontSize: 15, textAlign: 'center' },
});
