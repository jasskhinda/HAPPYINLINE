import { FlatList, Image, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUser } from '../../../../lib/auth';
import { getAllShops } from '../../../../lib/shopAuth';

const SuperAdminHomeScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentListings, setRecentListings] = useState([]);

  // Fetch data
  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      // Fetch user profile
      const { user, profile } = await getCurrentUser();
      if (profile) {
        setUserName(profile.name || profile.email || 'User');
      }

      // Fetch recent listings (last 5 shops)
      const shopsResult = await getAllShops();
      if (shopsResult.success) {
        const allShops = shopsResult.shops || [];
        // Sort by created_at descending and take first 5
        const recent = allShops
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        setRecentListings(recent);
      }

    } catch (error) {
      console.error('❌ Error fetching admin data:', error);
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

  // Get status display info
  const getStatusInfo = (status) => {
    const statusMap = {
      'draft': { label: 'Draft', color: '#9E9E9E', icon: 'document-outline' },
      'pending_review': { label: 'Pending', color: '#FF9800', icon: 'time-outline' },
      'pending_approval': { label: 'Pending', color: '#FF9800', icon: 'time-outline' },
      'approved': { label: 'Approved', color: '#4CAF50', icon: 'checkmark-circle' },
      'active': { label: 'Active', color: '#4CAF50', icon: 'checkmark-circle' },
      'rejected': { label: 'Rejected', color: '#F44336', icon: 'close-circle' },
      'suspended': { label: 'Suspended', color: '#9E9E9E', icon: 'ban' },
    };
    return statusMap[status] || { label: status || 'Unknown', color: '#9E9E9E', icon: 'help-circle-outline' };
  };

  // Render listing card
  const ListingCard = ({ listing }) => {
    const statusInfo = getStatusInfo(listing.status);

    return (
      <TouchableOpacity
        style={styles.listingCard}
        onPress={() => navigation.navigate('AdminBusinessDetailsScreen', {
          shopId: listing.id,
        })}
        activeOpacity={0.7}
      >
        {/* Business Logo */}
        {listing.logo_url ? (
          <Image source={{ uri: listing.logo_url }} style={styles.listingLogo} />
        ) : (
          <View style={[styles.listingLogo, styles.listingLogoPlaceholder]}>
            <Ionicons name="storefront" size={32} color="#4A90E2" />
          </View>
        )}

        {/* Business Info */}
        <View style={styles.listingInfo}>
          <Text style={styles.listingName} numberOfLines={1}>{listing.name}</Text>

          <View style={styles.listingMeta}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.listingMetaText} numberOfLines={1}>
              {listing.city || 'No location'}
            </Text>
          </View>

          <View style={styles.listingMeta}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.listingMetaText}>
              {new Date(listing.created_at).toLocaleDateString()}
            </Text>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.outerWrapper}>
        <View style={styles.container}>
          <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
            <View style={styles.header}>
              <Image
                source={require('../../../../../assets/logowithouttagline.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerGreeting}>Admin Dashboard</Text>
                <Text style={styles.headerName}>Loading...</Text>
              </View>
            </View>

            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
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
          {/* HEADER */}
          <View style={styles.header}>
            <Image
              source={require('../../../../../assets/logowithouttagline.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerGreeting}>Welcome back</Text>
              <Text style={styles.headerName}>{userName}</Text>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#4A90E2" />
                <Text style={styles.adminBadgeText}>Super Admin</Text>
              </View>
            </View>
          </View>

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
            {/* MAIN ACTIONS */}
            <View style={styles.section}>
              {/* Manage Listings Button */}
              <TouchableOpacity
                style={styles.primaryActionCard}
                onPress={() => navigation.navigate('ShopBrowserScreen')}
                activeOpacity={0.7}
              >
                <View style={styles.primaryActionIcon}>
                  <Ionicons name="storefront" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.primaryActionContent}>
                  <Text style={styles.primaryActionTitle}>Manage Listings</Text>
                  <Text style={styles.primaryActionSubtitle}>
                    View, approve, and manage all business listings
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Payment Tracking Button */}
              <TouchableOpacity
                style={[styles.primaryActionCard, { backgroundColor: '#34C759' }]}
                onPress={() => navigation.navigate('PaymentTrackingScreen')}
                activeOpacity={0.7}
              >
                <View style={[styles.primaryActionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="card" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.primaryActionContent}>
                  <Text style={styles.primaryActionTitle}>Payment Tracking</Text>
                  <Text style={styles.primaryActionSubtitle}>
                    View subscriptions, payments & revenue
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Profile Settings Button */}
              <TouchableOpacity
                style={[styles.primaryActionCard, styles.profileActionCard]}
                onPress={() => navigation.navigate('ProfileScreen')}
                activeOpacity={0.7}
              >
                <View style={[styles.primaryActionIcon, styles.profileActionIcon]}>
                  <Ionicons name="person" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.primaryActionContent}>
                  <Text style={styles.primaryActionTitle}>Profile Settings</Text>
                  <Text style={styles.primaryActionSubtitle}>
                    Manage your account and preferences
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* RECENTLY ADDED LISTINGS */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Added Listings</Text>
                {recentListings.length > 0 && (
                  <TouchableOpacity onPress={() => navigation.navigate('ShopBrowserScreen')}>
                    <Text style={styles.sectionLink}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {recentListings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="storefront-outline" size={60} color="#DDD" />
                  <Text style={styles.emptyStateTitle}>No Listings Yet</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    New business listings will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.listingsContainer}>
                  {recentListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </View>
              )}
            </View>

            {/* BOTTOM SPACING */}
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#4A90E2',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerLogo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerGreeting: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionLink: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  primaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileActionCard: {
    backgroundColor: '#000000',
  },
  primaryActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileActionIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryActionContent: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  listingsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  listingLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  listingLogoPlaceholder: {
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  listingMetaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
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
