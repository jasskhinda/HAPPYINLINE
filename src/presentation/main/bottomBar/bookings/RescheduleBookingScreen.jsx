import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import SettingAppBar from '../../../../components/appBar/SettingAppBar';
import { rescheduleBooking } from '../../../../lib/auth';

const RescheduleBookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking } = route.params || {};
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Parse services from JSON string
  const getServices = () => {
    try {
      if (!booking?.services) return [];
      
      let servicesList = booking.services;
      // If it's a string, parse it
      if (typeof servicesList === 'string') {
        servicesList = JSON.parse(servicesList);
      }
      // If it's an array, return it
      if (Array.isArray(servicesList)) {
        return servicesList.map(s => s.name || s);
      }
      return [];
    } catch (error) {
      console.error('Error parsing services:', error);
      return [];
    }
  };

  // Format current appointment date and time
  const formatCurrentDateTime = () => {
    if (!booking) return 'N/A';
    
    try {
      if (booking.appointment_date && booking.appointment_time) {
        const date = new Date(booking.appointment_date);
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        // Convert 24h to 12h format
        const [hours, minutes] = booking.appointment_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const formattedTime = `${hour12}:${minutes} ${ampm}`;
        
        return `${formattedDate} • ${formattedTime}`;
      }
      return booking.dateTime || 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return booking.dateTime || 'N/A';
    }
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

  // Sample available time slots
  const availableTimeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  ];

  const calendarData = generateCalendarData();

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

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Selection Required', 'Please select both date and time for your appointment.');
      return;
    }

    const newDateTime = `${selectedDate.fullDate} at ${selectedTime}`;
    const shopName = booking?.shop?.name || 'your appointment';

    Alert.alert(
      'Confirm Reschedule',
      `Reschedule ${shopName} to ${newDateTime}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            setRescheduling(true);
            try {
              // Convert selected date to YYYY-MM-DD format
              const year = selectedDate.date.getFullYear();
              const month = String(selectedDate.date.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.date.getDate()).padStart(2, '0');
              const newDate = `${year}-${month}-${day}`;
              
              // Convert 12h time to 24h format (HH:MM:SS)
              const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (!timeMatch) {
                throw new Error('Invalid time format');
              }
              
              let hours = parseInt(timeMatch[1]);
              const minutes = timeMatch[2];
              const period = timeMatch[3].toUpperCase();
              
              if (period === 'PM' && hours !== 12) {
                hours += 12;
              } else if (period === 'AM' && hours === 12) {
                hours = 0;
              }
              
              const newTime = `${String(hours).padStart(2, '0')}:${minutes}:00`;
              
              console.log('📅 Rescheduling booking:', {
                bookingId: booking.id,
                newDate,
                newTime,
              });
              
              // Call API to reschedule
              const result = await rescheduleBooking(booking.id, newDate, newTime);
              
              if (result.success) {
                Alert.alert(
                  '✅ Appointment Rescheduled',
                  `Your appointment has been successfully rescheduled to ${newDateTime}.\n\nYour booking is now pending confirmation from the shop manager.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              } else {
                Alert.alert(
                  '❌ Error',
                  result.error || 'Failed to reschedule booking. Please try again.'
                );
              }
            } catch (error) {
              console.error('❌ Error rescheduling:', error);
              Alert.alert(
                '❌ Error',
                'Failed to reschedule booking. Please try again.'
              );
            } finally {
              setRescheduling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container}>
        <SettingAppBar title="Reschedule Booking" />
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Booking Info */}
          <View style={styles.currentBookingSection}>
            <Text style={styles.sectionTitle}>Current Appointment</Text>
            <View style={styles.bookingInfoCard}>
              <Text style={styles.barberName}>
                {booking?.shop?.name || booking?.name || 'Barbershop'}
              </Text>
              <Text style={styles.currentDateTime}>{formatCurrentDateTime()}</Text>
              <Text style={styles.servicesText}>
                Services: {getServices().join(', ') || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Date Selection with Calendar */}
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>Select New Date</Text>
            {renderCalendar()}
          </View>

          {/* Time Selection */}
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>Select New Time</Text>
            <View style={styles.timeGrid}>
              {availableTimeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeButton,
                    selectedTime === time && styles.selectedTimeButton
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[
                    styles.timeButtonText,
                    selectedTime === time && styles.selectedTimeButtonText
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.confirmSection}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (selectedDate && selectedTime && !rescheduling) ? styles.confirmButtonActive : styles.confirmButtonInactive
            ]}
            onPress={handleConfirmReschedule}
            disabled={!selectedDate || !selectedTime || rescheduling}
          >
            {rescheduling ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={[
                styles.confirmButtonText,
                (selectedDate && selectedTime) ? styles.confirmButtonTextActive : styles.confirmButtonTextInactive
              ]}>
                Confirm Reschedule
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default RescheduleBookingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  currentBookingSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  bookingInfoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barberName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  currentDateTime: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  servicesText: {
    fontSize: 14,
    color: '#666',
  },
  selectionSection: {
    marginBottom: 30,
  },
  // Calendar Styles
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#FF6B6B',
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
  timeButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: '48%',
  },
  selectedTimeButton: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedTimeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  confirmSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#EEEEEE',
  },
  confirmButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  confirmButtonInactive: {
    backgroundColor: '#DDD',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonTextActive: {
    color: 'white',
  },
  confirmButtonTextInactive: {
    color: '#999',
  },
});