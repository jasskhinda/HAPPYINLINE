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
import { getAvailableServicesForShop, uploadImage } from '../../lib/shopAuth';

/**
 * ServiceSelectorModal - Global Catalog Approach
 * MODE 1: Select existing service from global catalog + set custom price
 * MODE 2: Create new service (adds to global catalog) + set custom price
 */
const ServiceSelectorModal = ({ visible, onClose, onSelectExisting, onCreateNew, shopId }) => {
  const [mode, setMode] = useState('select'); // 'select' or 'create'
  const [searchQuery, setSearchQuery] = useState('');
  const [availableServices, setAvailableServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // For selecting existing service
  const [selectedService, setSelectedService] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  
  // For creating new service
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_duration: '',
    custom_price: '',
    category: '',
    image_url: null,
  });
  const [errors, setErrors] = useState({});

  // Load available services when modal opens in select mode
  useEffect(() => {
    if (visible && mode === 'select' && shopId) {
      loadAvailableServices();
    }
  }, [visible, mode, shopId]);

  // Filter services based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredServices(availableServices);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = availableServices.filter(service =>
        service.name.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query) ||
        service.category?.toLowerCase().includes(query)
      );
      setFilteredServices(filtered);
    }
  }, [searchQuery, availableServices]);

  const loadAvailableServices = async () => {
    try {
      setLoading(true);
      const { success, services, error } = await getAvailableServicesForShop(shopId);
      if (success) {
        setAvailableServices(services || []);
        setFilteredServices(services || []);
      } else {
        Alert.alert('Error', error || 'Failed to load services');
      }
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (shopId) {
          setUploadingImage(true);
          const { success, url, error } = await uploadImage(
            result.assets[0].uri,
            'service-icons',
            `shop_${shopId}`
          );

          if (success && url) {
            handleInputChange('image_url', url);
            Alert.alert('Success', 'Image uploaded');
          } else {
            Alert.alert('Error', error || 'Upload failed');
          }
          setUploadingImage(false);
        } else {
          handleInputChange('image_url', result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploadingImage(false);
    }
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    setCustomPrice('');
  };

  const handleConfirmSelection = () => {
    if (!customPrice || isNaN(customPrice) || parseFloat(customPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    onSelectExisting(selectedService.id, parseFloat(customPrice));
    handleClose();
  };

  const validateCreateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.default_duration || parseInt(formData.default_duration) <= 0) {
      newErrors.default_duration = 'Valid duration required';
    }
    if (!formData.custom_price || parseFloat(formData.custom_price) <= 0) {
      newErrors.custom_price = 'Valid price required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateService = () => {
    if (!validateCreateForm()) return;

    const serviceData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      default_duration: parseInt(formData.default_duration),
      custom_price: parseFloat(formData.custom_price),
      category: formData.category.trim(),
      image_url: formData.image_url,
    };

    onCreateNew(serviceData);
    handleClose();
  };

  const handleClose = () => {
    setMode('select');
    setSearchQuery('');
    setSelectedService(null);
    setCustomPrice('');
    setFormData({
      name: '',
      description: '',
      default_duration: '',
      custom_price: '',
      category: '',
      image_url: null,
    });
    setErrors({});
    onClose();
  };

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => handleSelectService(item)}
      activeOpacity={0.7}
    >
      <View style={styles.serviceCardContent}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.serviceIcon} />
        ) : (
          <View style={styles.serviceIconPlaceholder}>
            <Ionicons name="cut" size={24} color="#FF6B35" />
          </View>
        )}
        
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.serviceDetails}>
            <Text style={styles.serviceDuration}>{item.default_duration} min</Text>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="add-circle" size={28} color="#FF6B35" />
      </View>
    </TouchableOpacity>
  );

  // Price input modal for selected service
  if (selectedService) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.priceModal}>
            <Text style={styles.priceModalTitle}>Set Your Price</Text>
            <Text style={styles.priceModalService}>{selectedService.name}</Text>
            <Text style={styles.priceModalHint}>
              Suggested duration: {selectedService.default_duration} min
            </Text>

            <View style={styles.priceInputGroup}>
              <Text style={styles.label}>Your Custom Price ($)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={customPrice}
                onChangeText={setCustomPrice}
                autoFocus
              />
            </View>

            <View style={styles.priceModalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setSelectedService(null)}
              >
                <Text style={styles.buttonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleConfirmSelection}
              >
                <Text style={styles.buttonTextPrimary}>Add Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === 'select' ? 'Select Service' : 'Create New Service'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'select' && styles.modeButtonActive]}
              onPress={() => setMode('select')}
            >
              <Ionicons name="list" size={20} color={mode === 'select' ? '#FFF' : '#666'} />
              <Text style={[styles.modeButtonText, mode === 'select' && styles.modeButtonTextActive]}>
                Select Existing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, mode === 'create' && styles.modeButtonActive]}
              onPress={() => setMode('create')}
            >
              <Ionicons name="create" size={20} color={mode === 'create' ? '#FFF' : '#666'} />
              <Text style={[styles.modeButtonText, mode === 'create' && styles.modeButtonTextActive]}>
                Create New
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'select' ? (
            // SELECT MODE
            <View style={styles.selectContainer}>
              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search services..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Services List */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF6B35" />
                  <Text style={styles.loadingText}>Loading services...</Text>
                </View>
              ) : filteredServices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={60} color="#DDD" />
                  <Text style={styles.emptyTitle}>No services found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery ? 'Try a different search' : 'No services available yet'}
                  </Text>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setMode('create')}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFF" />
                    <Text style={styles.createButtonText}>Create New Service</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={filteredServices}
                  renderItem={renderServiceItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.servicesList}
                />
              )}
            </View>
          ) : (
            // CREATE MODE
            <ScrollView style={styles.createContainer} contentContainerStyle={styles.form}>
              {/* Image */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Image (Optional)</Text>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="large" color="#FF6B35" />
                  ) : formData.image_url ? (
                    <Image source={{ uri: formData.image_url }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#999" />
                      <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="e.g., Haircut"
                  placeholderTextColor="#999"
                  value={formData.name}
                  onChangeText={(v) => handleInputChange('name', v)}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the service..."
                  placeholderTextColor="#999"
                  value={formData.description}
                  onChangeText={(v) => handleInputChange('description', v)}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Hair, Beard, Grooming"
                  placeholderTextColor="#999"
                  value={formData.category}
                  onChangeText={(v) => handleInputChange('category', v)}
                />
              </View>

              {/* Duration */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Default Duration (minutes) *</Text>
                <TextInput
                  style={[styles.input, errors.default_duration && styles.inputError]}
                  placeholder="30"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={formData.default_duration}
                  onChangeText={(v) => handleInputChange('default_duration', v)}
                />
                {errors.default_duration && (
                  <Text style={styles.errorText}>{errors.default_duration}</Text>
                )}
              </View>

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Price ($) *</Text>
                <TextInput
                  style={[styles.input, errors.custom_price && styles.inputError]}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={formData.custom_price}
                  onChangeText={(v) => handleInputChange('custom_price', v)}
                />
                {errors.custom_price && (
                  <Text style={styles.errorText}>{errors.custom_price}</Text>
                )}
              </View>

              {/* Create Button */}
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateService}>
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Create & Add to Shop</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modeToggle: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#FF6B35',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#FFF',
  },
  selectContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  servicesList: {
    padding: 15,
    paddingTop: 0,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  serviceIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 15,
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
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#999',
  },
  categoryBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  createContainer: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#FF6B35',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF6B35',
    fontSize: 12,
    marginTop: 4,
  },
  imagePicker: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#999',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  priceModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 20,
    marginBottom: '50%',
  },
  priceModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  priceModalService: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 5,
  },
  priceModalHint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 25,
  },
  priceInputGroup: {
    marginBottom: 25,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
  },
  priceModalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  buttonPrimary: {
    backgroundColor: '#FF6B35',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ServiceSelectorModal;
