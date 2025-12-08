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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SettingAppBar from '../../../../../components/appBar/SettingAppBar';
import CircularProgressBar from '../../../../../components/loadingBar/CircularProgressBar';
import { 
  fetchAllManagers, 
  createManager, 
  updateManager, 
  deleteManager,
} from '../../../../../lib/auth';

const ManagerManagementScreen = () => {
  const [managers, setManagers] = useState([]);
  const [filteredManagers, setFilteredManagers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingManagerId, setDeletingManagerId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  // Load managers on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter managers when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredManagers(managers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = managers.filter(manager =>
        manager.name?.toLowerCase().includes(query) ||
        manager.email?.toLowerCase().includes(query)
      );
      setFilteredManagers(filtered);
    }
  }, [searchQuery, managers]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const managersResult = await fetchAllManagers();

      if (managersResult.success) {
        setManagers(managersResult.data);
        setFilteredManagers(managersResult.data);
      } else {
        Alert.alert('Error', managersResult.error || 'Failed to load managers');
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddManager = () => {
    setEditingManager(null);
    setManagerName('');
    setManagerPhone('');
    setManagerEmail('');
    setManagerPassword('');
    setModalVisible(true);
  };

  const handleEditManager = (manager) => {
    setEditingManager(manager);
    setManagerName(manager.name || '');
    setManagerPhone(manager.phone || '');
    setManagerEmail(manager.email || '');
    setModalVisible(true);
  };

  const handleSaveManager = async () => {
    // Validation
    if (!managerName.trim()) {
      Alert.alert('Error', 'Please enter manager name');
      return;
    }
    if (!managerEmail.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }

    // Password validation for new managers only
    if (!editingManager) {
      if (!managerPassword.trim()) {
        Alert.alert('Error', 'Please enter a password for the new manager');
        return;
      }
      if (managerPassword.trim().length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
    }

    try {
      setSaving(true);

      if (editingManager) {
        // Update existing manager
        const updates = {
          name: managerName.trim(),
          phone: managerPhone.trim() || null,
          email: managerEmail.trim(),
        };

        const result = await updateManager(editingManager.id, updates);

        if (result.success) {
          Alert.alert('Success', 'Manager updated successfully');
          setModalVisible(false);
          await loadData();
        } else {
          Alert.alert('Error', result.error || 'Failed to update manager');
        }
      } else {
        // Create new manager
        const managerData = {
          name: managerName.trim(),
          phone: managerPhone.trim() || null,
          email: managerEmail.trim(),
          password: managerPassword.trim(),
        };

        const result = await createManager(managerData);

        if (result.success) {
          const message = result.message || 'Manager added successfully';
          Alert.alert('Success', message);
          setModalVisible(false);
          await loadData();
        } else {
          Alert.alert('Error', result.error || 'Failed to add manager');
        }
      }
    } catch (error) {
      console.error('❌ Error saving manager:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteManager = (managerId, managerName) => {
    Alert.alert(
      'Remove Manager',
      `Are you sure you want to remove ${managerName}? This will change their role to customer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              setDeletingManagerId(managerId);

              const result = await deleteManager(managerId);

              if (result.success) {
                Alert.alert('Success', 'Manager removed successfully');
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove manager');
              }
            } catch (error) {
              console.error('❌ Error deleting manager:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setDeleting(false);
              setDeletingManagerId(null);
            }
          },
        },
      ]
    );
  };

  const renderManagerItem = ({ item }) => {
    const isDeleting = deleting && deletingManagerId === item.id;

    return (
      <View style={styles.managerCard}>
        {isDeleting && (
          <View style={styles.cardOverlay}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.overlayText}>Removing...</Text>
          </View>
        )}
        <View style={[styles.managerContent, isDeleting && styles.contentDisabled]}>
          <View style={styles.managerIconContainer}>
            <Ionicons name="briefcase" size={30} color="#9C27B0" />
          </View>
          <View style={styles.managerInfo}>
            <Text style={styles.managerName}>{item.name}</Text>
            {item.phone && <Text style={styles.contactInfo}>📞 {item.phone}</Text>}
            <Text style={styles.contactInfo}>✉️ {item.email}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>Manager</Text>
            </View>
          </View>
          <View style={styles.managerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditManager(item)}
              disabled={isDeleting}
            >
              <Ionicons name="pencil" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteManager(item.id, item.name)}
              disabled={isDeleting}
            >
              <Ionicons name="trash" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Show initial loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <SettingAppBar title="Manager Management" />
          <View style={styles.loadingContainer}>
            <CircularProgressBar />
            <Text style={styles.loadingText}>Loading managers...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {deleting && (
        <View style={styles.globalOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingCardText}>Removing manager...</Text>
          </View>
        </View>
      )}

      <View style={styles.container}>
        <SettingAppBar title="Manager Management" />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Managers</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddManager}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Manager</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Manager List */}
          {filteredManagers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={80} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No managers found' : 'No managers yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Add your first manager to get started'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredManagers}
              renderItem={renderManagerItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#9C27B0']}
                  tintColor="#9C27B0"
                />
              }
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
                {editingManager ? 'Edit Manager' : 'Add New Manager'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Manager Name *</Text>
              <TextInput
                style={styles.textInput}
                value={managerName}
                onChangeText={setManagerName}
                placeholder="Enter manager name"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={managerPhone}
                onChangeText={setManagerPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                value={managerEmail}
                onChangeText={setManagerEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {!editingManager && (
                <>
                  <Text style={styles.inputLabel}>
                    Password * <Text style={styles.inputHint}>(Only required for new managers)</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={managerPassword}
                    onChangeText={setManagerPassword}
                    placeholder="Enter password (min 6 characters)"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                  <Text style={styles.noteText}>
                    💡 The manager can login immediately with their email and password.
                  </Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSaveManager}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingManager ? 'Update' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  globalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 150,
  },
  loadingCardText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  managerCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    zIndex: 10,
  },
  overlayText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  managerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
  },
  contentDisabled: {
    opacity: 0.5,
  },
  managerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#9C27B020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  roleTag: {
    backgroundColor: '#9C27B020',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  roleText: {
    fontSize: 12,
    color: '#9C27B0',
    fontWeight: '600',
  },
  managerActions: {
    flexDirection: 'column',
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
    backgroundColor: '#4A90E220',
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
    maxHeight: '80%',
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
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  inputHint: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#999',
    fontStyle: 'italic',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  noteText: {
    fontSize: 13,
    color: '#2196F3',
    marginTop: 15,
    lineHeight: 20,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
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
    backgroundColor: '#9C27B0',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ManagerManagementScreen;
