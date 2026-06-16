import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, Vibration, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../../lib/supabase';
import { useAppTheme } from '../../../context/ThemeContext';

const RED = '#B71C1C';

type ScanResult = { success: true; attendee: string } | { success: false; message: string } | null;

export default function ScanTicketScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<ScanResult>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const cooldownRef = useRef(false);

  const showFlash = (success: boolean) => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    Vibration.vibrate(success ? [0, 100] : [0, 200, 100, 200]);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setScanning(false);

    try {
      // Call the web API check-in endpoint
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const webUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;

      const response = await fetch(`${webUrl}/api/events/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ token: data, eventId: id }),
      });

      const json = await response.json();

      if (response.ok && json.success !== false) {
        const attendeeName = json.attendee?.name || json.name || 'Attendee';
        setResult({ success: true, attendee: attendeeName });
        showFlash(true);
      } else {
        const msg = json.error || json.message || 'Invalid or already used ticket.';
        setResult({ success: false, message: msg });
        showFlash(false);
      }
    } catch (e) {
      setResult({ success: false, message: 'Network error. Please check your connection.' });
      showFlash(false);
    }

    // Allow next scan after 2.5 seconds
    setTimeout(() => {
      setResult(null);
      setScanning(true);
      cooldownRef.current = false;
    }, 2500);
  };

  if (!permission) {
    return <SafeAreaView style={styles.center}><Text>Requesting camera permission…</Text></SafeAreaView>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={60} color={colors.textMuted} />
        <Text style={[styles.permText, { color: colors.textSecondary }]}>Camera access is required to scan tickets.</Text>
        <TouchableOpacity style={[styles.permBtn, { backgroundColor: colors.tint }]} onPress={requestPermission}>
          <Text style={[styles.permBtnText, { color: colors.card }]}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const flashBg = result?.success ? colors.tint : RED;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Flash overlay */}
      <Animated.View
        style={[styles.flashOverlay, { backgroundColor: flashBg, opacity: flashAnim }]}
        pointerEvents="none"
      />

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Ticket</Text>
          <View style={{ width: 48 }} />
        </View>
      </SafeAreaView>

      {/* Viewfinder */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.scanHint}>Point camera at the QR code on the attendee's ticket</Text>
      </View>

      {/* Result overlay */}
      {result && (
        <View style={[styles.resultBanner, { backgroundColor: result.success ? colors.inputBackground : '#FFEBEE', shadowColor: colors.text }]}>
          <Ionicons
            name={result.success ? 'checkmark-circle' : 'close-circle'}
            size={36}
            color={result.success ? colors.tint : RED}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultTitle, { color: result.success ? colors.tint : RED }]}>
              {result.success ? '✓ Valid Ticket' : '✗ Invalid Ticket'}
            </Text>
            <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
              {result.success ? result.attendee : result.message}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  permText: { fontSize: 15, textAlign: 'center' },
  permBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  permBtnText: { fontSize: 16, fontWeight: 'bold' },
  flashOverlay: { ...StyleSheet.absoluteFillObject },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  backBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  viewfinderContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  viewfinder: {
    width: 240, height: 240, position: 'relative', marginBottom: 24,
  },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: '#FFFFFF', borderTopLeftRadius: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: '#FFFFFF', borderTopRightRadius: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: '#FFFFFF', borderBottomLeftRadius: 4 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: '#FFFFFF', borderBottomRightRadius: 4 },
  scanHint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' },
  resultBanner: {
    position: 'absolute', bottom: 60, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 18,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  resultTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
  resultSub: { fontSize: 14 },
});
