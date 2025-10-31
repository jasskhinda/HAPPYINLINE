import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllServices } from '../../lib/shopAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * ServiceSelectorModal - For CreateShop Flow
 * Shows all services from global catalog
 * User can select multiple services with prices
 * Returns service data (not saved to DB yet, shop doesn't exist)
 */
const ServiceSelectorModalCreateShop = ({ visible, onClose, onServicesSelected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allServices, setAllServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [customPrices, setCustomPrices] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadAllServices();
      setSelectedServices(new Set());
      setCustomPrices({});
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredServices(allServices);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allServices.filter(service =>
        service.name.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query) ||
        service.category?.toLowerCase().includes(query)
      );
      setFilteredServices(filtered);
    }
  }, [searchQuery, allServices]);

  const loadAllServices = async () => {
    try {
      setLoading(true);
      const result = await getAllServices();

      if (result.success) {
        setAllServices(result.services);
        setFilteredServices(result.services);
      } else {
        Alert.alert('Error', result.error || 'Failed to load services');
      }
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceSelection = (service) => {
    const newSelected = new Set(selectedServices);
    
    if (newSelected.has(service.id)) {
      newSelected.delete(service.id);
      const newPrices = { ...customPrices };
      delete newPrices[service.id];
      setCustomPrices(newPrices);
    } else {
      newSelected.add(service.id);
      setCustomPrices(prev => ({
        ...prev,
        [service.id]: ''
      }));
    }
    
    setSelectedServices(newSelected);
  };

  const updateCustomPrice = (serviceId, price) => {
    setCustomPrices(prev => ({
      ...prev,
      [serviceId]: price
    }));
  };

  const handleAddSelectedServices = () => {
    if (selectedServices.size === 0) {
      Alert.alert('No Selection', 'Please select at least one service');
      return;
    }

    // Validate all selected services have prices
    const servicesData = Array.from(selectedServices).map(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      const price = customPrices[serviceId];
      
      if (!price || isNaN(price) || parseFloat(price) <= 0) {
        return null;
      }
      
      return {
        service_id: service.id,
        name: service.name,
        description: service.description,
        duration: service.default_duration,
        category: service.category,
        icon_url: service.image_url,
        price: parseFloat(price)
      };
    });

    if (servicesData.some(item => item === null)) {
      Alert.alert('Invalid Price', 'Please enter valid prices for all selected services');
      return;
    }

    // Return services data to parent
    onServicesSelected(servicesData);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedServices(new Set());
    setCustomPrices({});
    onClose();
  };

  const renderServiceItem = ({ item }) => {
    const isSelected = selectedServices.has(item.id);
    const customPrice = customPrices[item.id] || '';

    return (
      <TouchableOpacity
        style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
        onPress={() => toggleServiceSelection(item)}
      >
        {/* Checkbox */}
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={20} color="#FFA500" />}
        </View>

        {/* Service Icon */}
        {item.icon_url ? (
          <Image source={{ uri: item.icon_url }} style={styles.serviceIcon} />
        ) : (
          <View style={[styles.serviceIcon, styles.placeholderIcon]}>
            <Ionicons name="cut-outline" size={24} color="#999" />
          </View>
        )}
        
        {/* Service Info */}
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.serviceDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.serviceDetails}>
            {item.category && (
              <Text style={styles.serviceCategory}>{item.category}</Text>
            )}
            <Text style={styles.serviceDuration}>
              {item.default_duration} min
            </Text>
          </View>

          {/* Price Input (only if selected) */}
          {isSelected && (
            <View style={styles.priceInputContainer}>
              <Text style={styles.priceLabel}>Price:</Text>
              <TextInput
                style={styles.priceInput}
                value={customPrice}
                onChangeText={(text) => updateCustomPrice(item.id, text)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                onPressIn={(e) => e.stopPropagation()}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.listViewContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Select Services</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search services..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            {/* Selection Counter */}
            {selectedServices.size > 0 && (
              <View style={styles.selectionCounter}>
                <Text style={styles.selectionCounterText}>
                  {selectedServices.size} service(s) selected
                </Text>
              </View>
            )}

            {/* Services List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFA500" />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            ) : filteredServices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cut-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No services found</Text>
                <Text style={styles.emptySubtext}>Try a different search</Text>
              </View>
            ) : (
              <FlatList
                data={filteredServices}
                renderItem={renderServiceItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
              />
            )}

            {/* Bottom Button */}
            <SafeAreaView edges={['bottom']}>
               <View style={styles.bottomButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.bottomButton,
                    selectedServices.size === 0 && styles.bottomButtonDisabled
                  ]}
                  onPress={handleAddSelectedServices}
                  disabled={selectedServices.size === 0}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                  <Text style={styles.bottomButtonText}>
                    Add Selected Services ({selectedServices.size})
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingTop: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
  },

  listViewContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 15,
    paddingRight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  selectionCounter: {
    backgroundColor: '#FFF5E6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectionCounterText: {
    color: '#FFA500',
    fontWeight: '600',
    textAlign: 'center',
  },

  listContent: {
    paddingBottom: 20,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  serviceItemSelected: {
    borderColor: '#FFA500',
    backgroundColor: '#FFF5E6',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxSelected: {
    borderColor: '#FFA500',
    backgroundColor: '#FFF',
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderIcon: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 10,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#FFA500',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  serviceDuration: {
    fontSize: 12,
    color: '#666',
  },

  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFA500',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#FFF',
  },

  bottomButtonContainer: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  bottomButton: {
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  bottomButtonDisabled: {
    backgroundColor: '#CCC',
  },
  bottomButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default ServiceSelectorModalCreateShop;
