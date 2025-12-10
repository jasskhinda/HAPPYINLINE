import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { cancelBooking, confirmBooking } from '../../../../../lib/auth';
import { Ionicons } from '@expo/vector-icons';

const getStatusColor = (status) => {
  const lowerStatus = status?.toLowerCase() || '';
  switch (lowerStatus) {
    case 'confirmed':
      return '#74D7A3'; // Vibrant mint
    case 'pending':
      return '#FFD97D'; // Warm pastel yellow
    case 'completed':
      return '#72C4F6'; // Clear sky blue
    case 'cancelled':
      return '#0393d5'; // Red
    case 'no_show':
      return '#CCCCCC'; // Gray
    default:
      return '#FFD97D'; // Default to pending color
  }
};

const getStatusLabel = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'Unconfirmed ⚠️';
    case 'confirmed':
      return 'Confirmed ✅';
    case 'completed':
      return 'Completed ✅';
    case 'cancelled':
      return 'Cancelled ❌';
    case 'no_show':
      return 'Passed 📅';
    default:
      return status || 'Pending';
  }
};

const BookingCard = ({ booking, isBarberMode = false, userRole = 'customer', onBookingChange }) => {
  const navigation = useNavigation();
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const statusColor = getStatusColor(booking.status);
  const statusLabel = getStatusLabel(booking.status);
  
  // Determine if user is admin
  const isAdmin = userRole === 'admin';

  // Format date and time
  const formatDateTime = () => {
    if (!booking.appointment_date || !booking.appointment_time) return 'N/A';

    // Parse date in local timezone to avoid timezone shift
    const [year, month, day] = booking.appointment_date.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

    // Convert 24h to 12h format
    const [hours, minutes] = booking.appointment_time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const formattedTime = `${hour12}:${minutes} ${ampm}`;

    return `${formattedDate} • ${formattedTime}`;
  };

  // Get name to display
  const getDisplayName = () => {
    if (isBarberMode) {
      return booking.customer_name || booking.customer?.name || 'Customer';
    }
    // For customers, show shop name instead of barber name
    return booking.shop?.name || 'Barbershop';
  };

  // Get provider name for display (for customers)
  const getProviderName = () => {
    // First check for provider_id and provider relationship
    if (booking.provider_id && booking.provider?.name) {
      return booking.provider.name;
    }
    // Fallback to barber for backwards compatibility
    if (booking.barber_id && booking.barber?.name) {
      return booking.barber.name;
    }
    return null;
  };

  // Get services list
  const getServices = () => {
    try {
      // Services are stored as JSON string in database
      let servicesList = booking.services;
      
      // If it's a string, parse it
      if (typeof servicesList === 'string') {
        servicesList = JSON.parse(servicesList);
      }
      
      // If it's an array, map to names
      if (Array.isArray(servicesList)) {
        return servicesList.map(s => s.name || s).join(', ');
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error parsing services:', error);
      return 'N/A';
    }
  };

  // Copy booking ID to clipboard
  const copyBookingId = async () => {
    try {
      // Create a readable reference from the UUID
      const bookingReference = `BK-${booking.id.substring(0, 8).toUpperCase()}`;
      await Clipboard.setStringAsync(bookingReference);
      Alert.alert('Copied!', 'Booking reference copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      Alert.alert('Error', 'Failed to copy booking reference');
    }
  };

  const handleRateService = () => {
    navigation.navigate('RateServiceScreen', {
      barberName: getDisplayName(),
      bookingId: booking.id,
      barberId: booking.barber_id,
    });
  };

  const handleCancelBooking = () => {
    // Different prompts for admin vs customer
    if (isAdmin) {
      // Admin: MUST provide cancellation reason
      Alert.prompt(
        'Cancel Appointment',
        `Cancel ${booking.customer?.name || 'customer'}'s appointment on ${formatDateTime()}?\n\n⚠️ Customer will see your reason. Please provide explanation:`,
        [
          {
            text: 'Keep Appointment',
            style: 'cancel',
          },
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: async (reason) => {
              if (!reason || reason.trim() === '') {
                Alert.alert('Reason Required', 'Please provide a cancellation reason for the customer.');
                return;
              }
              
              setCancelling(true);
              try {
                const result = await cancelBooking(booking.id, reason);
                if (result.success) {
                  Alert.alert(
                    'Appointment Cancelled',
                    'Customer will be notified of the cancellation.',
                    [{ text: 'OK', onPress: () => onBookingChange?.() }]
                  );
                } else {
                  Alert.alert('Error', result.error || 'Failed to cancel appointment');
                }
              } catch (error) {
                console.error('Cancel error:', error);
                Alert.alert('Error', 'Failed to cancel appointment');
              } finally {
                setCancelling(false);
              }
            },
          },
        ],
        'plain-text',
        '',
        'default'
      );
    } else {
      // Customer: Optional reason
      Alert.prompt(
        'Cancel Booking',
        `Are you sure you want to cancel your appointment on ${formatDateTime()}?\n\nReason (optional):`,
        [
          {
            text: 'Keep Booking',
            style: 'cancel',
          },
          {
            text: 'Cancel Booking',
            style: 'destructive',
            onPress: async (reason) => {
              setCancelling(true);
              try {
                const result = await cancelBooking(booking.id, reason || 'Cancelled by customer');
                if (result.success) {
                  Alert.alert(
                    'Booking Cancelled',
                    'Your appointment has been cancelled successfully.',
                    [{ text: 'OK', onPress: () => onBookingChange?.() }]
                  );
                } else {
                  Alert.alert('Error', result.error || 'Failed to cancel booking');
                }
              } catch (error) {
                console.error('Cancel error:', error);
                Alert.alert('Error', 'Failed to cancel booking');
              } finally {
                setCancelling(false);
              }
            },
          },
        ],
        'plain-text'
      );
    }
  };

  const handleConfirmBooking = () => {
    Alert.alert(
      'Confirm Appointment',
      `Confirm ${booking.customer?.name || 'customer'}'s appointment on ${formatDateTime()}?`,
      [
        {
          text: 'Not Yet',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            setConfirming(true);
            try {
              const result = await confirmBooking(booking.id);
              if (result.success) {
                Alert.alert(
                  'Appointment Confirmed',
                  'Customer will be notified.',
                  [{ text: 'OK', onPress: () => onBookingChange?.() }]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to confirm appointment');
              }
            } catch (error) {
              console.error('Confirm error:', error);
              Alert.alert('Error', 'Failed to confirm appointment');
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  const handleReschedule = () => {
    navigation.navigate('RescheduleBookingScreen', {
      booking: booking,
    });
  };

  // Check if this is a past booking
  const isPastBooking = ['completed', 'cancelled', 'no_show'].includes(booking.status?.toLowerCase());

  // Generate readable booking reference from UUID
  const bookingReference = booking.id ? `BK-${booking.id.substring(0, 8).toUpperCase()}` : null;

  // Handle card press to view details
  const handleViewDetails = () => {
    navigation.navigate('BookingDetailScreen', {
      booking: booking,
      isBarberMode: isBarberMode,
    });
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handleViewDetails}
      activeOpacity={0.7}
    >
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.shopNameText}>{getDisplayName()}</Text>
          {booking.shop?.address && !isBarberMode && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.shopAddress} numberOfLines={1}>{booking.shop.address}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      {/* Booking Reference */}
      {bookingReference && (
        <View style={styles.bookingIdRow}>
          <Ionicons name="qr-code-outline" size={16} color="#0393d5" />
          <Text style={styles.bookingIdLabel}>Booking Ref: </Text>
          <Text style={styles.bookingIdText}>{bookingReference}</Text>
          <TouchableOpacity onPress={copyBookingId} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={18} color="#0393d5" />
          </TouchableOpacity>
        </View>
      )}

      {/* Date & Time */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color="#0393d5" />
          <Text style={styles.dateText}>{formatDateTime()}</Text>
        </View>

        {/* Services */}
        <View style={styles.infoRow}>
          <Ionicons name="cut-outline" size={18} color="#0393d5" />
          <Text style={styles.serviceText} numberOfLines={2}>
            {getServices()}
          </Text>
        </View>

        {!isBarberMode && getProviderName() && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#0393d5" />
            <Text style={styles.providerNameText}>{getProviderName()}</Text>
          </View>
        )}

        {/* Price */}
        {booking.total_amount && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceText}>${booking.total_amount}</Text>
          </View>
        )}
      </View>

      {/* Action buttons - Role-based rendering */}
      {!isPastBooking && (
        <>
          {/* ADMIN: Confirm & Cancel buttons */}
          {isAdmin && (
            <View style={styles.buttonRow}>
              {booking.status === 'pending' && (
                <TouchableOpacity 
                  style={[styles.confirmButton, confirming && styles.disabledButton]} 
                  onPress={handleConfirmBooking}
                  disabled={confirming || cancelling}
                >
                  <Text style={[styles.buttonText, { color: 'white' }]}>
                    {confirming ? 'Confirming...' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.managerCancelButton, cancelling && styles.disabledButton]} 
                onPress={handleCancelBooking}
                disabled={cancelling || confirming}
              >
                <Text style={[styles.buttonText, { color: 'white' }]}>
                  {cancelling ? 'Cancelling...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CUSTOMER: Reschedule & Cancel buttons */}
          {!isAdmin && !isBarberMode && (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.rescheduleButton} 
                onPress={handleReschedule}
                disabled={cancelling}
              >
                <Text style={styles.buttonText}>Reschedule</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.cancelButton, cancelling && styles.disabledButton]} 
                onPress={handleCancelBooking}
                disabled={cancelling}
              >
                <Text style={styles.buttonText}>
                  {cancelling ? 'Cancelling...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BARBER: NO ACTION BUTTONS (view only) */}
        </>
      )}

      {/* Rate button for completed bookings (customer only) */}
      {!isBarberMode && !isAdmin && booking.status === 'completed' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.rateButton} onPress={handleRateService}>
            <Text style={[styles.buttonText, { color: 'white' }]}>Rate the Service</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barber mode: Show customer notes if any */}
      {isBarberMode && booking.customer_notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Customer Notes:</Text>
          <Text style={styles.notesText}>{booking.customer_notes}</Text>
        </View>
      )}

      {/* Show cancellation reason if cancelled (prominent for customers) */}
      {booking.status === 'cancelled' && booking.customer_notes && (
        <View style={styles.cancellationContainer}>
          <View style={styles.cancellationHeader}>
            <Ionicons name="alert-circle" size={18} color="#FF3B30" />
            <Text style={styles.cancellationLabel}>
              {isAdmin ? 'Cancellation Reason:' : '❗ Why was this cancelled?'}
            </Text>
          </View>
          <Text style={styles.cancellationText}>{booking.customer_notes}</Text>
          {!isAdmin && (
            <Text style={styles.cancellationFooter}>
              Contact the shop if you have questions.
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default BookingCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginTop: 7,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16,
  },
  bookingIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#0393d5',
    borderStyle: 'dashed',
  },
  bookingIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  bookingIdText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0393d5',
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoSection: {
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  logo: {
    width: 90,
    height: 120,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#F8F9FA'
  },
  statusBadge: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  dateText: {
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 17,
  },
  nameText: {
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 16,
  },
  barberNameText: {
    color: '#666',
    fontWeight: '500',
    marginLeft: 5,
    fontSize: 13,
    marginTop: 2,
  },
  providerNameText: {
    color: '#666',
    fontWeight: '500',
    marginLeft: 5,
    fontSize: 13,
    marginTop: 2,
  },
  shopAddress: {
    color: '#888',
    fontWeight: 'normal',
    marginLeft: 5,
    fontSize: 11,
    marginTop: 2,
  },
  serviceText: {
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 5,
    paddingRight: 7,
    fontSize: 12,
  },
  priceText: {
    color: '#0393d5',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 15,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rescheduleButton: {
    borderWidth: 1,
    borderColor: 'black',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'black',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginRight: 8,
  },
  managerCancelButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rateButton: {
    flex: 1,
    backgroundColor: '#0393d5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  barberInfo: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 15,
    alignItems: 'center',
  },
  barberModeLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#333',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancellationContainer: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  cancellationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancellationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF3B30',
    marginLeft: 6,
  },
  cancellationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '500',
  },
  cancellationFooter: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
