import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getShopDetails } from '../../lib/shopAuth';

const QRShopSignup = ({ route, navigation }) => {
  const { shopId } = route.params || {};

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopId) {
      loadShopAndSaveReference();
    } else {
      Alert.alert('Error', 'No shop ID provided');
      navigation.goBack();
    }
  }, [shopId]);

  const loadShopAndSaveReference = async () => {
    try {
      setLoading(true);

      // Save shop ID as business_reference in AsyncStorage
      // This persists across Register AND Login flows
      await AsyncStorage.setItem('business_reference', shopId);
      console.log('✅ Business reference saved:', shopId);

      // Load shop details
      const { success, shop: shopData, error } = await getShopDetails(shopId);

      if (success && shopData) {
        setShop(shopData);
      } else {
        Alert.alert('Error', 'Could not load shop details');
        await AsyncStorage.removeItem('business_reference');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading shop:', error);
      Alert.alert('Error', 'Failed to load shop details');
      await AsyncStorage.removeItem('business_reference');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    // Navigate to exclusive customer registration
    // The registration screen will check AsyncStorage for business_reference
    navigation.navigate('ExclusiveCustomerRegistration', { shopId });
  };

  const handleSignIn = () => {
    // Navigate to exclusive customer login
    // The login screen will check AsyncStorage for business_reference
    navigation.navigate('ExclusiveCustomerLogin', { shopId });
  };

  const handleBack = async () => {
    // Clear business reference if user goes back
    await AsyncStorage.removeItem('business_reference');
    console.log('🗑️ Business reference cleared');
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="storefront-outline" size={100} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Shop Not Found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backIcon}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Shop Hero Section */}
        <View style={styles.heroSection}>
          {/* Cover Image or Gradient */}
          {shop.cover_image_url || shop.logo_url ? (
            <View style={styles.coverImageContainer}>
              <Image
                source={{ uri: shop.cover_image_url || shop.logo_url }}
                style={styles.coverImage}
                resizeMode="cover"
              />
              <View style={styles.coverOverlay} />
            </View>
          ) : (
            <LinearGradient
              colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverGradient}
            />
          )}

          {/* Shop Logo */}
          <View style={styles.logoContainer}>
            {shop.logo_url ? (
              <Image
                source={{ uri: shop.logo_url }}
                style={styles.shopLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront" size={50} color="#4A90E2" />
              </View>
            )}
          </View>
        </View>

        {/* Shop Info */}
        <View style={styles.shopInfo}>
          <View style={styles.shopNameRow}>
            <Text style={styles.shopName}>{shop.name}</Text>
            {shop.is_verified && (
              <Ionicons name="checkmark-circle" size={28} color="#34C759" />
            )}
          </View>

          {shop.business_type && (
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Ionicons name="business" size={14} color="#666" />
                <Text style={styles.badgeText}>{shop.business_type}</Text>
              </View>
            </View>
          )}

          {shop.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.ratingText}>
                {shop.rating.toFixed(1)} ({shop.total_reviews || 0} reviews)
              </Text>
            </View>
          )}

          {shop.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color="#666" />
              <Text style={styles.infoText}>{shop.address}</Text>
            </View>
          )}

          {shop.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={18} color="#666" />
              <Text style={styles.infoText}>{shop.phone}</Text>
            </View>
          )}

          {shop.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.description} numberOfLines={3}>
                {shop.description}
              </Text>
            </View>
          )}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaHeader}>
            <Ionicons name="calendar" size={32} color="#4A90E2" />
            <Text style={styles.ctaTitle}>Start Booking Today</Text>
            <Text style={styles.ctaSubtitle}>
              Create your account to book appointments at {shop.name}
            </Text>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.9}>
            <LinearGradient
              colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Already have an account? Sign In
            </Text>
            <Ionicons name="log-in-outline" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        {/* Trust Signals */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={24} color="#34C759" />
            <Text style={styles.trustText}>Secure & Private</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="time" size={24} color="#007AFF" />
            <Text style={styles.trustText}>Instant Booking</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="notifications" size={24} color="#FF9500" />
            <Text style={styles.trustText}>Real-time Updates</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 24,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backIcon: {
    padding: 8,
  },
  heroSection: {
    position: 'relative',
    marginBottom: 80,
  },
  coverImageContainer: {
    height: 180,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  coverGradient: {
    height: 180,
    width: '100%',
  },
  logoContainer: {
    position: 'absolute',
    bottom: -60,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  shopLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  shopInfo: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shopName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
  },
  ctaSection: {
    backgroundColor: '#FFF',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  ctaHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginRight: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    backgroundColor: '#FFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginRight: 8,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  trustItem: {
    alignItems: 'center',
  },
  trustText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '600',
  },
});

export default QRShopSignup;
