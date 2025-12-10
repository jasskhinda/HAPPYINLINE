import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../../lib/supabase';
import { getCurrentUser, signOut } from '../../../../lib/auth';

const ProviderDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    weekCount: 0,
    totalEarnings: 0,
  });

  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      // Get current user
      const { user, profile: userProfile } = await getCurrentUser();
      if (!userProfile) {
        console.error('No profile found');
        setLoading(false);
        return;
      }
      setProfile(userProfile);
      console.log('👤 Provider profile:', userProfile.name, userProfile.id);

      // Get the shop where this provider works (via shop_staff)
      console.log('🔍 Looking for shop_staff with user_id:', userProfile.id);
      const { data: staffData, error: staffError } = await supabase
        .from('shop_staff')
        .select(`
          shop_id,
          role,
          is_active,
          shops:shop_id (
            id, name, logo_url, address, city, phone
          )
        `)
        .eq('user_id', userProfile.id)
        .eq('is_active', true);

      console.log('📋 Shop staff data:', JSON.stringify(staffData, null, 2));
      console.log('❌ Shop staff error:', staffError);

      if (staffError) {
        console.error('Error fetching shop staff:', staffError);
      } else if (staffData && staffData.length > 0) {
        // Find the first shop where user is a barber
        const barberShop = staffData.find(s => s.role === 'barber') || staffData[0];

        if (barberShop?.shops) {
          setShop(barberShop.shops);
          console.log('🏪 Provider shop:', barberShop.shops.name, 'Shop ID:', barberShop.shop_id);

          // Fetch services assigned to this provider via service_providers table
          console.log('🔍 Looking for services with provider_id:', userProfile.id, 'shop_id:', barberShop.shop_id);

          const { data: providerServices, error: servicesError } = await supabase
            .from('service_providers')
            .select('*')
            .eq('provider_id', userProfile.id)
            .eq('shop_id', barberShop.shop_id);

          console.log('📋 Raw service_providers data:', JSON.stringify(providerServices, null, 2));
          console.log('❌ Services error:', servicesError);

          if (servicesError) {
            console.error('Error fetching provider services:', servicesError);
          } else if (providerServices && providerServices.length > 0) {
            // Get the shop_service_ids and fetch the actual services
            const shopServiceIds = providerServices.map(sp => sp.shop_service_id);
            console.log('🔑 Shop service IDs to fetch:', shopServiceIds);

            const { data: shopServices, error: shopServicesError } = await supabase
              .from('shop_services')
              .select('id, name, price, duration, description')
              .in('id', shopServiceIds);

            console.log('📋 Shop services data:', JSON.stringify(shopServices, null, 2));
            console.log('❌ Shop services error:', shopServicesError);

            if (!shopServicesError && shopServices) {
              setServices(shopServices);
              console.log('✅ Provider services loaded:', shopServices.length);
            }
          } else {
            console.log('ℹ️ No service assignments found for this provider');
            setServices([]);
          }

          // Fetch bookings for this provider
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayISO = today.toISOString();

          // Get upcoming bookings (including today)
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id, appointment_date, appointment_time, status, total_amount, customer_notes, services,
              shop:shop_id (id, name),
              customer:customer_id (id, name, email, phone, profile_image)
            `)
            .eq('provider_id', userProfile.id)
            .eq('shop_id', barberShop.shop_id)
            .gte('appointment_date', todayISO.split('T')[0])
            .in('status', ['pending', 'confirmed', 'in_progress'])
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true })
            .limit(20);

          if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
          } else {
            console.log('📅 Provider bookings:', bookingsData?.length || 0);

            // Separate today's bookings from upcoming
            const todayStr = today.toISOString().split('T')[0];
            const todaysList = bookingsData?.filter(b => b.appointment_date === todayStr) || [];
            const upcomingList = bookingsData?.filter(b => b.appointment_date > todayStr) || [];

            setTodayBookings(todaysList);
            setUpcomingBookings(upcomingList);

            // Calculate stats
            const weekFromNow = new Date();
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            const weekBookings = bookingsData?.filter(b => {
              const bookingDate = new Date(b.appointment_date);
              return bookingDate <= weekFromNow;
            }) || [];

            setStats({
              todayCount: todaysList.length,
              weekCount: weekBookings.length,
              totalEarnings: bookingsData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0,
            });
          }
        }
      } else {
        console.log('⚠️ No shop_staff records found for this user');
      }
    } catch (error) {
      console.error('Error in ProviderDashboard fetchData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigation.replace('WelcomeScreen');
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#999';
    }
  };

  const getServiceNames = (services) => {
    if (!services) return 'Service';
    try {
      const parsed = typeof services === 'string' ? JSON.parse(services) : services;
      if (Array.isArray(parsed)) {
        return parsed.map(s => s.name || s).join(', ');
      }
      return 'Service';
    } catch {
      return 'Service';
    }
  };

  const renderBookingCard = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate('BookingDetailScreen', { bookingId: item.id })}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingTimeContainer}>
          <Ionicons name="time-outline" size={16} color="#4A90E2" />
          <Text style={styles.bookingTime}>{formatTime(item.appointment_time)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingCustomer}>
        {item.customer?.profile_image ? (
          <Image source={{ uri: item.customer.profile_image }} style={styles.customerAvatar} />
        ) : (
          <View style={[styles.customerAvatar, styles.customerAvatarPlaceholder]}>
            <Text style={styles.customerAvatarText}>
              {item.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
            </Text>
          </View>
        )}
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.customer?.name || 'Customer'}</Text>
          <Text style={styles.serviceName}>{getServiceNames(item.services)}</Text>
        </View>
        <Text style={styles.bookingPrice}>${item.total_amount?.toFixed(2) || '0.00'}</Text>
      </View>

      {item.customer_notes && (
        <View style={styles.notesContainer}>
          <Ionicons name="document-text-outline" size={14} color="#666" />
          <Text style={styles.notesText} numberOfLines={2}>{item.customer_notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Dashboard Content
  const renderDashboardTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4A90E2']}
          tintColor="#4A90E2"
        />
      }
    >
      {/* Shop Info Card */}
      {shop && (
        <View style={styles.shopCard}>
          {shop.logo_url ? (
            <Image source={{ uri: shop.logo_url }} style={styles.shopLogo} />
          ) : (
            <View style={[styles.shopLogo, styles.shopLogoPlaceholder]}>
              <Ionicons name="storefront" size={30} color="#4A90E2" />
            </View>
          )}
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.shopAddress}>{shop.address}, {shop.city}</Text>
          </View>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="today-outline" size={22} color="#2196F3" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{stats.todayCount}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="calendar-outline" size={22} color="#4CAF50" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{stats.weekCount}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="cash-outline" size={22} color="#FF9800" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>${stats.totalEarnings.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Today's Bookings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Appointments</Text>
        {todayBookings.length > 0 ? (
          todayBookings.map((booking) => (
            <View key={booking.id}>
              {renderBookingCard({ item: booking })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#DDD" />
            <Text style={styles.emptyStateText}>No appointments today</Text>
            <Text style={styles.emptyStateSubtext}>Enjoy your day off!</Text>
          </View>
        )}
      </View>

      {/* Upcoming Bookings Section */}
      {upcomingBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          {upcomingBookings.map((booking) => (
            <View key={booking.id}>
              <Text style={styles.dateHeader}>{formatDate(booking.appointment_date)}</Text>
              {renderBookingCard({ item: booking })}
            </View>
          ))}
        </View>
      )}

      {/* Bottom Padding */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../../../../assets/logowithouttagline.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.headerInfo}>
                <Text style={styles.greeting}>Hello 👋</Text>
                <Text style={styles.userName}>{profile?.name || 'Provider'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Dashboard Content */}
          {renderDashboardTab()}
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerInfo: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.4)',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  // Dashboard Styles
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  shopLogoPlaceholder: {
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopInfo: {
    flex: 1,
    marginLeft: 15,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
    marginLeft: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  customerAvatarPlaceholder: {
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  bookingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default ProviderDashboard;
