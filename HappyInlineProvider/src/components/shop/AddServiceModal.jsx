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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const AddServiceModal = ({ visible, onClose, onAdd, shopId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '',
    icon_url: null,
    provider_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Load providers when modal opens
  useEffect(() => {
    if (visible && shopId) {
      loadProviders();
    }
  }, [visible, shopId]);

  const loadProviders = async () => {
    try {
      setLoadingProviders(true);

      // Get all staff members with role 'barber' for this shop
      const { data, error } = await supabase
        .from('shop_staff')
        .select(`
          user_id,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('shop_id', shopId)
        .eq('role', 'barber');

      if (error) throw error;

      const providersList = data
        .filter(item => item.profiles)
        .map(item => ({
          id: item.profiles.id,
          name: item.profiles.name || item.profiles.email,
          email: item.profiles.email,
        }));

      setProviders(providersList);
    } catch (error) {
      console.error('Error loading providers:', error);
      Alert.alert('Error', 'Failed to load providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  const toggleProvider = (providerId) => {
    setFormData(prev => ({
      ...prev,
      provider_ids: prev.provider_ids.includes(providerId)
        ? prev.provider_ids.filter(id => id !== providerId)
        : [...prev.provider_ids, providerId]
    }));
  };

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
        mediaTypes: [ImagePicker.MediaType.Images],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleInputChange('icon_url', result.assets[0].uri);
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

    if (!formData.duration_minutes) {
      newErrors.duration_minutes = 'Duration is required';
    } else if (isNaN(formData.duration_minutes) || parseInt(formData.duration_minutes) <= 0) {
      newErrors.duration_minutes = 'Please enter a valid duration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddService = () => {
    if (!validateForm()) {
      return;
    }

    // Convert price and duration to numbers
    const serviceData = {
      ...formData,
      price: parseFloat(formData.price),
      duration_minutes: parseInt(formData.duration_minutes),
    };

    onAdd(serviceData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration_minutes: '',
      icon_url: null,
      provider_ids: [],
    });
    setErrors({});
    setProviders([]);
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
            <Text style={styles.modalTitle}>Add Service</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.scrollView}>
            <View style={styles.form}>
              {/* Service Icon */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Icon (Optional)</Text>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={handlePickImage}
                >
                  {formData.icon_url ? (
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

              {/* Price */}
              <View style={styles.inputGroup}>
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

              {/* Duration */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Duration (minutes) *</Text>
                <TextInput
                  style={[styles.input, errors.duration_minutes && styles.inputError]}
                  placeholderTextColor="#999"
                  placeholder="e.g., 30"
                  value={formData.duration_minutes}
                  onChangeText={(value) => handleInputChange('duration_minutes', value)}
                  keyboardType="number-pad"
                />
                {errors.duration_minutes && (
                  <Text style={styles.errorText}>{errors.duration_minutes}</Text>
                )}
              </View>

              {/* Providers */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign Providers</Text>
                <Text style={styles.sublabel}>
                  Select staff members who can provide this service
                </Text>

                {loadingProviders ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0393d5" />
                  </View>
                ) : providers.length === 0 ? (
                  <View style={styles.emptyProvidersContainer}>
                    <Ionicons name="people-outline" size={32} color="#999" />
                    <Text style={styles.emptyProvidersText}>
                      No staff members found. Add staff first.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.providersContainer}>
                    {providers.map((provider) => (
                      <TouchableOpacity
                        key={provider.id}
                        style={[
                          styles.providerItem,
                          formData.provider_ids.includes(provider.id) && styles.providerItemSelected
                        ]}
                        onPress={() => toggleProvider(provider.id)}
                      >
                        <View style={styles.providerInfo}>
                          <View style={styles.providerAvatar}>
                            <Ionicons
                              name="person"
                              size={20}
                              color={formData.provider_ids.includes(provider.id) ? '#FFF' : '#666'}
                            />
                          </View>
                          <View style={styles.providerDetails}>
                            <Text style={[
                              styles.providerName,
                              formData.provider_ids.includes(provider.id) && styles.providerNameSelected
                            ]}>
                              {provider.name}
                            </Text>
                            <Text style={styles.providerRole}>Provider</Text>
                          </View>
                        </View>
                        <Ionicons
                          name={formData.provider_ids.includes(provider.id) ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={formData.provider_ids.includes(provider.id) ? '#0393d5' : '#CCC'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={handleAddService}
            >
              <Text style={styles.addButtonText}>Add Service</Text>
            </TouchableOpacity>
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
    maxHeight: '90%',
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
  scrollView: {
    maxHeight: '70%',
  },
  form: {
    padding: 20,
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
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    backgroundColor: '#0393d5',
    marginLeft: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  sublabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyProvidersContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyProvidersText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  providersContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  providerItemSelected: {
    backgroundColor: '#FFF5F5',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  providerNameSelected: {
    color: '#0393d5',
  },
  providerRole: {
    fontSize: 12,
    color: '#999',
  },
});

export default AddServiceModal;
