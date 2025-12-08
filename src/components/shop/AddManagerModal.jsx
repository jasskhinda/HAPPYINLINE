import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const AddAdminModal = ({ visible, onClose, onAdd }) => {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }
    if (!confirmEmail.trim()) {
      Alert.alert('Error', 'Please confirm the email address');
      return false;
    }
    if (email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) {
      Alert.alert('Error', 'Email addresses do not match');
      return false;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleCreateAdmin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('📝 Creating new admin account...');

      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
            role: 'admin', // Profile-level role
          }
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        Alert.alert('Error', authError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Admin account created:', authData.user?.id);

      // 2. Return the new user data to parent
      const newAdmin = {
        id: authData.user?.id,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        phone: phone.trim(),
        role: 'admin', // Shop-level role (will be added to shop_staff)
      };

      Alert.alert(
        'Success!',
        `Admin account created for ${name}. They can now login with their email and password.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onAdd(newAdmin);
              handleClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Creation error:', error);
      Alert.alert('Error', 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setConfirmEmail('');
    setName('');
    setPhone('');
    setPassword('');
    setShowPassword(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Admin Account</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formSection}>
                <Text style={styles.sectionDescription}>
                  Create a new admin account. They'll be able to login and manage your shop.
                </Text>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="admin@example.com"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Confirm Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="admin@example.com"
                    placeholderTextColor="#999"
                    value={confirmEmail}
                    onChangeText={setConfirmEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {confirmEmail.length > 0 && email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim() && (
                    <Text style={styles.errorText}>
                      Email addresses do not match
                    </Text>
                  )}
                </View>

                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Smith"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                {/* Phone */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="(555) 123-4567"
                    placeholderTextColor="#999"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                  {password.length > 0 && password.length < 6 && (
                    <Text style={styles.errorText}>
                      Password must be at least 6 characters
                    </Text>
                  )}
                </View>

                <View style={styles.noteBox}>
                  <Ionicons name="information-circle" size={20} color="#4A90E2" />
                  <Text style={styles.noteText}>
                    The admin will be able to login with this email and password. They'll have full control of this shop.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <SafeAreaView edges={['bottom']}>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.addButton]}
                  onPress={handleCreateAdmin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.addButtonText}>Create & Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
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
  formSection: {
    padding: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    marginTop: 6,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
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
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    backgroundColor: '#4A90E2',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

// Export as AddAdminModal (renamed from AddManagerModal)
export default AddAdminModal;
// Backwards compatible export
export { AddAdminModal as AddManagerModal };
