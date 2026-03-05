import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { getProviderShop } from '../../lib/providerAuth';
import Toast from 'react-native-toast-message';

const ShopQRCodeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (route.params?.shopId) {
        setShop({ id: route.params.shopId, name: route.params.shopName || 'Your Business' });
        setLoading(false);
        return;
      }
      const result = await getProviderShop();
      if (result.success) setShop(result.shop);
      setLoading(false);
    };
    init();
  }, []);

  const qrValue = shop ? `https://happyinline.com/join/${shop.id}` : '';

  const copyStoreId = async () => {
    if (shop?.id) {
      await Clipboard.setStringAsync(shop.id);
      Toast.show({ type: 'success', text1: 'Copied!', text2: 'Store ID copied to clipboard' });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${shop?.name} on Happy InLine! Use Store ID: ${shop?.id} or visit: https://happyinline.com/join/${shop?.id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code & Store ID</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={styles.shopName}>{shop?.name}</Text>
          <View style={styles.qrBox}>
            {shop?.id && <QRCode value={qrValue} size={200} backgroundColor="#FFF" />}
          </View>
          <Text style={styles.scanText}>Scan to join on Happy InLine</Text>
        </View>

        {/* Store ID */}
        <View style={styles.storeIdContainer}>
          <Text style={styles.storeIdLabel}>Store ID</Text>
          <TouchableOpacity style={styles.storeIdBox} onPress={copyStoreId}>
            <Text style={styles.storeIdText} numberOfLines={1}>{shop?.id}</Text>
            <Ionicons name="copy-outline" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <Text style={styles.storeIdHint}>Customers can enter this ID to find your business</Text>
        </View>

        {/* Share */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#FFF" />
          <Text style={styles.shareButtonText}>Share with Customers</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  content: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  qrContainer: { alignItems: 'center', marginTop: 20 },
  shopName: { fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 20 },
  qrBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  scanText: { fontSize: 14, color: '#666', marginTop: 16 },
  storeIdContainer: { width: '100%', marginTop: 32 },
  storeIdLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  storeIdBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  storeIdText: { fontSize: 14, color: '#000', flex: 1, marginRight: 12, fontFamily: 'monospace' },
  storeIdHint: { fontSize: 12, color: '#999', marginTop: 8 },
  shareButton: {
    backgroundColor: '#4A90E2', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32,
  },
  shareButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
});

export default ShopQRCodeScreen;
