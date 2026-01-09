import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { getShopDetails, getShopStaff } from '../../lib/shopAuth';
import { sendNewBookingNotification, scheduleBookingReminder, sendBookingConfirmationEmail } from '../../lib/notifications';

const BookingConfirmationScreen = ({ route, navigation }) => {
  const { shopId, shopName, selectedServices = [], selectedBarber = null } = route.params;

  const [shop, setShop] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [selectedBarberId, setSelectedBarberId] = useState(selectedBarber?.id || null);
  const [selectedBarberName, setSelectedBarberName] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bookingIdPreview, setBookingIdPreview] = useState('');
  const [showBarberBottomSheet, setShowBarberBottomSheet] = useState(false);
  const [barberSearchQuery, setBarberSearchQuery] = useState('');
  // Single booking format choice for all services (applies to services with "both" type)
  const [bookingFormat, setBookingFormat] = useState('in_person'); // 'in_person' or 'online'

  // Check if any service has "both" type (can be either in-person or online)
  const hasBothTypeServices = selectedServices.some(s => s.service_type === 'both');

  // Get effective service type for a service
  const getEffectiveServiceType = (service) => {
    if (service.service_type === 'both') {
      // Use the single booking-wide format choice
      return bookingFormat;
    }
    return service.service_type || 'in_person';
  };

  // Check if any selected service will be online
  const hasOnlineService = () => {
    return selectedServices.some(s => getEffectiveServiceType(s) === 'online');
  };

  useEffect(() => {
    loadShopData();
    generateBookingIdPreview();
  }, []);

  const loadShopData = async () => {
    try {
      setLoading(true);

      // Load shop details
      const { success: shopSuccess, shop: shopData } = await getShopDetails(shopId);
      if (shopSuccess && shopData) {
        setShop(shopData);
      }

      // Set the selected provider name if one was passed
      if (selectedBarber?.id) {
        setSelectedBarberName(selectedBarber.user?.name || 'Provider');
      }

      // Load providers assigned to the selected services
      if (selectedServices.length > 0) {
        const serviceIds = selectedServices.map(s => s.id);

        // Step 1: Get provider IDs from service_providers junction table
        const { data: serviceProviders, error: spError } = await supabase
          .from('service_providers')
          .select('provider_id')
          .in('shop_service_id', serviceIds);

        if (spError) {
          console.error('Error loading service providers:', spError);
        } else {
          // Extract unique provider IDs
          const providerIds = [...new Set(serviceProviders?.map(sp => sp.provider_id).filter(Boolean) || [])];

          if (providerIds.length > 0) {
            // Step 2: Fetch profiles for these provider IDs
            const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('id, name, email')
              .in('id', providerIds);

            if (!profileError && profiles) {
              // Map profiles to provider format
              const uniqueProviders = profiles.map(profile => ({
                id: profile.id,
                user: {
                  name: profile.name || profile.email,
                  email: profile.email
                }
              }));

              setBarbers(uniqueProviders);

              // Update selected provider name if needed
              if (selectedBarber?.id && !selectedBarberName) {
                const provider = uniqueProviders.find(p => p.id === selectedBarber.id);
                if (provider) {
                  setSelectedBarberName(provider.user?.name || 'Provider');
                }
              }
            }
          }
        }
      } else {
        // Fallback: Load all barbers if no services selected
        const { success: staffSuccess, staff: staffData } = await getShopStaff(shopId);
        if (staffSuccess && staffData) {
          const barbersData = staffData.filter(s => s.role === 'barber');
          setBarbers(barbersData);

          // Set initial barber name if pre-selected
          if (selectedBarber?.id) {
            const barber = barbersData.find(b => b.id === selectedBarber.id);
            if (barber) {
              setSelectedBarberName(barber.user?.name || 'Barber');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
      Alert.alert('Error', 'Failed to load shop information');
    } finally {
      setLoading(false);
    }
  };

  const generateBookingIdPreview = () => {
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    setBookingIdPreview(`BK-${datePart}-${randomPart}`);
  };

  const calculateTotal = () => {
    return selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  };

  const calculateDuration = () => {
    return selectedServices.reduce((sum, service) => sum + Number(service.duration_minutes || service.duration || 30), 0);
  };

  const handleBarberSelect = (barber) => {
    if (barber === null) {
      setSelectedBarberId(null);
      setSelectedBarberName(null);
    } else {
      setSelectedBarberId(barber.id);
      setSelectedBarberName(barber.user?.name || 'Barber');
    }
    setShowBarberBottomSheet(false);
    setBarberSearchQuery('');
  };

  const getFilteredBarbers = () => {
    if (!barberSearchQuery.trim()) {
      return barbers;
    }
    const query = barberSearchQuery.toLowerCase();
    return barbers.filter(barber => 
      (barber.user?.name || '').toLowerCase().includes(query)
    );
  };

  const formatDate = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        setSelectedDate(date);
      }
    } else {
      // iOS - update temp date
      if (date) {
        setTempDate(date);
      }
    }
  };

  const handleTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && time) {
        setSelectedTime(time);
      }
    } else {
      // iOS - update temp time
      if (time) {
        setTempTime(time);
      }
    }
  };

  const handleDatePickerOpen = () => {
    setTempDate(selectedDate);
    setShowDatePicker(true);
  };

  const handleTimePickerOpen = () => {
    setTempTime(selectedTime);
    setShowTimePicker(true);
  };

  const handleDateConfirm = () => {
    setSelectedDate(tempDate);
    setShowDatePicker(false);
  };

  const handleTimeConfirm = () => {
    setSelectedTime(tempTime);
    setShowTimePicker(false);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const handleTimeCancel = () => {
    setShowTimePicker(false);
  };

  const validateBooking = () => {
    // Check if date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    if (selected < today) {
      Alert.alert('Invalid Date', 'Please select a date in the future.');
      return false;
    }

    // Check if services are selected
    if (selectedServices.length === 0) {
      Alert.alert('No Services', 'Please select at least one service.');
      return false;
    }

    return true;
  };

  const handleConfirmBooking = async () => {
    if (!validateBooking()) {
      return;
    }

    try {
      setCreating(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to book an appointment');
        return;
      }

      // Prepare booking data
      const appointmentDate = selectedDate.toISOString().split('T')[0];
      const appointmentTime = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}:00`;

      const bookingData = {
        shop_id: shopId,
        customer_id: user.id,
        provider_id: selectedBarberId || null, // Using provider_id instead of barber_id
        services: selectedServices, // Pass as array, not stringified
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        total_amount: calculateTotal(),
        status: 'confirmed', // Auto-approve bookings
      };

      console.log('📝 Creating booking:', bookingData);

      // Insert booking
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating booking:', error);
        throw error;
      }

      console.log('✅ Booking created:', data);

      // Generate a readable booking reference from the UUID
      const bookingReference = `BK-${data.id.substring(0, 8).toUpperCase()}`;

      // Get customer name for notification
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const customerName = customerProfile?.name || 'A customer';
      const serviceNames = selectedServices.map(s => s.name).join(', ');

      // Send push notification to shop owner (fire and forget)
      if (shop?.created_by) {
        sendNewBookingNotification({
          recipientUserId: shop.created_by,
          customerName: customerName,
          serviceName: serviceNames,
          date: appointmentDate,
          time: appointmentTime,
          bookingId: data.id,
        }).catch(err => console.log('Push notification error (non-blocking):', err));
      }

      // Schedule a reminder notification for the customer (1 hour before)
      scheduleBookingReminder({
        shopName: shopName,
        serviceName: serviceNames,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        bookingId: data.id,
      }).catch(err => console.log('Reminder scheduling error (non-blocking):', err));

      // Send booking confirmation email to customer (fire and forget)
      sendBookingConfirmationEmail({
        customerEmail: user.email,
        customerName: customerName,
        shopName: shopName,
        serviceName: serviceNames,
        date: appointmentDate,
        time: appointmentTime,
        bookingReference: bookingReference,
        totalAmount: calculateTotal().toFixed(2),
      }).catch(err => console.log('Email error (non-blocking):', err));

      // Show success message
      Alert.alert(
        '🎉 Booking Confirmed!',
        `Your booking has been confirmed successfully!\n\nBooking Reference: ${bookingReference}\n\nAmount Due: $${calculateTotal().toFixed(2)} (Pay in person at the shop)\n\nYour appointment is confirmed and ready!\n\nYou can view your booking in the "My Bookings" tab at the bottom of the screen.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error creating booking:', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0393d5" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalPrice = calculateTotal();
  const totalDuration = calculateDuration();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Booking</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Booking ID Preview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="qr-code-outline" size={24} color="#0393d5" />
            <Text style={styles.cardTitle}>Your Booking ID (Preview)</Text>
          </View>
          <View style={styles.bookingIdContainer}>
            <Text style={styles.bookingId}>{bookingIdPreview}</Text>
            <Text style={styles.bookingIdHint}>
              Show this ID at the shop to confirm your appointment
            </Text>
          </View>
        </View>

        {/* Shop Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="storefront-outline" size={24} color="#0393d5" />
            <Text style={styles.cardTitle}>Shop Details</Text>
          </View>
          <Text style={styles.shopName}>{shopName}</Text>
          {shop?.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{shop.address}</Text>
            </View>
          )}
          {shop?.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{shop.phone}</Text>
            </View>
          )}
        </View>

        {/* Selected Services Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cut-outline" size={24} color="#0393d5" />
            <Text style={styles.cardTitle}>Selected Services</Text>
          </View>
          {selectedServices.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <View style={styles.serviceNameRow}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {getEffectiveServiceType(service) === 'online' && (
                    <View style={styles.onlineServiceBadge}>
                      <Ionicons name="videocam" size={12} color="#9333EA" />
                      <Text style={styles.onlineServiceBadgeText}>Online</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.serviceDuration}>
                  {service.duration_minutes || service.duration || 30} min
                </Text>
              </View>
              <Text style={styles.servicePrice}>${service.price || '0.00'}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.totalInfo}>
              <Text style={styles.totalDuration}>{totalDuration} min</Text>
              <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Notice */}
          <View style={styles.paymentNotice}>
            <Ionicons name="cash-outline" size={18} color="#007AFF" />
            <Text style={styles.paymentNoticeText}>Payment due at store</Text>
          </View>
        </View>

        {/* Service Format Selection (single choice for all services with "both" type) */}
        {hasBothTypeServices && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="options-outline" size={24} color="#0393d5" />
              <Text style={styles.cardTitle}>How would you like your appointment?</Text>
            </View>
            <Text style={styles.formatHint}>
              Choose how you'd like to receive your services. This applies to all services in your booking.
            </Text>
            <View style={styles.formatButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  bookingFormat === 'in_person' && styles.formatButtonActive
                ]}
                onPress={() => setBookingFormat('in_person')}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={bookingFormat === 'in_person' ? '#FFF' : '#666'}
                />
                <Text style={[
                  styles.formatButtonText,
                  bookingFormat === 'in_person' && styles.formatButtonTextActive
                ]}>In-Person</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  styles.formatButtonOnline,
                  bookingFormat === 'online' && styles.formatButtonOnlineActive
                ]}
                onPress={() => setBookingFormat('online')}
              >
                <Ionicons
                  name="videocam"
                  size={20}
                  color={bookingFormat === 'online' ? '#FFF' : '#9333EA'}
                />
                <Text style={[
                  styles.formatButtonText,
                  styles.formatButtonTextOnline,
                  bookingFormat === 'online' && styles.formatButtonTextOnlineActive
                ]}>Online</Text>
              </TouchableOpacity>
            </View>
            {bookingFormat === 'online' && (
              <View style={styles.onlineFormatNotice}>
                <Ionicons name="videocam" size={18} color="#9333EA" />
                <Text style={styles.onlineFormatNoticeText}>
                  You'll receive meeting details via email after booking
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Online Meeting Details */}
        {hasOnlineService() && (
          <View style={styles.onlineMeetingCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="videocam" size={24} color="#9333EA" />
              <Text style={[styles.cardTitle, { color: '#9333EA' }]}>Online Meeting Details</Text>
            </View>
            {selectedServices.filter(s => getEffectiveServiceType(s) === 'online').map((service) => (
              <View key={service.id} style={styles.onlineMeetingItem}>
                <Text style={styles.onlineMeetingServiceName}>{service.name}</Text>
                {service.online_meeting_link && (
                  <View style={styles.onlineMeetingRow}>
                    <Ionicons name="link" size={14} color="#9333EA" />
                    <Text style={styles.onlineMeetingLink} numberOfLines={2}>{service.online_meeting_link}</Text>
                  </View>
                )}
                {service.online_meeting_password && (
                  <View style={styles.onlineMeetingRow}>
                    <Ionicons name="lock-closed" size={14} color="#9333EA" />
                    <Text style={styles.onlineMeetingPassword}>Password: {service.online_meeting_password}</Text>
                  </View>
                )}
                {service.online_instructions && (
                  <Text style={styles.onlineMeetingInstructions}>{service.online_instructions}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Selected Provider Card */}
        {selectedBarberName && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={24} color="#0393d5" />
              <Text style={styles.cardTitle}>Selected Provider</Text>
            </View>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <Ionicons name="person" size={24} color="#0393d5" />
              </View>
              <Text style={styles.providerName}>{selectedBarberName}</Text>
            </View>
          </View>
        )}

        {/* Date & Time Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={24} color="#0393d5" />
            <Text style={styles.cardTitle}>Select Date & Time</Text>
          </View>

          {/* Date Selection */}
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={handleDatePickerOpen}
          >
            <View style={styles.dateTimeInfo}>
              <Ionicons name="calendar" size={20} color="#0393d5" />
              <Text style={styles.dateTimeLabel}>Date</Text>
            </View>
            <Text style={styles.dateTimeValue}>{formatDate(selectedDate)}</Text>
          </TouchableOpacity>

          {/* Time Selection */}
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={handleTimePickerOpen}
          >
            <View style={styles.dateTimeInfo}>
              <Ionicons name="time" size={20} color="#0393d5" />
              <Text style={styles.dateTimeLabel}>Time</Text>
            </View>
            <Text style={styles.dateTimeValue}>{formatTime(selectedTime)}</Text>
          </TouchableOpacity>

          {shop && (
            <View style={styles.operatingHoursInfo}>
              <Ionicons name="information-circle-outline" size={16} color="#007AFF" />
              <Text style={styles.operatingHoursText}>
                Operating Hours: {shop.opening_time} - {shop.closing_time}
              </Text>
            </View>
          )}
        </View>

        {/* Important Information Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Important Information</Text>
            <Text style={styles.infoCardText}>
              • Your booking will be <Text style={styles.bold}>pending</Text> until confirmed by the shop manager{'\n'}
              • You will receive a notification once your booking is confirmed{'\n'}
              • You can track your booking status in "My Bookings" screen{'\n'}
              • Show your Booking ID at the shop to confirm your appointment{'\n'}
              • Please arrive on time for your appointment
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDateCancel}
      >
        <Pressable 
          style={styles.dateTimeModalOverlay}
          onPress={handleDateCancel}
        >
          <Pressable 
            style={styles.dateTimeModalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dateTimeModalHeader}>
              <Text style={styles.dateTimeModalTitle}>Select Date</Text>
            </View>
            
            <View style={styles.dateTimePickerWrapper}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor="#333"
              />
            </View>

            <View style={styles.dateTimeModalActions}>
              <TouchableOpacity 
                style={styles.dateTimeModalButton}
                onPress={handleDateCancel}
              >
                <Text style={styles.dateTimeModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.dateTimeModalButton, styles.dateTimeModalButtonPrimary]}
                onPress={handleDateConfirm}
              >
                <Text style={[styles.dateTimeModalButtonText, styles.dateTimeModalButtonTextPrimary]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleTimeCancel}
      >
        <Pressable 
          style={styles.dateTimeModalOverlay}
          onPress={handleTimeCancel}
        >
          <Pressable 
            style={styles.dateTimeModalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dateTimeModalHeader}>
              <Text style={styles.dateTimeModalTitle}>Select Time</Text>
            </View>
            
            <View style={styles.dateTimePickerWrapper}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                textColor="#333"
              />
            </View>

            <View style={styles.dateTimeModalActions}>
              <TouchableOpacity 
                style={styles.dateTimeModalButton}
                onPress={handleTimeCancel}
              >
                <Text style={styles.dateTimeModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.dateTimeModalButton, styles.dateTimeModalButtonPrimary]}
                onPress={handleTimeConfirm}
              >
                <Text style={[styles.dateTimeModalButtonText, styles.dateTimeModalButtonTextPrimary]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>


      {/* Confirm Button */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          onPress={handleConfirmBooking}
          disabled={creating}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0393d5', '#3A7BC8', '#2A6BA8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.confirmButton, creating && styles.confirmButtonDisabled]}
          >
            {creating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  bookingIdContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0393d5',
    borderStyle: 'dashed',
  },
  bookingId: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0393d5',
    letterSpacing: 2,
    marginBottom: 8,
  },
  bookingIdHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  shopName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#666',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0393d5',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalInfo: {
    alignItems: 'flex-end',
  },
  totalDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0393d5',
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    gap: 8,
  },
  paymentNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  barberButtonsContainer: {
    gap: 12,
  },
  barberPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0393d5',
    gap: 8,
  },
  barberButtonSelected: {
    backgroundColor: '#0393d5',
    borderColor: '#0393d5',
  },
  barberButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0393d5',
    flex: 1,
    textAlign: 'center',
  },
  barberButtonTextSelected: {
    color: '#FFF',
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  bottomSheetHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  bottomSheetCloseButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  barberListContainer: {
    maxHeight: 500,
  },
  barberListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  barberListItemSelected: {
    backgroundColor: '#F0F8F0',
  },
  barberListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  barberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
    borderWidth: 2,
    borderColor: '#0393d5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barberAvatarSelected: {
    backgroundColor: '#0393d5',
    borderColor: '#0393d5',
  },
  barberListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  barberListItemNameSelected: {
    color: '#0393d5',
  },
  barberListItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Date/Time Picker Modal Styles
  dateTimeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateTimeModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dateTimeModalHeader: {
    backgroundColor: '#0393d5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  dateTimeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  dateTimePickerWrapper: {
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  dateTimeModalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  dateTimeModalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeModalButtonPrimary: {
    backgroundColor: '#0393d5',
  },
  dateTimeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  dateTimeModalButtonTextPrimary: {
    color: '#FFF',
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0393d5',
  },
  operatingHoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  operatingHoursText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
  // Service name row for badge
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  onlineServiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  onlineServiceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9333EA',
  },
  // Format selection styles
  formatHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  formatButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    gap: 6,
  },
  formatButtonActive: {
    backgroundColor: '#0393d5',
    borderColor: '#0393d5',
  },
  formatButtonOnline: {
    borderColor: '#9333EA',
  },
  formatButtonOnlineActive: {
    backgroundColor: '#9333EA',
    borderColor: '#9333EA',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  formatButtonTextActive: {
    color: '#FFF',
  },
  formatButtonTextOnline: {
    color: '#9333EA',
  },
  formatButtonTextOnlineActive: {
    color: '#FFF',
  },
  onlineFormatNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 8,
    gap: 10,
  },
  onlineFormatNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#9333EA',
    fontWeight: '500',
  },
  onlineInstructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    borderRadius: 8,
    gap: 8,
  },
  onlineInstructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#9333EA',
    lineHeight: 18,
  },
  // Online meeting card styles
  onlineMeetingCard: {
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  onlineMeetingItem: {
    marginBottom: 12,
  },
  onlineMeetingServiceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  onlineMeetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  onlineMeetingLink: {
    flex: 1,
    fontSize: 13,
    color: '#9333EA',
  },
  onlineMeetingPassword: {
    fontSize: 13,
    color: '#9333EA',
    fontWeight: '500',
  },
  onlineMeetingInstructions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});

export default BookingConfirmationScreen;
