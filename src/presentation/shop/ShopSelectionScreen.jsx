import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  getMyShops, 
  setCurrentShopId, 
  createShop 
} from '../../lib/shopAuth';

const ShopSelectionScreen = ({ navigation }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserShops();
  }, []);

  const loadUserShops = async () => {
    try {
      setLoading(true);
      const { shops: userShops, error } = await getMyShops();
      
      if (!error) {
        setShops(userShops || []);
      } else {
        console.error('Error loading shops:', error);
        Alert.alert('Error', error || 'Failed to load shops');
      }
    } catch (error) {
      console.error('Unexpected error loading shops:', error);
      Alert.alert('Error', 'Failed to load shops');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleShopSelect = async (shopId) => {
    try {
      const success = await setCurrentShopId(shopId);
      if (success) {
        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainScreen' }],
        });
      } else {
        Alert.alert('Error', 'Failed to select shop');
      }
    } catch (error) {
      console.error('Error selecting shop:', error);
      Alert.alert('Error', 'Failed to select shop');
    }
  };

  const handleCreateShop = () => {
    navigation.navigate('CreateShopScreen');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserShops();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return '#4CAF50';
      case 'manager': return '#FF9800';
      case 'barber': return '#2196F3';
      default: return '#757575';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return 'crown';
      case 'manager': return 'people';
      case 'barber': return 'cut';
      default: return 'person';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your shops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainScreen' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Shop</Text>
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.subtitle}>Choose which shop you'd like to access</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      >
        {shops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Shops Found</Text>
            <Text style={styles.emptySubtitle}>
              You're not a member of any shops yet.{'\n'}
              Create your own shop to get started!
            </Text>
          </View>
        ) : (
          <View style={styles.shopsContainer}>
            {shops.map((shop) => (
              <TouchableOpacity
                key={shop.shop_id}
                style={styles.shopCard}
                onPress={() => handleShopSelect(shop.shop_id)}
                activeOpacity={0.7}
              >
                <View style={styles.shopHeader}>
                  <View style={styles.shopInfo}>
                    <Text style={styles.shopName}>{shop.shop_name}</Text>
                    <View style={styles.roleContainer}>
                      <Ionicons 
                        name={getRoleIcon(shop.user_role)} 
                        size={16} 
                        color={getRoleColor(shop.user_role)} 
                      />
                      <Text style={[styles.roleText, { color: getRoleColor(shop.user_role) }]}>
                        {shop.user_role.charAt(0).toUpperCase() + shop.user_role.slice(1)}
                      </Text>
                      {shop.is_owner && (
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>OWNER</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Create Shop Button */}
        <TouchableOpacity
          style={styles.createShopButton}
          onPress={handleCreateShop}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={styles.createShopText}>Create New Shop</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can switch between shops anytime from the profile menu
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginLeft: 40,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  shopsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  ownerBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  ownerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  createShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  createShopText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ShopSelectionScreen;