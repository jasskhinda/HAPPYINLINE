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
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/shopAuth';

/**
 * ServiceSelectorModal - Simple List Approach
 * Shows all services from database
 * User can select existing OR add custom service
 */
const ServiceSelectorModal = ({ visible, onClose, onServiceSelected, shopId }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allServices, setAllServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // For creating custom service
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    category: '',
    image_url: null,
  });
  const [errors, setErrors] = useState({});

  // Load all services when modal opens
  useEffect(() => {
    if (visible) {
      loadAllServices();
      setShowCreateForm(false); // Reset to list view
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
      
      // Get ALL services (no shop_id filter) - this shows global list
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading services:', error);
        Alert.alert('Error', 'Failed to load services');
        return;
      }

      // Remove duplicates by name (show unique services)
      const uniqueServices = [];
      const seen = new Set();
      
      services?.forEach(service => {
        if (!seen.has(service.name.toLowerCase())) {
          seen.add(service.name.toLowerCase());
          uniqueServices.push(service);
        }
      });

      setAllServices(uniqueServices);
      setFilteredServices(uniqueServices);
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectService = (service) => {
    // When user selects a service, create a copy for their shop
    const serviceData = {
      name: service.name,
      description: service.description || '',
      price: service.price || 0,
      duration: service.duration || service.default_duration || 30,
      category: service.category || '',
      image_url: service.image_url || null,
      icon_url: service.icon_url || null,
      is_active: true
    };

    // Only add shop_id if it's provided (for existing shops)
    if (shopId) {
      serviceData.shop_id = shopId;
    }

    onServiceSelected(serviceData);
    handleClose();
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

    if (!formData.duration) {
      newErrors.duration = 'Duration is required';
    } else if (isNaN(formData.duration) || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Please enter a valid duration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCustomService = () => {
    if (!validateForm()) {
      return;
    }

    // Create custom service
    const serviceData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      category: formData.category.trim() || null,
      image_url: formData.image_url || null,
      is_active: true
    };

    // Only add shop_id if it's provided (for existing shops)
    if (shopId) {
      serviceData.shop_id = shopId;
    }

    onServiceSelected(serviceData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      duration: '',
      price: '',
      category: '',
      image_url: null,
    });
    setErrors({});
    setSearchQuery('');
    setShowCreateForm(false);
    onClose();
  };

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceItem}
      onPress={() => handleSelectService(item)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.serviceImage} />
      ) : (
        <View style={[styles.serviceImage, styles.placeholderImage]}>
          <Ionicons name="cut-outline" size={24} color="#999" />
        </View>
      )}
      
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
            {item.duration || item.default_duration || 30} min
          </Text>
        </View>
      </View>

      <Ionicons name="add-circle" size={28} color="#6C63FF" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showCreateForm ? 'Add Custom Service' : 'Add Service'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {!showCreateForm ? (
            // LIST VIEW
            <View style={styles.listViewContainer}>
              {/* Add Custom Button */}
              <TouchableOpacity
                style={styles.addCustomButton}
                onPress={() => setShowCreateForm(true)}
              >
                <Ionicons name="add-circle" size={24} color="#FFF" />
                <Text style={styles.addCustomButtonText}>Add Custom Service</Text>
              </TouchableOpacity>

              {/* Search Bar */}
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
                  <ActivityIndicator size="large" color="#6C63FF" />
                  <Text style={styles.loadingText}>Loading services...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredServices}
                  keyExtractor={(item) => item.id}
                  renderItem={renderServiceItem}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={true}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="cut-outline" size={48} color="#CCC" />
                      <Text style={styles.emptyText}>No services found</Text>
                      <Text style={styles.emptySubtext}>
                        {searchQuery ? 'Try a different search' : 'Add a custom service to get started'}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          ) : (
            // CREATE FORM
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowCreateForm(false)}
              >
                <Ionicons name="arrow-back" size={20} color="#6C63FF" />
                <Text style={styles.backButtonText}>Back to list</Text>
              </TouchableOpacity>

              {/* Service Image */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Image (Optional)</Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {formData.image_url ? (
                    <Image source={{ uri: formData.image_url }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color="#6C63FF" />
                      ) : (
                        <>
                          <Ionicons name="image-outline" size={32} color="#999" />
                          <Text style={styles.imagePlaceholderText}>Tap to upload</Text>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Service Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="e.g. Haircut, Beard Trim"
                  placeholderTextColor="#999"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description of the service"
                  placeholderTextColor="#999"
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price *</Text>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  value={formData.price}
                  onChangeText={(value) => handleInputChange('price', value)}
                  keyboardType="decimal-pad"
                />
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
              </View>

              {/* Duration */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Duration (minutes) *</Text>
                <TextInput
                  style={[styles.input, errors.duration && styles.inputError]}
                  placeholder="30"
                  placeholderTextColor="#999"
                  value={formData.duration}
                  onChangeText={(value) => handleInputChange('duration', value)}
                  keyboardType="number-pad"
                />
                {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Hair, Beard, Styling"
                  placeholderTextColor="#999"
                  value={formData.category}
                  onChangeText={(value) => handleInputChange('category', value)}
                />
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateCustomService}
              >
                <Text style={styles.createButtonText}>Add Custom Service</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
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
    height: '85%', // Changed from maxHeight to height for consistent sizing
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  listViewContainer: {
    flex: 1,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  addCustomButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  serviceItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  serviceImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
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
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 10,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '500',
  },
  serviceDuration: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 5,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '500',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#4A90E2',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#4A90E2',
    fontSize: 12,
    marginTop: 5,
  },
  imagePickerButton: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  createButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServiceSelectorModal;
