import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getShopDetails, updateShopDetails, deleteShop, uploadShopImage } from '../../../../lib/shopAuth';
import OperatingHoursSelector from '../../../../components/shop/OperatingHoursSelector';

const ShopSettingsScreen = ({ route, navigation }) => {
  const { shopId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    email: '',
    logo_url: '',
    cover_image_url: '',
  });

  // Operating hours
  const [operatingDays, setOperatingDays] = useState([]);
  const [openingTime, setOpeningTime] = useState(new Date());
  const [closingTime, setClosingTime] = useState(new Date());

  // Errors
  const [errors, setErrors] = useState({});

  // Helper function to convert time string to Date object
  const timeStringToDate = (timeString) => {
    if (!timeString) {
      const date = new Date();
      date.setHours(9, 0, 0, 0);
      return date;
    }
    
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  };

  // Helper function to convert Date object to time string
  const dateToTimeString = (date) => {
    if (!date) return '09:00';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  useEffect(() => {
    loadShopData();
  }, [shopId]);

  const loadShopData = async () => {
    try {
      setLoading(true);
      const { success, shop, error } = await getShopDetails(shopId);
      
      if (success && shop) {
        setFormData({
          name: shop.name || '',
          description: shop.description || '',
          address: shop.address || '',
          city: shop.city || '',
          state: shop.state || '',
          zipCode: shop.zip_code || '',
          country: shop.country || '',
          phone: shop.phone || '',
          email: shop.email || '',
          logo_url: shop.logo_url || '',
          cover_image_url: shop.cover_image_url || '',
        });

        // Parse operating days
        if (shop.operating_days) {
          const days = Array.isArray(shop.operating_days) 
            ? shop.operating_days 
            : JSON.parse(shop.operating_days || '[]');
          setOperatingDays(days);
        }

        // Set operating hours - convert time strings to Date objects
        if (shop.opening_time) {
          setOpeningTime(timeStringToDate(shop.opening_time));
        }
        if (shop.closing_time) {
          setClosingTime(timeStringToDate(shop.closing_time));
        }
      } else {
        Alert.alert('Error', error || 'Failed to load shop details');
      }
    } catch (error) {
      console.error('Error loading shop:', error);
      Alert.alert('Error', 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Shop name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'Zip code is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (operatingDays.length === 0) {
      newErrors.operatingDays = 'Please select at least one operating day';
    }

    if (!openingTime || !closingTime) {
      newErrors.operatingHours = 'Please set opening and closing times';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        if (type === 'logo') {
          setUploadingLogo(true);
        } else {
          setUploadingCover(true);
        }

        const { success, url, error } = await uploadShopImage(shopId, imageUri, type);

        if (success && url) {
          setFormData(prev => ({
            ...prev,
            [type === 'logo' ? 'logo_url' : 'cover_image_url']: url
          }));
          Alert.alert('Success', `${type === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully`);
        } else {
          Alert.alert('Error', error || 'Failed to upload image');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setUploadingLogo(false);
      setUploadingCover(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip_code: formData.zipCode.trim(),
        country: formData.country.trim() || 'USA',
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        logo_url: formData.logo_url || null,
        cover_image_url: formData.cover_image_url || null,
        operating_days: operatingDays,
        opening_time: dateToTimeString(openingTime),
        closing_time: dateToTimeString(closingTime),
      };

      const { success, error } = await updateShopDetails(shopId, updateData);

      if (success) {
        Alert.alert(
          'Success',
          'Shop details updated successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', error || 'Failed to update shop details');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShop = () => {
    Alert.alert(
      'Delete Shop',
      'Are you sure you want to delete this shop? This action cannot be undone and will delete all staff, services, bookings, and reviews.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { success, error } = await deleteShop(shopId);
              
              if (success) {
                Alert.alert(
                  'Success',
                  'Shop deleted successfully',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'ShopSelectionScreen' }],
                        });
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', error || 'Failed to delete shop');
                setLoading(false);
              }
            } catch (err) {
              console.error('Delete shop error:', err);
              Alert.alert('Error', 'An unexpected error occurred');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading shop settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Shop Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop Images</Text>
          
          {/* Logo */}
          <View style={styles.imageSection}>
            <Text style={styles.label}>Shop Logo</Text>
            <TouchableOpacity
              style={styles.imagePickerContainer}
              onPress={() => handlePickImage('logo')}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : formData.logo_url ? (
                <Image source={{ uri: formData.logo_url }} style={styles.logoPreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#999" />
                  <Text style={styles.imagePlaceholderText}>Tap to upload logo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Cover Image */}
          <View style={styles.imageSection}>
            <Text style={styles.label}>Cover Image</Text>
            <TouchableOpacity
              style={[styles.imagePickerContainer, styles.coverImageContainer]}
              onPress={() => handlePickImage('cover')}
              disabled={uploadingCover}
            >
              {uploadingCover ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : formData.cover_image_url ? (
                <Image source={{ uri: formData.cover_image_url }} style={styles.coverPreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#999" />
                  <Text style={styles.imagePlaceholderText}>Tap to upload cover image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Shop Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter your shop name"
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              maxLength={50}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell customers about your shop..."
              placeholderTextColor="#999"
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={styles.charCount}>
              {formData.description.length}/200
            </Text>
          </View>
        </View>

        {/* Location Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              placeholder="Enter full address"
              placeholderTextColor="#999"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              multiline
              numberOfLines={2}
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="Enter city name"
              placeholderTextColor="#999"
              value={formData.city}
              onChangeText={(value) => handleInputChange('city', value)}
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={[styles.input, errors.state && styles.inputError]}
                placeholder="Enter state"
                placeholderTextColor="#999"
                value={formData.state}
                onChangeText={(value) => handleInputChange('state', value)}
              />
              {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Zip Code *</Text>
              <TextInput
                style={[styles.input, errors.zipCode && styles.inputError]}
                placeholder="Enter zip code"
                placeholderTextColor="#999"
                value={formData.zipCode}
                onChangeText={(value) => handleInputChange('zipCode', value)}
                keyboardType="numeric"
                maxLength={10}
              />
              {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="Country"
              placeholderTextColor="#999"
              value={formData.country}
              onChangeText={(value) => handleInputChange('country', value)}
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="(555) 123-4567"
              placeholderTextColor="#999"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="shop@example.com"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <OperatingHoursSelector
            selectedDays={operatingDays}
            onDaysChange={setOperatingDays}
            openingTime={openingTime}
            closingTime={closingTime}
            onOpeningTimeChange={setOpeningTime}
            onClosingTimeChange={setClosingTime}
          />
          {errors.operatingDays && <Text style={styles.errorText}>{errors.operatingDays}</Text>}
          {errors.operatingHours && <Text style={styles.errorText}>{errors.operatingHours}</Text>}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteShop}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete Shop</Text>
          </TouchableOpacity>
          <Text style={styles.deleteWarning}>
            This action cannot be undone. All shop data, staff, services, and bookings will be permanently deleted.
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  imageSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  imagePickerContainer: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  coverImageContainer: {
    height: 180,
  },
  logoPreview: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  dangerZone: {
    backgroundColor: '#FFF5F5',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  deleteWarning: {
    fontSize: 12,
    color: '#D32F2F',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default ShopSettingsScreen;
