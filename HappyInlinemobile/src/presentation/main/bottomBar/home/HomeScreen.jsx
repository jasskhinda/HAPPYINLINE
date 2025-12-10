import { FlatList, Image, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser, fetchAllBookingsForManagers } from '../../../../lib/auth';
import { getAllShops, getMyShops, getCurrentShopId, isShopOpen, getAllServices, fetchPendingInvitations } from '../../../../lib/shopAuth';
import { supabase } from '../../../../lib/supabase';
import ShopStatusBadge from '../../../../components/shop/ShopStatusBadge';
import SuperAdminHomeScreen from './SuperAdminHomeScreen';
import ManagerDashboard from './ManagerDashboard';
import ProviderDashboard from './ProviderDashboard';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [isManagerMode, setIsManagerMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isProvider, setIsProvider] = useState(false); // Service provider (barber)
  const [userName, setUserName] = useState('Guest');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Shops and current shop context
  const [shops, setShops] = useState([]);
  const [userShops, setUserShops] = useState([]); // Shops where user is staff
  const [currentShop, setCurrentShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Home Shop Lock - customer locked to specific shop
  const [isLockedCustomer, setIsLockedCustomer] = useState(false);

  // Business categories for browsing
  const [categories, setCategories] = useState([]);
  
  // Pending appointments for managers/admins (real data from backend)
  const [pendingAppointments, setPendingAppointments] = useState([]);
  
  // Pending invitations count
  const [invitationCount, setInvitationCount] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ref for FlatList to prevent scroll on data change
  const flatListRef = useRef(null);
  
  // Fetch data function (used for initial load and refresh)
  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      
      // Fetch user profile
      console.log('🏠 HomeScreen: Fetching user profile...');
      const { user, profile } = await getCurrentUser();
      console.log('👤 User:', user);
      console.log('📋 Profile:', profile);
      
      if (profile) {
        const name = profile.name || 'Guest';
        const isSuperAdminUser = profile.role === 'super_admin';
        const isAdminUser = profile.role === 'admin';
        console.log('✅ Setting state - Name:', name, ', Super Admin:', isSuperAdminUser, ', Admin:', isAdminUser);

        setUserName(name);
        setIsPlatformAdmin(profile.is_platform_admin || false);
        setIsSuperAdmin(isSuperAdminUser);

        // If super admin, skip fetching user shops and services
        if (isSuperAdminUser) {
          console.log('👑 Super Admin detected - showing admin dashboard');
          setLoading(false);
          return;
        }

        // Check if user is owner or admin (NOT customer)
        const isOwnerOrAdmin = profile.role === 'owner' || profile.role === 'admin';

        // Check if user is a service provider (barber)
        if (profile.role === 'barber') {
          console.log('💈 Provider/Barber role detected in profile');
          setIsProvider(true);
          setIsManagerMode(false);
          setIsAdminMode(false);
        }
        // Only set admin mode if they are NOT a customer
        else if (isOwnerOrAdmin && profile.role !== 'customer') {
          console.log('👔 Owner/Admin role detected in profile:', profile.role);
          setIsManagerMode(true);
          setIsAdminMode(true);
          setIsProvider(false);
        } else if (profile.role === 'customer') {
          console.log('👤 Customer role detected - showing browsing interface');
          setIsManagerMode(false);
          setIsAdminMode(false);
          setIsProvider(false);
        }
      }
      
      // Check if customer is locked to a home shop (Home Shop Lock)
      let shopsToDisplay = [];
      const customerIsLocked = !!(profile && profile.home_shop_id && profile.role === 'customer');
      setIsLockedCustomer(customerIsLocked);

      if (customerIsLocked) {
        console.log('🔒 Customer locked to home shop:', profile.home_shop_id);
        // Fetch only their home shop
        const { data: homeShop, error: homeShopError } = await supabase
          .from('shops')
          .select('*')
          .eq('id', profile.home_shop_id)
          .eq('status', 'approved')
          .single();

        if (homeShopError) {
          console.error('❌ Error fetching home shop:', homeShopError);
          shopsToDisplay = [];
        } else {
          console.log('✅ Home shop fetched:', homeShop.name);
          shopsToDisplay = homeShop ? [homeShop] : [];
        }
      } else {
        // Fetch all shops for browsing
        console.log('🏪 HomeScreen: Fetching all shops...');
        const shopsResult = await getAllShops();
        if (shopsResult.success) {
          console.log('✅ Shops fetched:', shopsResult.shops.length);
          shopsToDisplay = shopsResult.shops || [];
        } else {
          console.error('❌ Error fetching shops:', shopsResult.error);
          shopsToDisplay = [];
        }
      }

      setShops(shopsToDisplay);
      
      // Fetch user's shops (where they are staff)
      console.log('👥 HomeScreen: Fetching user shops...');
      const myShopsResult = await getMyShops();
      if (myShopsResult.success) {
        console.log('✅ User shops fetched:', myShopsResult.shops?.length || 0);
        setUserShops(myShopsResult.shops || []);

        // Check if user is admin of any shop (via shop_staff)
        const hasAdminRoleInShops = myShopsResult.shops?.some(
          s => s.role === 'admin'
        );

        // Only update admin mode if they have shops
        // Don't override the profile-based admin detection
        if (hasAdminRoleInShops) {
          setIsManagerMode(true);
          setIsAdminMode(true);
        }
        console.log('👔 Admin mode from shops:', hasAdminRoleInShops);

        // Get current shop context
        const currentShopId = await getCurrentShopId();
        if (currentShopId && myShopsResult.shops) {
          const currentShopData = myShopsResult.shops.find(s => s.shop_id === currentShopId);
          setCurrentShop(currentShopData);
          console.log('🎯 Current shop:', currentShopData?.shop_name);
        }
      } else {
        console.log('ℹ️ No user shops');
        setUserShops([]);
        setCurrentShop(null);
        // DON'T override manager mode here - keep the profile-based detection
        // Manager might not have shops yet, but they should still see manager dashboard
      }

      // Fetch business categories
      console.log('📂 HomeScreen: Fetching business categories...');
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('business_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (categoriesError) {
        console.error('❌ Error fetching categories:', categoriesError);
        setCategories([]);
      } else {
        console.log('✅ Categories fetched:', categoriesData?.length || 0);
        setCategories(categoriesData || []);
      }

      // Fetch pending invitations
      console.log('📬 HomeScreen: Fetching pending invitations...');
      const invitationsResult = await fetchPendingInvitations();
      if (invitationsResult.success) {
        const count = invitationsResult.invitations?.length || 0;
        console.log(`✅ Pending invitations: ${count}`);
        setInvitationCount(count);
      } else {
        console.log('ℹ️ No invitations or error:', invitationsResult.error);
        setInvitationCount(0);
      }
      
    } catch (error) {
      console.error('❌ Error fetching data:', error);
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  };



  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
    console.log('✅ Refresh complete');
  }, []);
  
  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle shop card press - navigate to shop details
  const handleShopPress = useCallback((shop) => {
    navigation.navigate('ShopDetailsScreen', { shopId: shop.id });
  }, [navigation]);

  // Render individual shop card
  const renderShopItem = useCallback(({ item }) => {
    const shopIsOpen = isShopOpen(item);
    
    return (
      <TouchableOpacity 
        style={styles.shopCard}
        onPress={() => handleShopPress(item)}
        activeOpacity={0.7}
      >
        {/* Shop Logo */}
        {item.logo_url ? (
          <Image 
            source={{ uri: item.logo_url }} 
            style={styles.shopLogo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.shopLogo, styles.shopLogoPlaceholder]}>
            <Ionicons name="storefront" size={40} color="#4A90E2" />
          </View>
        )}
        
        {/* Shop Info */}
        <View style={styles.shopInfo}>
          <View style={styles.shopHeader}>
            <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
            {item.is_verified && (
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginLeft: 5 }} />
            )}
          </View>
          
          <Text style={styles.shopAddress} numberOfLines={1}>
            <Ionicons name="location-outline" size={14} color="#666" /> {item.address}
          </Text>
          
          {item.city && (
            <Text style={styles.shopCity} numberOfLines={1}>{item.city}</Text>
          )}
          
          {/* Shop Status and Hours */}
          <ShopStatusBadge
            operatingDays={item.operating_days}
            openingTime={item.opening_time}
            closingTime={item.closing_time}
            isManuallyClosed={item.is_manually_closed}
            isCurrentlyOpen={shopIsOpen}
            compact={true}
          />
          
          <View style={styles.shopFooter}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>
                {item.rating ? Number(item.rating).toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.reviewsText}>
                ({item.total_reviews || 0} reviews)
              </Text>
            </View>
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  }, [handleShopPress]);

  // Render empty state for shops
  const renderEmptyShops = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="storefront-outline" size={80} color="#DDD" />
      <Text style={styles.emptyStateTitle}>No Shops Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        Check back soon for available businesses in your area
      </Text>
    </View>
  );

  // If Super Admin, show Super Admin Dashboard
  if (isSuperAdmin && !loading) {
    console.log('🎯 Rendering Super Admin Dashboard');
    return <SuperAdminHomeScreen />;
  }

  // If Manager/Admin, show Manager Dashboard
  if (isManagerMode && !loading) {
    console.log('👔 Rendering Manager Dashboard');
    return <ManagerDashboard />;
  }

  // If Provider (barber), show Provider Dashboard
  if (isProvider && !loading) {
    console.log('💈 Rendering Provider Dashboard');
    return <ProviderDashboard />;
  }

  // If customer WITHOUT home shop, show QR scan prompt (Exclusive customers only)
  if (!loading && !isManagerMode && !isSuperAdmin && !isProvider && !isLockedCustomer) {
    console.log('🔒 Customer without home shop - showing QR prompt');
    return (
      <View style={styles.outerWrapper}>
        <View style={styles.container}>
          <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
            {/* APP BAR */}
            <View style={styles.appBar}>
              <Image
                source={require('../../../../../assets/logowithouttagline.png')}
                style={styles.userProfilePic}
                resizeMode="contain"
              />
              <View style={styles.userInfo}>
                <Text style={{ color: 'rgba(0, 0, 0, 0.4)' }}>Hello 👋</Text>
                <Text style={styles.userName}>{userName}</Text>
              </View>
            </View>

            {/* QR SCAN PROMPT */}
            <View style={styles.qrPromptContainer}>
              <Ionicons name="qr-code-outline" size={120} color="#4A90E2" />
              <Text style={styles.qrPromptTitle}>Welcome to Happy Inline!</Text>
              <Text style={styles.qrPromptMessage}>
                Please scan the QR code provided by your business to create your account and start booking services.
              </Text>
              <Text style={styles.qrPromptSubtext}>
                Ask your service provider for their unique QR code
              </Text>

              {/* Logout option */}
              <TouchableOpacity
                style={styles.qrLogoutButton}
                onPress={async () => {
                  const { signOut } = await import('../../../../lib/auth');
                  await signOut();
                  navigation.replace('WelcomeScreen');
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#666" />
                <Text style={styles.qrLogoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  // Render loading indicator
  if (loading) {
    return (
      <View style={styles.outerWrapper}>
        <View style={styles.container}>
          <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
            {/* APP BAR - Show even while loading */}
            <View style={styles.appBar}>
              <Image
                source={require('../../../../../assets/logowithouttagline.png')}
                style={styles.userProfilePic}
                resizeMode="contain"
              />
              <View style={styles.userInfo}>
                <Text style={{ color: 'rgba(0, 0, 0, 0.4)' }}>Hello 👋</Text>
                <Text style={styles.userName}>Loading...</Text>
              </View>
            </View>

            {/* Loading Content */}
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading your dashboard...</Text>
              <Text style={styles.loadingSubtext}>Discovering businesses near you</Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }



  const renderHeader = () => {
    return (
      <>
        {/* SEARCH BAR - For searching shops */}
        <TouchableOpacity
          style={styles.searchBarContainer}
          onPress={() => navigation.navigate('SearchScreen')}
          activeOpacity={0.7}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIconLeft} />
            <Text style={styles.searchPlaceholder}>Search businesses or services...</Text>
          </View>
        </TouchableOpacity>


        {/* Current Shop Badge - Show if user has a shop */}
        {currentShop && (
          <View style={styles.currentShopBadge}>
            <Ionicons name="briefcase" size={16} color="#4A90E2" />
            <Text style={styles.currentShopText}>
              Managing: <Text style={styles.currentShopName}>{currentShop.shop_name}</Text>
            </Text>
            <TouchableOpacity 
              style={styles.switchShopButton}
              onPress={() => navigation.navigate('ShopSelectionScreen')}
            >
              <Text style={styles.switchShopText}>Switch</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Business Categories */}
        {/* Hide categories for locked customers - they can only see their home shop */}
        {!isLockedCustomer && categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>Browse by Category</Text>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryCard, { backgroundColor: item.color || '#4A90E2' }]}
                  onPress={() => navigation.navigate('CategoryShopsScreen', {
                    categoryId: item.id,
                    categoryName: item.name,
                    categorySlug: item.slug
                  })}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryIconContainer}>
                    <Text style={styles.categoryIcon}>{item.icon || '📋'}</Text>
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesListContent}
            />
          </View>
        )}

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>Popular Businesses</Text>
        </View>
      </>
    );
  };

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          {/* APP BAR */}
          <View style={styles.appBar}>
            <Image 
              source={require('../../../../../assets/logowithouttagline.png')} 
              style={styles.userProfilePic}
              resizeMode="contain"
            />
            <View style={styles.userInfo}>
              <Text style={{ color: 'rgba(0, 0, 0, 0.4)' }}>Hello 👋</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            
            {/* Invitation Bell Icon */}
            {invitationCount > 0 && (
              <TouchableOpacity 
                style={styles.invitationButton}
                onPress={() => navigation.navigate('InvitationsScreen')}
              >
                <Ionicons name="mail" size={24} color="#4A90E2" />
                <View style={styles.invitationBadge}>
                  <Text style={styles.invitationBadgeText}>
                    {invitationCount}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Notification Icon - if user has shops */}
            {userShops.length > 0 && (
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => navigation.navigate('BookingManagementScreen')}
              >
                <Ionicons name="notifications-outline" size={24} color="#333" />
                {pendingAppointments.length > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {pendingAppointments.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* MAIN CONTENT WITH FLATLIST */}
          <FlatList
            ref={flatListRef}
            data={shops}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderShopItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyShops}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4A90E2']} // Android
                tintColor="#4A90E2" // iOS
                title="Pull to refresh" // iOS
                titleColor="#666" // iOS
              />
            }
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </View>
    </View>
  );
};

export default HomeScreen;

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
    overflow: 'hidden', // 🔒 clips children inside the border radius
  },
  appBar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  userProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 40,
  },
  userInfo: {
    marginLeft: 10,
    justifyContent: 'center',
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  servicesCard: {
    backgroundColor: 'white',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 10
  },
  servicesText: {
    marginTop: 7,
    fontWeight: 'bold',
  },
  logo: {
    width: 90,
    height: 120,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#F8F9FA'
  },
  barberCard: {
    borderRadius: 30, 
    backgroundColor: 'white', 
    padding: 12, 
    marginTop: 10, 
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#333',
  },
  // Section Header with Create Button
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  createShopIconButton: {
    padding: 5,
  },
  // Shop Card Styles
  shopCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  shopLogoPlaceholder: {
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopInfo: {
    flex: 1,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  shopAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  shopCity: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  shopFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  // Create Shop Banner
  createShopBanner: {
    backgroundColor: '#FFF5F0',
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 5,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  createShopBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  createShopTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  createShopTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 3,
  },
  createShopSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  // Current Shop Badge
  currentShopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  currentShopText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  currentShopName: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  switchShopButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  switchShopText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Notification Button
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Invitation Button
  invitationButton: {
    position: 'relative',
    padding: 8,
    marginRight: 5,
  },
  invitationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  invitationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Create Shop Button in Empty State
  createShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  createShopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyServicesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  emptyServicesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  // Service Icon Style
  serviceIcon: {
    width: 24,
    height: 24,
  },
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Search Bar Styles (Tappable)
  searchBarContainer: {
    marginTop: 20,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIconLeft: {
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  // Services Section Styles
  servicesSection: {
    marginTop: 20,
    marginBottom: 5,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  servicesListContent: {
    paddingHorizontal: 15,
  },
  serviceCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  serviceIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Categories Section Styles
  categoriesSection: {
    marginTop: 20,
    marginBottom: 5,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  categoriesListContent: {
    paddingHorizontal: 15,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 120,
    height: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 16,
  },
  // QR Prompt Styles
  qrPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  qrPromptTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 30,
    marginBottom: 15,
    textAlign: 'center',
  },
  qrPromptMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  qrPromptSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 40,
  },
  qrLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
    gap: 8,
  },
  qrLogoutText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});