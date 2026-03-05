import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

const ShopQRCodeModal = ({ visible, onClose, shopId, shopName }) => {
  const qrRef = React.useRef();
  const [shopData, setShopData] = useState(null);

  // Generate QR code value - Deep link URL for the app
  // This URL will open the app directly to the shop signup screen
  const qrCodeValue = `happyinline://signup/shop/${shopId}`;
  const shareText = `📍 Check out ${shopName} on Happy InLine!\n\n📱 Download the app to book your appointment!\n\nShop ID: ${shopId}`;

  useEffect(() => {
    if (visible && shopId) {
      fetchShopData();
    }
  }, [visible, shopId]);

  const fetchShopData = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('name, logo_url, address, city, phone, business_type')
        .eq('id', shopId)
        .single();

      if (!error && data) {
        setShopData(data);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: shareText,
        title: `Book at ${shopName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownloadQR = async () => {
    try {
      if (!qrRef.current) return;

      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Save QR Code',
        });
      } else {
        Alert.alert('Success', 'QR Code saved to camera roll');
      }
    } catch (error) {
      console.error('Error downloading QR:', error);
      Alert.alert('Error', 'Failed to save QR code');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Your Business</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
          {/* Professional QR Code Card */}
          <View style={styles.qrContainer} ref={qrRef} collapsable={false}>
            {/* Header with Logo */}
            <View style={styles.qrHeader}>
              {shopData?.logo_url ? (
                <Image
                  source={{ uri: shopData.logo_url }}
                  style={styles.businessLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="storefront" size={32} color="#FFFFFF" />
                </View>
              )}
              <Text style={styles.businessName}>{shopData?.name || shopName}</Text>
              {shopData?.business_type && (
                <Text style={styles.businessType}>{shopData.business_type}</Text>
              )}
            </View>

            {/* QR Code with gradient border */}
            <View style={styles.qrCodeContainer}>
              <LinearGradient
                colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.qrGradientBorder}
              >
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={qrCodeValue}
                    size={220}
                    backgroundColor="white"
                    color="#000000"
                  />
                </View>
              </LinearGradient>
            </View>

            {/* Scan Me Text */}
            <View style={styles.scanBanner}>
              <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
              <Text style={styles.scanText}>SCAN TO BOOK</Text>
            </View>

            {/* Business Info */}
            {shopData && (
              <View style={styles.businessInfo}>
                {shopData.phone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={14} color="#666" />
                    <Text style={styles.infoText}>{shopData.phone}</Text>
                  </View>
                )}
                {(shopData.address || shopData.city) && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={14} color="#666" />
                    <Text style={styles.infoText}>
                      {shopData.city ? `${shopData.city}` : shopData.address}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Powered by footer */}
            <View style={styles.poweredBy}>
              <Image
                source={require('../../../assets/logowithouttagline.png')}
                style={styles.appLogo}
                resizeMode="contain"
              />
              <Text style={styles.poweredByText}>Powered by Happy InLine</Text>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>How it works:</Text>
            <View style={styles.instructionItem}>
              <Ionicons name="qr-code" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>
                Customers scan this QR code with their phone camera
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="storefront" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>
                They'll see your business details and available services
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="calendar" size={20} color="#4A90E2" />
              <Text style={styles.instructionText}>
                They can book appointments directly from their phone
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadQR}
            >
              <Ionicons name="download-outline" size={20} color="#4A90E2" />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadQR}
            >
              <Ionicons name="print-outline" size={20} color="#4A90E2" />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFF" />
              <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>

          {/* Shop ID for Reference */}
          <View style={styles.linkBox}>
            <Text style={styles.linkLabel}>Shop ID (for customer reference):</Text>
            <View style={styles.shopIdContainer}>
              <Text style={styles.shopIdText} selectable>
                {shopId}
              </Text>
            </View>
            <Text style={styles.shopIdNote}>
              Customers can use this ID to search for your business in the app
            </Text>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  businessLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  qrCodeContainer: {
    marginVertical: 16,
  },
  qrGradientBorder: {
    padding: 4,
    borderRadius: 20,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 16,
    gap: 8,
  },
  scanText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  businessInfo: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  poweredBy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  appLogo: {
    width: 20,
    height: 20,
  },
  poweredByText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  instructionsBox: {
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4A90E2',
    backgroundColor: '#FFF',
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A90E2',
  },
  primaryButtonText: {
    color: '#FFF',
  },
  linkBox: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  linkLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  shopIdContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  shopIdText: {
    fontSize: 16,
    color: '#4A90E2',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  shopIdNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ShopQRCodeModal;
