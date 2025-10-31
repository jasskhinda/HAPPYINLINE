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

const AddStaffModal = ({ visible, onClose, onAdd, existingStaff = [] }) => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSearch = async () => {
    if (!searchText.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      // Search by email only in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .eq('email', searchText.trim().toLowerCase())
        .limit(5);

      if (error) throw error;

      // Filter out already added staff
      const existingIds = existingStaff.map(s => s.id);
      const filteredData = (data || []).filter(user => !existingIds.includes(user.id));

      setSearchResults(filteredData);

      if (filteredData.length === 0) {
        Alert.alert('Not Found', 'No user found with that email address');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search for users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleAddStaff = () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user');
      return;
    }

    onAdd({ ...selectedUser, role: 'staff' });
    handleClose();
  };

  const handleClose = () => {
    setSearchText('');
    setSearchResults([]);
    setSelectedUser(null);
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
              <Text style={styles.modalTitle}>Add Staff Member</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Search Section */}
              <View style={styles.searchSection}>
                <Text style={styles.label}>Search by Email Address</Text>
                <View style={styles.searchInputContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter email address"
                    placeholderTextColor="#999"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons name="search" size={20} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>
                  User must be registered with this email to be added as staff
                </Text>
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsTitle}>Select User:</Text>
                  {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userItem,
                    selectedUser?.id === user.id && styles.userItemSelected,
                  ]}
                  onPress={() => handleSelectUser(user)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name?.charAt(0).toUpperCase() || 'B'}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name || 'No Name'}</Text>
                    <Text style={styles.userContact}>{user.email || user.phone}</Text>
                  </View>
                  {selectedUser?.id === user.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
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
                style={[
                  styles.button,
                  styles.addButton,
                  !selectedUser && styles.addButtonDisabled,
                ]}
                onPress={handleAddStaff}
                disabled={!selectedUser}
              >
                <Text style={styles.addButtonText}>Add Staff</Text>
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
  searchSection: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#333',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#FF6B35',
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userItemSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F0',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userContact: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
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
    backgroundColor: '#FF6B35',
    marginLeft: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default AddStaffModal;
