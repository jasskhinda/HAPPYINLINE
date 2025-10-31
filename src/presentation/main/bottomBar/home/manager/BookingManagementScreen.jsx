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
    { key: 'confirmed', title: 'Confirmed' },
    { key: 'completed', title: 'Completed' },
  ]);

  const [bookings, setBookings] = useState({
    pending: [],
    confirmed: [],
    completed: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingIdInput, setBookingIdInput] = useState('');
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

  const handleConfirmBooking = (booking) => {
    setSelectedBooking(booking);
    setBookingIdInput('');
    setShowConfirmModal(true);
  };

  const confirmBookingWithVerification = async () => {
    if (!selectedBooking) return;

    // Verify booking ID
    if (bookingIdInput.trim().toUpperCase() !== selectedBooking.booking_id.toUpperCase()) {
      Alert.alert('Invalid Booking ID', 'The booking ID you entered does not match. Please try again.');
      return;
    }

    try {
      console.log('✅ Confirming booking:', selectedBooking.id);
      const result = await confirmBooking(selectedBooking.id);
      
      if (result.success) {
        setShowConfirmModal(false);
        setBookingIdInput('');
        setSelectedBooking(null);
        // Refresh bookings
        await loadBookings(true);
        Alert.alert('✅ Success', 'Booking confirmed successfully!');
      } else {
        Alert.alert('Error', 'Failed to confirm booking: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error confirming booking:', error);
      Alert.alert('Error', 'An error occurred while confirming the booking');
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
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleConfirmBooking(item)}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.confirmButtonText}>Confirm</Text>
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

        {item.status === 'confirmed' && (
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

  const ConfirmedTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={bookings.confirmed}
        renderItem={({ item }) => renderBookingItem({ item, tabKey: 'confirmed' })}
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
            <Text style={styles.emptyText}>No confirmed bookings</Text>
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
    confirmed: ConfirmedTab,
    completed: CompletedTab,
  });

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#FF6B6B', height: 3 }}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#FF6B6B"
      inactiveColor="#666"
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
    <SafeAreaView style={styles.container}>
        <View style={styles.container}>
            <SettingAppBar title="Booking Management" />
            
            <View style={styles.content}>
                <Text style={styles.title}>Manage Bookings</Text>
                
                <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={initialLayout}
                renderTabBar={renderTabBar}
                />
            </View>
        </View>

        {/* Confirm Booking Modal */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
                <Text style={styles.modalTitle}>Confirm Booking</Text>
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
                      Type booking ID to confirm:
                    </Text>
                    <TextInput
                      style={styles.verificationInput}
                      placeholder="Enter Booking ID"
                      value={bookingIdInput}
                      onChangeText={setBookingIdInput}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <Text style={styles.verificationHint}>
                      Customer should show you this ID at the shop
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setShowConfirmModal(false);
                    setBookingIdInput('');
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmModalButton]}
                  onPress={confirmBookingWithVerification}
                >
                  <Text style={styles.confirmModalButtonText}>Confirm</Text>
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
    backgroundColor: '#EEEEEE',
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
  content: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  tabBar: {
    backgroundColor: 'white',
    elevation: 0,
    shadowOpacity: 0,
    borderRadius: 10,
    marginBottom: 15,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  tabContent: {
    flex: 1,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  confirmedBadge: {
    backgroundColor: '#2196F320',
  },
  completedBadge: {
    backgroundColor: '#4CAF5020',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingText: {
    color: '#FFA500',
  },
  confirmedText: {
    color: '#2196F3',
  },
  completedText: {
    color: '#4CAF50',
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
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  confirmButtonText: {
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
  confirmModalButton: {
    backgroundColor: '#4CAF50',
  },
  confirmModalButtonText: {
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
});

export default BookingManagementScreen;