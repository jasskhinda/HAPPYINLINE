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
import { uploadImage } from '../../lib/shopAuth';

/**
 * ServiceSelectorModal - Create new service
 * 
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onAdd - Callback when service created (serviceData)
 * @param {string} shopId - Shop ID for the service
 */
const ServiceSelectorModal = ({ visible, onClose, onAdd, shopId }) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form data for creating new service
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    category: '',
    image_url: null,
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // If shopId is provided, upload to Supabase Storage
        if (shopId) {
          try {
            setUploadingImage(true);
            const { success, url, error } = await uploadImage(
              result.assets[0].uri,
              'service-icons',
              `shop_${shopId}`
            );

            if (success && url) {
              handleInputChange('icon_url', url);
              Alert.alert('Success', 'Image uploaded successfully');
            } else {
              Alert.alert('Upload Failed', error || 'Failed to upload image');
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to upload image');
          } finally {
            setUploadingImage(false);
          }
        } else {
          // For CreateShop screen (no shopId yet), just use local URI
          handleInputChange('icon_url', result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
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

  const handleCreateService = () => {
    if (!validateForm()) {
      return;
    }

    // Convert form data to service format
    const serviceData = {
      ...formData,
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
    };

    onAdd(serviceData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      category: '',
      icon_url: null,
    });
    setErrors({});
    onClose();
  };

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
            <Text style={styles.modalTitle}>Add New Service</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* CREATE FORM */}
          <ScrollView 
            style={styles.createModeContainer}
            contentContainerStyle={styles.formContainer}
            showsVerticalScrollIndicator={true}
          >
              {/* Service Icon */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Icon (Optional)</Text>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <View style={styles.iconPlaceholder}>
                      <ActivityIndicator size="large" color="#FF6B35" />
                      <Text style={styles.iconPlaceholderText}>Uploading...</Text>
                    </View>
                  ) : formData.icon_url ? (
                    <Image source={{ uri: formData.icon_url }} style={styles.iconPreview} />
                  ) : (
                    <View style={styles.iconPlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#999" />
                      <Text style={styles.iconPlaceholderText}>Tap to add icon</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Service Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="e.g., Haircut"
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
                  placeholder="Describe the service..."
                  placeholderTextColor="#999"
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
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
                  onChangeText={(value) => handleInputChange('category', value)}
                />
              </View>

              {/* Price and Duration Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>Price ($) *</Text>
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

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.label}>Duration (min) *</Text>
                  <TextInput
                    style={[styles.input, errors.duration && styles.inputError]}
                    placeholder="30"
                    placeholderTextColor="#999"
                    value={formData.duration}
                    onChangeText={(value) => handleInputChange('duration', value)}
                    keyboardType="number-pad"
                  />
                  {errors.duration && (
                    <Text style={styles.errorText}>{errors.duration}</Text>
                  )}
                </View>
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={styles.createServiceButton}
                onPress={handleCreateService}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.createServiceButtonText}>Add Custom Service</Text>
              </TouchableOpacity>
          </ScrollView>
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
    height: '90%',
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
  modeToggle: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  selectModeContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  servicesList: {
    padding: 16,
    paddingTop: 8,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  serviceCardIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceCardInfo: {
    flex: 1,
  },
  serviceCardName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceCardDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  serviceCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceCardPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  serviceCardDuration: {
    fontSize: 13,
    color: '#666',
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  createModeContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  iconPreview: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  iconPlaceholderText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  createServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  createServiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ServiceSelectorModal;
