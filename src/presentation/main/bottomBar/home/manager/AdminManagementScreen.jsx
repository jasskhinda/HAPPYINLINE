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
  fetchAllAdmins, 
  createAdmin, 
  updateAdmin, 
  deleteAdmin,
  getCurrentUser,
} from '../../../../../lib/auth';

const AdminManagementScreen = () => {
  const [admins, setAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Load current user and admins on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter admins when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAdmins(admins);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = admins.filter(admin =>
        admin.name?.toLowerCase().includes(query) ||
        admin.email?.toLowerCase().includes(query)
      );
      setFilteredAdmins(filtered);
    }
  }, [searchQuery, admins]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUserResult = await getCurrentUser();
      if (currentUserResult.success && currentUserResult.data) {
        setCurrentUserId(currentUserResult.data.id);
      }

      // Get all admins (only regular admins, not super admin)
      const adminsResult = await fetchAllAdmins();

      if (adminsResult.success) {
        // Filter out super admins - only show regular admins
        const regularAdmins = adminsResult.data.filter(admin => !admin.is_super_admin);
        setAdmins(regularAdmins);
        setFilteredAdmins(regularAdmins);
      } else {
        Alert.alert('Error', adminsResult.error || 'Failed to load admins');
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

  const handleAddAdmin = () => {
    setEditingAdmin(null);
    setAdminName('');
    setAdminPhone('');
    setAdminEmail('');
    setModalVisible(true);
  };

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setAdminName(admin.name || '');
    setAdminPhone(admin.phone || '');
    setAdminEmail(admin.email || '');
    setModalVisible(true);
  };

  const handleSaveAdmin = async () => {
    // Validation
    if (!adminName.trim()) {
      Alert.alert('Error', 'Please enter admin name');
      return;
    }
    if (!adminEmail.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }

    try {
      setSaving(true);

      if (editingAdmin) {
        // Update existing admin
        const updates = {
          name: adminName.trim(),
          phone: adminPhone.trim() || null,
          email: adminEmail.trim(),
        };

        const result = await updateAdmin(editingAdmin.id, updates);

        if (result.success) {
          Alert.alert('Success', 'Admin updated successfully');
          setModalVisible(false);
          await loadData();
        } else {
          Alert.alert('Error', result.error || 'Failed to update admin');
        }
      } else {
        // Create new admin
        const adminData = {
          name: adminName.trim(),
          phone: adminPhone.trim() || null,
          email: adminEmail.trim(),
        };

        const result = await createAdmin(adminData);

        if (result.success) {
          const message = result.message || 'Admin added successfully';
          Alert.alert('Success', message);
          setModalVisible(false);
          await loadData();
        } else {
          Alert.alert('Error', result.error || 'Failed to add admin');
        }
      }
    } catch (error) {
      console.error('❌ Error saving admin:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = (adminId, adminName, isSuperAdmin) => {
    if (isSuperAdmin) {
      Alert.alert('Cannot Remove', 'Super admin cannot be removed from the system.');
      return;
    }

    Alert.alert(
      'Remove Admin',
      `Are you sure you want to remove ${adminName}? This will change their role to customer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              setDeletingAdminId(adminId);

              const result = await deleteAdmin(adminId);

              if (result.success) {
                Alert.alert('Success', 'Admin removed successfully');
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove admin');
              }
            } catch (error) {
              console.error('❌ Error deleting admin:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setDeleting(false);
              setDeletingAdminId(null);
            }
          },
        },
      ]
    );
  };

  const renderAdminItem = ({ item }) => {
    const isDeleting = deleting && deletingAdminId === item.id;
    const isSuperAdmin = item.is_super_admin;
    const isCurrentUser = item.id === currentUserId;

    return (
      <View style={styles.adminCard}>
        {isDeleting && (
          <View style={styles.cardOverlay}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.overlayText}>Removing...</Text>
          </View>
        )}
        <View style={[styles.adminContent, isDeleting && styles.contentDisabled]}>
          <View style={[
            styles.adminIconContainer,
            isSuperAdmin && styles.superAdminIconContainer
          ]}>
            <Ionicons 
              name={isSuperAdmin ? "shield-checkmark" : "shield"} 
              size={30} 
              color={isSuperAdmin ? "#FFD700" : "#FF5722"} 
            />
          </View>
          <View style={styles.adminInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.adminName}>{item.name}</Text>
              {isSuperAdmin && <Text style={styles.crownEmoji}>👑</Text>}
              {isCurrentUser && <Text style={styles.youTag}>(You)</Text>}
            </View>
            {item.phone && <Text style={styles.contactInfo}>📞 {item.phone}</Text>}
            <Text style={styles.contactInfo}>✉️ {item.email}</Text>
            <View style={[
              styles.roleTag,
              isSuperAdmin && styles.superAdminRoleTag
            ]}>
              <Text style={[
                styles.roleText,
                isSuperAdmin && styles.superAdminRoleText
              ]}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </Text>
            </View>
          </View>
          {!isSuperAdmin && (
            <View style={styles.adminActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditAdmin(item)}
                disabled={isDeleting}
              >
                <Ionicons name="pencil" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteAdmin(item.id, item.name, item.is_super_admin)}
                disabled={isDeleting}
              >
                <Ionicons name="trash" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Show initial loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <SettingAppBar title="Admin Management" />
          <View style={styles.loadingContainer}>
            <CircularProgressBar />
            <Text style={styles.loadingText}>Loading admins...</Text>
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
            <Text style={styles.loadingCardText}>Removing admin...</Text>
          </View>
        </View>
      )}

      <View style={styles.container}>
        <SettingAppBar title="Admin Management" />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Admins</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddAdmin}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Admin</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              Only regular admins can be managed here. Super admin is permanent.
            </Text>
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

          {/* Admin List */}
          {filteredAdmins.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={80} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No admins found' : 'No admins yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Add your first admin to get started'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredAdmins}
              renderItem={renderAdminItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#FF5722']}
                  tintColor="#FF5722"
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
                  {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Admin Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={adminName}
                  onChangeText={setAdminName}
                  placeholder="Enter admin name"
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={adminPhone}
                  onChangeText={setAdminPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.textInput}
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {!editingAdmin && (
                  <Text style={styles.noteText}>
                    💡 An admin profile will be created. They can login with OTP when ready. You won't be signed out.
                  </Text>
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
                  onPress={handleSaveAdmin}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingAdmin ? 'Update' : 'Add'}
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
    backgroundColor: '#FF5722',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 10,
    flex: 1,
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
  adminCard: {
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
  adminContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
  },
  contentDisabled: {
    opacity: 0.5,
  },
  adminIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF572220',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  superAdminIconContainer: {
    backgroundColor: '#FFD70020',
  },
  adminInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  adminName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  crownEmoji: {
    fontSize: 18,
    marginLeft: 5,
  },
  youTag: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
    fontStyle: 'italic',
  },
  contactInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  roleTag: {
    backgroundColor: '#FF572220',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  superAdminRoleTag: {
    backgroundColor: '#FFD70020',
  },
  roleText: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: '600',
  },
  superAdminRoleText: {
    color: '#F57C00',
  },
  adminActions: {
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
    backgroundColor: '#FF5722',
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

export default AdminManagementScreen;
