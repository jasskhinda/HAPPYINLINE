import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../../../lib/supabase';
import SettingAppBar from '../../../../../components/appBar/SettingAppBar';

const EditProfileScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profile_image: null,
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      setUserId(user.id);

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfileData({
        name: profile.name || '',
        email: profile.email || user.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        profile_image: profile.profile_image || null,
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangeProfilePicture = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to change your profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Show options
      Alert.alert(
        'Change Profile Picture',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraPermission.status === 'granted') {
                pickImage('camera');
              } else {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: () => pickImage('gallery')
          },
          {
            text: 'Cancel',
            style: 'cancel'
          },
        ]
      );

    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to access photo library');
    }
  };

  const pickImage = async (source) => {
    try {
      let result;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await uploadProfileImage(imageUri);
      }

    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfileImage = async (imageUri) => {
    try {
      setUploadingImage(true);

      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      // Generate file name
      const fileExt = imageUri.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Delete old profile image if exists
      if (profileData.profile_image) {
        const oldPath = profileData.profile_image.split('/').pop();
        await supabase.storage
          .from('profile-images')
          .remove([`${userId}/${oldPath}`]);
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          profile_image: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      setProfileData(prev => ({
        ...prev,
        profile_image: publicUrl,
      }));

      Alert.alert('Success', 'Profile picture updated successfully');

    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validate required fields
    if (!profileData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!profileData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    try {
      setSaving(true);

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileData.name.trim(),
          phone: profileData.phone.trim(),
          address: profileData.address.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SettingAppBar title="Edit Profile" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SettingAppBar title="Edit Profile" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePictureContainer}>
            {uploadingImage ? (
              <View style={styles.profilePicture}>
                <ActivityIndicator size="large" color="#FF6B6B" />
              </View>
            ) : (
              <Image
                source={
                  profileData.profile_image
                    ? { uri: profileData.profile_image }
                    : require('../../../../../../assets/logo.png')
                }
                style={styles.profilePicture}
                resizeMode="cover"
              />
            )}
            <TouchableOpacity
              style={styles.changePictureButton}
              onPress={handleChangeProfilePicture}
              disabled={uploadingImage}
            >
              <Ionicons name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePictureText}>
            {uploadingImage ? 'Uploading...' : 'Tap to change profile picture'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={profileData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputContainer, styles.disabledInput]}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, styles.disabledText]}
                value={profileData.email}
                placeholder="Email address"
                placeholderTextColor="#999"
                editable={false}
              />
            </View>
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={profileData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={profileData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                placeholder="Enter your address"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, (saving || uploadingImage) && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={saving || uploadingImage}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FF6B6B',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePictureButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FF6B6B',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  changePictureText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    paddingVertical: 10,
  },
  disabledText: {
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
