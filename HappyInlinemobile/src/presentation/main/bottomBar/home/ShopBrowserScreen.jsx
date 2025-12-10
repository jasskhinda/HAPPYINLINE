import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllShops } from '../../../../lib/shopAuth';
import { getCurrentUser } from '../../../../lib/auth';
import { useFocusEffect } from '@react-navigation/native';

const ShopBrowserScreen = ({ navigation }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, topRated, nearby, pending, rejected, approved
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasOwnBusiness, setHasOwnBusiness] = useState(false);

  // Keep status bar as dark-content for light background
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      return () => {
        StatusBar.setBarStyle('dark-content');
      };
    }, [])
  );

  useEffect(() => {
    checkUserRole();
  }, []);

  // Load shops when filter changes OR when isSuperAdmin state changes
  useEffect(() => {
    loadShops();
  }, [selectedFilter, isSuperAdmin]);

  const checkUserRole = async () => {
    try {
      const { profile } = await getCurrentUser();
      setIsSuperAdmin(profile?.role === 'super_admin');

      // Check if user owns a business (one business per account rule)
      if (profile?.id) {
        const { supabase } = await import('../../../../lib/supabase');
        const { data: existingShops } = await supabase
          .from('shops')
          .select('id')
          .eq('created_by', profile.id)
          .limit(1);

        setHasOwnBusiness(existingShops && existingShops.length > 0);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadShops = async () => {
    try {
      setLoading(true);
      console.log('🏪 ShopBrowserScreen loadShops - isSuperAdmin:', isSuperAdmin, 'selectedFilter:', selectedFilter);

      const filters = {};

      // Super admin should see all shops regardless of is_active status
      if (isSuperAdmin) {
        filters.includeAll = true;
        console.log('🔑 Super admin detected - setting includeAll=true');
      }

      // Apply filters based on selection
      if (selectedFilter === 'topRated') {
        filters.minRating = 4.0;
      } else if (selectedFilter === 'pending') {
        filters.status = 'pending_review';
      } else if (selectedFilter === 'rejected') {
        filters.status = 'rejected';
      } else if (selectedFilter === 'approved') {
        filters.status = 'approved';
      }

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      console.log('🔍 Calling getAllShops with filters:', JSON.stringify(filters));
      const { success, shops: shopsData, error } = await getAllShops(filters);

      if (success) {
        setShops(shopsData || []);
      } else {
        console.error('Error loading shops:', error);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadShops();
  };

  const handleSearch = () => {
    loadShops();
  };

  const handleShopPress = (shop) => {
    if (isSuperAdmin) {
      navigation.navigate('AdminBusinessDetailsScreen', { shopId: shop.id });
    } else {
      navigation.navigate('ShopDetailsScreen', { shopId: shop.id });
    }
  };

  const handleCreateShop = () => {
    navigation.navigate('CreateShopScreen');
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`full-${i}`} name="star" size={14} color="#FFD700" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color="#FFD700" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FFD700" />);
    }

    return stars;
  };

  const renderShopCard = (shop) => (
    <TouchableOpacity
      key={shop.id}
      style={styles.shopCard}
      onPress={() => handleShopPress(shop)}
      activeOpacity={0.8}
    >
      {/* Shop Cover/Logo */}
      <View style={styles.shopImageContainer}>
        {shop.cover_image_url || shop.logo_url ? (
          <Image
            source={{ uri: shop.cover_image_url || shop.logo_url }}
            style={styles.shopImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.shopImage, styles.placeholderImage]}>
            <Ionicons name="storefront" size={50} color="#CCCCCC" />
          </View>
        )}

        {/* Status Badge for Super Admin */}
        {isSuperAdmin && (
          <View style={[
            styles.statusBadge,
            shop.status === 'approved' && styles.statusApproved,
            shop.status === 'pending_review' && styles.statusPending,
            shop.status === 'rejected' && styles.statusRejected,
          ]}>
            <Text style={styles.statusText}>
              {shop.status === 'approved' ? 'APPROVED' :
               shop.status === 'pending_review' ? 'PENDING' :
               shop.status === 'rejected' ? 'REJECTED' : 'UNKNOWN'}
            </Text>
          </View>
        )}
      </View>

      {/* Shop Info */}
      <View style={styles.shopInfo}>
        <Text style={styles.shopName} numberOfLines={1}>
          {shop.name}
        </Text>

        {/* Rating */}
        {shop.rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {shop.rating.toFixed(1)} ({shop.total_reviews || 0})
            </Text>
          </View>
        )}

        {/* Address */}
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.addressText} numberOfLines={1}>
            {shop.city || shop.address || 'Location not specified'}
          </Text>
        </View>

        {/* Description */}
        {shop.description && (
          <Text style={styles.description} numberOfLines={2}>
            {shop.description}
          </Text>
        )}

        {/* View Details Button with Gradient */}
        <TouchableOpacity
          onPress={() => handleShopPress(shop)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewDetailsButton}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.outerContainer}>
      {/* White background for status bar area */}
      <View style={{ backgroundColor: '#FFFFFF', flex: 0 }}>
        <SafeAreaView edges={['top']}>
          {/* Header with Red Gradient */}
          <LinearGradient
            colors={['#4A90E2', '#3A7BC8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
        <View>
          <Text style={styles.title}>
            {isSuperAdmin ? 'Manage Listings' : 'Discover Shops'}
          </Text>
          <Text style={styles.subtitle}>
            {isSuperAdmin ? 'Review and manage all business listings' : 'Find the perfect service for you'}
          </Text>
        </View>
        {!isSuperAdmin && !hasOwnBusiness && (
          <TouchableOpacity style={styles.createShopButtonWrapper} onPress={handleCreateShop}>
            <View style={styles.createShopButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}
          </LinearGradient>
        </SafeAreaView>
      </View>

      {/* Search Bar - Clean White */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, city, or category..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              loadShops();
            }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
              {isSuperAdmin ? 'All Listings' : 'All Shops'}
            </Text>
          </TouchableOpacity>

          {isSuperAdmin ? (
            /* Super Admin Filters */
            <>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'pending' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('pending')}
              >
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={selectedFilter === 'pending' ? '#FFFFFF' : '#4A90E2'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.filterText, selectedFilter === 'pending' && styles.filterTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'rejected' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('rejected')}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={14}
                  color={selectedFilter === 'rejected' ? '#FFFFFF' : '#4A90E2'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.filterText, selectedFilter === 'rejected' && styles.filterTextActive]}>
                  Rejected
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'approved' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('approved')}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color={selectedFilter === 'approved' ? '#FFFFFF' : '#4A90E2'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.filterText, selectedFilter === 'approved' && styles.filterTextActive]}>
                  Approved
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Regular User Filters */
            <>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'topRated' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('topRated')}
              >
                <Ionicons
                  name="star"
                  size={14}
                  color={selectedFilter === 'topRated' ? '#FFFFFF' : '#4A90E2'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.filterText, selectedFilter === 'topRated' && styles.filterTextActive]}>
                  Top Rated
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'nearby' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('nearby')}
              >
                <Ionicons
                  name="location"
                  size={14}
                  color={selectedFilter === 'nearby' ? '#FFFFFF' : '#4A90E2'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.filterText, selectedFilter === 'nearby' && styles.filterTextActive]}>
                  Nearby
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* Shops List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      ) : shops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={100} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>
            {isSuperAdmin ? 'No Listings Found' : 'No Shops Found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try adjusting your search or filter'
              : isSuperAdmin
                ? 'No businesses match the selected filter'
                : 'Be the first to create a shop!'}
          </Text>
          {!isSuperAdmin && !hasOwnBusiness && (
            <TouchableOpacity onPress={handleCreateShop} activeOpacity={0.9}>
              <LinearGradient
                colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createShopButtonLarge}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
                <Text style={styles.createShopButtonText}>Create Your Shop</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.shopsContainer}>
            {shops.map(renderShopCard)}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  createShopButtonWrapper: {
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createShopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#000000',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: '#FFFFFF',
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
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F8F9FA',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  createShopButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createShopButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  shopsContainer: {
    padding: 20,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  shopImageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    backgroundColor: '#F5F5F5',
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: '#000000',
  },
  statusPending: {
    backgroundColor: '#4A90E2',
  },
  statusRejected: {
    backgroundColor: '#666666',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  shopInfo: {
    padding: 20,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 6,
    fontWeight: '600',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
    letterSpacing: 0.5,
  },
});

export default ShopBrowserScreen;