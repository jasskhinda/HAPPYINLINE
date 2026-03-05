import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getProviderShop } from '../../../lib/providerAuth';
import { getCurrentUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatDate = (dateStr) => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr) => {
  try {
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${minute} ${ampm}`;
  } catch {
    return timeStr;
  }
};

const getServiceNames = (services) => {
  try {
    const parsed = typeof services === 'string' ? JSON.parse(services) : services;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(s => s.name).filter(Boolean).join(', ');
    }
  } catch {}
  return null;
};

const DashboardScreen = () => {
  const navigation = useNavigation();
  const [shop, setShop] = useState(null);
  const [stats, setStats] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userId, setUserId] = useState(null);

  const isOwnerRole = (role) => role === 'owner' || role === 'super_admin';

  const loadData = async () => {
    try {
      // Fetch user profile and shop data in parallel
      const [userResult, shopResult] = await Promise.all([
        getCurrentUser(),
        getProviderShop(),
      ]);

      // Set user info
      const currentUserId = userResult?.user?.id || null;
      const currentProfile = userResult?.profile || null;
      setUserId(currentUserId);
      setUserProfile(currentProfile);

      if (!shopResult.success || !shopResult.shop) {
        setShop(null);
        setLoading(false);
        return;
      }
      setShop(shopResult.shop);

      // Determine role: use the role from getProviderShop (owner/provider/staff)
      const role = shopResult.role || currentProfile?.role || 'staff';
      setUserRole(role);

      const isOwner = isOwnerRole(role);
      const today = new Date().toISOString().split('T')[0];

      // Fetch stats: TODAY = today's bookings, PENDING/CONFIRMED = all upcoming
      // Today's bookings query
      let todayQuery = supabase
        .from('bookings')
        .select('id, status')
        .eq('shop_id', shopResult.shop.id)
        .eq('appointment_date', today);

      // This week's bookings query
      const todayDate = new Date();
      const dayOfWeek = todayDate.getDay(); // 0=Sun
      const startOfWeek = new Date(todayDate);
      startOfWeek.setDate(todayDate.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const weekStart = startOfWeek.toISOString().split('T')[0];
      const weekEnd = endOfWeek.toISOString().split('T')[0];

      let weekQuery = supabase
        .from('bookings')
        .select('id, status')
        .eq('shop_id', shopResult.shop.id)
        .gte('appointment_date', weekStart)
        .lte('appointment_date', weekEnd)
        .in('status', ['confirmed', 'completed']);

      // Upcoming confirmed bookings count query
      let upcomingQuery = supabase
        .from('bookings')
        .select('id, status')
        .eq('shop_id', shopResult.shop.id)
        .gte('appointment_date', today)
        .in('status', ['confirmed']);

      // For providers/staff, filter by their assigned bookings
      if (!isOwner && currentUserId) {
        const providerFilter = `barber_id.eq.${currentUserId},provider_id.eq.${currentUserId}`;
        todayQuery = todayQuery.or(providerFilter);
        weekQuery = weekQuery.or(providerFilter);
        upcomingQuery = upcomingQuery.or(providerFilter);
      }

      const [{ data: todayBookings }, { data: weekBookings }, { data: upcomingAll }] = await Promise.all([
        todayQuery,
        weekQuery,
        upcomingQuery,
      ]);

      setStats({
        total: todayBookings?.length || 0,
        thisWeek: weekBookings?.length || 0,
        confirmed: upcomingAll?.length || 0,
      });

      // Fetch upcoming bookings
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          id, appointment_date, appointment_time, status, total_amount, services,
          customer:profiles!bookings_customer_id_fkey(id, name, profile_image)
        `)
        .eq('shop_id', shopResult.shop.id)
        .gte('appointment_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);

      // For providers/staff, only show their assigned bookings
      if (!isOwner && currentUserId) {
        bookingsQuery = bookingsQuery.or(`barber_id.eq.${currentUserId},provider_id.eq.${currentUserId}`);
      }

      const { data: bookings } = await bookingsQuery;

      setUpcomingBookings(bookings || []);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#34C759';
      case 'pending': return '#FF9500';
      case 'completed': return '#4A90E2';
      case 'cancelled': return '#FF3B30';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  // No shop state
  if (!shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.noShopContainer}>
          <View style={styles.noShopIconCircle}>
            <Ionicons name="storefront-outline" size={48} color="#A0AEC0" />
          </View>
          <Text style={styles.noShopTitle}>No Business Found</Text>
          <Text style={styles.noShopSubtitle}>
            Your account is not linked to a business yet. Please contact your administrator.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {shop.logo_url ? (
              <Image source={{ uri: shop.logo_url }} style={styles.shopLogo} />
            ) : (
              <View style={styles.shopLogoPlaceholder}>
                <Ionicons name="storefront" size={26} color="#4A90E2" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              {isOwnerRole(userRole) ? (
                <Text style={styles.headerSubtitle}>Owner Dashboard</Text>
              ) : (
                <Text style={styles.welcomeSubtitle}>
                  Welcome, {userProfile?.name || 'Team Member'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardBlue]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CalendarScreen', { shopId: shop.id })}
          >
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(74, 144, 226, 0.15)' }]}>
              <Ionicons name="calendar" size={22} color="#4A90E2" />
            </View>
            <Text style={styles.statNumber}>{stats?.total || 0}</Text>
            <Text style={styles.statLabel}>{isOwnerRole(userRole) ? 'Today' : 'My Bookings'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardOrange]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CalendarScreen', { shopId: shop.id })}
          >
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.15)' }]}>
              <Ionicons name="calendar-outline" size={22} color="#FF9500" />
            </View>
            <Text style={styles.statNumber}>{stats?.thisWeek || 0}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, styles.statCardGreen]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('BookingsListScreen')}
          >
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={22} color="#34C759" />
            </View>
            <Text style={styles.statNumber}>{stats?.confirmed || 0}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions - Owner only */}
        {isOwnerRole(userRole) ? (
          <View style={styles.quickActionsWrapper}>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('CalendarScreen', { shopId: shop.id })}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#EBF5FF' }]}>
                  <Ionicons name="calendar" size={28} color="#4A90E2" />
                </View>
                <Text style={styles.quickActionText}>Calendar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('ServicesManagementScreen', { shopId: shop.id })}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="list" size={28} color="#9C27B0" />
                </View>
                <Text style={styles.quickActionText}>Services</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('StaffManagementScreen', { shopId: shop.id })}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="people" size={28} color="#34C759" />
                </View>
                <Text style={styles.quickActionText}>Providers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('ShopQRCodeScreen', { shopId: shop.id, shopName: shop.name })}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="qr-code" size={28} color="#FF9500" />
                </View>
                <Text style={styles.quickActionText}>QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.viewScheduleContainer}>
            <TouchableOpacity
              style={styles.viewScheduleButton}
              onPress={() => navigation.navigate('CalendarScreen', { shopId: shop.id })}
            >
              <Ionicons name="calendar-outline" size={22} color="#FFF" />
              <Text style={styles.viewScheduleText}>View My Schedule</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isOwnerRole(userRole) ? 'Upcoming Bookings' : 'My Upcoming Bookings'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('BookingsListScreen')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={32} color="#A0AEC0" />
              </View>
              <Text style={styles.emptyTitle}>All Clear</Text>
              <Text style={styles.emptyText}>No upcoming bookings at the moment</Text>
            </View>
          ) : (
            upcomingBookings.map((booking) => {
              const serviceNames = getServiceNames(booking.services);
              const statusColor = getStatusColor(booking.status);
              return (
                <TouchableOpacity
                  key={booking.id}
                  style={[styles.bookingCard, { borderLeftColor: statusColor }]}
                  onPress={() => navigation.navigate('BookingDetailScreen', { bookingId: booking.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingLeft}>
                    {booking.customer?.profile_image ? (
                      <Image source={{ uri: booking.customer.profile_image }} style={styles.customerAvatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#8896AB" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{booking.customer?.name || 'Customer'}</Text>
                      {serviceNames && (
                        <Text style={styles.serviceText} numberOfLines={1}>{serviceNames}</Text>
                      )}
                      <View style={styles.bookingMeta}>
                        <Ionicons name="calendar-outline" size={12} color="#8896AB" />
                        <Text style={styles.bookingTime}>
                          {formatDate(booking.appointment_date)}
                        </Text>
                        <Ionicons name="time-outline" size={12} color="#8896AB" style={{ marginLeft: 8 }} />
                        <Text style={styles.bookingTime}>
                          {formatTime(booking.appointment_time)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {booking.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // No Shop
  noShopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noShopIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noShopTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  noShopSubtitle: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  shopLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEE',
  },
  shopLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 13,
    color: '#8896AB',
    fontWeight: '500',
    marginBottom: 1,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8896AB',
    marginTop: 1,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
    marginTop: 1,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statCardBlue: {
    backgroundColor: '#F0F7FF',
    borderColor: '#DBEAFE',
  },
  statCardOrange: {
    backgroundColor: '#FFF8F0',
    borderColor: '#FEE8CC',
  },
  statCardGreen: {
    backgroundColor: '#F0FFF4',
    borderColor: '#D1FAE5',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: '#8896AB',
    marginTop: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Quick Actions
  quickActionsWrapper: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
  },

  // View Schedule (Provider)
  viewScheduleContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  viewScheduleButton: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#4A6CF7',
    ...Platform.select({
      ios: {
        shadowColor: '#4A6CF7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  viewScheduleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },

  // Section
  section: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#A0AEC0',
  },

  // Booking Card
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#EDF2F7',
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 1,
  },
  serviceText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 4,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingTime: {
    fontSize: 12,
    color: '#8896AB',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
});

export default DashboardScreen;
