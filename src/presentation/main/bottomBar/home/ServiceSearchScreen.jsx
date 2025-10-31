import { FlatList, StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import ProviderCard from './component/ProviderCard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchBarbers } from '../../../../lib/auth';

const ServiceSearchScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { serviceName, filteredBarbers: initialBarbers } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [barbers, setBarbers] = useState(initialBarbers || []);
  const [loading, setLoading] = useState(!initialBarbers);

  // Fetch barbers if not passed from previous screen
  useEffect(() => {
    if (!initialBarbers) {
      loadBarbers();
    }
  }, []);

  const loadBarbers = async () => {
    try {
      setLoading(true);
      const result = await fetchBarbers();
      if (result.success) {
        // Filter barbers by service
        const filtered = result.data.filter(barber => {
          return barber.services && barber.services.some(service => 
            service.toLowerCase().includes(serviceName.toLowerCase()) ||
            serviceName.toLowerCase().includes(service.toLowerCase())
          );
        });
        setBarbers(filtered);
      }
    } catch (error) {
      console.error('❌ Error loading barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time filtering based on search query
  const filteredBarbers = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return barbers;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return barbers.filter(barber =>
      barber.name?.toLowerCase().includes(query)
    );
  }, [searchQuery, barbers]);

  const handleBarberPress = (barber) => {
    navigation.navigate('ProviderProfileScreen', { provider: barber });
  };

  const renderBarberItem = ({ item }) => (
    <ProviderCard
      provider={item}
      onPress={() => handleBarberPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="search-outline" size={80} color="#DDD" />
      <Text style={styles.emptyStateTitle}>No barbers found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchQuery 
          ? `No barbers match "${searchQuery}"`
          : `No barbers available for ${serviceName}`
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search {serviceName} Barbers</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading barbers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            placeholder={`Search ${serviceName.toLowerCase()} barbers...`}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
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

      {/* Result Count */}
      {searchQuery.trim() !== '' && !loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {filteredBarbers.length > 0 
              ? `Found ${filteredBarbers.length} barber${filteredBarbers.length !== 1 ? 's' : ''}`
              : 'No results found'
            }
          </Text>
        </View>
      )}

      {/* Barbers List */}
      <FlatList
        data={filteredBarbers}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderBarberItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};

export default ServiceSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
