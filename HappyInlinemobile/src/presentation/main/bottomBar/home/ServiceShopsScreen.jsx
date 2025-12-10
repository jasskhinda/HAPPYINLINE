import { FlatList, Image, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getShopsByService } from '../../../../lib/shopAuth';
import ShopStatusBadge from '../../../../components/shop/ShopStatusBadge';

const ServiceShopsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { serviceId, serviceName, serviceIcon } = route.params;

  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchShopsWithService();
  }, [serviceId]);

  useEffect(() => {
    filterShops();
  }, [searchQuery, shops]);

  const fetchShopsWithService = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching shops with service:', serviceName);

      const { success, shops: shopsWithService } = await getShopsByService(serviceId);
      if (success && shopsWithService) {
        console.log(`✅ Found ${shopsWithService.length} shops offering ${serviceName}`);
        setShops(shopsWithService);
        setFilteredShops(shopsWithService);
      }
    } catch (error) {
      console.error('❌ Error fetching shops:', error);
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
      shop.address?.toLowerCase().includes(query)
    );
    setFilteredShops(filtered);
  };

  const handleShopPress = (shopId) => {
    navigation.navigate('ShopDetailsScreen', { shopId });
  };

  const renderShopItem = ({ item }) => (
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
          <Ionicons name="storefront" size={40} color="#DDD" />
        </View>
      )}

      {/* Shop Info */}
      <View style={styles.shopInfo}>
        <View style={styles.shopHeader}>
          <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
          <ShopStatusBadge shopId={item.id} compact={true} />
        </View>

        {item.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.shopAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}

        {item.phone && (
          <View style={styles.phoneRow}>
            <Ionicons name="call" size={14} color="#666" />
            <Text style={styles.shopPhone}>{item.phone}</Text>
          </View>
        )}

        {item.rating !== undefined && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>
              {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
            </Text>
            {item.total_reviews > 0 && (
              <Text style={styles.reviewCount}>({item.total_reviews})</Text>
            )}
          </View>
        )}
      </View>

      {/* Arrow Icon */}
      <Ionicons name="chevron-forward" size={24} color="#DDD" />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sad-outline" size={60} color="#DDD" />
      <Text style={styles.emptyTitle}>No shops found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `No shops matching "${searchQuery}" offer this service`
          : `No shops currently offer ${serviceName}`
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
              {serviceIcon && (
                <Image source={{ uri: serviceIcon }} style={styles.headerIcon} resizeMode="contain" />
              )}
              <Text style={styles.headerTitle} numberOfLines={1}>{serviceName}</Text>
            </View>
            <View style={styles.backButton} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Finding shops...</Text>
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
            {serviceIcon && (
              <Image source={{ uri: serviceIcon }} style={styles.headerIcon} resizeMode="contain" />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>{serviceName}</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops..."
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
            {filteredShops.length} {filteredShops.length === 1 ? 'shop' : 'shops'} found
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
  headerIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
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
  },
  shopInfo: {
    flex: 1,
    marginLeft: 12,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  shopPhone: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
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

export default ServiceShopsScreen;
