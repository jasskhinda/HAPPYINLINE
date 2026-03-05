import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { getCurrentUser, updateProfile } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import Toast from 'react-native-toast-message';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { user, profile } = await getCurrentUser();
    if (profile) {
      setUserId(user?.id || profile.id);
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setProfileImage(profile.profile_image || null);
    }
    setLoading(false);
  };

  const handleChangeProfilePicture = () => {
    Alert.alert('Change Profile Picture', 'Choose an option', [
      { text: 'Take Photo', onPress: () => requestCameraPermission() },
      { text: 'Choose from Gallery', onPress: () => requestGalleryPermission() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const requestGalleryPermission = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === 'granted') {
        pickImage('gallery');
      } else {
        pickImage('gallery'); // Android 13+ system picker doesn't need permission
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access photo library');
    }
  };

  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === 'granted') {
        pickImage('camera');
      } else {
        Alert.alert('Permission Required', 'Please enable camera access in Settings.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access camera');
    }
  };

  const pickImage = async (source) => {
    try {
      const options = { allowsEditing: true, aspect: [1, 1], quality: 0.8 };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]) {
        const { uri, width, height } = result.assets[0];
        if (width < 200 || height < 200) {
          Alert.alert('Image Too Small', 'Please select an image at least 200x200 pixels.');
          return;
        }
        await uploadProfileImage(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfileImage = async (imageUri) => {
    if (!userId) return;
    setUploadingImage(true);
    try {
      // Convert to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const fileExt = imageUri.split('.').pop() || 'jpg';
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      // Delete old image if exists
      if (profileImage) {
        const oldFileName = profileImage.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('profile-pictures').remove([`${userId}/${oldFileName}`]);
        }
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfileImage(publicUrl);
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Profile picture updated' });
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Name is required' });
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile({ name: name.trim(), phone: phone.trim() });
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Profile updated' });
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to save' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar with camera button */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleChangeProfilePicture} disabled={uploadingImage} activeOpacity={0.7}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#666" />
                </View>
              )}
              {uploadingImage ? (
                <View style={styles.cameraOverlay}>
                  <ActivityIndicator color="#FFF" size="small" />
                </View>
              ) : (
                <View style={styles.cameraButton}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} autoCapitalize="words" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="(555) 123-4567" placeholderTextColor="#999" />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  avatarSection: { alignItems: 'center', marginVertical: 24 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  cameraButton: {
    position: 'absolute', bottom: 2, right: 2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  cameraOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 55, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  changePhotoText: { fontSize: 13, color: '#4A90E2', fontWeight: '500', marginTop: 8 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#000' },
  saveButton: { backgroundColor: '#4A90E2', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
});

export default EditProfileScreen;
