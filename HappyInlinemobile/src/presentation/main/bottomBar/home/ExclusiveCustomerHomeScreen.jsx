import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../../lib/supabase';
import { getShopDetails } from '../../../../lib/shopAuth';
import { getCurrentUser, signOut } from '../../../../lib/auth';
import { getOrCreateConversation } from '../../../../lib/messaging';

const ExclusiveCustomerHomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { profile } = await getCurrentUser();

      if (!profile?.exclusive_shop_id) {
        Alert.alert('Error', 'No shop assigned to your account');
        return;
      }

      // Save user profile for header
      setUserProfile(profile);

      // Load shop details
      const { success, shop: shopData, error } = await getShopDetails(profile.exclusive_shop_id);

      if (success && shopData) {
        setShop(shopData);
        await loadShopServices(shopData.id);
        await loadUpcomingBookings(profile.id, shopData.id);
      } else {
        Alert.alert('Error', 'Could not load shop details');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadShopServices = async (shopId) => {
    try {
      const { data, error } = await supabase
        .from('shop_services')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setServices(data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadUpcomingBookings = async (customerId, shopId) => {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          shop_services (name, price, duration)
        `)
        .eq('customer_id', customerId)
        .eq('shop_id', shopId)
        .gte('appointment_datetime', now)
        .in('status', ['confirmed', 'pending'])
        .order('appointment_datetime', { ascending: true })
        .limit(5);

      if (!error && data) {
        setUpcomingBookings(data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBookService = (service) => {
    // Navigate to provider selection screen first
    navigation.navigate('ProviderSelectionScreen', {
      shopId: shop.id,
      shopName: shop.name,
      selectedServices: [service],
    });
  };

  const handleMessageShop = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser?.id) {
        Alert.alert('Please log in', 'You need to be logged in to message this shop');
        return;
      }

      console.log('🔍 Looking for shop owner/admin/manager for shopId:', shop.id);

      // Get shop owner/admin/manager ID from shop staff (include 'owner' role)
      const { data: ownerData, error: queryError } = await supabase
        .from('shop_staff')
        .select('user_id, role')
        .eq('shop_id', shop.id)
        .in('role', ['owner', 'admin'])
        .eq('is_active', true)
        .order('role', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (queryError) {
        console.error('❌ Query error:', queryError);
        Alert.alert('Error', 'Database error: ' + queryError.message);
        return;
      }

      // If no staff found, fall back to shop.created_by
      let recipientId = ownerData?.user_id;

      if (!recipientId && shop.created_by) {
        console.log('📌 No staff found, using shop.created_by:', shop.created_by);
        recipientId = shop.created_by;
      }

      if (!recipientId) {
        console.error('❌ No owner/admin/manager found for shop:', shop.id);
        Alert.alert('Error', 'Could not find shop owner or manager');
        return;
      }

      console.log('✅ Found recipient:', recipientId, ownerData?.role || 'created_by');

      // Create or get existing conversation
      const result = await getOrCreateConversation(currentUser.id, recipientId, shop.id);

      if (result.success && result.conversationId) {
        console.log('✅ Conversation created/found:', result.conversationId);
        // Navigate to chat conversation screen
        navigation.navigate('ChatConversationScreen', {
          conversationId: result.conversationId,
          recipientName: shop.name,
          recipientId: recipientId,
        });
      } else {
        console.error('❌ Failed to create conversation:', result.error);
        Alert.alert('Error', result.error || 'Could not create conversation');
      }
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      Alert.alert('Error', 'Could not start conversation: ' + error.message);
    }
  };

  const handleViewAllServices = () => {
    navigation.navigate('ShopDetailsScreen', {
      shopId: shop.id,
    });
  };

  const handleViewBooking = (booking) => {
    navigation.navigate('BookingDetailsScreen', {
      bookingId: booking.id,
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { success } = await signOut();
            if (success) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'SplashScreen' }],
              });
            }
          },
        },
      ]
    );
  };

  const handleProfile = () => {
    navigation.navigate('ProfileScreen');
  };

  const handleViewAllBookings = () => {
    navigation.navigate('MyBookingScreen');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="storefront-outline" size={100} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No Shop Found</Text>
          <Text style={styles.emptySubtitle}>Please contact support</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Shop Header */}
        <View style={styles.shopHeader}>
          {/* Cover Image */}
          {shop.cover_image_url ? (
            <Image
              source={{ uri: shop.cover_image_url }}
              style={styles.shopCover}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shopCover}
            />
          )}

          {/* Shop Logo Overlay */}
          <View style={styles.logoOverlay}>
            {shop.logo_url ? (
              <View style={styles.logoContainer}>
                <Image
                  source={{ uri: shop.logo_url }}
                  style={styles.shopLogo}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.shopLogoPlaceholder}>
                <Ionicons name="storefront" size={40} color="#4A90E2" />
              </View>
            )}
          </View>

          <View style={styles.shopInfo}>
            <View style={styles.shopNameRow}>
              <Text style={styles.shopName}>{shop.name}</Text>
              {shop.is_verified && (
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              )}
            </View>

            {shop.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {shop.rating.toFixed(1)} ({shop.total_reviews || 0} reviews)
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.infoText}>{shop.city || shop.address || 'Location not specified'}</Text>
            </View>

            {shop.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={16} color="#666" />
                <Text style={styles.infoText}>{shop.phone}</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleViewAllServices}>
              <LinearGradient
                colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.quickActionGradient}
              >
                <Ionicons name="calendar" size={20} color="#FFF" />
                <Text style={styles.quickActionText}>Book Now</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton} onPress={handleMessageShop}>
              <View style={styles.quickActionOutline}>
                <Ionicons name="chatbubble" size={20} color="#4A90E2" />
                <Text style={styles.quickActionTextOutline}>Message</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              <TouchableOpacity onPress={handleViewAllBookings}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {upcomingBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                onPress={() => handleViewBooking(booking)}
              >
                <View style={styles.bookingInfo}>
                  <View style={styles.bookingDateContainer}>
                    <Ionicons name="calendar" size={20} color="#4A90E2" />
                    <Text style={styles.bookingDate}>
                      {new Date(booking.appointment_datetime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.bookingService}>{booking.shop_services?.name}</Text>
                  <View style={styles.bookingTimeContainer}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.bookingTime}>
                      {new Date(booking.appointment_datetime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
                <View style={[styles.bookingStatus, booking.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending]}>
                  <Text style={styles.bookingStatusText}>
                    {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Popular Services */}
        {services.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Our Services</Text>
              {services.length > 5 && (
                <TouchableOpacity onPress={handleViewAllServices}>
                  <Text style={styles.sectionLink}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {services.slice(0, 5).map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleBookService(service)}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {service.description && (
                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {service.description}
                    </Text>
                  )}
                  <View style={styles.serviceMeta}>
                    <View style={styles.serviceMetaItem}>
                      <Ionicons name="time-outline" size={14} color="#666" />
                      <Text style={styles.serviceMetaText}>{service.duration} min</Text>
                    </View>
                    <View style={styles.serviceMetaItem}>
                      <Ionicons name="cash-outline" size={14} color="#666" />
                      <Text style={styles.serviceMetaText}>${service.price}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => handleBookService(service)}
                >
                  <Text style={styles.bookButtonText}>Book</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 13,
    color: '#666',
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
  },
  shopHeader: {
    backgroundColor: '#FFF',
    marginBottom: 16,
    overflow: 'visible', // Allow logo to overflow
  },
  shopCover: {
    width: '100%',
    height: 200,
  },
  logoOverlay: {
    position: 'absolute',
    top: 160,
    left: 20,
    zIndex: 10,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shopLogo: {
    width: '100%',
    height: '100%',
  },
  shopLogoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  shopInfo: {
    padding: 20,
    paddingTop: 75, // Add space for the larger logo overlay
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 6,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  quickActionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A90E2',
    gap: 8,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
  quickActionTextOutline: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  section: {
    backgroundColor: '#FFF',
    marginBottom: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  bookingService: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  bookingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  bookingStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  bookingStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  serviceMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceMetaText: {
    fontSize: 13,
    color: '#666',
  },
  bookButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default ExclusiveCustomerHomeScreen;
