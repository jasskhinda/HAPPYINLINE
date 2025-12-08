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
import { Ionicons } from '@expo/vector-icons';
import SettingAppBar from '../../../../components/appBar/SettingAppBar';
import { rescheduleBooking } from '../../../../lib/auth';

const RescheduleBookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking } = route.params || {};

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);

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
        // Parse date in local timezone to avoid timezone shift
        const [year, month, day] = booking.appointment_date.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed

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

  // Generate calendar data for a single month based on offset
  const generateCalendarMonth = (monthOffset) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
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
      const isPast = date < today && !isToday;
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

    return {
      monthName,
      days,
      year,
      month
    };
  };

  // Sample available time slots
  const availableTimeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  ];

  // Calendar component with month navigation
  const renderCalendar = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthData = generateCalendarMonth(currentMonthOffset);

    const handlePreviousMonth = () => {
      if (currentMonthOffset > 0) {
        setCurrentMonthOffset(currentMonthOffset - 1);
      }
    };

    const handleNextMonth = () => {
      // Allow up to 12 months in the future
      if (currentMonthOffset < 12) {
        setCurrentMonthOffset(currentMonthOffset + 1);
      }
    };

    return (
      <View style={styles.calendarContainer}>
        {/* Month Navigation Header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={handlePreviousMonth}
            disabled={currentMonthOffset === 0}
            style={[styles.monthNavButton, currentMonthOffset === 0 && styles.monthNavButtonDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={currentMonthOffset === 0 ? '#CCC' : '#4A90E2'}
            />
          </TouchableOpacity>

          <Text style={styles.monthTitle}>{monthData.monthName}</Text>

          <TouchableOpacity
            onPress={handleNextMonth}
            disabled={currentMonthOffset >= 12}
            style={[styles.monthNavButton, currentMonthOffset >= 12 && styles.monthNavButtonDisabled]}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={currentMonthOffset >= 12 ? '#CCC' : '#4A90E2'}
            />
          </TouchableOpacity>
        </View>

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
          {monthData.days.map((dayData) => {
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
              // Convert selected date to YYYY-MM-DD format using LOCAL time (not UTC)
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

              const newTime = `${String(hours).padStart(2, '0')}:${minutes}`;

              console.log('📅 Rescheduling booking:', {
                bookingId: booking.id,
                newDate,
                newTime,
                selectedDateObject: selectedDate.date,
              });

              // Call API to reschedule
              const result = await rescheduleBooking(booking.id, newDate, newTime);
              
              if (result.success) {
                Alert.alert(
                  '✅ Appointment Rescheduled',
                  `Your appointment has been successfully rescheduled to ${newDateTime}.`,
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
  );
};

export default RescheduleBookingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  currentBookingSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  bookingInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 6,
  },
  currentDateTime: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  servicesText: {
    fontSize: 13,
    color: '#666',
  },
  selectionSection: {
    marginBottom: 20,
  },
  // Calendar Styles
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
  },
  monthNavButtonDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: '14.28%', // 100% / 7 days
    height: 42,
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
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
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
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
    backgroundColor: '#F8F9FA',
  },
  confirmButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmButtonActive: {
    backgroundColor: '#4A90E2',
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