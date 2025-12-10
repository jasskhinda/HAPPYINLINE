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
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  getShopDetails,
  getShopStaff,
  getShopServices,
} from '../../../../lib/shopAuth';
import { supabase } from '../../../../lib/supabase';
import { getRoleDisplayName } from '../../../../utils/roleDisplay';

const AdminBusinessDetailsScreen = ({ route, navigation }) => {
  const { shopId } = route.params;

  const [shop, setShop] = useState(null);
  const [owner, setOwner] = useState(null);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Approval/Rejection modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  // Keep status bar as dark-content for light background
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      return () => {
        StatusBar.setBarStyle('dark-content');
      };
    }, [])
  );

  useEffect(() => {
    loadBusinessData();
  }, [shopId]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);

      // Load shop details
      const { success: shopSuccess, shop: shopData } = await getShopDetails(shopId);
      if (shopSuccess && shopData) {
        setShop(shopData);

        // Load owner information
        if (shopData.created_by) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, name, email, phone, created_at')
            .eq('id', shopData.created_by)
            .single();

          setOwner(ownerData);
        }
      }

      // Load staff with full profile information
      const { success: staffSuccess, staff: staffData } = await getShopStaff(shopId);
      console.log('📊 Staff Data from getShopStaff:', staffData);

      if (staffSuccess && staffData) {
        // Transform staff data - user info is already included from the JOIN
        const staffWithProfiles = staffData.map((member) => {
          console.log('👤 Processing staff member:', member);
          console.log('   - role:', member.role);
          console.log('   - user object:', member.user);

          return {
            ...member,
            name: member.user?.name || member.user?.email || 'No name',
            email: member.user?.email || '',
            phone: member.user?.phone || '',
          };
        });

        console.log('✅ Final staff with profiles:', staffWithProfiles);
        setStaff(staffWithProfiles);
      }

      // Load services
      const { success: servicesSuccess, services: servicesData } = await getShopServices(shopId);
      if (servicesSuccess) {
        setServices(servicesData || []);
      }

      // Load bookings count
      console.log('📅 Fetching bookings for shop_id:', shopId);
      const { count: bookingsTotal, error: bookingsError, data: bookingsData } = await supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .eq('shop_id', shopId);

      console.log('   - Bookings count:', bookingsTotal);
      console.log('   - Bookings error:', bookingsError);
      console.log('   - Bookings data:', bookingsData);

      setBookingsCount(bookingsTotal || 0);

      // TODO: Calculate total revenue from completed bookings
      setTotalRevenue(0);

    } catch (error) {
      console.error('Error loading business data:', error);
      Alert.alert('Error', 'Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinessData();
    setRefreshing(false);
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('shops')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId);

      if (error) throw error;

      Alert.alert('Success', 'Business has been approved!', [
        { text: 'OK', onPress: () => {
          setShowApprovalModal(false);
          loadBusinessData();
        }}
      ]);

    } catch (error) {
      console.error('Error approving business:', error);
      Alert.alert('Error', 'Failed to approve business');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('shops')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId);

      if (error) throw error;

      Alert.alert('Success', 'Business has been rejected', [
        { text: 'OK', onPress: () => {
          setShowRejectionModal(false);
          setRejectionReason('');
          loadBusinessData();
        }}
      ]);

    } catch (error) {
      console.error('Error rejecting business:', error);
      Alert.alert('Error', 'Failed to reject business');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = () => {
    Alert.alert(
      'Suspend Business',
      'Are you sure you want to suspend this business? It will be hidden from customers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const { error } = await supabase
                .from('shops')
                .update({ status: 'suspended' })
                .eq('id', shopId);

              if (error) throw error;

              Alert.alert('Success', 'Business has been suspended');
              loadBusinessData();
            } catch (error) {
              Alert.alert('Error', 'Failed to suspend business');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'pending_review': { label: 'Pending Review', color: '#4A90E2', icon: 'time-outline' },
      'pending_approval': { label: 'Pending Approval', color: '#4A90E2', icon: 'time-outline' },
      'approved': { label: 'Approved', color: '#000000', icon: 'checkmark-circle' },
      'active': { label: 'Active', color: '#000000', icon: 'checkmark-circle' },
      'rejected': { label: 'Rejected', color: '#666666', icon: 'close-circle' },
      'suspended': { label: 'Suspended', color: '#666666', icon: 'ban' },
    };
    return statusMap[status] || statusMap['approved'];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* White background for status bar area */}
        <View style={{ backgroundColor: '#FFFFFF', flex: 0 }}>
          <SafeAreaView edges={['top']}>
            <LinearGradient
              colors={['#4A90E2', '#3A7BC8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Business Details</Text>
              <View style={{ width: 24 }} />
            </LinearGradient>
          </SafeAreaView>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading business details...</Text>
        </View>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.container}>
        {/* White background for status bar area */}
        <View style={{ backgroundColor: '#FFFFFF', flex: 0 }}>
          <SafeAreaView edges={['top']}>
            <LinearGradient
              colors={['#4A90E2', '#3A7BC8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Business Details</Text>
              <View style={{ width: 24 }} />
            </LinearGradient>
          </SafeAreaView>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#4A90E2" />
          <Text style={styles.errorText}>Business not found</Text>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo(shop.status);

  return (
    <View style={styles.container}>
      {/* White background for status bar area */}
      <View style={{ backgroundColor: '#FFFFFF', flex: 0 }}>
        <SafeAreaView edges={['top']}>
          {/* Header with Red Gradient */}
          <LinearGradient
            colors={['#4A90E2', '#3A7BC8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Business Details</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />
        }
        style={styles.scrollView}
      >
        {/* Business Header - Clean White */}
        <View style={styles.businessHeader}>
          {shop.logo_url ? (
            <Image source={{ uri: shop.logo_url }} style={styles.businessLogo} />
          ) : (
            <View style={[styles.businessLogo, styles.businessLogoPlaceholder]}>
              <Ionicons name="storefront" size={40} color="#4A90E2" />
            </View>
          )}
          <Text style={styles.businessName}>{shop.name}</Text>

          {/* Status Badge */}
          <View style={[styles.statusBadgeLarge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon} size={16} color="#FFFFFF" />
            <Text style={[styles.statusBadgeText, { color: '#FFFFFF' }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Admin Actions */}
        {(shop.status === 'pending_review' || shop.status === 'pending_approval') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => setShowApprovalModal(true)}
                disabled={actionLoading}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowRejectionModal(true)}
                disabled={actionLoading}
                activeOpacity={0.9}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {shop.status === 'approved' && (
          <View style={styles.section}>
            <View style={styles.noteBox}>
              <Ionicons name="information-circle" size={24} color="#4CAF50" />
              <View style={styles.noteContent}>
                <Text style={styles.noteTitle}>Approved Business</Text>
                <Text style={styles.noteText}>
                  This business is approved and visible to customers. Owner, admins, and managers have full access.
                </Text>
                {shop.admin_note && (
                  <Text style={styles.noteSubtext}>Note: {shop.admin_note}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={handleSuspend}
              disabled={actionLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#666666', '#4D4D4D', '#333333']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.actionButton, styles.suspendButton]}
              >
                <Ionicons name="ban" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Suspend Business</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {shop.status === 'rejected' && (
          <View style={styles.section}>
            <View style={[styles.noteBox, styles.rejectionBox]}>
              <Ionicons name="close-circle" size={24} color="#4A90E2" />
              <View style={styles.noteContent}>
                <Text style={[styles.noteTitle, { color: '#4A90E2' }]}>Rejected</Text>
                <Text style={styles.noteText}>Reason: {shop.rejection_reason || 'No reason provided'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <View style={[styles.analyticsIcon, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="people" size={24} color="#000000" />
              </View>
              <Text style={styles.analyticsValue}>{staff.length}</Text>
              <Text style={styles.analyticsLabel}>Total Staff</Text>
            </View>
            <View style={styles.analyticsCard}>
              <View style={[styles.analyticsIcon, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="list" size={24} color="#000000" />
              </View>
              <Text style={styles.analyticsValue}>{services.length}</Text>
              <Text style={styles.analyticsLabel}>Services</Text>
            </View>
            <View style={styles.analyticsCard}>
              <View style={[styles.analyticsIcon, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="calendar" size={24} color="#000000" />
              </View>
              <Text style={styles.analyticsValue}>{bookingsCount}</Text>
              <Text style={styles.analyticsLabel}>Total Bookings</Text>
            </View>
            <View style={styles.analyticsCard}>
              <View style={[styles.analyticsIcon, { backgroundColor: '#F5F5F5' }]}>
                <Ionicons name="cash" size={24} color="#000000" />
              </View>
              <Text style={styles.analyticsValue}>${totalRevenue}</Text>
              <Text style={styles.analyticsLabel}>Revenue</Text>
            </View>
          </View>
        </View>

        {/* Owner Information */}
        {owner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Owner</Text>
            <View style={styles.infoCard}>
              <View style={styles.ownerRow}>
                <View style={styles.ownerAvatar}>
                  <Ionicons name="person" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerName}>{owner.name || 'No name'}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={14} color="#666" />
                    <Text style={styles.infoText}>{owner.email}</Text>
                  </View>
                  {owner.phone && (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={14} color="#666" />
                      <Text style={styles.infoText}>{owner.phone}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.infoText}>
                      Joined {new Date(owner.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <View style={styles.infoCard}>
            {shop.description && (
              <View style={styles.infoItem}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemLabel}>Description</Text>
                  <Text style={styles.infoItemValue}>{shop.description}</Text>
                </View>
              </View>
            )}

            {shop.address && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemLabel}>Address</Text>
                  <Text style={styles.infoItemValue}>{shop.address}</Text>
                </View>
              </View>
            )}

            {shop.city && (
              <View style={styles.infoItem}>
                <Ionicons name="business-outline" size={20} color="#666" />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemLabel}>City</Text>
                  <Text style={styles.infoItemValue}>{shop.city}</Text>
                </View>
              </View>
            )}

            {shop.phone && (
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemLabel}>Phone</Text>
                  <Text style={styles.infoItemValue}>{shop.phone}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <View style={styles.infoItemContent}>
                <Text style={styles.infoItemLabel}>Created</Text>
                <Text style={styles.infoItemValue}>
                  {shop.created_at ? new Date(shop.created_at).toLocaleDateString() : 'Not available'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Staff List */}
        {staff.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Members ({staff.length})</Text>
            <View style={styles.infoCard}>
              {staff.map((member, index) => (
                <View key={member.id} style={[styles.staffItem, index > 0 && styles.staffItemBorder]}>
                  <View style={styles.staffAvatar}>
                    <Ionicons name="person" size={20} color="#666666" />
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{member.name}</Text>
                    <Text style={styles.staffRole}>{member.email}</Text>
                    {member.phone && (
                      <Text style={styles.staffPhone}>{member.phone}</Text>
                    )}
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>
                        {getRoleDisplayName(member.role)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Services List */}
        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services ({services.length})</Text>
            <View style={styles.infoCard}>
              {services.map((service, index) => (
                <View key={service.id} style={[styles.serviceItem, index > 0 && styles.serviceItemBorder]}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceDetails}>
                      <Text style={styles.servicePrice}>${service.price}</Text>
                      <Text style={styles.serviceDuration}>{service.duration_minutes} min</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Approval Modal */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Approve Business</Text>
              <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              This will approve the business and make it visible to customers.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Add a note (optional)"
              value={approvalNote}
              onChangeText={setApprovalNote}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowApprovalModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalApproveButton]}
                onPress={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalApproveText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Business</Text>
              <TouchableOpacity onPress={() => setShowRejectionModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Please provide a reason for rejecting this business. The owner will see this message.
            </Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Reason for rejection *"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowRejectionModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    padding: 16,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  manageButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    backgroundColor: '#F8F9FA',
  },
  businessHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  businessLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  businessLogoPlaceholder: {
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  suspendButton: {
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#000000',
  },
  rejectionBox: {
    backgroundColor: '#FFF5F5',
    borderLeftColor: '#4A90E2',
  },
  noteContent: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noteSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoItemLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoItemValue: {
    fontSize: 15,
    color: '#333',
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  staffItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  staffRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  staffPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  serviceItem: {
    paddingVertical: 12,
  },
  serviceItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  serviceDuration: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F5F5F5',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalApproveButton: {
    backgroundColor: '#4CAF50',
  },
  modalApproveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalRejectButton: {
    backgroundColor: '#F44336',
  },
  modalRejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdminBusinessDetailsScreen;
