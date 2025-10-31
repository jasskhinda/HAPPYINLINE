import { FlatList, Image, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser } from '../../../../lib/auth';
import { getAllShops, isShopOpen } from '../../../../lib/shopAuth';
import ShopStatusBadge from '../../../../components/shop/ShopStatusBadge';

const SuperAdminHomeScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('Super Admin');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'active', 'rejected'

  // Stats
  const [stats, setStats] = useState({
    totalShops: 0,
    pendingShops: 0,
    activeShops: 0,
    rejectedShops: 0,
    totalUsers: 0,
  });

  // Fetch data function
  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      // Fetch user profile
      const { user, profile } = await getCurrentUser();
      if (profile) {
        setUserName(profile.name || 'Super Admin');
      }

      // Fetch all shops (super admin sees all)
      console.log('🏪 SuperAdmin: Fetching all shops...');
      const shopsResult = await getAllShops();
      if (shopsResult.success) {
        const allShops = shopsResult.shops || [];
        console.log('✅ Total shops fetched:', allShops.length);
        setShops(allShops);

        // Calculate stats
        const pending = allShops.filter(s => s.status === 'pending_approval').length;
        const active = allShops.filter(s => s.status === 'active').length;
        const rejected = allShops.filter(s => s.status === 'rejected').length;

        setStats({
          totalShops: allShops.length,
          pendingShops: pending,
          activeShops: active,
          rejectedShops: rejected,
          totalUsers: 0, // TODO: Fetch from profiles table
        });
      } else {
        console.error('❌ Error fetching shops:', shopsResult.error);
        setShops([]);
      }

    } catch (error) {
      console.error('❌ Error fetching data:', error);
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Handle shop press - navigate to ADMIN shop details view (read-only)
  const handleShopPress = useCallback((shop) => {
    // TODO: Create AdminShopDetailsScreen for read-only view with admin actions
    navigation.navigate('ShopDetailsScreen', {
      shopId: shop.id,
      adminView: true // Flag to show admin-only features
    });
  }, [navigation]);

  // Filter shops based on selected status
  const filteredShops = shops.filter(shop => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return shop.status === 'pending_approval';
    if (filterStatus === 'active') return shop.status === 'active' || !shop.status; // Show shops without status as active
    if (filterStatus === 'rejected') return shop.status === 'rejected';
    return true;
  });

  // Render stat card
  const StatCard = ({ icon, title, value, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render filter button
  const FilterButton = ({ label, status, count }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.filterButtonActive
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[
        styles.filterButtonText,
        filterStatus === status && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[
          styles.filterBadge,
          filterStatus === status && styles.filterBadgeActive
        ]}>
          <Text style={[
            styles.filterBadgeText,
            filterStatus === status && styles.filterBadgeTextActive
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render shop status badge
  const ShopStatusChip = ({ status }) => {
    let config = {
      pending_approval: { icon: 'time-outline', text: 'Pending', color: '#FF9800' },
      active: { icon: 'checkmark-circle', text: 'Active', color: '#4CAF50' },
      rejected: { icon: 'close-circle', text: 'Rejected', color: '#F44336' },
      suspended: { icon: 'ban', text: 'Suspended', color: '#9E9E9E' },
    };

    const currentStatus = status || 'active'; // Default to active if no status
    const { icon, text, color } = config[currentStatus] || config.active;

    return (
      <View style={[styles.statusChip, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.statusChipText, { color }]}>{text}</Text>
      </View>
    );
  };

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
            <Ionicons name="storefront" size={40} color="#FF6B35" />
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

          <ShopStatusChip status={item.status} />

          <Text style={styles.shopAddress} numberOfLines={1}>
            <Ionicons name="location-outline" size={14} color="#666" /> {item.address || 'No address'}
          </Text>

          {item.city && (
            <Text style={styles.shopCity} numberOfLines={1}>{item.city}</Text>
          )}

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

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="storefront-outline" size={80} color="#DDD" />
      <Text style={styles.emptyStateTitle}>No Shops Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {filterStatus === 'pending' && 'No pending shops to review'}
        {filterStatus === 'active' && 'No active shops yet'}
        {filterStatus === 'rejected' && 'No rejected shops'}
        {filterStatus === 'all' && 'No shops registered yet'}
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.outerWrapper}>
        <View style={styles.container}>
          <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
            <View style={styles.appBar}>
              <Image
                source={require('../../../../../assets/logo.png')}
                style={styles.userProfilePic}
                resizeMode="contain"
              />
              <View style={styles.userInfo}>
                <Text style={{ color: 'rgba(0, 0, 0, 0.4)' }}>Hello 👋</Text>
                <Text style={styles.userName}>Loading...</Text>
              </View>
            </View>

            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          {/* APP BAR */}
          <View style={styles.appBar}>
            <Image
              source={require('../../../../../assets/logo.png')}
              style={styles.userProfilePic}
              resizeMode="contain"
            />
            <View style={styles.userInfo}>
              <Text style={{ color: 'rgba(0, 0, 0, 0.4)' }}>Hello 👋</Text>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FF6B35" />
                <Text style={styles.adminBadgeText}>Super Admin</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="black" />
              {stats.pendingShops > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{stats.pendingShops}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredShops}
            renderItem={renderShopItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={() => (
              <View>
                {/* Platform Stats */}
                <View style={styles.statsContainer}>
                  <StatCard
                    icon="storefront"
                    title="Total Shops"
                    value={stats.totalShops}
                    color="#2196F3"
                    onPress={() => setFilterStatus('all')}
                  />
                  <StatCard
                    icon="time"
                    title="Pending"
                    value={stats.pendingShops}
                    color="#FF9800"
                    onPress={() => setFilterStatus('pending')}
                  />
                  <StatCard
                    icon="checkmark-circle"
                    title="Active"
                    value={stats.activeShops}
                    color="#4CAF50"
                    onPress={() => setFilterStatus('active')}
                  />
                  <StatCard
                    icon="close-circle"
                    title="Rejected"
                    value={stats.rejectedShops}
                    color="#F44336"
                    onPress={() => setFilterStatus('rejected')}
                  />
                </View>

                {/* Filters */}
                <View style={styles.filtersContainer}>
                  <FilterButton label="All" status="all" count={stats.totalShops} />
                  <FilterButton label="Pending" status="pending" count={stats.pendingShops} />
                  <FilterButton label="Active" status="active" count={stats.activeShops} />
                  <FilterButton label="Rejected" status="rejected" count={stats.rejectedShops} />
                </View>

                {/* Shops Header */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {filterStatus === 'all' && 'All Shops'}
                    {filterStatus === 'pending' && 'Pending Approvals'}
                    {filterStatus === 'active' && 'Active Shops'}
                    {filterStatus === 'rejected' && 'Rejected Shops'}
                  </Text>
                  <Text style={styles.sectionCount}>{filteredShops.length}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={filteredShops.length === 0 && styles.emptyList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FF6B35']}
                tintColor="#FF6B35"
              />
            }
          />
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    marginTop: 10,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  userProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  filterBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shopLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  shopLogoPlaceholder: {
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopInfo: {
    flex: 1,
    marginLeft: 16,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  shopAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  shopCity: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  shopFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
    color: '#333',
  },
  reviewsText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});

export default SuperAdminHomeScreen;
