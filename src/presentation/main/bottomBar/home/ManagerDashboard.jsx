import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import ShopQRCodeModal from '../../../../components/shop/ShopQRCodeModal';

const ManagerDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState([]); // Changed to array for multiple listings
  const [ownerName, setOwnerName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'owner' or 'admin'
  const [stats, setStats] = useState({
    todayBookings: 0,
    weekRevenue: 0,
    rating: 0,
    newCustomers: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [hasShop, setHasShop] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedShopForQR, setSelectedShopForQR] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile to get name, role, and profile image
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name, profile_image')
        .eq('id', user.id)
        .single();

      const profileRole = profile?.role || 'customer';
      setUserRole(profileRole);
      setOwnerName(profile?.name || 'Business Owner');
      setProfileImage(profile?.profile_image || null);

      // Fetch ALL shops where user is owner/manager/admin (support multiple listings)
      const { data: shopStaffData, error: staffError } = await supabase
        .from('shop_staff')
        .select(`
          shop_id,
          role,
          shops (*)
        `)
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin']);

      if (staffError || !shopStaffData || shopStaffData.length === 0) {
        console.log('No shops found for this user');
        setHasShop(false);
        setShops([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setHasShop(true);

      // Extract all shops
      const allShops = shopStaffData.map(item => item.shops).filter(Boolean);
      setShops(allShops);

      // Fetch stats from the first approved shop (or first shop if none approved)
      const approvedShop = allShops.find(s => s.status === 'approved') || allShops[0];
      if (approvedShop && approvedShop.status === 'approved') {
        await fetchStats(approvedShop.id);
        await fetchTodayAppointments(approvedShop.id);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async (shopId) => {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get week start (Monday)
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);

      // Fetch today's bookings count
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('shop_id', shopId)
        .gte('date', today.toISOString())
        .lt('date', tomorrow.toISOString());

      // Fetch week revenue
      const { data: weekBookings } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('shop_id', shopId)
        .gte('date', weekStart.toISOString())
        .eq('status', 'completed');

      const weekRevenue = weekBookings?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;

      // Fetch shop rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('shop_id', shopId);

      const avgRating = reviews?.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Fetch new customers this week
      const { data: newCustomers } = await supabase
        .from('bookings')
        .select('customer_id')
        .eq('shop_id', shopId)
        .gte('created_at', weekStart.toISOString());

      const uniqueCustomers = new Set(newCustomers?.map(b => b.customer_id) || []).size;

      setStats({
        todayBookings: todayBookings?.length || 0,
        weekRevenue: weekRevenue,
        rating: avgRating.toFixed(1),
        newCustomers: uniqueCustomers,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTodayAppointments = async (shopId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          services,
          profiles:customer_id (name)
        `)
        .eq('shop_id', shopId)
        .gte('appointment_date', today.toISOString())
        .lt('appointment_date', tomorrow.toISOString())
        .order('appointment_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      setTodayAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  const getStatusInfo = (shopStatus) => {
    switch (shopStatus) {
      case 'draft':
        return { text: 'DRAFT - Complete Setup', color: '#FF9800', icon: 'create', bg: '#FFF3E0' };
      case 'pending_review':
        return { text: 'PENDING REVIEW', color: '#FF9800', icon: 'time', bg: '#FFF3E0' };
      case 'approved':
        return { text: 'LIVE', color: '#4CAF50', icon: 'checkmark-circle', bg: '#E8F5E9' };
      case 'rejected':
        return { text: 'NEEDS ATTENTION', color: '#F44336', icon: 'alert-circle', bg: '#FFEBEE' };
      case 'suspended':
        return { text: 'SUSPENDED', color: '#F44336', icon: 'ban', bg: '#FFEBEE' };
      default:
        return { text: 'UNKNOWN', color: '#999', icon: 'help-circle', bg: '#F5F5F5' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  // No shop - show different message based on role
  if (hasShop === false) {
    // OWNERS can create shops
    if (userRole === 'owner') {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="storefront-outline" size={100} color="#CCC" />
            </View>
            <Text style={styles.emptyTitle}>Create Your Business</Text>
            <Text style={styles.emptySubtitle}>
              Set up your business to start taking bookings and managing your operations
            </Text>

            <TouchableOpacity
              style={styles.createShopButton}
              onPress={() => navigation.navigate('CreateShopScreen')}
            >
              <Ionicons name="add-circle" size={24} color="#FFF" />
              <Text style={styles.createShopButtonText}>Create Business</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // Admins must be assigned to a shop
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="alert-circle-outline" size={100} color="#4A90E2" />
          </View>
          <Text style={styles.emptyTitle}>Account Not Active</Text>
          <Text style={styles.emptySubtitle}>
            Your admin account is not linked to any shop yet. Please contact the shop owner who created your account to assign you to a shop.
          </Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Admin accounts must be assigned to a shop by the shop owner. You cannot create shops yourself.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Owner Info */}
        <View style={styles.header}>
          <View style={styles.ownerInfo}>
            <View>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.ownerName}>{ownerName}</Text>
              <Text style={styles.ownerRole}>Business Owner</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('ProfileScreen')}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person-circle" size={48} color="#4A90E2" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Your Businesses Section */}
        {shops.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Businesses ({shops.length})</Text>
            </View>

            {shops.map((shop) => {
              const statusInfo = getStatusInfo(shop.status);
              const isApproved = shop.status === 'approved';

              return (
                <View key={shop.id} style={styles.businessCardContainer}>
                  <TouchableOpacity
                    style={styles.businessCard}
                    onPress={() => {
                      if (shop.status === 'draft') {
                        navigation.navigate('CreateShopScreen', { shopId: shop.id });
                      } else if (shop.status === 'pending_review' || shop.status === 'rejected') {
                        navigation.navigate('ShopPendingReview', { shopId: shop.id });
                      } else {
                        navigation.navigate('ShopSettingsScreen', { shopId: shop.id });
                      }
                    }}
                  >
                    <View style={styles.businessCardLeft}>
                      {shop.logo_url ? (
                        <Image source={{ uri: shop.logo_url }} style={styles.businessLogo} />
                      ) : (
                        <View style={[styles.businessLogo, styles.businessLogoPlaceholder]}>
                          <Ionicons name="storefront" size={24} color="#4A90E2" />
                        </View>
                      )}
                      <View style={styles.businessDetails}>
                        <Text style={styles.businessName}>{shop.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                          <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                          <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.text}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#CCC" />
                  </TouchableOpacity>

                  {/* QR Code Button - Only show for approved shops */}
                  {isApproved && (
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => {
                        setSelectedShopForQR(shop);
                        setQrModalVisible(true);
                      }}
                    >
                      <Ionicons name="qr-code" size={20} color="#FFFFFF" />
                      <Text style={styles.qrButtonText}>Get QR Code</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}


        {/* Quick Actions - 4 Cards Only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('BookingManagementScreen')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#000' }]}>
                <Ionicons name="calendar" size={28} color="#4A90E2" />
              </View>
              <Text style={styles.quickActionText}>Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => {
                if (shops.length === 1) {
                  navigation.navigate('ShopSettingsScreen', { shopId: shops[0].id });
                } else {
                  navigation.navigate('ShopSelectionScreen');
                }
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#000' }]}>
                <Ionicons name="storefront" size={28} color="#4A90E2" />
              </View>
              <Text style={styles.quickActionText}>Manage Listings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('ProfileScreen')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#000' }]}>
                <Ionicons name="settings" size={28} color="#4A90E2" />
              </View>
              <Text style={styles.quickActionText}>Profile Settings</Text>
            </TouchableOpacity>

          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Code Modal */}
      {selectedShopForQR && (
        <ShopQRCodeModal
          visible={qrModalVisible}
          onClose={() => {
            setQrModalVisible(false);
            setSelectedShopForQR(null);
          }}
          shopId={selectedShopForQR.id}
          shopName={selectedShopForQR.name}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  ownerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  ownerRole: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  profileButton: {
    padding: 4,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  businessCardContainer: {
    marginBottom: 12,
  },
  businessCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qrButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  businessCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  businessLogoPlaceholder: {
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#FFE5E5',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  alertText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  alertButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  alertButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionLink: {
    fontSize: 15,
    color: '#4A90E2',
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 4,
  },
  appointmentTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  appointmentService: {
    fontSize: 14,
    color: '#666',
  },
  appointmentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appointmentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  statuspending: {
    backgroundColor: '#FF9800',
  },
  statusconfirmed: {
    backgroundColor: '#4CAF50',
  },
  statuscompleted: {
    backgroundColor: '#2196F3',
  },
  statuscancelled: {
    backgroundColor: '#F44336',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickActionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    minWidth: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  menuItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    marginLeft: 16,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  createShopButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createShopButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Subscription Required Styles
  subscriptionRequiredCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subscriptionRequiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  subscriptionRequiredText: {
    fontSize: 16,
    color: '#333',
  },
  subscribeButton: {
    backgroundColor: '#4A90E2',
    width: '100%',
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  subscriptionPriceHint: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  // Subscription Styles
  subscriptionSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subscriptionLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  subscriptionLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  subscriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  planIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginTop: 2,
  },
  planStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  licenseSection: {
    marginBottom: 16,
  },
  licenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  licenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  licenseCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
  },
  licenseBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  licenseBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  refundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  refundBannerText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  manageButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  manageButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noSubscriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noSubscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  noSubscriptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
});

export default ManagerDashboard;
