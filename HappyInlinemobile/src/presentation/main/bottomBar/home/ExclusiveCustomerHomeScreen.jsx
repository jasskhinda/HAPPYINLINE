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

const ExclusiveCustomerHomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [bookingFormat, setBookingFormat] = useState('in_person'); // 'in_person' or 'online'

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
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

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

  const handleToggleService = (service) => {
    // Toggle service selection (like web app behavior)
    const isSelected = selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleBookSelectedServices = () => {
    if (!canContinue) return;

    // Map services with their chosen format
    const servicesWithFormat = selectedServices.map(s => {
      let chosen_format;
      if (s.service_type === 'both') {
        chosen_format = bookingFormat;
      } else if (s.service_type === 'online') {
        chosen_format = 'online';
      } else {
        chosen_format = 'in_person';
      }
      return { ...s, chosen_format };
    });

    // Navigate to provider selection screen with all selected services
    navigation.navigate('ProviderSelectionScreen', {
      shopId: shop.id,
      shopName: shop.name,
      selectedServices: servicesWithFormat,
      bookingFormat: bookingFormat,
    });
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, service) => total + (parseFloat(service.price) || 0), 0);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((total, service) => total + (parseInt(service.duration) || 0), 0);
  };

  // Check if any selected service has service_type 'both' (needs format choice)
  const hasBothTypeServices = selectedServices.some(s => s.service_type === 'both');

  // Check for format conflicts
  const inPersonOnlyServices = selectedServices.filter(s =>
    s.service_type === 'in_person' || !s.service_type
  );
  const onlineOnlyServices = selectedServices.filter(s => s.service_type === 'online');

  // Is there an impossible conflict? (has both in-person-only AND online-only)
  const hasImpossibleConflict = inPersonOnlyServices.length > 0 && onlineOnlyServices.length > 0;

  // Check if selected format conflicts with any selected service
  const hasFormatConflict = (bookingFormat === 'online' && inPersonOnlyServices.length > 0) ||
                            (bookingFormat === 'in_person' && onlineOnlyServices.length > 0);

  // Continue button should be disabled if there's any format conflict
  const canContinue = selectedServices.length > 0 && !hasFormatConflict && !hasImpossibleConflict;

  // Get service type badge info
  const getServiceTypeBadge = (serviceType) => {
    if (serviceType === 'online') {
      return { label: 'Online', color: '#9333EA', bgColor: '#9333EA20' };
    } else if (serviceType === 'both') {
      return { label: 'Choose Format', color: '#3B82F6', bgColor: '#3B82F620' };
    }
    return { label: 'In-Person', color: '#10B981', bgColor: '#10B98120' };
  };

  const handleMessageShop = () => {
    // Navigate to Chat tab which shows the staff list with Provider/ADMIN tags
    // Customer can choose who to message from there
    navigation.navigate('Chat');
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

        {/* Services - Selectable like web app */}
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
            <Text style={styles.selectServicesHint}>Select services for your appointment:</Text>
            {services.map((service) => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              const badge = getServiceTypeBadge(service.service_type);
              // Check if this service conflicts with current format selection
              const hasConflict = isSelected && (
                (bookingFormat === 'online' && (service.service_type === 'in_person' || !service.service_type)) ||
                (bookingFormat === 'in_person' && service.service_type === 'online')
              );
              return (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardSelected,
                    hasConflict && styles.serviceCardConflict,
                  ]}
                  onPress={() => handleToggleService(service)}
                  activeOpacity={0.7}
                >
                  <View style={styles.serviceInfo}>
                    <View style={styles.serviceNameRow}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      {/* Service Type Badge */}
                      <View style={[styles.serviceTypeBadge, { backgroundColor: badge.bgColor }]}>
                        {service.service_type === 'both' ? (
                          <View style={styles.badgeIconRow}>
                            <Ionicons name="location-outline" size={10} color={badge.color} />
                            <Text style={[styles.badgeSlash, { color: badge.color }]}>/</Text>
                            <Ionicons name="videocam-outline" size={10} color={badge.color} />
                          </View>
                        ) : service.service_type === 'online' ? (
                          <Ionicons name="videocam-outline" size={10} color={badge.color} />
                        ) : (
                          <Ionicons name="location-outline" size={10} color={badge.color} />
                        )}
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>
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
                    </View>
                  </View>
                  <View style={styles.serviceRight}>
                    <Text style={styles.servicePrice}>${parseFloat(service.price).toFixed(0)}</Text>
                    <View style={[styles.serviceCheckbox, isSelected && styles.serviceCheckboxSelected]}>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                      ) : (
                        <Ionicons name="add" size={18} color="#CCC" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Book Now Bar - Shows when services are selected */}
      {selectedServices.length > 0 && (
        <View style={styles.floatingBookBar}>
          {/* Format Conflict Warning */}
          {(hasFormatConflict || hasImpossibleConflict) && (
            <View style={styles.conflictWarning}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <Text style={styles.conflictWarningText}>
                {hasImpossibleConflict
                  ? 'Cannot mix in-person only and online only services'
                  : `Some services are ${bookingFormat === 'online' ? 'in-person' : 'online'} only`}
              </Text>
            </View>
          )}

          {/* Top row: Duration, Price, Service count */}
          <View style={styles.floatingBookTopRow}>
            <View style={styles.floatingBookStats}>
              <View style={styles.floatingStatItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.floatingStatText}>{getTotalDuration()} min</Text>
              </View>
              <View style={styles.floatingStatItem}>
                <Ionicons name="cash-outline" size={16} color="#4A90E2" />
                <Text style={styles.floatingStatPrice}>${getTotalPrice().toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.floatingServiceCount}>
              {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
            </Text>
          </View>

          {/* Bottom row: Format toggle buttons (if needed) and Continue button */}
          <View style={styles.floatingBookBottomRow}>
            {/* In-Person / Online Toggle - Only show if any service has 'both' type */}
            {hasBothTypeServices && (
              <View style={styles.formatToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.formatToggleButton,
                    bookingFormat === 'in_person' && styles.formatToggleActive,
                    bookingFormat === 'in_person' && styles.formatToggleInPerson,
                  ]}
                  onPress={() => setBookingFormat('in_person')}
                >
                  <Ionicons
                    name="location"
                    size={16}
                    color={bookingFormat === 'in_person' ? '#FFF' : '#666'}
                  />
                  <Text style={[
                    styles.formatToggleText,
                    bookingFormat === 'in_person' && styles.formatToggleTextActive,
                  ]}>
                    In-Person
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formatToggleButton,
                    bookingFormat === 'online' && styles.formatToggleActive,
                    bookingFormat === 'online' && styles.formatToggleOnline,
                  ]}
                  onPress={() => setBookingFormat('online')}
                >
                  <Ionicons
                    name="videocam"
                    size={16}
                    color={bookingFormat === 'online' ? '#FFF' : '#666'}
                  />
                  <Text style={[
                    styles.formatToggleText,
                    bookingFormat === 'online' && styles.formatToggleTextActive,
                  ]}>
                    Online
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.floatingBookButton,
                !canContinue && styles.floatingBookButtonDisabled,
              ]}
              onPress={handleBookSelectedServices}
              disabled={!canContinue}
            >
              <Text style={styles.floatingBookButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
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
  serviceCardSelected: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  serviceCardConflict: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSlash: {
    fontSize: 10,
    marginHorizontal: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  serviceCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  serviceCheckboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  selectServicesHint: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  floatingBookBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  conflictWarningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  floatingBookTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  floatingBookStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  floatingStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingStatText: {
    fontSize: 14,
    color: '#666',
  },
  floatingStatPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  floatingServiceCount: {
    fontSize: 12,
    color: '#999',
  },
  floatingBookBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  formatToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    flex: 1,
  },
  formatToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  formatToggleActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formatToggleInPerson: {
    backgroundColor: '#10B981',
  },
  formatToggleOnline: {
    backgroundColor: '#9333EA',
  },
  formatToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  formatToggleTextActive: {
    color: '#FFF',
  },
  floatingBookButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  floatingBookButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  floatingBookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default ExclusiveCustomerHomeScreen;
