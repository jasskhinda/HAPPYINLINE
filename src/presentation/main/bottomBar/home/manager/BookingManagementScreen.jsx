import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import SettingAppBar from '../../../../../components/appBar/SettingAppBar';
import { 
  fetchAllBookingsForManagers, 
  confirmBooking, 
  cancelBooking, 
  completeBooking 
} from '../../../../../lib/auth';

const initialLayout = { width: Dimensions.get('window').width };

const BookingManagementScreen = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'pending', title: 'Pending' },
    { key: 'approved', title: 'Approved' },
    { key: 'completed', title: 'Done' },
    { key: 'rejected', title: 'Rejected' },
  ]);

  const [bookings, setBookings] = useState({
    pending: [],
    approved: [],
    completed: [],
    rejected: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Fetch bookings on component mount
  useEffect(() => {
    loadBookings();
  }, []);

  // Load bookings from database
  const loadBookings = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      
      console.log('📊 [BookingManagementScreen] Loading bookings for manager...');
      const result = await fetchAllBookingsForManagers();
      
      console.log('📊 [BookingManagementScreen] Result from fetchAllBookingsForManagers:', {
        success: result.success,
        error: result.error,
        hasPendingData: !!result.data?.pending,
        pendingCount: result.data?.pending?.length || 0,
        confirmedCount: result.data?.confirmed?.length || 0,
        completedCount: result.data?.completed?.length || 0,
        otherCount: result.data?.other?.length || 0,
        fullData: result.data
      });
      
      if (result.success) {
        setBookings(result.data);
        console.log('✅ [BookingManagementScreen] Bookings set to state:', {
          pending: result.data.pending?.length || 0,
          confirmed: result.data.confirmed?.length || 0,
          completed: result.data.completed?.length || 0
        });
      } else {
        console.error('❌ [BookingManagementScreen] Failed to load bookings:', result.error);
        Alert.alert('Error', 'Failed to load bookings: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      Alert.alert('Error', 'An error occurred while loading bookings');
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings(true);
    setRefreshing(false);
  }, []);

  const handleApproveBooking = (booking) => {
    setSelectedBooking(booking);
    setBookingIdInput('');
    setShowApproveModal(true);
  };

  const approveBookingAction = async () => {
    if (!selectedBooking) return;

    try {
      console.log('✅ Approving booking:', selectedBooking.id);
      const result = await confirmBooking(selectedBooking.id);

      if (result.success) {
        setShowApproveModal(false);
        setBookingIdInput('');
        setSelectedBooking(null);
        // Refresh bookings
        await loadBookings(true);
        Alert.alert('✅ Success', 'Booking approved successfully!');
      } else {
        Alert.alert('Error', 'Failed to approve booking: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error approving booking:', error);
      Alert.alert('Error', 'An error occurred while approving the booking');
    }
  };

  const handleRejectBooking = (booking) => {
    setSelectedBooking(booking);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const rejectBookingWithReason = async () => {
    if (!selectedBooking) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejection.');
      return;
    }

    try {
      console.log('❌ Rejecting booking:', selectedBooking.id);
      const result = await cancelBooking(selectedBooking.id, `[REJECTED] ${rejectionReason.trim()}`);

      if (result.success) {
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedBooking(null);
        // Refresh bookings
        await loadBookings(true);
        Alert.alert('✅ Success', 'Booking rejected successfully!');
      } else {
        Alert.alert('Error', 'Failed to reject booking: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error rejecting booking:', error);
      Alert.alert('Error', 'An error occurred while rejecting the booking');
    }
  };

  const handleCancelBooking = (booking, currentTab) => {
    setSelectedBooking(booking);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  const cancelBookingWithReason = async () => {
    if (!selectedBooking) return;

    if (!cancellationReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancellation.');
      return;
    }

    try {
      console.log('❌ Cancelling booking:', selectedBooking.id);
      const result = await cancelBooking(selectedBooking.id, cancellationReason.trim());
      
      if (result.success) {
        setShowCancelModal(false);
        setCancellationReason('');
        setSelectedBooking(null);
        // Refresh bookings
        await loadBookings(true);
        Alert.alert('✅ Success', 'Booking cancelled successfully!');
      } else {
        Alert.alert('Error', 'Failed to cancel booking: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      Alert.alert('Error', 'An error occurred while cancelling the booking');
    }
  };

  const handleCompleteBooking = (booking) => {
    const customerName = booking.customer?.name || 'Customer';
    
    Alert.alert(
      'Mark as Completed',
      `Mark ${customerName}'s appointment as completed?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              console.log('✅ Completing booking:', booking.id);
              const result = await completeBooking(booking.id);
              
              if (result.success) {
                // Refresh bookings
                await loadBookings(true);
                Alert.alert('Success', 'Booking marked as completed!');
              } else {
                Alert.alert('Error', 'Failed to complete booking: ' + result.error);
              }
            } catch (error) {
              console.error('❌ Error completing booking:', error);
              Alert.alert('Error', 'An error occurred while completing the booking');
            }
          },
        },
      ]
    );
  };

  const renderBookingItem = ({ item, tabKey }) => {
    // Extract data from Supabase structure
    const customerName = item.customer?.name || 'Unknown Customer';
    const barberName = item.barber?.name || 'Unknown Barber';
    
    // Format services (JSONB array) to string
    const serviceNames = item.services && Array.isArray(item.services)
      ? item.services.map(s => s.name).join(', ')
      : 'No services';
    
    // Format date
    const formattedDate = item.appointment_date
      ? new Date(item.appointment_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'N/A';
    
    // Format time (HH:MM:SS to HH:MM AM/PM)
    const formattedTime = item.appointment_time
      ? (() => {
          const [hours, minutes] = item.appointment_time.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minutes} ${ampm}`;
        })()
      : 'N/A';
    
    return (
      <View style={styles.bookingCard}>
        {/* Booking ID Badge */}
        <View style={styles.bookingIdBadge}>
          <Ionicons name="qr-code-outline" size={16} color="#FF6B35" />
          <Text style={styles.bookingIdText}>{item.booking_id || 'N/A'}</Text>
        </View>

        <View style={styles.bookingHeader}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>
          <View style={[styles.statusBadge, styles[`${item.status}Badge`]]}>
            <Text style={[styles.statusText, styles[`${item.status}Text`]]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.detailText}>Barber: {barberName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cut" size={16} color="#666" />
            <Text style={styles.detailText}>Service: {serviceNames}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.detailText}>Date: {formattedDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.detailText}>Time: {formattedTime}</Text>
          </View>
          {item.total_amount && (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Total: ${Number(item.total_amount).toFixed(2)}</Text>
            </View>
          )}
        </View>

        <View style={styles.bookingActions}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveBooking(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectBooking(item)}
            >
              <Ionicons name="close-circle" size={16} color="white" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {(item.status === 'confirmed' || item.status === 'approved') && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleCompleteBooking(item)}
            >
              <Ionicons name="checkmark-done" size={16} color="white" />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelBooking(item, tabKey)}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'completed' && (
          <View style={styles.completedInfo}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completedText}>Service Completed</Text>
          </View>
        )}

        {item.status === 'cancelled' && item.cancellation_reason && (
          <View style={styles.rejectedInfo}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.rejectedText}>{item.cancellation_reason}</Text>
          </View>
        )}
        </View>
      </View>
    );
  };

  const PendingTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={bookings.pending}
        renderItem={({ item }) => renderBookingItem({ item, tabKey: 'pending' })}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={50} color="#CCC" />
            <Text style={styles.emptyText}>No pending bookings</Text>
          </View>
        }
      />
    </View>
  );

  const ApprovedTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={bookings.approved}
        renderItem={({ item }) => renderBookingItem({ item, tabKey: 'approved' })}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={50} color="#CCC" />
            <Text style={styles.emptyText}>No approved bookings</Text>
          </View>
        }
      />
    </View>
  );

  const RejectedTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={bookings.rejected}
        renderItem={({ item }) => renderBookingItem({ item, tabKey: 'rejected' })}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="close-circle-outline" size={50} color="#CCC" />
            <Text style={styles.emptyText}>No rejected bookings</Text>
          </View>
        }
      />
    </View>
  );

  const CompletedTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={bookings.completed}
        renderItem={({ item }) => renderBookingItem({ item, tabKey: 'completed' })}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-outline" size={50} color="#CCC" />
            <Text style={styles.emptyText}>No completed bookings</Text>
          </View>
        }
      />
    </View>
  );

  const renderScene = SceneMap({
    pending: PendingTab,
    approved: ApprovedTab,
    completed: CompletedTab,
    rejected: RejectedTab,
  });

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#FF6B6B', height: 3 }}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#FF6B6B"
      inactiveColor="#999"
      pressColor="rgba(255, 107, 107, 0.1)"
      scrollEnabled={false}
      tabStyle={{ width: 'auto', minWidth: 80 }}
    />
  );

  // Show loading indicator on initial load
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SettingAppBar title="Booking Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Booking Management</Text>
              <Text style={styles.headerSubtitle}>Review and manage customer bookings</Text>
            </View>

            <View style={styles.content}>
                <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={initialLayout}
                renderTabBar={renderTabBar}
                />
            </View>
        </View>

        {/* Approve Booking Modal */}
        <Modal
          visible={showApproveModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowApproveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
                <Text style={styles.modalTitle}>Approve Booking</Text>
              </View>

              {selectedBooking && (
                <View style={styles.modalBody}>
                  <Text style={styles.modalText}>
                    Customer: <Text style={styles.bold}>{selectedBooking.customer?.name || 'N/A'}</Text>
                  </Text>
                  <Text style={styles.modalText}>
                    Service: <Text style={styles.bold}>
                      {selectedBooking.services && Array.isArray(selectedBooking.services)
                        ? selectedBooking.services.map(s => s.name).join(', ')
                        : 'N/A'}
                    </Text>
                  </Text>
                  <Text style={styles.modalText}>
                    Booking ID: <Text style={styles.boldOrange}>{selectedBooking.booking_id}</Text>
                  </Text>

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#4CAF50" />
                    <Text style={styles.infoText}>
                      Approving this booking will confirm the appointment. Customer will be notified.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setShowApproveModal(false);
                    setBookingIdInput('');
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.approveModalButton]}
                  onPress={approveBookingAction}
                >
                  <Text style={styles.approveModalButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Reject Booking Modal */}
        <Modal
          visible={showRejectModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRejectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="close-circle-outline" size={48} color="#FF9800" />
                <Text style={styles.modalTitle}>Reject Booking</Text>
              </View>

              {selectedBooking && (
                <View style={styles.modalBody}>
                  <Text style={styles.modalText}>
                    Customer: <Text style={styles.bold}>{selectedBooking.customer?.name || 'N/A'}</Text>
                  </Text>
                  <Text style={styles.modalText}>
                    Booking ID: <Text style={styles.boldOrange}>{selectedBooking.booking_id}</Text>
                  </Text>

                  <View style={styles.verificationBox}>
                    <Text style={styles.verificationLabel}>
                      Rejection Reason: *
                    </Text>
                    <TextInput
                      style={[styles.verificationInput, styles.textArea]}
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    <Text style={styles.verificationHint}>
                      Customer will be notified with this reason
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectModalButton]}
                  onPress={rejectBookingWithReason}
                >
                  <Text style={styles.rejectModalButtonText}>Reject Booking</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Cancel Booking Modal */}
        <Modal
          visible={showCancelModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="close-circle-outline" size={48} color="#FF3B30" />
                <Text style={styles.modalTitle}>Cancel Booking</Text>
              </View>

              {selectedBooking && (
                <View style={styles.modalBody}>
                  <Text style={styles.modalText}>
                    Customer: <Text style={styles.bold}>{selectedBooking.customer?.name || 'N/A'}</Text>
                  </Text>
                  <Text style={styles.modalText}>
                    Booking ID: <Text style={styles.boldOrange}>{selectedBooking.booking_id}</Text>
                  </Text>
                  
                  <View style={styles.verificationBox}>
                    <Text style={styles.verificationLabel}>
                      Cancellation Reason: *
                    </Text>
                    <TextInput
                      style={[styles.verificationInput, styles.textArea]}
                      placeholder="Enter reason for cancellation..."
                      value={cancellationReason}
                      onChangeText={setCancellationReason}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    <Text style={styles.verificationHint}>
                      Customer will be notified with this reason
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.destructiveButton]}
                  onPress={cancelBookingWithReason}
                >
                  <Text style={styles.destructiveButtonText}>Cancel Booking</Text>
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
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#FFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginHorizontal: 0,
    paddingHorizontal: 4,
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  pendingBadge: {
    backgroundColor: '#FFA50020',
  },
  approvedBadge: {
    backgroundColor: '#2196F320',
  },
  confirmedBadge: {
    backgroundColor: '#2196F320',
  },
  completedBadge: {
    backgroundColor: '#4CAF5020',
  },
  rejectedBadge: {
    backgroundColor: '#FF3B3020',
  },
  cancelledBadge: {
    backgroundColor: '#99999920',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingText: {
    color: '#FFA500',
  },
  approvedText: {
    color: '#2196F3',
  },
  confirmedText: {
    color: '#2196F3',
  },
  completedText: {
    color: '#4CAF50',
  },
  rejectedText: {
    color: '#FF3B30',
  },
  cancelledText: {
    color: '#999',
  },
  bookingDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF9800',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  approveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  completeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rejectedInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
  },
  rejectedText: {
    color: '#E65100',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  // Booking ID Badge Styles
  bookingIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
  },
  bookingIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
    marginLeft: 6,
    letterSpacing: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  boldOrange: {
    fontWeight: '700',
    color: '#FF6B35',
    letterSpacing: 1,
  },
  verificationBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  verificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  verificationInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  verificationHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  approveModalButton: {
    backgroundColor: '#4CAF50',
  },
  approveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  rejectModalButton: {
    backgroundColor: '#FF9800',
  },
  rejectModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
});

export default BookingManagementScreen;