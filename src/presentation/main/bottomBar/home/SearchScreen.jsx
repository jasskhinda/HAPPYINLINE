import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAllShops, isShopOpen } from '../../../../lib/shopAuth';
import ShopStatusBadge from '../../../../components/shop/ShopStatusBadge';

const SearchScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      setLoading(true);
      console.log('🔍 SearchScreen: Loading all businesses...');
      const result = await getAllShops();
      if (result.success) {
        console.log(`✅ Loaded ${result.shops?.length || 0} businesses`);
        setShops(result.shops || []);
      }
    } catch (error) {
      console.error('❌ Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter shops based on search query
  const filteredShops = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return shops;
    }

    const query = searchQuery.toLowerCase().trim();
    return shops.filter(shop => {
      const nameMatch = shop.name?.toLowerCase().includes(query);
      const addressMatch = shop.address?.toLowerCase().includes(query);
      const cityMatch = shop.city?.toLowerCase().includes(query);
      const descriptionMatch = shop.description?.toLowerCase().includes(query);
      return nameMatch || addressMatch || cityMatch || descriptionMatch;
    });
  }, [searchQuery, shops]);

  const handleShopPress = useCallback((shopId) => {
    navigation.navigate('ShopDetailsScreen', { shopId });
  }, [navigation]);

  const renderShopItem = useCallback(({ item }) => {
    const shopIsOpen = isShopOpen(item);

    return (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={() => handleShopPress(item.id)}
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

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.emptyText}>Loading businesses...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && filteredShops.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color="#DDD" />
          <Text style={styles.emptyTitle}>No businesses found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with a different name or location
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={80} color="#DDD" />
        <Text style={styles.emptyTitle}>Search for businesses</Text>
        <Text style={styles.emptySubtitle}>
          Search by business name, service, or location
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header with Back Button and Search Input */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses or services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
            autoCapitalize="none"
            returnKeyType="search"
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results Header */}
      {searchQuery.trim() !== '' && !loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredShops.length > 0
              ? `Found ${filteredShops.length} business${filteredShops.length !== 1 ? 'es' : ''}`
              : 'No results found'
            }
          </Text>
        </View>
      )}

      {/* Businesses List */}
      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderShopItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
});
