import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getShopStaff, getUserRoleInShop } from '../../../../lib/shopAuth';
import { supabase } from '../../../../lib/supabase';

const StaffManagementScreen = ({ route, navigation }) => {
  const { shopId, section } = route.params; // section: 'managers' or 'barbers'
  
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [staff, setStaff] = useState([]);
  const [managers, setManagers] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('barber');
  const [addingStaff, setAddingStaff] = useState(false);

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Check user role
      const { success: roleSuccess, role } = await getUserRoleInShop(shopId);
      if (roleSuccess) {
        setUserRole(role);
      }

      // Load all staff
      const { success: staffSuccess, staff: staffData } = await getShopStaff(shopId);
      if (staffSuccess && staffData) {
        setStaff(staffData);
        // Admins are those with 'admin' role in shop_staff
        const managersData = staffData.filter(s => s.role === 'admin');
        const barbersData = staffData.filter(s => s.role === 'barber');
        setManagers(managersData);
        setBarbers(barbersData);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!addEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Check permissions - admins can only add barbers
    if (userRole === 'admin' && addRole !== 'barber') {
      Alert.alert('Permission Denied', 'Admins can only add barbers');
      return;
    }

    try {
      setAddingStaff(true);

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('email', addEmail.toLowerCase().trim())
        .single();

      if (userError || !userData) {
        Alert.alert('Error', 'User not found with this email');
        return;
      }

      // Check if user is already staff
      const existingStaff = staff.find(s => s.user_id === userData.id);
      if (existingStaff) {
        Alert.alert('Error', 'This user is already a staff member');
        return;
      }

      // Add staff member using RPC function to bypass RLS
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('add_staff_to_shop', {
          p_shop_id: shopId,
          p_user_id: userData.id,
          p_role: addRole,
          p_invited_by: null
        });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        // Fallback to direct insert
        const { error: insertError } = await supabase
          .from('shop_staff')
          .insert({
            shop_id: shopId,
            user_id: userData.id,
            role: addRole,
            is_active: true,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          Alert.alert('Error', 'Failed to add staff member');
          return;
        }
      } else if (!rpcResult?.success) {
        console.error('RPC returned error:', rpcResult?.error);
        Alert.alert('Error', rpcResult?.error || 'Failed to add staff member');
        return;
      }

      Alert.alert('Success', `${userData.name} added as ${addRole}`, [
        {
          text: 'OK',
          onPress: () => {
            setShowAddModal(false);
            setAddEmail('');
            loadData();
          },
        },
      ]);
    } catch (error) {
      console.error('Add staff error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = (staffMember) => {
    // Check permissions - admins can remove barbers only
    if (userRole === 'admin' && staffMember.role !== 'barber') {
      Alert.alert('Permission Denied', 'Admins can only remove barbers');
      return;
    }

    Alert.alert(
      'Remove Staff Member',
      `Are you sure you want to remove ${staffMember.user?.name} (${staffMember.role})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shop_staff')
                .delete()
                .eq('id', staffMember.id);

              if (error) {
                Alert.alert('Error', 'Failed to remove staff member');
                return;
              }

              Alert.alert('Success', 'Staff member removed');
              loadData();
            } catch (error) {
              console.error('Remove staff error:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = (staffMember, newRole) => {
    // Only admin can change roles
    if (userRole !== 'admin') {
      Alert.alert('Permission Denied', 'Only admins can change staff roles');
      return;
    }

    Alert.alert(
      'Change Role',
      `Change ${staffMember.user?.name} from ${staffMember.role} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shop_staff')
                .update({ role: newRole })
                .eq('id', staffMember.id);

              if (error) {
                Alert.alert('Error', 'Failed to change role');
                return;
              }

              Alert.alert('Success', 'Role changed successfully');
              loadData();
            } catch (error) {
              console.error('Change role error:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  };

  const renderStaffMember = (staffMember) => {
    const canRemove = userRole === 'admin';
    const canChangeRole = userRole === 'admin';

    return (
      <View key={staffMember.id} style={styles.staffCard}>
        {staffMember.user?.profile_image ? (
          <Image
            source={{ uri: staffMember.user.profile_image }}
            style={styles.staffImage}
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <Ionicons name="person" size={30} color="#007AFF" />
          </View>
        )}

        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{staffMember.user?.name}</Text>
          <Text style={styles.staffEmail}>{staffMember.user?.email}</Text>
          
          {/* Role Badge */}
          <View style={styles.roleBadgeContainer}>
            <View style={[
              styles.roleBadge,
              staffMember.role === 'admin' && styles.adminBadge,
              staffMember.role === 'barber' && styles.barberBadge,
            ]}>
              <Text style={styles.roleBadgeText}>{staffMember.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {/* Change Role Button (Admin only) */}
          {canChangeRole && staffMember.role !== 'admin' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const availableRoles = staffMember.role === 'admin'
                  ? ['barber']
                  : ['admin'];

                Alert.alert(
                  'Change Role',
                  'Select new role:',
                  availableRoles.map(role => ({
                    text: role.toUpperCase(),
                    onPress: () => handleChangeRole(staffMember, role),
                  })).concat([{ text: 'Cancel', style: 'cancel' }])
                );
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}

          {/* Remove Button */}
          {canRemove && staffMember.role !== 'admin' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRemoveStaff(staffMember)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Management</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading staff...</Text>
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
        <Text style={styles.headerTitle}>
          {section === 'managers' ? 'Manage Admins' : 'Manage Barbers'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (userRole === 'admin' && section === 'managers') {
              Alert.alert('Permission Denied', 'Only owners can add admins');
              return;
            }
            setAddRole(section === 'managers' ? 'admin' : 'barber');
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Permission Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#007AFF" />
        <Text style={styles.infoBannerText}>
          {userRole === 'admin'
            ? 'You can add, remove, and change roles for all staff'
            : 'You can add and remove barbers only'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {section === 'managers' ? (
          <>
            {managers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color="#DDD" />
                <Text style={styles.emptyText}>No admins yet</Text>
              </View>
            ) : (
              managers.map(renderStaffMember)
            )}
          </>
        ) : (
          <>
            {barbers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cut-outline" size={60} color="#DDD" />
                <Text style={styles.emptyText}>No barbers yet</Text>
              </View>
            ) : (
              barbers.map(renderStaffMember)
            )}
          </>
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add {addRole === 'admin' ? 'Admin' : 'Barber'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter user's email"
              placeholderTextColor="#999"
              value={addEmail}
              onChangeText={setAddEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setAddEmail('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddStaff}
                disabled={addingStaff}
              >
                {addingStaff ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalAddButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  staffImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
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
  staffEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  adminBadge: {
    backgroundColor: '#4CAF50',
  },
  managerBadge: {
    backgroundColor: '#007AFF',
  },
  barberBadge: {
    backgroundColor: '#4A90E2',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default StaffManagementScreen;
