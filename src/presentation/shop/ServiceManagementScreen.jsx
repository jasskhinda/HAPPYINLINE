import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
  Switch,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import {
  getShopServices,
  updateShopService,
  removeServiceFromShop,
  uploadImage
} from '../../lib/shopAuth';
import ServiceSelectorModal from '../../components/shop/ServiceSelectorModal_MultiSelect';

const ServiceManagementScreen = ({ route, navigation }) => {
  const { shopId } = route.params;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectorModalVisible, setSelectorModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    icon_url: null,
    is_active: true
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const { success, services: servicesData } = await getShopServices(shopId);
      if (success) {
        setServices(servicesData || []);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    // Open the selector modal for adding services
    setSelectorModalVisible(true);
  };

  // Handle services added from modal
  const handleServicesAdded = () => {
    setSelectorModalVisible(false);
    loadServices(); // Reload services list
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: (service.duration || service.duration_minutes).toString(),
      icon_url: service.icon_url,
      is_active: service.is_active
    });
    setModalVisible(true);
  };

  const handleSaveService = async () => {
    // Validation
    if (!formData.price || isNaN(formData.price) || Number(formData.price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      if (editingService) {
        // Update shop_service (only price and is_active can be updated)
        const result = await updateShopService(editingService.id, {
          custom_price: Number(formData.price),
          is_active: formData.is_active
        });
          
        if (result.success) {
          Alert.alert('Success', 'Service price updated successfully');
          setModalVisible(false);
          loadServices();
        } else {
          Alert.alert('Error', result.error || 'Failed to update service');
        }
      }
    } catch (error) {
      console.error('Error saving service:', error);
      Alert.alert('Error', 'Failed to save service');
    }
  };

  const handleDeleteService = (service) => {
    Alert.alert(
      'Remove Service',
      `Are you sure you want to remove "${service.name}" from your shop?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeServiceFromShop(service.id);
              
            if (result.success) {
              Alert.alert('Success', 'Service removed from shop');
              loadServices();
            } else {
              Alert.alert('Error', result.error || 'Failed to remove service');
            }
          }
        }
      ]
    );
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        setUploadingImage(true);
        
        // Upload to Supabase Storage
        const { success, url, error } = await uploadImage(
          result.assets[0].uri,
          'service-icons',
          `shop_${shopId}`
        );

        if (success && url) {
          setFormData(prev => ({ ...prev, icon_url: url }));
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
    }
  };

  const renderServiceItem = ({ item }) => (
    <View style={styles.serviceItem}>
      {item.icon_url ? (
        <Image source={{ uri: item.icon_url }} style={styles.serviceIcon} />
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
          <Text style={styles.servicePrice}>${item.price}</Text>
          <Text style={styles.serviceDuration}>{item.duration || item.duration_minutes} min</Text>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.serviceActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditService(item)}
        >
          <Ionicons name="create-outline" size={22} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteService(item)}
        >
          <Ionicons name="remove-circle-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Services</Text>
        <TouchableOpacity onPress={handleAddService}>
          <Ionicons name="add-circle" size={28} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Services List */}
      <FlatList
        data={services}
        renderItem={renderServiceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cut-outline" size={60} color="#DDD" />
            <Text style={styles.emptyTitle}>No Services Yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first service</Text>
          </View>
        }
      />

      {/* Add/Edit Service Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={styles.formContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Service Info (Read-only) */}
              <View style={styles.readOnlySection}>
                <Text style={styles.readOnlyLabel}>Service Details</Text>
                <View style={styles.readOnlyCard}>
                  {formData.icon_url ? (
                    <Image source={{ uri: formData.icon_url }} style={styles.readOnlyIcon} />
                  ) : (
                    <View style={[styles.readOnlyIcon, styles.readOnlyIconPlaceholder]}>
                      <Ionicons name="cut-outline" size={28} color="#999" />
                    </View>
                  )}
                  <View style={styles.readOnlyInfo}>
                    <Text style={styles.readOnlyName}>{formData.name}</Text>
                    {formData.description && (
                      <Text style={styles.readOnlyDescription}>{formData.description}</Text>
                    )}
                    <Text style={styles.readOnlyDuration}>Duration: {formData.duration} minutes</Text>
                    <Text style={styles.readOnlyNote}>
                      ℹ️ Service details are from global catalog and cannot be changed
                    </Text>
                  </View>
                </View>
              </View>

              {/* Price (Editable) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Price ($) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25.00"
                  value={formData.price}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, price: value }))}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.helpText}>Set your custom price for this service</Text>
              </View>

              {/* Active Toggle */}
              <View style={styles.toggleGroup}>
                <View>
                  <Text style={styles.label}>Service Active</Text>
                  <Text style={styles.helpText}>Toggle to show/hide from customers</Text>
                </View>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                  trackColor={{ false: '#DDD', true: '#FF6B35' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveService}>
                <Text style={styles.saveButtonText}>Update Price & Status</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Service Selector Modal (for adding services) */}
      <ServiceSelectorModal
        visible={selectorModalVisible}
        onClose={() => setSelectorModalVisible(false)}
        onServicesAdded={handleServicesAdded}
        shopId={shopId}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    padding: 15,
  },
  serviceItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  serviceIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 12,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#666',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  serviceActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%', // Changed from maxHeight to height
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 20,
    paddingBottom: 150,
  },
  readOnlySection: {
    marginBottom: 20,
  },
  readOnlyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  readOnlyCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    gap: 12,
  },
  readOnlyIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  readOnlyIconPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  readOnlyInfo: {
    flex: 1,
  },
  readOnlyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  readOnlyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  readOnlyDuration: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  readOnlyNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePickerPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DDD',
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  toggleGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ServiceManagementScreen;
