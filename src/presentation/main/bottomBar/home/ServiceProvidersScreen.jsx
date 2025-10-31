import { FlatList, Image, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import ProviderCard from './component/ProviderCard';
import { useNavigation, useRoute } from '@react-navigation/native';
import SettingAppBar from '../../../../components/appBar/SettingAppBar';
import { fetchBarbers } from '../../../../lib/auth';

const ServiceBarbersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { serviceName, serviceIcon } = route.params || {};
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  // Fetch all barbers on component mount
  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching barbers for service:', serviceName);
      
      const result = await fetchBarbers();
      if (result.success) {
        console.log('✅ All barbers loaded:', result.data.length);
        setBarbers(result.data);
      } else {
        console.error('❌ Failed to load barbers:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter barbers based on the selected service
  // Uses useMemo to prevent recalculation on every render
  const filteredBarbers = useMemo(() => {
    if (!barbers || barbers.length === 0) return [];
    
    return barbers.filter(barber => {
      // Check if barber has the selected service
      return barber.services && barber.services.some(service => 
        service.toLowerCase().includes(serviceName.toLowerCase()) ||
        serviceName.toLowerCase().includes(service.toLowerCase())
      );
    });
  }, [barbers, serviceName]);

  // Handle barber press
  const handleProviderPress = useCallback((provider) => {
    navigation.navigate('ProviderProfileScreen', { provider });
  }, [navigation]);

  // Handle search bar press - navigate to dedicated search screen
  const handleSearchPress = useCallback(() => {
    navigation.navigate('ServiceSearchScreen', {
      serviceName,
      filteredBarbers,
    });
  }, [navigation, serviceName, filteredBarbers]);

  // Render provider item (memoized)
  const renderProviderItem = useCallback(({ item }) => (
    <ProviderCard
      provider={item}
      onPress={() => handleProviderPress(item)}
    />
  ), [handleProviderPress]);

  const renderHeader = () => (
    <>
      {/* SERVICE INFO SECTION */}
      <View style={styles.serviceInfoSection}>
        <View style={styles.serviceHeader}>
          {serviceIcon ? (
            <Image 
              source={{ uri: serviceIcon }} 
              style={styles.serviceIcon}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="cut" size={24} color="#FF6B6B" />
          )}
          <Text style={styles.serviceTitle}>{serviceName}</Text>
        </View>
        <Text style={styles.serviceDescription}>
          {filteredBarbers.length} barber{filteredBarbers.length !== 1 ? 's' : ''} available for {serviceName.toLowerCase()}
        </Text>
      </View>

      {/* SEARCH BAR - Tappable (navigates to ServiceSearchScreen) */}
      <TouchableOpacity 
        style={styles.searchContainer}
        onPress={handleSearchPress}
        activeOpacity={0.7}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIconLeft} />
          <Text style={styles.searchPlaceholder}>
            Search barbers for {serviceName.toLowerCase()}
          </Text>
        </View>
      </TouchableOpacity>

      {!loading && filteredBarbers.length > 0 && (
        <Text style={styles.resultTitle}>
          Available Barbers
        </Text>
      )}
    </>
  );

  // Separate empty state component
  const renderEmptyState = () => (
    <View style={styles.noResultsContainer}>
      <Ionicons name="search-outline" size={48} color="#999" />
      <Text style={styles.noResultsTitle}>No barbers found</Text>
      <Text style={styles.noResultsDescription}>
        {searchQuery 
          ? `No barbers match "${searchQuery}" for ${serviceName.toLowerCase()}`
          : `No barbers available for ${serviceName.toLowerCase()} service`
        }
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.container}>
          <SettingAppBar title={`${serviceName} Service`} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Loading barbers...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <SettingAppBar title={`${serviceName} Service`} />
        
        <FlatList
          ref={flatListRef}
          data={filteredBarbers}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderProviderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
};

export default ServiceBarbersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  serviceInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceIcon: {
    width: 24,
    height: 24,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginLeft: 12,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
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
  resultTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  noResultsDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});