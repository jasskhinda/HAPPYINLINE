import { FlatList, Image, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser } from '../../../../lib/auth';
import { getAllShops, isShopOpen } from '../../../../lib/shopAuth';
import { supabase } from '../../../../lib/supabase';
import ShopStatusBadge from '../../../../components/shop/ShopStatusBadge';

const CustomerHomeScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('Guest');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLockedCustomer, setIsLockedCustomer] = useState(false);
  const [categories, setCategories] = useState([]);
  const flatListRef = useRef(null);

  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      // Fetch user profile
      console.log('🏠 CustomerHomeScreen: Fetching user profile...');
      const { user, profile } = await getCurrentUser();

      if (profile) {
        setUserName(profile.name || 'Guest');
      }

      // Check if customer is locked to a home shop
      let shopsToDisplay = [];
      const customerIsLocked = !!(profile && profile.home_shop_id && profile.role === 'customer');
      setIsLockedCustomer(customerIsLocked);

      if (customerIsLocked) {
        console.log('🔒 Customer locked to home shop:', profile.home_shop_id);
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
        console.log('🏪 CustomerHomeScreen: Fetching all shops...');
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

      // Fetch business categories
      console.log('📂 CustomerHomeScreen: Fetching business categories...');
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

    } catch (error) {
      console.error('❌ Error fetching data:', error);
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  };

  const onRefresh = useCallback(async () => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
    console.log('✅ Refresh complete');
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleShopPress = useCallback((shop) => {
    navigation.navigate('ShopDetailsScreen', { shopId: shop.id });
  }, [navigation]);

  const renderShopItem = useCallback(({ item }) => {
    const shopIsOpen = isShopOpen(item);

    return (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={() => handleShopPress(item)}
        activeOpacity={0.7}
      >
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

  const renderEmptyShops = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="storefront-outline" size={80} color="#DDD" />
      <Text style={styles.emptyStateTitle}>No Shops Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        Check back soon for available businesses in your area
      </Text>
    </View>
  );

  // If customer WITHOUT home shop, show QR scan prompt
  if (!loading && !isLockedCustomer) {
    return (
      <View style={styles.outerWrapper}>
        <View style={styles.container}>
          <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
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

            <View style={styles.qrPromptContainer}>
              <Ionicons name="qr-code-outline" size={120} color="#4A90E2" />
              <Text style={styles.qrPromptTitle}>Welcome to Happy Inline!</Text>
              <Text style={styles.qrPromptMessage}>
                Please scan the QR code provided by your business to create your account and start booking services.
              </Text>
              <Text style={styles.qrPromptSubtext}>
                Ask your service provider for their unique QR code
              </Text>

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

  if (loading) {
    return (
      <View style={styles.outerWrapper}>
        <View style={styles.container}>
          <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
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

            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  const renderHeader = () => {
    return (
      <>
        {/* Search Bar */}
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

        {/* Business Categories */}
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
          <Text style={styles.title}>
            {isLockedCustomer ? 'Your Shop' : 'Popular Businesses'}
          </Text>
        </View>
      </>
    );
  };

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          {/* App Bar */}
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

          {/* Main Content */}
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
                colors={['#4A90E2']}
                tintColor="#4A90E2"
                title="Pull to refresh"
                titleColor="#666"
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

export default CustomerHomeScreen;

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
  title: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
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
