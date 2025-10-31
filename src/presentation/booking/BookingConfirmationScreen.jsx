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
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { getShopDetails, getShopStaff } from '../../lib/shopAuth';

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

      // Load barbers
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
    return selectedServices.reduce((sum, service) => sum + Number(service.duration_minutes || 0), 0);
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
        barber_id: selectedBarberId,
        services: JSON.stringify(selectedServices),
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        total_amount: calculateTotal(),
        status: 'pending', // Will be 'confirmed' after manager confirmation
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

      // Show success message
      Alert.alert(
        '🎉 Booking Created!',
        `Your booking has been created successfully!\n\nBooking Reference: ${bookingReference}\n\nYour appointment is pending confirmation from the shop manager. You will be notified once confirmed.\n\nYou can track your booking status in the "My Bookings" tab at the bottom of the screen.`,
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
          <ActivityIndicator size="large" color="#FF6B35" />
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
            <Ionicons name="qr-code-outline" size={24} color="#FF6B35" />
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
            <Ionicons name="storefront-outline" size={24} color="#FF6B35" />
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
            <Ionicons name="cut-outline" size={24} color="#FF6B35" />
            <Text style={styles.cardTitle}>Selected Services</Text>
          </View>
          {selectedServices.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDuration}>
                  {service.duration_minutes} min
                </Text>
              </View>
              <Text style={styles.servicePrice}>${service.price}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.totalInfo}>
              <Text style={styles.totalDuration}>{totalDuration} min</Text>
              <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>


        {/* Date & Time Selection Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={24} color="#FF6B35" />
            <Text style={styles.cardTitle}>Select Date & Time</Text>
          </View>

          {/* Date Selection */}
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={handleDatePickerOpen}
          >
            <View style={styles.dateTimeInfo}>
              <Ionicons name="calendar" size={20} color="#FF6B35" />
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
              <Ionicons name="time" size={20} color="#FF6B35" />
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
          style={[styles.confirmButton, creating && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </SafeAreaView>
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
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
  },
  bookingId: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
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
    color: '#FF6B35',
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
    color: '#FF6B35',
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
    borderColor: '#FF6B35',
    gap: 8,
  },
  barberButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  barberButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
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
    borderColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barberAvatarSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  barberListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  barberListItemNameSelected: {
    color: '#FF6B35',
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
    backgroundColor: '#FF6B35',
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
    backgroundColor: '#FF6B35',
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
    color: '#FF6B35',
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
    backgroundColor: '#4CAF50',
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
