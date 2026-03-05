import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getProviderShop } from '../../../lib/providerAuth';
import { getCurrentUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import ProviderBookingCard from './components/ProviderBookingCard';

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const EMPTY_STATE_SUBTITLES = {
  today: 'No bookings scheduled for today',
  upcoming: 'No upcoming bookings yet',
  completed: 'No completed bookings to show',
  cancelled: 'No cancelled bookings',
};

const BookingsListScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('today');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopId, setShopId] = useState(null);
  const [userRole, setUserRole] = useState('owner');
  const [userId, setUserId] = useState(null);

  const loadShop = async () => {
    const result = await getProviderShop();
    const { profile } = await getCurrentUser();
    if (profile?.id) setUserId(profile.id);
    if (result.success) {
      setShopId(result.shop.id);
      setUserRole(result.role || 'owner');
      return result.shop.id;
    }
    return null;
  };

  const isOwner = userRole === 'owner' || userRole === 'super_admin';

  const fetchBookings = async (sid = shopId) => {
    if (!sid) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('bookings')
        .select(`
          id, appointment_date, appointment_time, status, total_amount, services, customer_notes,
          customer:profiles!bookings_customer_id_fkey(id, name, email, phone, profile_image),
          provider:profiles!bookings_barber_id_fkey(id, name)
        `)
        .eq('shop_id', sid)
        .order('appointment_date', { ascending: activeTab !== 'completed' })
        .order('appointment_time', { ascending: true });

      // Providers only see their own bookings
      if (!isOwner && userId) {
        query = query.or(`barber_id.eq.${userId},provider_id.eq.${userId}`);
      }

      switch (activeTab) {
        case 'today':
          query = query.eq('appointment_date', today).in('status', ['pending', 'confirmed', 'completed']);
          break;
        case 'upcoming':
          query = query.gt('appointment_date', today).in('status', ['pending', 'confirmed']);
          break;
        case 'completed':
          query = query.eq('status', 'completed').order('appointment_date', { ascending: false });
          break;
        case 'cancelled':
          query = query.eq('status', 'cancelled').order('appointment_date', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(50);
      if (!error) setBookings(data || []);
    } catch (error) {
      console.error('Fetch bookings error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    const init = async () => {
      setLoading(true);
      const sid = await loadShop();
      if (sid) fetchBookings(sid);
      else setLoading(false);
    };
    init();
  }, []));

  useEffect(() => {
    if (shopId) {
      setLoading(true);
      fetchBookings();
    }
  }, [activeTab]);

  const handleStatusChange = async (bookingId, newStatus) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId);
    if (!error) fetchBookings();
  };

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.screenTitle}>Bookings</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => setActiveTab(tab.key)}
          >
            {activeTab === tab.key ? (
              <LinearGradient
                colors={['#4A90E2', '#357ABD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeTabGradient}
              >
                <Text style={styles.activeTabText}>{tab.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTabInner}>
                <Text style={styles.tabText}>{tab.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProviderBookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingDetailScreen', { bookingId: item.id })}
              onConfirm={() => handleStatusChange(item.id, 'confirmed')}
              onCancel={() => handleStatusChange(item.id, 'cancelled')}
              onComplete={() => handleStatusChange(item.id, 'completed')}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={36} color="#4A90E2" />
              </View>
              <Text style={styles.emptyTitle}>No Bookings Found</Text>
              <Text style={styles.emptySubtitle}>{EMPTY_STATE_SUBTITLES[activeTab]}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A202C',
    letterSpacing: -0.3,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tab: {
    flex: 1,
  },
  activeTabGradient: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTabInner: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});

export default BookingsListScreen;
