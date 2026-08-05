import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/use-supabase-auth';
import { G, DARK, GLASS_BORDER, SURFACE, LABEL, MUTED, TEXT_PRIMARY } from '../../constants/tokens';

export default function InviteScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const referralCode = (profile as any)?.username || user?.email?.split('@')[0] || user?.id?.substring(0, 8) || 'yrdly';
  const inviteUrl = `https://app.yrdly.ng/invite/${referralCode}`;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        title: 'Join me on YRDLY!',
        message: `Hey! Join our local neighbourhood community on YRDLY to buy, sell, connect and look out for each other: ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Neighbours</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        {/* Banner Illustration Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="people" size={40} color={G} />
        </View>

        <Text style={styles.title}>Stronger Together.</Text>
        <Text style={styles.subtitle}>
          YRDLY works best when your real neighbours join. Invite friends, family, and people on your street to build a safer, closer community.
        </Text>

        {/* Link Box */}
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>{inviteUrl}</Text>
        </View>

        {/* Primary Share Action */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={20} color={DARK} />
          <Text style={styles.shareBtnText}>Share Invite Link</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: TEXT_PRIMARY },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: G + '15',
    borderWidth: 1,
    borderColor: G + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 20,
  },
  linkText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: G,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
  },
  shareBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: DARK,
  },
});
