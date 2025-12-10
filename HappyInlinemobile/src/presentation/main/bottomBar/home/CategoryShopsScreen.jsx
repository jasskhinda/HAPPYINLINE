import { FlatList, Image, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../../../lib/supabase';
import { isShopOpen } from '../../../../lib/shopAuth';
import ShopStatusBadge from '../../../../components/shop/ShopStatusBadge';

const CategoryShopsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryId, categoryName, categorySlug } = route.params;

  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShopsByCategory();
  }, [categoryId]);

  useEffect(() => {
    filterShops();
  }, [searchQuery, shops]);

  const fetchShopsByCategory = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching shops in category:', categoryName);

      const { data, error } = await supabase
        .from('shops')
        .select(`
          *,
          business_types!inner (
            id,
            name,
            category_id
          )
        `)
        .eq('business_types.category_id', categoryId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shops:', error);
        setShops([]);
        setFilteredShops([]);
      } else {
        console.log(`✅ Found ${data?.length || 0} shops in ${categoryName}`);
        setShops(data || []);
        setFilteredShops(data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching shops:', error);
      setShops([]);
      setFilteredShops([]);
    } finally {
      setLoading(false);
    }
  };

  const filterShops = () => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = shops.filter(shop =>
      shop.name?.toLowerCase().includes(query) ||
      shop.address?.toLowerCase().includes(query) ||
      shop.city?.toLowerCase().includes(query)
    );
    setFilteredShops(filtered);
  };

  const handleShopPress = (shopId) => {
    navigation.navigate('ShopDetailsScreen', { shopId });
  };

  const renderShopItem = ({ item }) => {
    const shopIsOpen = isShopOpen(item);

    return (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={() => handleShopPress(item.id)}
        activeOpacity={0.7}
      >
        {/* Shop Image */}
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.shopImage} />
        ) : (
          <View style={[styles.shopImage, styles.placeholderImage]}>
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

          {item.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.shopAddress} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

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

          {item.rating !== undefined && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>
                {item.rating > 0 ? Number(item.rating).toFixed(1) : '0.0'}
              </Text>
              {item.total_reviews > 0 && (
                <Text style={styles.reviewCount}>({item.total_reviews})</Text>
              )}
            </View>
          )}
        </View>

        {/* Arrow Icon */}
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="business-outline" size={60} color="#DDD" />
      <Text style={styles.emptyTitle}>No businesses found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `No businesses matching "${searchQuery}" in this category`
          : `No businesses currently in ${categoryName}`
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
            </View>
            <View style={styles.backButton} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Finding businesses...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Shops Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredShops.length} {filteredShops.length === 1 ? 'business' : 'businesses'} found
          </Text>
        </View>

        {/* Shops List */}
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderShopItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  countContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F0',
  },
  shopInfo: {
    flex: 1,
    marginLeft: 12,
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  shopAddress: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  shopCity: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
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
});

export default CategoryShopsScreen;
