import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { G, DARK, SURFACE, GLASS_BORDER, LABEL, MUTED } from '../constants/tokens';
import * as Haptics from 'expo-haptics';

const SEVERITY_COLORS = {
  information: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6', icon: '#3b82f6' },
  caution: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', icon: '#f59e0b' },
  urgent: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#ef4444', icon: '#ef4444' }
};

const TYPE_LABELS = { safety: 'SAFETY ALERT', amber: 'AMBER ALERT', info: 'COMMUNITY INFO' };

export default function CreateAlertScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState<'information' | 'caution' | 'urgent'>('caution');
  const [type, setType] = useState<'safety' | 'amber' | 'info'>('safety');
  const [area, setArea] = useState('');
  const [action, setAction] = useState('');
  
  const [published, setPublished] = useState(false);

  const canPreview = title.trim() && desc.trim();

  if (published) {
    return (
      <View style={[styles.successContainer, { backgroundColor: '#050505' }]}>
        <View style={styles.successIcon}>
          <Feather name="check" size={34} color={G} />
        </View>
        <Text style={styles.successTitle}>Alert Published</Text>
        <Text style={styles.successDesc}>The alert is now live on the Home Feed and Alerts screen.</Text>
        <TouchableOpacity 
          style={styles.btnPrimary}
          onPress={() => router.replace('/(tabs)/catalog')} // Or wherever alerts are
        >
          <Text style={styles.btnPrimaryText}>View Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 8 }}>
          <Text style={styles.btnText}>Back to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const c = SEVERITY_COLORS[severity];

  if (step === 'preview') {
    return (
      <View style={[styles.container, { backgroundColor: '#050505', paddingTop: insets.top }]}>
        <View style={styles.previewHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Preview Alert</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setPublished(true);
            }} 
            style={styles.publishBtn}
          >
            <Text style={styles.publishBtnText}>Publish Alert</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>Home Feed Banner</Text>
          <View style={[styles.bannerPreview, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Feather name="alert-triangle" size={18} color={c.icon} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={[styles.bannerType, { color: c.text }]}>{TYPE_LABELS[type]}</Text>
                <Text style={styles.bannerMeta}>· {area || 'Your Area'} · Now</Text>
              </View>
              <Text style={styles.bannerDesc}>{desc || 'Alert description will appear here.'}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Alert Detail Preview</Text>
          <View style={[styles.heroPreview, { backgroundColor: c.bg, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={[styles.heroTypePill, { backgroundColor: `${c.icon}22` }]}>
                <Text style={[styles.heroType, { color: c.text }]}>{TYPE_LABELS[type]}</Text>
              </View>
              <Text style={styles.heroTime}>Now</Text>
            </View>
            <Text style={styles.heroTitle}>{title || 'Alert title'}</Text>
            <Text style={styles.heroArea}>📍 {area || 'Affected area'}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: '#050505', paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Safety Alert</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 24 }}>
          <View>
            <Text style={styles.fieldLabel}>Severity</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                ['information', 'Info', '#64B5F6'], 
                ['caution', 'Caution', '#FFB74D'], 
                ['urgent', 'Urgent', '#EF4444']
              ] as const).map(([key, label, color]) => {
                const isSelected = severity === key;
                return (
                  <TouchableOpacity 
                    key={key}
                    onPress={() => setSeverity(key)}
                    style={[
                      styles.severityBtn, 
                      { 
                        backgroundColor: isSelected ? `${color}15` : SURFACE,
                        borderColor: isSelected ? color : GLASS_BORDER 
                      }
                    ]}
                  >
                    <Text style={[styles.severityBtnText, { color: isSelected ? color : MUTED }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Alert Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                ['safety', 'Safety Alert'], 
                ['amber', 'Amber Alert'], 
                ['info', 'Community Info']
              ] as const).map(([key, label]) => {
                const isSelected = type === key;
                return (
                  <TouchableOpacity 
                    key={key}
                    onPress={() => setType(key)}
                    style={[
                      styles.typeBtn, 
                      { 
                        backgroundColor: isSelected ? SURFACE : 'transparent',
                        borderColor: isSelected ? G : GLASS_BORDER 
                      }
                    ]}
                  >
                    <Text style={[styles.typeBtnText, { color: isSelected ? '#fff' : MUTED }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Alert Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Road closure at Admiralty Way" placeholderTextColor={MUTED} />
          </View>
          
          <View>
            <Text style={styles.fieldLabel}>Affected Area</Text>
            <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="e.g. Lekki Phase 1, Lagos" placeholderTextColor={MUTED} />
          </View>
          
          <View>
            <Text style={styles.fieldLabel}>Recommended Action</Text>
            <TextInput style={styles.input} value={action} onChangeText={setAction} placeholder="e.g. Avoid Admiralty Way, use Chevron Drive" placeholderTextColor={MUTED} />
          </View>

          <View>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={desc} onChangeText={setDesc} placeholder="Factual description of what is happening…" placeholderTextColor={MUTED} multiline textAlignVertical="top" />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
        <TouchableOpacity 
          style={[styles.continueBtn, !canPreview && styles.continueBtnDisabled]}
          disabled={!canPreview}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep('preview');
          }}
        >
          <Text style={[styles.continueBtnText, !canPreview && styles.continueBtnTextDisabled]}>
            Preview Alert
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
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  publishBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ef4444',
  },
  publishBtnText: { fontFamily: 'Outfit-Bold', fontSize: 13, color: '#fff' },

  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: LABEL,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityBtnText: { fontFamily: 'Outfit-Bold', fontSize: 12 },
  
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: { fontFamily: 'Inter-Regular', fontSize: 11 },

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
    gap: 14,
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
  successTitle: { fontFamily: 'Outfit-Bold', fontSize: 22, color: '#fff', textAlign: 'center' },
  successDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: MUTED, textAlign: 'center' },
  btnPrimary: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: G,
  },
  btnPrimaryText: { fontFamily: 'Outfit-Bold', fontSize: 14, color: DARK },
  btnText: { fontFamily: 'Inter-Regular', fontSize: 14, color: LABEL },

  sectionLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: LABEL,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  bannerPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 18,
  },
  bannerType: { fontFamily: 'Outfit-Bold', fontSize: 11 },
  bannerMeta: { fontFamily: 'Inter-Regular', fontSize: 10, color: LABEL },
  bannerDesc: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#fff', lineHeight: 18 },

  heroPreview: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderRadius: 24,
  },
  heroTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroType: { fontFamily: 'Outfit-Bold', fontSize: 11 },
  heroTime: { fontFamily: 'Inter-Regular', fontSize: 11, color: LABEL },
  heroTitle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff', marginBottom: 8 },
  heroArea: { fontFamily: 'Inter-Regular', fontSize: 12, color: LABEL },
});
