import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SettingAppBar from '../../../../../components/appBar/SettingAppBar';
import {
  fetchServices,
  createService,
  updateService,
  deleteService,
  uploadServiceIcon,
} from '../../../../../lib/auth';

const ServiceManagementScreen = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const result = await fetchServices();
      if (result.success) {
        setServices(result.data);
      } else {
        Alert.alert('Error', 'Failed to load services');
      }
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const handleAddService = () => {
    setEditingService(null);
    setServiceName('');
    setServiceDescription('');
    setServicePrice('');
    setServiceDuration('');
    setSelectedImageUri(null);
    setModalVisible(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceName(service.name || '');
    setServiceDescription(service.description || '');
    setServicePrice(service.price?.toString() || '');
    setServiceDuration(service.duration?.toString() || '');
    setSelectedImageUri(service.icon_url || null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    // Show action sheet
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: openCamera,
        },
        {
          text: 'Gallery',
          onPress: openGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleSaveService = async () => {
    try {
      if (!serviceName.trim()) {
        Alert.alert('Error', 'Please enter a service name');
        return;
      }

      console.log('💾 Saving service...', { serviceName, hasImage: !!selectedImageUri });
      setUploading(true);

      let finalIconUrl = selectedImageUri;

      // Upload image if it's a local file (not a URL)
      if (selectedImageUri && !selectedImageUri.startsWith('http')) {
        console.log('📤 Uploading image...');
        const tempId = editingService?.id || `temp-${Date.now()}`;
        const uploadResult = await uploadServiceIcon(selectedImageUri, tempId);
        if (uploadResult.success) {
          finalIconUrl = uploadResult.url;
          console.log('✅ Image uploaded successfully:', finalIconUrl);
        } else {
          console.error('⚠️ Image upload failed:', uploadResult.error);
          Alert.alert('Warning', 'Failed to upload icon, but service will be saved');
        }
      }

      const serviceData = {
        name: serviceName.trim(),
        description: serviceDescription.trim(),
        icon_url: finalIconUrl,
        price: servicePrice ? parseFloat(servicePrice) : null,
        duration: serviceDuration ? parseInt(serviceDuration) : null,
      };

      console.log('💾 Saving service data:', serviceData);

      let result;
      if (editingService) {
        console.log('🔄 Updating service:', editingService.id);
        result = await updateService(editingService.id, serviceData);
      } else {
        console.log('➕ Creating new service');
        result = await createService(serviceData);
      }

      console.log('📊 Save result:', result);

      if (result.success) {
        console.log('✅ Service saved successfully');
        setModalVisible(false);
        await loadServices();
        Alert.alert(
          'Success',
          `Service ${editingService ? 'updated' : 'created'} successfully`
        );
      } else {
        console.error('❌ Save failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to save service');
      }
    } catch (error) {
      console.error('❌ Unexpected error saving service:', error);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteService = (service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting service:', service.name);
              setDeleting(true);
              setDeletingServiceId(service.id);
              
              const result = await deleteService(service.id);
              
              if (result.success) {
                console.log('✅ Service deleted successfully');
                await loadServices();
                Alert.alert('Success', 'Service deleted successfully');
              } else {
                console.error('❌ Delete failed:', result.error);
                Alert.alert('Error', result.error || 'Failed to delete service');
              }
            } catch (error) {
              console.error('❌ Error deleting service:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setDeleting(false);
              setDeletingServiceId(null);
            }
          },
        },
      ]
    );
  };

  const renderServiceItem = ({ item }) => {
    const isDeleting = deletingServiceId === item.id;
    
    return (
      <View style={[styles.serviceCard, isDeleting && styles.serviceCardDeleting]}>
        <View style={styles.serviceContent}>
          <View style={styles.serviceIconContainer}>
            {item.icon_url ? (
              <Image 
                source={{ uri: item.icon_url }} 
                style={styles.serviceImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="image-outline" size={30} color="#0393d5" />
            )}
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.priceInfo}>
              {item.price && (
                <Text style={styles.servicePrice}>${item.price.toFixed(2)}</Text>
              )}
              {item.duration && (
                <Text style={styles.serviceDuration}>{item.duration} min</Text>
              )}
            </View>
          </View>
          <View style={styles.serviceActions}>
            <TouchableOpacity
              style={[styles.editButton, isDeleting && styles.disabledButton]}
              onPress={() => handleEditService(item)}
              disabled={isDeleting}
            >
              <Ionicons name="pencil" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.disabledButton]}
              onPress={() => handleDeleteService(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#0393d5" />
              ) : (
                <Ionicons name="trash" size={20} color="#0393d5" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        {isDeleting && (
          <View style={styles.deletingOverlay}>
            <ActivityIndicator size="large" color="#0393d5" />
            <Text style={styles.deletingText}>Deleting...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="settings-outline" size={80} color="#DDD" />
      <Text style={styles.emptyTitle}>No Services Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first service to get started
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.container}>
      <SettingAppBar title="Service Management" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Services</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0393d5" />
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        ) : (
          <FlatList
            data={services}
            renderItem={renderServiceItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={renderEmptyState}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Service Name</Text>
              <TextInput
                style={styles.textInput}
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="Enter service name"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={serviceDescription}
                onChangeText={setServiceDescription}
                placeholder="Enter service description"
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>Price ($)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={servicePrice}
                    onChangeText={setServicePrice}
                    placeholder="25.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.inputLabel}>Duration (min)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={serviceDuration}
                    onChangeText={setServiceDuration}
                    placeholder="30"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Service Image</Text>
              <View style={styles.imageSection}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  {selectedImageUri ? (
                    <View style={styles.selectedImageContainer}>
                      <Image 
                        source={{ uri: selectedImageUri }} 
                        style={styles.selectedImage}
                        resizeMode="cover"
                      />
                      <View style={styles.changeImageOverlay}>
                        <Ionicons name="camera" size={24} color="white" />
                        <Text style={styles.changeImageText}>Change</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.placeholderImageContainer}>
                      <Ionicons name="camera" size={40} color="#0393d5" />
                      <Text style={styles.placeholderText}>Tap to select image</Text>
                      <Text style={styles.placeholderSubtext}>Camera or Gallery</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {selectedImageUri && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImageUri(null)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#0393d5" />
                    <Text style={styles.removeImageText}>Remove Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={uploading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, uploading && styles.disabledButton]}
                onPress={handleSaveService}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingService ? 'Update' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Deleting Overlay */}
      {deleting && (
        <View style={styles.globalLoadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0393d5" />
            <Text style={styles.loadingOverlayText}>Deleting service...</Text>
            <Text style={styles.loadingOverlaySubtext}>Please wait</Text>
          </View>
        </View>
      )}
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0393d5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  serviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0393d520',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF5020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0393d520',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#333',
  },
  imageSection: {
    marginTop: 10,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#0393d5',
    borderStyle: 'dashed',
    borderRadius: 15,
    overflow: 'hidden',
  },
  selectedImageContainer: {
    position: 'relative',
    height: 150,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  placeholderImageContainer: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0393d5',
    marginTop: 10,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#0393d510',
    borderRadius: 8,
  },
  removeImageText: {
    color: '#0393d5',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#0393d5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    marginTop: 10,
    textAlign: 'center',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0393d5',
    marginRight: 15,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#999',
  },
  row: {
    flexDirection: 'row',
  },
  disabledButton: {
    opacity: 0.6,
  },
  serviceCardDeleting: {
    opacity: 0.7,
  },
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#0393d5',
  },
  globalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  loadingOverlayText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingOverlaySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
  },
});

export default ServiceManagementScreen;