import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, X, AlertTriangle, Lock } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/use-supabase-auth';
import { Post } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useEffect } from 'react';

const GREEN = '#388E3C';
const FLW_KEY = process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';

export default function CheckoutScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const { user, profile } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);
  const txRef = useRef(`tx-${user?.id}-${Date.now()}`);

  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setPost(data as Post);
    } catch {
      Alert.alert('Error', 'Item not found');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      await supabase.from('transactions').insert({
        user_id: user?.id,
        post_id: post?.id,
        amount: post?.price,
        status: 'completed',
        tx_ref: transactionId || txRef.current,
        type,
      });

      if (type === 'event') {
        await supabase.from('my_tickets').insert({
          user_id: user?.id,
          event_id: post?.id,
          status: 'active',
        });
      } else if (type === 'marketplace') {
        await supabase.from('posts').update({ is_sold: true }).eq('id', post?.id);
      }

      Alert.alert('Payment Successful! 🎉', 'Your order has been confirmed.', [
        { text: 'View Tickets', onPress: () => router.push('/tickets') },
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Success', 'Payment received. Please contact support if your ticket is missing.');
    }
  };

  // Inline Flutterwave HTML page
  const flutterwaveHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://checkout.flutterwave.com/v3.js"></script>
  <style>
    body { font-family: -apple-system, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#F9FBF9; }
    button { background:#388E3C; color:white; border:none; padding:16px 40px; font-size:18px; border-radius:30px; cursor:pointer; font-weight:bold; }
    button:active { opacity:0.8; }
  </style>
</head>
<body>
  <button onclick="pay()">Complete Payment</button>
  <script>
    function pay() {
      FlutterwaveCheckout({
        public_key: "${FLW_KEY}",
        tx_ref: "${txRef.current}",
        amount: ${post?.price || 0},
        currency: "NGN",
        payment_options: "card,ussd,banktransfer",
        customer: {
          email: "${user?.email || 'user@yrdly.com'}",
          name: "${profile?.full_name || user?.user_metadata?.name || 'Yrdly User'}",
        },
        customizations: {
          title: "Yrdly",
          description: "${post?.title || 'Purchase'}",
          logo: "https://yrdly.com/logo.png",
        },
        callback: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        },
        onclose: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'cancelled' }));
        }
      });
    }
    // Auto-open payment on load
    window.onload = function() { setTimeout(pay, 500); };
  </script>
</body>
</html>`;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'successful') {
        setShowWebView(false);
        handlePaymentSuccess(data.transaction_id?.toString() || txRef.current);
      } else if (data.status === 'cancelled') {
        setShowWebView(false);
        Alert.alert('Payment Cancelled', 'Your payment was not completed.');
      } else {
        setShowWebView(false);
        Alert.alert('Payment Failed', 'Please try again.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !post || !user) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  const missingKey = !FLW_KEY || FLW_KEY === 'FLWPUBK_TEST-PLACEHOLDER';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Flutterwave WebView overlay */}
      {showWebView && (
        <View style={StyleSheet.absoluteFillObject}>
          {webViewLoading && (
            <View style={styles.webViewLoader}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={styles.webViewLoaderText}>Loading secure payment...</Text>
            </View>
          )}
          <WebView
            source={{ html: flutterwaveHtml }}
            onMessage={handleWebViewMessage}
            onLoadEnd={() => setWebViewLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1 }} />
          <TouchableOpacity style={styles.cancelWebView} onPress={() => setShowWebView(false)}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.itemTitle} numberOfLines={2}>{post.title || 'Item'}</Text>
            <Text style={styles.itemPrice}>{formatPrice(post.price || 0)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.feeTitle}>Platform Fee</Text>
            <Text style={styles.feePrice}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalTitle}>Total</Text>
            <Text style={styles.totalPrice}>{formatPrice(post.price || 0)}</Text>
          </View>
        </View>

        {missingKey ? (
          <View style={styles.errorBox}>
            <AlertTriangle size={24} color="#E53935" />
            <Text style={styles.errorText}>
              Flutterwave Public Key is missing.{'\n'}Add it to your .env file to enable payments.
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.payBtn} onPress={() => { setShowWebView(true); setWebViewLoading(true); }}>
            <Lock size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.payBtnText}>Pay {formatPrice(post.price || 0)} securely</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.secureNote}>🔒 Payments powered by Flutterwave</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBF9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F2', backgroundColor: '#FFFFFF',
  },
  backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', flex: 1, textAlign: 'center' },
  content: { padding: 20 },
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F2F2F2', marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemTitle: { fontSize: 16, color: '#424242', flex: 1, marginRight: 12 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1C' },
  feeTitle: { fontSize: 14, color: '#9E9E9E', flex: 1 },
  feePrice: { fontSize: 14, color: '#9E9E9E' },
  totalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1C' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: GREEN },
  payBtn: {
    flexDirection: 'row', width: '100%', height: 56, borderRadius: 28,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  secureNote: { textAlign: 'center', marginTop: 16, color: '#9E9E9E', fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFEBEE', padding: 16, borderRadius: 10 },
  errorText: { color: '#E53935', marginLeft: 12, flex: 1, lineHeight: 22 },
  webViewLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  webViewLoaderText: { marginTop: 12, color: '#616161', fontSize: 15 },
  cancelWebView: {
    position: 'absolute', top: 50, right: 16, width: 36, height: 36,
    borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 20,
  },
});
