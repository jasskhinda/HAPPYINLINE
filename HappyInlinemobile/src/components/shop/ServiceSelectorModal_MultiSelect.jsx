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
import * as ImagePicker from 'expo-image-picker';
import { getAllServices, addServiceToShop, createCustomService } from '../../lib/shopAuth';
import { uploadImage } from '../../lib/shopAuth';

/**
 * ServiceSelectorModal - Multi-Select with Bottom Button
 * Shows all services from global catalog
 * User can select multiple services OR create custom
 * Bottom button to confirm selection
 */
const ServiceSelectorModal = ({ visible, onClose, onServicesAdded, shopId }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allServices, setAllServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(new Set()); // Track selected service IDs
  const [customPrices, setCustomPrices] = useState({}); // Store custom price for each selected service
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // For creating custom service
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_duration: '',
    price: '',
    category: '',
    image_url: null,
  });
  const [errors, setErrors] = useState({});

  // Load all services when modal opens
  useEffect(() => {
    if (visible) {
      loadAllServices();
      setShowCreateForm(false);
      setSelectedServices(new Set());
      setCustomPrices({});
    }
  }, [visible]);

  // Filter services based on search
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
      // Deselect
      newSelected.delete(service.id);
      const newPrices = { ...customPrices };
      delete newPrices[service.id];
      setCustomPrices(newPrices);
    } else {
      // Select - set default price from service or 0
      newSelected.add(service.id);
      setCustomPrices(prev => ({
        ...prev,
        [service.id]: '' // Empty initially, user must enter
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

  const handleAddSelectedServices = async () => {
    if (selectedServices.size === 0) {
      Alert.alert('No Selection', 'Please select at least one service');
      return;
    }

    // Validate all selected services have prices
    const servicesWithPrices = Array.from(selectedServices).map(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      const price = customPrices[serviceId];
      
      if (!price || isNaN(price) || parseFloat(price) <= 0) {
        return null;
      }
      
      return {
        service,
        price: parseFloat(price)
      };
    });

    if (servicesWithPrices.some(item => item === null)) {
      Alert.alert('Invalid Price', 'Please enter valid prices for all selected services');
      return;
    }

    try {
      setAdding(true);

      // Add all selected services to shop
      const results = await Promise.all(
        servicesWithPrices.map(({ service, price }) =>
          addServiceToShop(shopId, service.id, price)
        )
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        Alert.alert('Success', `Added ${successCount} service(s) to your shop!`);
        onServicesAdded && onServicesAdded();
        handleClose();
      } else {
        Alert.alert('Error', 'Failed to add services. Please try again.');
      }

    } catch (error) {
      console.error('Error adding services:', error);
      Alert.alert('Error', 'Failed to add services');
    } finally {
      setAdding(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.Images],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUrl = await uploadImage(result.assets[0].uri, 'services');
        if (imageUrl) {
          setFormData(prev => ({ ...prev, image_url: imageUrl }));
        }
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!formData.default_duration) {
      newErrors.default_duration = 'Duration is required';
    } else if (isNaN(formData.default_duration) || parseInt(formData.default_duration) <= 0) {
      newErrors.default_duration = 'Please enter a valid duration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCustomService = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setAdding(true);

      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        default_duration: parseInt(formData.default_duration),
        category: formData.category.trim() || 'Other',
        image_url: formData.image_url || null,
      };

      const customPrice = parseFloat(formData.price);

      const result = await createCustomService(shopId, serviceData, customPrice);

      if (result.success) {
        Alert.alert('Success', 'Custom service created and added to your shop!');
        onServicesAdded && onServicesAdded();
        handleClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to create service');
      }
    } catch (error) {
      console.error('Error creating service:', error);
      Alert.alert('Error', 'Failed to create service');
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      default_duration: '',
      price: '',
      category: '',
      image_url: null,
    });
    setErrors({});
    setSearchQuery('');
    setShowCreateForm(false);
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
        <View style={styles.checkbox}>
          {isSelected && <Ionicons name="checkmark" size={20} color="#FFA500" />}
        </View>

        {/* Service Image */}
        {item.icon_url ? (
          <Image source={{ uri: item.icon_url }} style={styles.serviceImage} />
        ) : (
          <View style={[styles.serviceImage, styles.placeholderImage]}>
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
              <Text style={styles.priceLabel}>Your Price:</Text>
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

  // LIST VIEW
  const renderListView = () => (
    <View style={styles.listViewContainer}>
      {/* Header with Add Custom Button */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Services</Text>
        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={() => setShowCreateForm(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFA500" />
          <Text style={styles.addCustomButtonText}>Add Custom</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor="#999"
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
          <Text style={styles.emptySubtext}>Try a different search or create a custom service</Text>
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
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[
            styles.bottomButton,
            (selectedServices.size === 0 || adding) && styles.bottomButtonDisabled
          ]}
          onPress={handleAddSelectedServices}
          disabled={selectedServices.size === 0 || adding}
        >
          {adding ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.bottomButtonText}>
                Add Selected Services ({selectedServices.size})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // CREATE FORM VIEW
  const renderCreateForm = () => (
    <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={() => setShowCreateForm(false)}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.formTitle}>Create Custom Service</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Image Upload */}
      <TouchableOpacity style={styles.imageUploadContainer} onPress={handlePickImage}>
        {uploadingImage ? (
          <ActivityIndicator size="large" color="#FFA500" />
        ) : formData.image_url ? (
          <Image source={{ uri: formData.image_url }} style={styles.uploadedImage} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={40} color="#999" />
            <Text style={styles.imageUploadText}>Add Service Image</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Service Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Service Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="e.g., Haircut, Beard Trim"
          placeholderTextColor="#999"
          value={formData.name}
          onChangeText={(text) => handleInputChange('name', text)}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the service..."
          placeholderTextColor="#999"
          value={formData.description}
          onChangeText={(text) => handleInputChange('description', text)}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Category */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Hair, Beard, Combo"
          placeholderTextColor="#999"
          value={formData.category}
          onChangeText={(text) => handleInputChange('category', text)}
        />
      </View>

      {/* Duration & Price Row */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Duration (min) *</Text>
          <TextInput
            style={[styles.input, errors.default_duration && styles.inputError]}
            placeholder="30"
            placeholderTextColor="#999"
            value={formData.default_duration}
            onChangeText={(text) => handleInputChange('default_duration', text)}
            keyboardType="number-pad"
          />
          {errors.default_duration && <Text style={styles.errorText}>{errors.default_duration}</Text>}
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Price ($) *</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            placeholder="25.00"
            placeholderTextColor="#999"
            value={formData.price}
            onChangeText={(text) => handleInputChange('price', text)}
            keyboardType="decimal-pad"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, adding && styles.createButtonDisabled]}
        onPress={handleCreateCustomService}
        disabled={adding}
      >
        {adding ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.createButtonText}>Create & Add Service</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

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
          {showCreateForm ? renderCreateForm() : renderListView()}
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

  // LIST VIEW STYLES
  listViewContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingRight: 40, // Space for close button
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF5E6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  addCustomButtonText: {
    color: '#FFA500',
    fontWeight: '600',
    fontSize: 14,
  },

  // SEARCH
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

  // SELECTION COUNTER
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

  // SERVICE LIST
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
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
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

  // PRICE INPUT
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

  // BOTTOM BUTTON
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

  // LOADING / EMPTY STATES
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

  // CREATE FORM STYLES
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formContent: {
    paddingBottom: 30,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 40,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },

  imageUploadContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageUploadText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },

  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },

  createButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#CCC',
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ServiceSelectorModal;
