import { ScrollView, StyleSheet, Text, View, Image, TouchableOpacity, Alert, Modal, Dimensions, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingAppBar from '../../../../components/appBar/SettingAppBar';
import SelectableServiceItem from '../../../../components/services/SelectableServiceItem';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { fetchBarberReviews, fetchServices, createBooking } from '../../../../lib/auth';
import { supabase } from '../../../../lib/supabase';

const ProviderProfileScreen = ({ route }) => {
  // Support both new 'provider' and legacy 'barber' params
  const { provider, barber } = route.params || {};
  const providerData = provider || barber;
  const navigation = useNavigation();
  const [selectedServices, setSelectedServices] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Real data from Supabase
  const [services, setServices] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerProfileData, setProviderProfileData] = useState(providerData);
  
  // Fetch barber's services and reviews from Supabase
  useEffect(() => {
    const fetchBarberData = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching data for provider:', providerData.id);
        
        // Fetch all available services
        const { data: allServices, error: servicesError } = await supabase
          .from('services')
          .select('*');
        
        if (servicesError) {
          console.error('❌ Error fetching services:', servicesError);
        } else {
          // Filter services that match barber's specialties
          const providerServices = allServices.filter(service =>
            providerData.specialties && providerData.specialties.includes(service.id)
          );
          
          console.log('✅ Provider services:', providerServices.length);
          setServices(providerServices);
        }
        
        // Fetch reviews for this provider
        const reviewsResult = await fetchBarberReviews(providerData.id);
        if (reviewsResult.success) {
          console.log('✅ Reviews loaded:', reviewsResult.data.length);
          setCustomerReviews(reviewsResult.data);
        } else {
          console.error('❌ Error fetching reviews:', reviewsResult.error);
          setCustomerReviews([]);
        }
        
      } catch (error) {
        console.error('❌ Error in fetchBarberData:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBarberData();
  }, [providerData.id]);
  
  const toggleService = (id) => {
    setSelectedServices((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((item) => item !== id)
        : [...prevSelected, id]
    );
  };

  // Calculate total price based on selected services
  const calculateTotalPrice = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  // Handle book now button press
  const handleBookNow = () => {
    if (selectedServices.length === 0) {
      Alert.alert(
        'No Services Selected',
        'Please select at least one service before booking.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setShowBookingModal(true);
  };

  // Generate calendar data for current and next month
  const generateCalendarData = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const months = [];
    
    // Generate current month and next month
    for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
      const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
      
      const monthName = targetDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startDayOfWeek; i++) {
        days.push({ isEmpty: true, key: `empty-${i}` });
      }
      
      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < today;
        const isSelectable = !isPast;
        
        days.push({
          day,
          date,
          isToday,
          isPast,
          isSelectable,
          fullDate: date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          key: `${year}-${month}-${day}`
        });
      }
      
      months.push({
        monthName,
        days,
        year,
        month
      });
    }
    
    return months;
  };

  const calendarData = generateCalendarData();

  // Generate available time slots
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push({
          time: time,
          displayTime: time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        });
      }
    }
    return slots;
  };

  const availableTimeSlots = generateTimeSlots();

  // Calendar component
  const renderCalendar = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <View style={styles.calendarContainer}>
        {calendarData.map((monthData, monthIndex) => (
          <View key={monthIndex} style={styles.monthContainer}>
            <Text style={styles.monthTitle}>{monthData.monthName}</Text>
            
            {/* Week day headers */}
            <View style={styles.weekDaysContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.weekDayHeader}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>
            
            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {monthData.days.map((dayData, index) => {
                if (dayData.isEmpty) {
                  return <View key={dayData.key} style={styles.emptyDay} />;
                }
                
                const isSelected = selectedDate && 
                  selectedDate.date && 
                  dayData.date.toDateString() === selectedDate.date.toDateString();
                
                return (
                  <TouchableOpacity
                    key={dayData.key}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.selectedCalendarDay,
                      dayData.isToday && styles.todayCalendarDay,
                      !dayData.isSelectable && styles.disabledCalendarDay
                    ]}
                    onPress={() => {
                      if (dayData.isSelectable) {
                        setSelectedDate(dayData);
                      }
                    }}
                    disabled={!dayData.isSelectable}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      isSelected && styles.selectedCalendarDayText,
                      dayData.isToday && styles.todayCalendarDayText,
                      !dayData.isSelectable && styles.disabledCalendarDayText
                    ]}>
                      {dayData.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Incomplete Selection', 'Please select both date and time.');
      return;
    }

    try {
      // Show loading
      Alert.alert('Processing...', 'Creating your booking...');
      
      const selectedServiceDetails = services.filter(service => 
        selectedServices.includes(service.id)
      ).map(service => ({
        id: service.id,
        name: service.name,
        price: service.price,
        description: service.description || ''
      }));

      // Format date and time for database
      const appointmentDate = selectedDate.date.toISOString().split('T')[0]; // YYYY-MM-DD
      const appointmentTime = selectedTime.value; // HH:MM

      const bookingData = {
        barberId: providerProfileData.id,
        services: selectedServiceDetails, // Array of service objects
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        totalAmount: calculateTotalPrice(),
        customerNotes: '', // Can add a notes input field if needed
      };

      console.log('📅 Creating booking:', bookingData);

      // Create booking in database
      const result = await createBooking(bookingData);

      setShowBookingModal(false);

      if (result.success) {
        const bookingId = result.data?.booking_id || 'N/A';
        
        Alert.alert(
          'Booking Confirmed! 🎉',
          `Your appointment with ${providerProfileData.name} has been scheduled for ${selectedDate.fullDate} at ${selectedTime.displayTime}.\n\n💳 Booking ID: ${bookingId}\n\nTotal: $${calculateTotalPrice()}\n\nStatus: Waiting for manager confirmation\n\nShow your Booking ID at the store!`,
          [
            { 
              text: 'View My Bookings', 
              onPress: () => navigation.navigate('MyBookingScreen'),
              style: 'default'
            },
            { text: 'OK', style: 'cancel' }
          ]
        );

        console.log('✅ Booking created with ID:', bookingId);

        // Reset selections
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedTime(null);
      } else {
        Alert.alert(
          'Booking Failed',
          `Failed to create booking: ${result.error}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('❌ Error in handleConfirmBooking:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const renderStarRating = (rating, size = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Ionicons key={i} name="star" size={size} color="#FFD700" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={size} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={size} color="#FFD700" />);
      }
    }
    return stars;
  };

  const renderReviewItem = (review) => (
    <View key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.customerName}</Text>
          <Text style={styles.reviewDate}>{review.date}</Text>
        </View>
        <View style={styles.reviewRating}>
          {renderStarRating(Number(review.rating) || 0, 14)}
        </View>
      </View>
      <Text style={styles.reviewText}>{review.review}</Text>
      {review.services && review.services.length > 0 && (
        <View style={styles.reviewServicesContainer}>
          <Text style={styles.reviewServicesLabel}>Services: </Text>
          <Text style={styles.reviewServicesText}>{review.services.join(', ')}</Text>
        </View>
      )}
    </View>
  );

  // Booking Modal Component
  const renderBookingModal = () => (
    <Modal
      visible={showBookingModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBookingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Appointment</Text>
              <TouchableOpacity 
                onPress={() => setShowBookingModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Barber Info */}
            <View style={styles.modalBarberInfo}>
              <Image
                source={barberData.profile_image ? { uri: barberData.profile_image } : require('../../../../../assets/image.png')}
                style={styles.modalBarberImage}
                resizeMode="cover"
              />
              <View style={styles.modalBarberDetails}>
                <Text style={styles.modalBarberName}>{barberData.name}</Text>
                <View style={styles.modalRating}>
                  {renderStarRating(Number(barberData.rating) || 0, 14)}
                  <Text style={styles.modalRatingText}>({Number(barberData.total_reviews) || 0} reviews)</Text>
                </View>
              </View>
            </View>

            {/* Selected Services */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Selected Services</Text>
              {services
                .filter(service => selectedServices.includes(service.id))
                .map(service => (
                  <View key={service.id} style={styles.modalServiceItem}>
                    <View style={styles.modalServiceIcon}>
                      {service.icon_url ? 
                        <Image source={{ uri: service.icon_url }} style={{ width: 24, height: 24 }} /> : 
                        <Ionicons name="cut" size={24} color="#4A90E2" />
                      }
                    </View>
                    <View style={styles.modalServiceText}>
                      <Text style={styles.modalServiceTitle}>{service.name.toUpperCase()}</Text>
                      <Text style={styles.modalServiceSubtitle}>{service.description} - ${service.price}</Text>
                    </View>
                  </View>
                ))}
            </View>

            {/* Date Selection with Calendar */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Select Date</Text>
              {renderCalendar()}
            </View>

            {/* Time Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Select Time</Text>
              <View style={styles.timeGrid}>
                {availableTimeSlots.map((timeSlot, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.timeCard,
                      selectedTime?.value === timeSlot.value && styles.selectedTimeCard
                    ]}
                    onPress={() => setSelectedTime(timeSlot)}
                  >
                    <Text style={[
                      styles.timeText,
                      selectedTime?.value === timeSlot.value && styles.selectedTimeText
                    ]}>
                      {timeSlot.displayTime}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Total Price */}
            <View style={styles.modalTotalSection}>
              <View style={styles.modalTotalRow}>
                <Text style={styles.modalTotalLabel}>Total Amount</Text>
                <Text style={styles.modalTotalPrice}>${calculateTotalPrice()}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowBookingModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                (!selectedDate || !selectedTime) && styles.disabledButton
              ]}
              onPress={handleConfirmBooking}
              disabled={!selectedDate || !selectedTime}
            >
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* App Bar */}
          <SettingAppBar title={providerProfileData.name}/>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading provider details...</Text>
            </View>
          ) : (
            <>
              <View style={{marginTop: 30, paddingHorizontal: 15}}>
                <View style={{flexDirection: 'row'}}>
                  <Image
                    source={providerProfileData.profile_image ? { uri: providerProfileData.profile_image } : require('../../../../../assets/image.png')}
                    style={styles.logo}
                    resizeMode="cover"
                  />
                  <View style={styles.barberInfo}>
                    <Text style={styles.barberName}>
                      {providerProfileData.name}
                    </Text>
                    
                    {/* RATING SECTION */}
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStarRating(Number(barberData.rating) || 0, 18)}
                      </View>
                      <Text style={styles.ratingText}>
                        {Number(barberData.rating || 0).toFixed(1)} ({Number(barberData.total_reviews) || 0} reviews)
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* DESCRIPTION SECTION */}
                {barberData.bio && (
                  <View style={styles.descriptionContainer}>
                    <Text 
                      style={styles.descriptionText}
                      numberOfLines={3}
                      ellipsizeMode="tail"
                    >
                      {barberData.bio}
                    </Text>
                  </View>
                )}
              </View>

              {/* SERVICES SELECTION */}
              <View style={{paddingHorizontal: 15}}>
                <Text style={styles.title}>
                  Select Service
                </Text>
                {services.length > 0 ? (
                  services.map((service) => (
                    <SelectableServiceItem
                      key={service.id}
                      icon={service.icon_url ? 
                        <Image source={{ uri: service.icon_url }} style={{ width: 24, height: 24 }} /> : 
                        <Ionicons name="cut" size={24} color="#4A90E2" />
                      }
                      title={service.name.toUpperCase()}
                      subtitle={`${service.description || 'Professional service'} - $${service.price}`}
                      selected={selectedServices.includes(service.id)}
                      onPress={() => toggleService(service.id)}
                    />
                  ))
                ) : (
                  <View style={styles.emptyServicesContainer}>
                    <Ionicons name="cut-outline" size={48} color="#DDD" />
                    <Text style={styles.emptyServicesText}>No services available for this barber</Text>
                  </View>
                )}
              </View>

              {/* CUSTOMER REVIEWS SECTION */}
              <View style={styles.reviewsSection}>
                <Text style={styles.title}>
                  Customer Reviews
                </Text>
                {customerReviews.length > 0 ? (
                  customerReviews.map((review) => renderReviewItem(review))
                ) : (
                  <View style={styles.emptyReviewsContainer}>
                    <Ionicons name="chatbox-ellipses-outline" size={48} color="#DDD" />
                    <Text style={styles.emptyReviewsTitle}>No Reviews Yet</Text>
                    <Text style={styles.emptyReviewsText}>
                      This barber hasn't received any customer reviews yet. Be the first to leave a review! 💬
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ height: 20 }} />
            </>
          )}
        </ScrollView>

        <View style={styles.priceBar}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <View>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 20}}>
                {selectedServices.length > 0 ? 'Total Price' : 'Estimated Fare'}
              </Text>
              <Text style={{color: '#999', fontSize: 14}}>
                {selectedServices.length > 0 
                  ? `${selectedServices.length} service(s) selected` 
                  : 'Select services to see price'
                }
              </Text>
            </View>
            <Text style={{color: 'white', fontWeight: 'bold', fontSize: 24}}>
              ${selectedServices.length > 0 ? calculateTotalPrice() : '0'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.bookButton,
              { 
                backgroundColor: selectedServices.length > 0 ? '#4A90E2' : '#999',
                opacity: selectedServices.length > 0 ? 1 : 0.7
              }
            ]}
            onPress={handleBookNow}
          >
            <Text style={{color: 'white', fontWeight: 'bold', fontSize: 15}}>
              {selectedServices.length > 0 ? 'Book Now' : 'Select Services First'}
            </Text>
          </TouchableOpacity>
        </View>     
      </SafeAreaView>

      {/* Booking Modal */}
      {renderBookingModal()}
    </View>
  )
}

export default ProviderProfileScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  scrollContent: {
    flexGrow: 1
  },
  logo: {
    width: 90,
    height: 120,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#F8F9FA'
  },
  barberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  barberName: {
    fontWeight: 'bold',
    color: 'black',
    fontSize: 18,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  title: {
    fontWeight: 'bold',
    marginTop: 20, 
    fontSize: 17
  },
  reviewsSection: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priceBar: {
    backgroundColor: '#424242',
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
    padding: 14,
    paddingTop: 25
  },
  bookButton: {
    padding: 17,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 20,
    transition: 'all 0.3s ease',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBarberInfo: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
  },
  modalBarberImage: {
    width: 60,
    height: 80,
    borderRadius: 15,
    marginRight: 15,
  },
  modalBarberDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modalBarberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRatingText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modalServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  modalServiceIcon: {
    marginRight: 12,
  },
  modalServiceText: {
    flex: 1,
  },
  modalServiceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  modalServiceSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Calendar Styles
  calendarContainer: {
    backgroundColor: 'white',
  },
  monthContainer: {
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: '14.28%', // 100% / 7 days
    height: 45,
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedCalendarDay: {
    backgroundColor: '#4A90E2',
  },
  todayCalendarDay: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  disabledCalendarDay: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedCalendarDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  todayCalendarDayText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  disabledCalendarDayText: {
    color: '#CCC',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeCard: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTimeCard: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedTimeText: {
    color: 'white',
  },
  modalTotalSection: {
    backgroundColor: '#F8F9FA',
    margin: 20,
    padding: 15,
    borderRadius: 15,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalTotalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  // Description Styles
  descriptionContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Empty States
  emptyServicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    marginTop: 10,
  },
  emptyServicesText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    marginTop: 10,
  },
  emptyReviewsTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptyReviewsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Review Services Display
  reviewServicesContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  reviewServicesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  reviewServicesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
})