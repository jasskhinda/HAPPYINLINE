import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { rescheduleBooking } from '../../../lib/shopAuth';
import { supabase } from '../../../lib/supabase';
import {
  sendBookingRescheduledNotification,
  sendBookingRescheduledEmail,
} from '../../../lib/notifications';

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return dateString; }
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch { return timeString; }
};

const RescheduleBookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking } = route.params || {};

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);

  // Parse services
  const getServiceNames = () => {
    try {
      if (!booking?.services) return [];
      const list = typeof booking.services === 'string'
        ? JSON.parse(booking.services) : booking.services;
      return Array.isArray(list) ? list.map(s => s.name || s) : [];
    } catch { return []; }
  };

  // Generate time slots from shop operating hours
  const generateTimeSlots = useCallback(() => {
    let openTime = '09:00';
    let closeTime = '17:00';

    if (selectedDate && booking?.shop?.operating_hours) {
      const dayName = selectedDate.date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayHours = booking.shop.operating_hours[dayName];
      if (dayHours && !dayHours.closed) {
        openTime = dayHours.open || openTime;
        closeTime = dayHours.close || closeTime;
      }
    } else if (booking?.shop?.opening_time && booking?.shop?.closing_time) {
      openTime = booking.shop.opening_time;
      closeTime = booking.shop.closing_time;
    }

    const slots = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    let currentMinutes = openH * 60 + (openM || 0);
    const endMinutes = closeH * 60 + (closeM || 0);

    while (currentMinutes < endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      slots.push(`${displayH}:${String(m).padStart(2, '0')} ${period}`);
      currentMinutes += 30;
    }
    return slots;
  }, [selectedDate, booking?.shop]);

  // Generate calendar month
  const generateCalendarMonth = (monthOffset) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();

    const monthName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ isEmpty: true, key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today && !isToday;
      days.push({
        day, date, isToday, isPast,
        isSelectable: !isPast,
        fullDate: date.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }),
        key: `${year}-${month}-${day}`,
      });
    }

    return { monthName, days };
  };

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Selection Required', 'Please select both a date and time.');
      return;
    }

    const newDateTime = `${selectedDate.fullDate} at ${selectedTime}`;

    Alert.alert(
      'Confirm Reschedule',
      `Reschedule to ${newDateTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRescheduling(true);
            try {
              // Convert date to YYYY-MM-DD
              const year = selectedDate.date.getFullYear();
              const month = String(selectedDate.date.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.date.getDate()).padStart(2, '0');
              const newDate = `${year}-${month}-${day}`;

              // Convert 12h time to 24h HH:MM
              const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (!timeMatch) throw new Error('Invalid time format');
              let hours = parseInt(timeMatch[1]);
              const minutes = timeMatch[2];
              const period = timeMatch[3].toUpperCase();
              if (period === 'PM' && hours !== 12) hours += 12;
              else if (period === 'AM' && hours === 12) hours = 0;
              const newTime = `${String(hours).padStart(2, '0')}:${minutes}`;

              const oldDate = booking.appointment_date;
              const oldTime = booking.appointment_time;

              // Reschedule in database
              const result = await rescheduleBooking(booking.id, newDate, newTime);
              if (!result.success) throw new Error(result.error || 'Failed to reschedule');

              const shopName = booking.shop?.name || 'the shop';
              const serviceNames = getServiceNames();
              const serviceName = serviceNames.length > 0 ? serviceNames.join(', ') : 'appointment';
              const formattedNewDate = formatDate(newDate);
              const formattedNewTime = formatTime(newTime);

              // Send push notification to customer
              if (booking.customer?.id) {
                sendBookingRescheduledNotification({
                  recipientUserId: booking.customer.id,
                  shopName,
                  serviceName,
                  date: formattedNewDate,
                  time: formattedNewTime,
                  bookingId: booking.id,
                  oldDate: formatDate(oldDate),
                  oldTime: formatTime(oldTime),
                }).catch(err => console.error('Push notification error:', err));
              }

              // Send push notification to assigned provider (if different from current user)
              const providerId = booking.barber_id || booking.provider_id;
              if (providerId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && providerId !== user.id) {
                  sendBookingRescheduledNotification({
                    recipientUserId: providerId,
                    shopName,
                    serviceName,
                    date: formattedNewDate,
                    time: formattedNewTime,
                    bookingId: booking.id,
                    oldDate: formatDate(oldDate),
                    oldTime: formatTime(oldTime),
                  }).catch(err => console.error('Provider push notification error:', err));
                }
              }

              // Send email to customer
              if (booking.customer?.email) {
                sendBookingRescheduledEmail({
                  customerEmail: booking.customer.email,
                  customerName: booking.customer.name || 'Customer',
                  shopName,
                  serviceName,
                  oldDate: formatDate(oldDate),
                  oldTime: formatTime(oldTime),
                  newDate: formattedNewDate,
                  newTime: formattedNewTime,
                }).catch(err => console.error('Email error:', err));
              }

              Toast.show({ type: 'success', text1: 'Rescheduled', text2: `Moved to ${formattedNewDate} at ${formattedNewTime}` });
              navigation.goBack();
            } catch (error) {
              console.error('Reschedule error:', error);
              Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to reschedule' });
            } finally {
              setRescheduling(false);
            }
          },
        },
      ]
    );
  };

  // Render calendar
  const renderCalendar = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthData = generateCalendarMonth(currentMonthOffset);

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={() => currentMonthOffset > 0 && setCurrentMonthOffset(currentMonthOffset - 1)}
            disabled={currentMonthOffset === 0}
            style={[styles.monthNavButton, currentMonthOffset === 0 && styles.monthNavButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={22} color={currentMonthOffset === 0 ? '#CCC' : '#4A90E2'} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthData.monthName}</Text>
          <TouchableOpacity
            onPress={() => currentMonthOffset < 3 && setCurrentMonthOffset(currentMonthOffset + 1)}
            disabled={currentMonthOffset >= 3}
            style={[styles.monthNavButton, currentMonthOffset >= 3 && styles.monthNavButtonDisabled]}
          >
            <Ionicons name="chevron-forward" size={22} color={currentMonthOffset >= 3 ? '#CCC' : '#4A90E2'} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {weekDays.map((d, i) => (
            <View key={i} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {monthData.days.map((dayData) => {
            if (dayData.isEmpty) return <View key={dayData.key} style={styles.emptyDay} />;
            const isSelected = selectedDate?.date?.toDateString() === dayData.date.toDateString();
            return (
              <TouchableOpacity
                key={dayData.key}
                style={[
                  styles.calendarDay,
                  isSelected && styles.selectedDay,
                  dayData.isToday && styles.todayDay,
                  !dayData.isSelectable && styles.disabledDay,
                ]}
                onPress={() => {
                  if (dayData.isSelectable) {
                    setSelectedDate(dayData);
                    setSelectedTime('');
                  }
                }}
                disabled={!dayData.isSelectable}
              >
                <Text style={[
                  styles.calendarDayText,
                  isSelected && styles.selectedDayText,
                  dayData.isToday && !isSelected && styles.todayDayText,
                  !dayData.isSelectable && styles.disabledDayText,
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

  const timeSlots = generateTimeSlots();
  const serviceNames = getServiceNames();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Current Appointment Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardTitleIconCircle, { backgroundColor: '#FFF5EB' }]}>
              <Ionicons name="calendar" size={16} color="#FF9500" />
            </View>
            <Text style={styles.cardTitle}>Current Appointment</Text>
          </View>

          <View style={styles.currentInfoRow}>
            <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
            <Text style={styles.currentInfoText}>
              {formatDate(booking?.appointment_date)} at {formatTime(booking?.appointment_time)}
            </Text>
          </View>

          {booking?.customer?.name && (
            <View style={styles.currentInfoRow}>
              <Ionicons name="person-outline" size={16} color="#8E8E93" />
              <Text style={styles.currentInfoText}>{booking.customer.name}</Text>
            </View>
          )}

          {booking?.barber?.name && (
            <View style={styles.currentInfoRow}>
              <Ionicons name="cut-outline" size={16} color="#8E8E93" />
              <Text style={styles.currentInfoText}>Provider: {booking.barber.name}</Text>
            </View>
          )}

          {serviceNames.length > 0 && (
            <View style={styles.currentInfoRow}>
              <Ionicons name="list-outline" size={16} color="#8E8E93" />
              <Text style={styles.currentInfoText}>{serviceNames.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Select New Date */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleIconCircle}>
              <Ionicons name="calendar" size={16} color="#4A90E2" />
            </View>
            <Text style={styles.cardTitle}>Select New Date</Text>
          </View>
          {renderCalendar()}
        </View>

        {/* Select New Time */}
        {selectedDate && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleIconCircle}>
                <Ionicons name="time" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.cardTitle}>Select New Time</Text>
            </View>
            <Text style={styles.selectedDateLabel}>{selectedDate.fullDate}</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlot, isSelected && styles.selectedTimeSlot]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.timeSlotText, isSelected && styles.selectedTimeSlotText]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.confirmButtonWrapper}
          onPress={handleConfirmReschedule}
          activeOpacity={0.85}
          disabled={!selectedDate || !selectedTime || rescheduling}
        >
          <LinearGradient
            colors={selectedDate && selectedTime ? ['#FF9500', '#F57C00'] : ['#CCC', '#BBB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmButton}
          >
            {rescheduling ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.confirmButtonText}>Confirm Reschedule</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', letterSpacing: 0.3 },

  // Cards
  card: {
    backgroundColor: '#FFF', borderRadius: 18, padding: 20,
    marginHorizontal: 20, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitleIconCircle: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#EBF5FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', letterSpacing: 0.2 },

  // Current appointment info
  currentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  currentInfoText: { fontSize: 14, color: '#555', fontWeight: '500', flex: 1 },

  // Calendar
  calendarContainer: {},
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavButton: { padding: 4 },
  monthNavButtonDisabled: { opacity: 0.4 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  weekDaysRow: { flexDirection: 'row', marginBottom: 8 },
  weekDayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekDayText: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyDay: { width: '14.28%', height: 42 },
  calendarDay: {
    width: '14.28%', height: 42, justifyContent: 'center', alignItems: 'center',
    borderRadius: 21,
  },
  calendarDayText: { fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  selectedDay: { backgroundColor: '#4A90E2' },
  selectedDayText: { color: '#FFF', fontWeight: '700' },
  todayDay: { borderWidth: 1.5, borderColor: '#4A90E2' },
  todayDayText: { color: '#4A90E2', fontWeight: '700' },
  disabledDay: { opacity: 0.3 },
  disabledDayText: { color: '#CCC' },

  // Time slots
  selectedDateLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500', marginBottom: 14 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: {
    width: '47%', paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F5F7FA', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#F0F0F5',
  },
  timeSlotText: { fontSize: 14, fontWeight: '600', color: '#555' },
  selectedTimeSlot: { backgroundColor: '#EBF5FF', borderColor: '#4A90E2' },
  selectedTimeSlotText: { color: '#4A90E2', fontWeight: '700' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12, backgroundColor: '#F8F9FC',
    borderTopWidth: 1, borderTopColor: '#F0F0F5',
  },
  confirmButtonWrapper: {
    borderRadius: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  confirmButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 16, gap: 10,
  },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
});

export default RescheduleBookingScreen;
