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
import { getSubscriptionStatus, cancelSubscription, requestRefund, STRIPE_PLANS, REFUND_DAYS } from '../../../../lib/stripe';
import { checkLicenseAvailability } from '../../../../lib/auth';

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
  const [currentUserId, setCurrentUserId] = useState(null); // Store user ID for subscription actions

  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState({ currentCount: 0, maxLicenses: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store user ID for subscription actions
      setCurrentUserId(user.id);

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

      // Fetch subscription data for owners FIRST (from profile, not shop)
      // This runs even if they have no shops yet
      if (profileRole === 'owner') {
        try {
          setLoadingSubscription(true);
          const [subscriptionData, licenseData] = await Promise.all([
            getSubscriptionStatus(user.id),
            checkLicenseAvailability()
          ]);
          setSubscription(subscriptionData);
          setLicenseInfo({
            currentCount: licenseData.currentCount || 0,
            maxLicenses: licenseData.maxLicenses || 0
          });
        } catch (subError) {
          console.error('Error fetching subscription:', subError);
        } finally {
          setLoadingSubscription(false);
        }
      }

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

  const getPlanIcon = (planKey) => {
    switch (planKey) {
      case 'basic': return 'person';
      case 'starter': return 'people';
      case 'professional': return 'briefcase';
      case 'enterprise': return 'business';
      case 'unlimited': return 'infinite';
      default: return 'card';
    }
  };

  const getPlanColor = (planKey) => {
    switch (planKey) {
      case 'basic': return '#8E8E93';
      case 'starter': return '#007AFF';
      case 'professional': return '#34C759';
      case 'enterprise': return '#FF9500';
      case 'unlimited': return '#AF52DE';
      default: return '#4A90E2';
    }
  };

  const handleCancelSubscription = () => {
    if (!currentUserId) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const isRefundEligible = subscription?.isRefundEligible;

    Alert.alert(
      'Cancel Subscription',
      isRefundEligible
        ? `You are within the ${REFUND_DAYS}-day refund window. Would you like to:\n\n• Request a full refund and cancel immediately\n• Just cancel (keep access until end of billing period)`
        : 'Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.',
      isRefundEligible
        ? [
            { text: 'Keep Subscription', style: 'cancel' },
            { text: 'Cancel Only', onPress: () => processCancellation(false) },
            { text: 'Cancel & Refund', style: 'destructive', onPress: () => processCancellation(true) }
          ]
        : [
            { text: 'Keep Subscription', style: 'cancel' },
            { text: 'Cancel Subscription', style: 'destructive', onPress: () => processCancellation(false) }
          ]
    );
  };

  const processCancellation = async (withRefund) => {
    try {
      setCancellingSubscription(true);

      if (withRefund) {
        const result = await requestRefund(currentUserId, 'Customer requested cancellation');
        if (result.success) {
          Alert.alert('Refund Processed', `Your subscription has been cancelled and $${result.refundAmount} has been refunded.`);
          setSubscription(prev => prev ? { ...prev, subscription_status: 'refunded', isActive: false } : null);
        } else {
          Alert.alert('Error', result.error || 'Failed to process refund');
        }
      } else {
        const result = await cancelSubscription(currentUserId, 'Customer requested cancellation');
        if (result.success) {
          // Handle different cancellation scenarios
          if (result.localOnly) {
            // No Stripe subscription - downgraded locally
            Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled successfully.');
            setSubscription(prev => prev ? { ...prev, subscription_status: 'cancelled', subscription_plan: 'none', isActive: false } : null);
          } else if (result.refundProcessed) {
            // Within refund window - refunded and cancelled
            Alert.alert('Subscription Cancelled', result.message || `Your subscription has been cancelled and $${result.refundAmount} has been refunded.`);
            setSubscription(prev => prev ? { ...prev, subscription_status: 'refunded', isActive: false } : null);
          } else {
            // Normal cancellation - access until end of billing period
            Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled. You will retain access until the end of your current billing period.');
            setSubscription(prev => prev ? { ...prev, subscription_status: 'cancelled', isActive: false } : null);
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to cancel subscription');
        }
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setCancellingSubscription(false);
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

  // Check if owner has no active subscription - show subscription required screen
  if (userRole === 'owner' && !loadingSubscription && subscription && !subscription.isActive) {
    const statusMessage = subscription.subscription_status === 'payment_failed'
      ? 'Your payment could not be processed. Please add a valid payment method to activate your subscription.'
      : subscription.subscription_status === 'cancelled'
      ? 'Your subscription has been cancelled. Resubscribe to continue using Happy Inline.'
      : 'You need an active subscription to access business features.';

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="card-outline" size={80} color="#FF9800" />
          </View>
          <Text style={styles.emptyTitle}>Subscription Required</Text>
          <Text style={styles.emptySubtitle}>{statusMessage}</Text>

          <View style={styles.subscriptionRequiredCard}>
            <View style={styles.subscriptionRequiredRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.subscriptionRequiredText}>Unlimited bookings</Text>
            </View>
            <View style={styles.subscriptionRequiredRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.subscriptionRequiredText}>Customer messaging</Text>
            </View>
            <View style={styles.subscriptionRequiredRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.subscriptionRequiredText}>Service provider licenses</Text>
            </View>
            <View style={styles.subscriptionRequiredRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.subscriptionRequiredText}>7-day money-back guarantee</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => navigation.navigate('ResubscribeScreen')}
          >
            <Ionicons name="card" size={24} color="#FFF" />
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>

          <Text style={styles.subscriptionPriceHint}>
            Plans start at $24.99/month
          </Text>
        </ScrollView>
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

        {/* Subscription Card - Only for owners */}
        {userRole === 'owner' && (
          <View style={styles.subscriptionSection}>
            {loadingSubscription ? (
              <View style={styles.subscriptionLoadingCard}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.subscriptionLoadingText}>Loading plan details...</Text>
              </View>
            ) : subscription ? (
              <View style={styles.subscriptionCard}>
                {/* Plan Header */}
                <View style={styles.subscriptionHeader}>
                  <View style={[styles.planIconCircle, { backgroundColor: getPlanColor(subscription.subscription_plan) + '20' }]}>
                    <Ionicons
                      name={getPlanIcon(subscription.subscription_plan)}
                      size={28}
                      color={getPlanColor(subscription.subscription_plan)}
                    />
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{subscription.planDetails?.name || 'Unknown'} Plan</Text>
                    <Text style={styles.planPrice}>${subscription.planDetails?.amount || '0'}/month</Text>
                  </View>
                  <View style={[styles.planStatusBadge, { backgroundColor: subscription.isActive ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Text style={[styles.planStatusText, { color: subscription.isActive ? '#4CAF50' : '#F44336' }]}>
                      {subscription.subscription_status?.toUpperCase() || 'UNKNOWN'}
                    </Text>
                  </View>
                </View>

                {/* License Usage Bar */}
                <View style={styles.licenseSection}>
                  <View style={styles.licenseHeader}>
                    <Text style={styles.licenseTitle}>Provider Licenses</Text>
                    <Text style={styles.licenseCount}>
                      {licenseInfo.currentCount} / {licenseInfo.maxLicenses || subscription.planDetails?.maxLicenses || 0} used
                    </Text>
                  </View>
                  <View style={styles.licenseBar}>
                    <View
                      style={[
                        styles.licenseBarFill,
                        {
                          width: `${Math.min(100, (licenseInfo.currentCount / (licenseInfo.maxLicenses || subscription.planDetails?.maxLicenses || 1)) * 100)}%`,
                          backgroundColor: (licenseInfo.currentCount / (licenseInfo.maxLicenses || subscription.planDetails?.maxLicenses || 1)) > 0.8 ? '#FF9500' : '#4A90E2'
                        }
                      ]}
                    />
                  </View>
                </View>

                {/* Features */}
                <View style={styles.featuresRow}>
                  <View style={styles.featureItem}>
                    <Ionicons name="people" size={16} color="#666" />
                    <Text style={styles.featureText}>{subscription.planDetails?.providers || '0'} providers</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="calendar" size={16} color="#666" />
                    <Text style={styles.featureText}>Unlimited bookings</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="chatbubble" size={16} color="#666" />
                    <Text style={styles.featureText}>Messaging</Text>
                  </View>
                </View>

                {/* Refund Banner */}
                {subscription.isRefundEligible && subscription.isActive && (
                  <View style={styles.refundBanner}>
                    <Ionicons name="shield-checkmark" size={18} color="#4A90E2" />
                    <Text style={styles.refundBannerText}>
                      {subscription.refundDaysRemaining} days left for full refund
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.subscriptionActions}>
                  {subscription.canUpgrade && subscription.isActive && (
                    <TouchableOpacity
                      style={styles.upgradeButton}
                      onPress={() => navigation.navigate('UpgradePlanScreen', {
                        userId: currentUserId
                      })}
                    >
                      <Ionicons name="arrow-up-circle" size={20} color="#FFF" />
                      <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                    </TouchableOpacity>
                  )}

                  {subscription.isActive && (
                    <TouchableOpacity
                      style={styles.cancelSubscriptionButton}
                      onPress={handleCancelSubscription}
                      disabled={cancellingSubscription}
                    >
                      {cancellingSubscription ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        <>
                          <Ionicons name="close-circle" size={18} color="#FF3B30" />
                          <Text style={styles.cancelSubscriptionText}>Cancel Subscription</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noSubscriptionCard}>
                <Ionicons name="alert-circle" size={40} color="#FF9500" />
                <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
                <Text style={styles.noSubscriptionText}>Contact support if you believe this is an error</Text>
              </View>
            )}
          </View>
        )}

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
              onPress={() => navigation.navigate('StaffManagementScreenManager')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#000' }]}>
                <Ionicons name="people" size={28} color="#4A90E2" />
              </View>
              <Text style={styles.quickActionText}>Providers</Text>
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

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => {
                if (currentUserId) {
                  navigation.navigate('UpgradePlanScreen', {
                    userId: currentUserId
                  });
                }
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#34C759' }]}>
                <Ionicons name="arrow-up-circle" size={28} color="#FFF" />
              </View>
              <Text style={styles.quickActionText}>Upgrade Plan</Text>
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
  subscriptionActions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  upgradeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelSubscriptionButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelSubscriptionText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
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
