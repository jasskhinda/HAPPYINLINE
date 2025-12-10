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
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../../../lib/supabase';
import { deleteAccount } from '../../../../../lib/auth';
import SettingAppBar from '../../../../../components/appBar/SettingAppBar';
import { useNavigation } from '@react-navigation/native';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profile_image: null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
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
      setUserRole(profile.role || 'customer');
      setIsPlatformAdmin(profile.is_platform_admin || false);

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
          'Photo Library Access',
          'Happy Inline needs access to your photo library so you can choose a profile picture. This helps other users and businesses recognize you when you book appointments.',
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
                Alert.alert('Camera Access', 'Happy Inline needs camera access so you can take a profile picture. This helps businesses recognize you when you arrive for appointments.');
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
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
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
          .from('profile-pictures')
          .remove([`${userId}/${oldPath}`]);
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
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
        .from('profile-pictures')
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

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChangePassword = async () => {
    // Validate passwords
    if (!passwordData.newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      console.log('🔐 Starting password change...');

      // Update password using Supabase Auth with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000)
      );

      const updatePromise = supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      const { data, error } = await Promise.race([updatePromise, timeoutPromise]);

      console.log('🔐 Password update response:', { data, error });

      if (error) throw error;

      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      Alert.alert('Success', 'Password changed successfully! Please use your new password next time you log in.');
    } catch (error) {
      // Handle specific error codes - don't use console.error to avoid LogBox display
      let errorMessage = 'Failed to change password. Please try again.';
      if (error.code === 'same_password' || error.message?.includes('same password')) {
        errorMessage = 'New password must be different from your current password.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Password Change Failed', errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isPlatformAdmin) {
      Alert.alert(
        'Cannot Delete',
        'Platform admin accounts cannot be deleted for security reasons.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.\n\nAll your data, bookings, and profile information will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'This is your last chance. Are you absolutely sure you want to delete your account?',
      [
        { text: 'No, Keep My Account', style: 'cancel' },
        {
          text: 'Yes, Delete Forever',
          style: 'destructive',
          onPress: processDeleteAccount,
        },
      ]
    );
  };

  const processDeleteAccount = async () => {
    try {
      setDeletingAccount(true);

      const result = await deleteAccount();

      if (result.success) {
        Alert.alert(
          'Account Deleted',
          result.message || 'Your account has been permanently deleted.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to welcome screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'WelcomeScreen' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Error', 'An unexpected error occurred while deleting your account');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SettingAppBar title="Edit Profile" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
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
                <ActivityIndicator size="large" color="#4A90E2" />
              </View>
            ) : (
              <Image
                source={
                  profileData.profile_image
                    ? { uri: profileData.profile_image }
                    : require('../../../../../../assets/logowithouttagline.png')
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

        {/* Save Button with Gradient */}
        <TouchableOpacity
          onPress={handleSaveProfile}
          disabled={saving || uploadingImage}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={saving || uploadingImage ? ['#CCCCCC', '#999999'] : ['#4A90E2', '#3A7BC8', '#2A6BA8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Change Password Section */}
        <View style={styles.passwordSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={24} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Change Password</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={passwordData.newPassword}
                onChangeText={(value) => handlePasswordChange('newPassword', value)}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                secureTextEntry={!showPasswords.new}
              />
              <TouchableOpacity onPress={() => togglePasswordVisibility('new')}>
                <Ionicons
                  name={showPasswords.new ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={passwordData.confirmPassword}
                onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                secureTextEntry={!showPasswords.confirm}
              />
              <TouchableOpacity onPress={() => togglePasswordVisibility('confirm')}>
                <Ionicons
                  name={showPasswords.confirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={changingPassword}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={changingPassword ? ['#CCCCCC', '#999999'] : ['#4A90E2', '#3A7BC8', '#2A6BA8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.changePasswordButton}
            >
              {changingPassword ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="key" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.changePasswordButtonText}>Update Password</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Delete Account Section */}
        <View style={styles.deleteAccountSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Delete Account</Text>
          </View>

          <Text style={styles.deleteWarningText}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </Text>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount || isPlatformAdmin}
            activeOpacity={0.9}
            style={[
              styles.deleteAccountButton,
              (deletingAccount || isPlatformAdmin) && styles.deleteAccountButtonDisabled
            ]}
          >
            {deletingAccount ? (
              <ActivityIndicator color="#FF3B30" size="small" />
            ) : (
              <>
                <Ionicons name="trash" size={18} color="#FF3B30" style={{ marginRight: 8 }} />
                <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
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
    borderColor: '#4A90E2',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePictureButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#4A90E2',
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
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  passwordSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  changePasswordButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  changePasswordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteAccountSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteWarningText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteAccountButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteAccountButtonDisabled: {
    borderColor: '#CCC',
    backgroundColor: '#F5F5F5',
  },
  deleteAccountButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
