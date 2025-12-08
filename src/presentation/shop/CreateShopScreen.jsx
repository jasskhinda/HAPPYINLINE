import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { createShop, addShopStaff, addServiceToShop } from '../../lib/shopAuth';
import { uploadShopImage } from '../../data/imageUpload';
import AddCustomServiceModal from '../../components/shop/AddCustomServiceModal';
import OperatingHoursSelector from '../../components/shop/OperatingHoursSelector';

const CreateShopScreen = ({ route, navigation }) => {
  const shopId = route?.params?.shopId; // For editing existing business
  const isEditMode = !!shopId;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: '',
    email: ''
  });
  // Two separate images
  const [logoImage, setLogoImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);

  // Operating Hours
  const [operatingDays, setOperatingDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);
  const [openingTime, setOpeningTime] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [closingTime, setClosingTime] = useState(() => {
    const date = new Date();
    date.setHours(18, 0, 0, 0);
    return date;
  });

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [errors, setErrors] = useState({});

  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);

  // Load existing business data when editing
  React.useEffect(() => {
    if (isEditMode && shopId) {
      loadExistingBusinessData();
    }
  }, [shopId, isEditMode]);

  const loadExistingBusinessData = async () => {
    try {
      setInitialLoading(true);
      console.log('📥 Loading business data for shopId:', shopId);

      // Fetch shop details
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (shopError) throw shopError;

      if (shopData) {
        console.log('📊 Loaded shop data:', {
          name: shopData.name,
          zip_code: shopData.zip_code,
          city: shopData.city,
          state: shopData.state
        });

        // Populate form data
        setFormData({
          name: shopData.name || '',
          description: shopData.description || '',
          address: shopData.address || '',
          city: shopData.city || '',
          state: shopData.state || '',
          zipCode: shopData.zip_code || '',
          country: shopData.country || 'USA',
          phone: shopData.phone || '',
          email: shopData.email || ''
        });

        console.log('✅ Form data set with zipCode:', shopData.zip_code);

        // Set images (if they exist)
        if (shopData.logo_url) {
          setLogoImage(shopData.logo_url);
        }
        if (shopData.cover_image_url) {
          setCoverImage(shopData.cover_image_url);
        }

        // Set operating days and hours
        if (shopData.operating_days) {
          try {
            const days = typeof shopData.operating_days === 'string'
              ? JSON.parse(shopData.operating_days)
              : shopData.operating_days;
            setOperatingDays(days);
          } catch (e) {
            console.error('Error parsing operating days:', e);
          }
        }

        if (shopData.opening_time) {
          const [hours, minutes] = shopData.opening_time.split(':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          setOpeningTime(date);
        }

        if (shopData.closing_time) {
          const [hours, minutes] = shopData.closing_time.split(':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          setClosingTime(date);
        }

        // Load services
        const { data: servicesData, error: servicesError } = await supabase
          .from('shop_services')
          .select('*')
          .eq('shop_id', shopId);

        if (!servicesError && servicesData) {
          console.log('📋 Loaded services:', servicesData.length);
          const loadedServices = servicesData.map(service => ({
            id: service.id,
            tempId: service.id, // Use real ID as tempId
            name: service.name,
            description: service.description || '',
            price: service.price,
            duration: service.duration || 30
          }));
          setServices(loadedServices);
          console.log('✅ Services set:', loadedServices.length);
        } else if (servicesError) {
          console.error('❌ Error loading services:', servicesError);
        }

        console.log('✅ Business data loaded successfully');
      }
    } catch (error) {
      console.error('❌ Error loading business data:', error);
      Alert.alert('Error', 'Failed to load business data');
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Shop name is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
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
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Image validation
    if (!logoImage) {
      newErrors.logo = 'Logo image is required';
    }
    if (!coverImage) {
      newErrors.cover = 'Cover image is required';
    }

    // Operating hours validation
    if (operatingDays.length === 0) {
      newErrors.operatingDays = 'Please select at least one operating day';
    }
    if (!openingTime || !closingTime) {
      newErrors.operatingHours = 'Please set opening and closing times';
    }
    if (openingTime && closingTime && openingTime >= closingTime) {
      newErrors.operatingHours = 'Closing time must be after opening time';
    }

    // Required services
    if (services.length === 0) {
      newErrors.services = 'At least one service is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Image Pickers
  const handlePickLogoImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogoImage(result.assets[0].uri);
      if (errors.logo) {
        setErrors(prev => ({ ...prev, logo: null }));
      }
    }
  };

  const handlePickCoverImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
      if (errors.cover) {
        setErrors(prev => ({ ...prev, cover: null }));
      }
    }
  };

  // Add Service (single custom service)
  const handleAddService = (serviceData) => {
    // Add tempId for tracking before submission
    const serviceWithTempId = {
      ...serviceData,
      tempId: Date.now() + Math.random(),
    };
    setServices(prev => [...prev, serviceWithTempId]);
    setShowServiceModal(false);
    if (errors.services) {
      setErrors(prev => ({ ...prev, services: null }));
    }
  };

  const handleRemoveService = (tempId) => {
    setServices(prev => prev.filter(s => s.tempId !== tempId));
  };

  const handleCreateShop = async () => {
    if (!validateForm()) {
      Alert.alert('Missing Information', 'Please fill all required fields and add at least 1 service.');
      return;
    }

    try {
      setLoading(true);

      const formatTimeForDB = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}:00`;
      };

      let shop;
      let isNewShop = !isEditMode;

      if (isEditMode) {
        // UPDATE EXISTING BUSINESS
        console.log('📝 Updating existing business:', shopId);

        const updateData = {
          name: formData.name,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country,
          phone: formData.phone,
          email: formData.email,
          operating_days: JSON.stringify(operatingDays),
          opening_time: formatTimeForDB(openingTime),
          closing_time: formatTimeForDB(closingTime),
        };

        const { data: updatedShop, error: updateError } = await supabase
          .from('shops')
          .update(updateData)
          .eq('id', shopId)
          .select()
          .single();

        if (updateError) throw updateError;
        shop = updatedShop;
        console.log('✅ Business updated successfully');

      } else {
        // CREATE NEW BUSINESS
        console.log('🆕 Creating new business');

        // Retrieve user metadata for subscription plan and business type
        const { data: { user } } = await supabase.auth.getUser();
        const userMetadata = user?.user_metadata || {};

        console.log('📋 User metadata:', {
          plan: userMetadata.selected_plan,
          category: userMetadata.category_id,
          type: userMetadata.business_type_id
        });

        const shopData = {
          ...formData,
          logo_url: null,
          cover_image_url: null,
          operating_days: JSON.stringify(operatingDays),
          opening_time: formatTimeForDB(openingTime),
          closing_time: formatTimeForDB(closingTime),
          is_manually_closed: false,
          status: 'draft',
          // Add subscription plan from registration
          subscription_plan: userMetadata.selected_plan || 'solo',
          category_id: userMetadata.category_id,
          business_type_id: userMetadata.business_type_id,
        };

        const { success, shop: createdShop, error } = await createShop(shopData);

        if (!success || !createdShop) {
          throw new Error(error || 'Failed to create shop');
        }

        shop = createdShop;
        console.log('✅ Business created:', shop.id);
      }

      if (shop) {
        console.log('Shop created:', shop.id);
        
        // Step 1: Upload images to Supabase Storage
        console.log('📤 Uploading images...');
        
        const uploadErrors = [];
        let logoUrl = null;
        let coverUrl = null;

        // Upload logo (only if it's a new local URI, not an existing URL)
        if (logoImage) {
          const isLocalUri = logoImage.startsWith('file://') || logoImage.startsWith('content://');
          if (isLocalUri) {
            const logoResult = await uploadShopImage(logoImage, shop.id, 'logo');
            if (logoResult.success) {
              logoUrl = logoResult.url;
              console.log('✅ Logo uploaded:', logoUrl);
            } else {
              console.error('❌ Logo upload failed:', logoResult.error);
              uploadErrors.push('logo');
            }
          } else {
            // Keep existing URL
            logoUrl = logoImage;
            console.log('📌 Keeping existing logo URL');
          }
        }

        // Upload cover (only if it's a new local URI, not an existing URL)
        if (coverImage) {
          const isLocalUri = coverImage.startsWith('file://') || coverImage.startsWith('content://');
          if (isLocalUri) {
            const coverResult = await uploadShopImage(coverImage, shop.id, 'cover');
            if (coverResult.success) {
              coverUrl = coverResult.url;
              console.log('✅ Cover uploaded:', coverUrl);
            } else {
              console.error('❌ Cover upload failed:', coverResult.error);
              uploadErrors.push('cover');
            }
          } else {
            // Keep existing URL
            coverUrl = coverImage;
            console.log('📌 Keeping existing cover URL');
          }
        }

        // Show warning if image uploads failed (but continue with shop creation)
        if (uploadErrors.length > 0) {
          console.warn('⚠️ Some images failed to upload:', uploadErrors.join(', '));
          console.warn('⚠️ Shop created successfully but without images.');
          console.warn('⚠️ To fix: Create "shop-images" bucket in Supabase Storage');
        }

        // Update shop with image URLs
        if (logoUrl || coverUrl) {
          const { error: updateError } = await supabase
            .from('shops')
            .update({
              logo_url: logoUrl,
              cover_image_url: coverUrl
            })
            .eq('id', shop.id);

          if (updateError) {
            console.error('Error updating shop images:', updateError);
          }
        }
        
        // Step 2: Get current user ID (creator is already added as admin)
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        // Step 3: Handle services (update for edit mode, insert for create mode)
        console.log('📦 Handling services. Mode:', isEditMode ? 'EDIT' : 'CREATE');
        console.log('📦 Total services to save:', services.length);
        console.log('📦 Services:', services);

        if (isEditMode) {
          // EDIT MODE: Sync services with database
          console.log('🔄 Syncing services for edit mode...');

          // Get existing services from DB
          const { data: existingServices } = await supabase
            .from('shop_services')
            .select('id, name')
            .eq('shop_id', shopId);

          const existingServiceNames = (existingServices || []).map(s => s.name);
          const currentServiceNames = services.map(s => s.name);

          // Delete services that were removed
          const servicesToDelete = (existingServices || []).filter(
            s => !currentServiceNames.includes(s.name)
          );

          for (const service of servicesToDelete) {
            await supabase
              .from('shop_services')
              .delete()
              .eq('id', service.id);
            console.log('🗑️ Deleted service:', service.name);
          }

          // Add new services
          const newServices = services.filter(
            s => !existingServiceNames.includes(s.name)
          );

          for (const service of newServices) {
            const { error: serviceError } = await supabase
              .from('shop_services')
              .insert({
                shop_id: shop.id,
                name: service.name,
                description: service.description,
                price: service.price,
                duration: service.duration || 30,
                is_active: true,
              });

            if (serviceError) {
              console.error('❌ Error adding service:', serviceError);
            } else {
              console.log('✅ Added new service:', service.name);
            }
          }

        } else {
          // CREATE MODE: Add all services
          console.log('✨ CREATE MODE: Adding', services.length, 'services...');

          for (const service of services) {
            try {
              console.log('➕ Inserting service:', service.name, {
                shop_id: shop.id,
                name: service.name,
                price: service.price,
                duration: service.duration || 30
              });

              const { error: serviceError } = await supabase
                .from('shop_services')
                .insert({
                  shop_id: shop.id,
                  name: service.name,
                  description: service.description || '',
                  price: service.price,
                  duration: service.duration || 30,
                  is_active: true,
                });

              if (serviceError) {
                console.error('❌ Error adding service:', service.name, serviceError);
              } else {
                console.log('✅ Successfully added service:', service.name);
              }
            } catch (err) {
              console.error('❌ Exception adding service:', service.name, err);
            }
          }

          console.log('✅ Finished adding all services');
        }
        
        // Success - navigate to review submission screen
        Alert.alert(
          isEditMode ? 'Business Updated!' : 'Business Listed!',
          isEditMode
            ? `Your business "${shop.name}" has been updated successfully!`
            : `Your business "${shop.name}" is ready. Now submit it for review to go live!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.replace('ShopReviewSubmission', { shopId: shop.id });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', error || 'Failed to create shop');
      }
    } catch (error) {
      console.error('Error creating shop:', error);
      Alert.alert('Error', 'Failed to create shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Shop Creation',
      'Are you sure you want to cancel? Your information will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { 
          text: 'Cancel', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditMode ? "Edit Business" : "List Your Business"}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Shop Images Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="images-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Shop Images</Text>
            </View>
            
            {/* Logo Image */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>Shop Logo *</Text>
              <Text style={styles.fieldHint}>Square logo for shop cards and listings (1:1 ratio)</Text>
              
              <TouchableOpacity 
                style={[styles.imagePickerContainer, styles.logoImageContainer, errors.logo && styles.inputError]} 
                onPress={handlePickLogoImage}
                activeOpacity={0.7}
              >
                {logoImage ? (
                  <>
                    <Image source={{ uri: logoImage }} style={styles.logoImagePreview} />
                    <View style={styles.imageOverlay}>
                      <View style={styles.changeImageButton}>
                        <Ionicons name="camera" size={20} color="#FFF" />
                        <Text style={styles.changeImageText}>Change Logo</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#999" />
                    <Text style={styles.imagePlaceholderText}>Tap to upload logo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors.logo && <Text style={styles.errorText}>{errors.logo}</Text>}
            </View>

            {/* Cover Image */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>Cover Image *</Text>
              <Text style={styles.fieldHint}>Wide cover photo for shop details page (16:9 ratio)</Text>
              
              <TouchableOpacity 
                style={[styles.imagePickerContainer, styles.coverImageContainer, errors.cover && styles.inputError]} 
                onPress={handlePickCoverImage}
                activeOpacity={0.7}
              >
                {coverImage ? (
                  <>
                    <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
                    <View style={styles.imageOverlay}>
                      <View style={styles.changeImageButton}>
                        <Ionicons name="camera" size={20} color="#FFF" />
                        <Text style={styles.changeImageText}>Change Cover</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#999" />
                    <Text style={styles.imagePlaceholderText}>Tap to upload cover image</Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors.cover && <Text style={styles.errorText}>{errors.cover}</Text>}
            </View>
          </View>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>

            {/* Shop Name */}
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

            {/* Description */}
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

          {/* Location Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="location-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Location Details</Text>
            </View>

            {/* Address */}
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

            {/* City */}
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
              {/* State */}
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

              {/* Zip Code */}
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

            {/* Country */}
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

          {/* Contact Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="call-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>

            {/* Phone */}
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

            {/* Email */}
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

          {/* Services Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="pricetag-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Services *</Text>
            </View>
            
            <TouchableOpacity
              style={styles.addStaffButton}
              onPress={() => setShowServiceModal(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
              <Text style={styles.addStaffButtonText}>Add Service</Text>
            </TouchableOpacity>

            {services.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="pricetag-outline" size={32} color="#999" />
                <Text style={styles.emptyText}>No services added yet</Text>
                <Text style={styles.emptySubtext}>Add at least 1 service to continue</Text>
              </View>
            ) : (
              <View style={styles.staffList}>
                {services.map((service, index) => (
                  <View key={service.tempId || index} style={styles.serviceCard}>
                    <View style={styles.staffCardLeft}>
                      {service.icon_url ? (
                        <Image source={{ uri: service.icon_url }} style={styles.serviceIcon} />
                      ) : (
                        <View style={[styles.staffAvatar, { backgroundColor: '#4CAF50' }]}>
                          <Ionicons name="cut" size={20} color="#FFF" />
                        </View>
                      )}
                      <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>{service.name}</Text>
                        <Text style={styles.staffContact}>
                          ${service.price} • {service.duration_minutes} min
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleRemoveService(service.tempId)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {errors.services && <Text style={styles.errorText}>{errors.services}</Text>}
          </View>

          {/* Operating Hours Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="time-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Operating Hours</Text>
            </View>
            
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

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.infoCardText}>
              After listing your business, you can add service providers (counted toward your plan) and unlimited managers from Staff Management.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <SafeAreaView edges={['bottom']} style={styles.footerContainer}>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateShop}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name={isEditMode ? "checkmark-circle" : "storefront"} size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>
                    {isEditMode ? "Update Business" : "List Business"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <AddCustomServiceModal
        visible={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onAdd={handleAddService}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollViewContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  // Section Styles
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginBottom: 8,
  },
  // Input Styles
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  // Image Styles
  imageSection: {
    marginBottom: 20,
  },
  imagePickerContainer: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  logoImageContainer: {
    height: 150,
  },
  coverImageContainer: {
    height: 180,
  },
  logoImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverImagePreview: {
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
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeImageText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Staff & Services Styles
  addStaffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addStaffButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  staffList: {
    marginTop: 8,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  staffCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  staffContact: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 4,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
    lineHeight: 20,
  },
  // Footer Styles
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  createButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Old Styles (to be removed - kept for compatibility)
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    lineHeight: 20,
  },
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footer: {
    padding: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  imageSection: {
    marginBottom: 32,
  },
  imageSectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  imageSectionHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  imagePickerContainer: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logoImageContainer: {
    height: 180,
  },
  logoImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  cameraIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFE5D9',
  },
  imagePlaceholderText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 6,
  },
  imagePlaceholderSubtext: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400',
  },
  shopImagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  changeImageText: {
    color: '#FFF',
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  listItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  sectionDividerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 15,
  },
});

export default CreateShopScreen;