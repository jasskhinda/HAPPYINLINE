import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAllShops } from '../../../../lib/shopAuth';

const ShopBrowserScreen = ({ navigation }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, topRated, nearby

  useEffect(() => {
    loadShops();
  }, [selectedFilter]);

  const loadShops = async () => {
    try {
      setLoading(true);
      
      const filters = {};
      if (selectedFilter === 'topRated') {
        filters.minRating = 4.0;
      }
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

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
    navigation.navigate('ShopDetailsScreen', { shopId: shop.id });
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
      activeOpacity={0.7}
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
            <Ionicons name="storefront" size={40} color="#999" />
          </View>
        )}
        {shop.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>
        )}
      </View>

      {/* Shop Info */}
      <View style={styles.shopInfo}>
        <View style={styles.shopHeader}>
          <Text style={styles.shopName} numberOfLines={1}>
            {shop.name}
          </Text>
          {shop.is_verified && (
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" style={styles.verifiedIcon} />
          )}
        </View>

        {/* Rating */}
        {shop.rating > 0 && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(shop.rating)}
            </View>
            <Text style={styles.ratingText}>
              {shop.rating.toFixed(1)} ({shop.total_reviews})
            </Text>
          </View>
        )}

        {/* Address */}
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.addressText} numberOfLines={1}>
            {shop.city || shop.address}
          </Text>
        </View>

        {/* Description */}
        {shop.description && (
          <Text style={styles.description} numberOfLines={2}>
            {shop.description}
          </Text>
        )}

        {/* View Details Button */}
        <View style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover Shops</Text>
        <TouchableOpacity style={styles.createShopButton} onPress={handleCreateShop}>
          <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops..."
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
              All Shops
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'topRated' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('topRated')}
          >
            <Ionicons 
              name="star" 
              size={14} 
              color={selectedFilter === 'topRated' ? '#FFFFFF' : '#007AFF'} 
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
              color={selectedFilter === 'nearby' ? '#FFFFFF' : '#007AFF'} 
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterText, selectedFilter === 'nearby' && styles.filterTextActive]}>
              Nearby
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Shops List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding shops...</Text>
        </View>
      ) : shops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Shops Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'Try a different search term' 
              : 'Be the first to create a shop!'}
          </Text>
          <TouchableOpacity style={styles.createShopButtonLarge} onPress={handleCreateShop}>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createShopButtonText}>Create Your Shop</Text>
          </TouchableOpacity>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createShopButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createShopButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createShopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  shopsContainer: {
    padding: 16,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  shopImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
  },
  shopInfo: {
    padding: 16,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopName: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    marginBottom: 12,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 4,
  },
});

export default ShopBrowserScreen;