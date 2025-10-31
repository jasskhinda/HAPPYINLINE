import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { cancelBooking } from '../../../../lib/auth';

const BookingDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking, isBarberMode = false } = route.params || {};
  const [cancelling, setCancelling] = useState(false);

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>Booking not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Format date and time
  const formatDateTime = () => {
    if (!booking.appointment_date || !booking.appointment_time) return 'N/A';
    
    const date = new Date(booking.appointment_date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Convert 24h to 12h format
    const [hours, minutes] = booking.appointment_time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const formattedTime = `${hour12}:${minutes} ${ampm}`;
    
    return { date: formattedDate, time: formattedTime };
  };

  // Get services list
  const getServices = () => {
    try {
      let servicesList = booking.services;
      if (typeof servicesList === 'string') {
        servicesList = JSON.parse(servicesList);
      }
      if (Array.isArray(servicesList)) {
        return servicesList;
      }
      return [];
    } catch (error) {
      console.error('Error parsing services:', error);
      return [];
    }
  };

  // Get status details
  const getStatusDetails = () => {
    const status = booking.status?.toLowerCase() || 'pending';
    const statusConfig = {
      pending: { color: '#FFD97D', icon: 'time-outline', label: 'Pending Confirmation' },
      confirmed: { color: '#74D7A3', icon: 'checkmark-circle-outline', label: 'Confirmed' },
      completed: { color: '#72C4F6', icon: 'checkmark-done-outline', label: 'Completed' },
      cancelled: { color: '#FF6B6B', icon: 'close-circle-outline', label: 'Cancelled' },
      no_show: { color: '#CCCCCC', icon: 'ban-outline', label: 'No Show' },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const { date, time } = formatDateTime();
  const services = getServices();
  const statusDetails = getStatusDetails();
  const bookingReference = `BK-${booking.id.substring(0, 8).toUpperCase()}`;
  const isPastBooking = ['completed', 'cancelled', 'no_show'].includes(booking.status?.toLowerCase());

  // Copy booking reference
  const copyBookingReference = async () => {
    try {
      await Clipboard.setStringAsync(bookingReference);
      Alert.alert('✅ Copied!', 'Booking reference copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy booking reference');
    }
  };

  // Handle cancel booking
  const handleCancelBooking = () => {
    Alert.prompt(
      'Cancel Booking',
      'Please provide a reason for cancellation:',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async (reason) => {
            setCancelling(true);
            try {
              const result = await cancelBooking(booking.id, reason || 'No reason provided');
              if (result.success) {
                Alert.alert(
                  '✅ Booking Cancelled',
                  'Your appointment has been cancelled successfully.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else {
                Alert.alert('❌ Error', result.error || 'Failed to cancel booking');
              }
            } catch (error) {
              console.error('Cancel error:', error);
              Alert.alert('❌ Error', 'Failed to cancel booking');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // Handle reschedule
  const handleReschedule = () => {
    navigation.navigate('RescheduleBookingScreen', { booking });
  };

  // Handle rate service
  const handleRateService = () => {
    navigation.navigate('RateServiceScreen', {
      barberName: booking.barber?.name || 'Barber',
      bookingId: booking.id,
      barberId: booking.barber_id,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusDetails.color }]}>
          <Ionicons name={statusDetails.icon} size={32} color="#FFF" />
          <Text style={styles.statusBannerText}>{statusDetails.label}</Text>
        </View>

        {/* Booking Reference Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="qr-code-outline" size={24} color="#6366F1" />
            <Text style={styles.cardTitle}>Booking Reference</Text>
          </View>
          <TouchableOpacity 
            style={styles.referenceContainer} 
            onPress={copyBookingReference}
            activeOpacity={0.7}
          >
            <Text style={styles.referenceText}>{bookingReference}</Text>
            <Ionicons name="copy-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
          <Text style={styles.referenceHint}>Tap to copy</Text>
        </View>

        {/* Date & Time Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={24} color="#FF6B35" />
            <Text style={styles.cardTitle}>Appointment Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#666" />
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#666" />
            <Text style={styles.infoLabel}>Time:</Text>
            <Text style={styles.infoValue}>{time}</Text>
          </View>
        </View>

        {/* Shop/Customer Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name={isBarberMode ? "person-outline" : "storefront-outline"} size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>
              {isBarberMode ? 'Customer Information' : 'Shop Information'}
            </Text>
          </View>
          
          {isBarberMode ? (
            // For barbers: show customer info
            <>
              <View style={styles.shopInfoRow}>
                <Text style={styles.shopName}>{booking.customer?.name || 'Customer'}</Text>
              </View>
              {booking.customer?.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#666" />
                  <Text style={styles.infoValue}>{booking.customer.phone}</Text>
                </View>
              )}
              {booking.customer?.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={18} color="#666" />
                  <Text style={styles.infoValue}>{booking.customer.email}</Text>
                </View>
              )}
            </>
          ) : (
            // For customers: show shop info
            <>
              {booking.shop?.logo_url && (
                <Image 
                  source={{ uri: booking.shop.logo_url }} 
                  style={styles.shopLogo}
                  resizeMode="cover"
                />
              )}
              <View style={styles.shopInfoRow}>
                <Text style={styles.shopName}>{booking.shop?.name || 'Barbershop'}</Text>
              </View>
              {booking.shop?.address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color="#666" />
                  <Text style={styles.infoValue}>{booking.shop.address}</Text>
                </View>
              )}
              {booking.shop?.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#666" />
                  <Text style={styles.infoValue}>{booking.shop.phone}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Barber Info (for customers) */}
        {!isBarberMode && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cut-outline" size={24} color="#9C27B0" />
              <Text style={styles.cardTitle}>Barber</Text>
            </View>
            <View style={styles.barberInfo}>
              {booking.barber?.profile_image && (
                <Image 
                  source={{ uri: booking.barber.profile_image }} 
                  style={styles.barberImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.barberName}>
                {booking.barber?.name || 'Any Available Barber'}
              </Text>
            </View>
          </View>
        )}

        {/* Services Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Services</Text>
          </View>
          {services.length > 0 ? (
            services.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceLeft}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {service.duration && (
                    <Text style={styles.serviceDuration}>{service.duration} min</Text>
                  )}
                </View>
                {service.price && (
                  <Text style={styles.servicePrice}>${service.price}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noServices}>No services listed</Text>
          )}
          
          {booking.total_amount && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>${booking.total_amount}</Text>
            </View>
          )}
        </View>

        {/* Customer Notes (for barbers) */}
        {isBarberMode && booking.customer_notes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbox-outline" size={24} color="#FF9800" />
              <Text style={styles.cardTitle}>Customer Notes</Text>
            </View>
            <Text style={styles.notesText}>{booking.customer_notes}</Text>
          </View>
        )}

        {/* Cancellation Reason */}
        {booking.status === 'cancelled' && booking.customer_notes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={24} color="#FF3B30" />
              <Text style={styles.cardTitle}>Cancellation Reason</Text>
            </View>
            <Text style={styles.cancellationText}>{booking.customer_notes}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {!isBarberMode && !isPastBooking && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.rescheduleButton}
            onPress={handleReschedule}
            disabled={cancelling}
          >
            <Ionicons name="calendar-outline" size={20} color="#2196F3" />
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.cancelButton, cancelling && styles.disabledButton]}
            onPress={handleCancelBooking}
            disabled={cancelling}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
            <Text style={styles.cancelButtonText}>
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rate Service Button */}
      {!isBarberMode && booking.status === 'completed' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.rateButton}
            onPress={handleRateService}
          >
            <Ionicons name="star-outline" size={20} color="#FFF" />
            <Text style={styles.rateButtonText}>Rate the Service</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default BookingDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginBottom: 16,
    gap: 12,
  },
  statusBannerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  referenceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    letterSpacing: 2,
  },
  referenceHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  shopLogo: {
    width: 100,
    height: 100,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 12,
  },
  shopInfoRow: {
    marginBottom: 12,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  barberInfo: {
    alignItems: 'center',
  },
  barberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceLeft: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#999',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  noServices: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancellationText: {
    fontSize: 14,
    color: '#FF3B30',
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  rateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
