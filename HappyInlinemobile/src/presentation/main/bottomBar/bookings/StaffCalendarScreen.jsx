import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../../../lib/supabase';
import COLORS from '../../../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants for calendar layout
const TIME_COLUMN_WIDTH = 50;
const PROVIDER_COLUMN_WIDTH = 140;
const HOUR_HEIGHT = 60; // Height per hour in pixels
const START_HOUR = 7; // 7 AM
const END_HOUR = 20; // 8 PM (20:00)
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Generate time slots for the day
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const displayHour = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    slots.push({
      hour,
      label: `${displayHour}${ampm}`,
    });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Provider colors (Booksy-style)
const PROVIDER_COLORS = [
  { bg: '#E8EAF6', border: '#5C6BC0', text: '#3949AB' }, // Indigo
  { bg: '#E3F2FD', border: '#42A5F5', text: '#1976D2' }, // Blue
  { bg: '#F3E5F5', border: '#AB47BC', text: '#7B1FA2' }, // Purple
  { bg: '#E8F5E9', border: '#66BB6A', text: '#388E3C' }, // Green
  { bg: '#FFF3E0', border: '#FFA726', text: '#F57C00' }, // Orange
  { bg: '#FCE4EC', border: '#EC407A', text: '#C2185B' }, // Pink
  { bg: '#E0F7FA', border: '#26C6DA', text: '#00838F' }, // Cyan
  { bg: '#FFF8E1', border: '#FFCA28', text: '#FF8F00' }, // Amber
];

const StaffCalendarScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const horizontalScrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shopInfo, setShopInfo] = useState(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (!loading && scrollViewRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        const scrollPosition = (currentHour - START_HOUR) * HOUR_HEIGHT - 50;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollPosition), animated: true });
        }, 500);
      }
    }
  }, [loading]);

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchCalendarData();
    }, [selectedDate])
  );

  const fetchCalendarData = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get the shop the user has access to
      const { data: staffData } = await supabase
        .from('shop_staff')
        .select('shop_id, role, shops(*)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin', 'barber'])
        .limit(1)
        .single();

      if (!staffData?.shop_id) {
        console.log('No shop access found');
        setLoading(false);
        return;
      }

      const shopId = staffData.shop_id;
      setShopInfo(staffData.shops);

      // Fetch all staff/providers for this shop
      const { data: shopStaff, error: staffError } = await supabase
        .from('shop_staff')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            id,
            name,
            profile_image
          )
        `)
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .in('role', ['barber', 'owner', 'admin']);

      if (staffError) {
        console.error('Error fetching staff:', staffError);
      }

      // Process providers
      const providersList = (shopStaff || [])
        .filter(s => s.profiles)
        .map((s, index) => ({
          id: s.user_id,
          name: s.profiles.name || 'Staff',
          profileImage: s.profiles.profile_image,
          role: s.role,
          color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
        }));

      setProviders(providersList);

      // Format date for query
      const dateStr = formatDateForQuery(selectedDate);

      // Fetch bookings for the selected date
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_id,
          appointment_date,
          appointment_time,
          status,
          services,
          total_amount,
          provider_id,
          customer:profiles!bookings_customer_id_fkey(id, name)
        `)
        .eq('shop_id', shopId)
        .eq('appointment_date', dateStr)
        .in('status', ['pending', 'confirmed', 'completed'])
        .order('appointment_time', { ascending: true });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
      }

      setBookings(bookingsData || []);

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDateForQuery = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCalendarData(true);
  };

  // Navigate to previous/next day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  // Format date for header display
  const formatDateHeader = () => {
    if (isToday()) return 'Today';

    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return selectedDate.toLocaleDateString('en-US', options);
  };

  // Calculate position for current time indicator
  const getCurrentTimePosition = () => {
    if (!isToday()) return null;

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();

    if (hours < START_HOUR || hours > END_HOUR) return null;

    const totalMinutes = (hours - START_HOUR) * 60 + minutes;
    return (totalMinutes / 60) * HOUR_HEIGHT;
  };

  // Calculate booking position and height
  const getBookingPosition = (booking) => {
    if (!booking.appointment_time) return { top: 0, height: HOUR_HEIGHT / 2 };

    const [hours, minutes] = booking.appointment_time.split(':').map(Number);
    const top = ((hours - START_HOUR) * 60 + minutes) / 60 * HOUR_HEIGHT;

    // Calculate duration from services or default to 30 min
    let duration = 30;
    if (booking.services && Array.isArray(booking.services)) {
      duration = booking.services.reduce((sum, s) => sum + (s.duration || 30), 0);
    }

    const height = (duration / 60) * HOUR_HEIGHT;

    return { top, height: Math.max(height, 25) }; // Minimum height of 25px
  };

  // Check if a booking is in the past
  const isBookingPast = (booking) => {
    if (!isToday()) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate < today;
    }

    if (!booking.appointment_time) return false;

    const [hours, minutes] = booking.appointment_time.split(':').map(Number);
    const bookingTime = new Date();
    bookingTime.setHours(hours, minutes, 0, 0);

    return bookingTime < currentTime;
  };

  // Get provider color
  const getProviderColor = (providerId) => {
    const providerIndex = providers.findIndex(p => p.id === providerId);
    if (providerIndex === -1) return PROVIDER_COLORS[0];
    return providers[providerIndex].color;
  };

  // Generate week days for date picker
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Format time for display (HH:MM to h:mm AM/PM)
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  // Get service names from booking
  const getServiceNames = (booking) => {
    if (!booking.services || !Array.isArray(booking.services)) return 'Service';
    return booking.services.map(s => s.name).join(', ');
  };

  // Handle booking tap
  const handleBookingPress = (booking) => {
    navigation.navigate('BookingDetailScreen', { bookingId: booking.id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const weekDays = getWeekDays();
  const timePosition = getCurrentTimePosition();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{formatDateHeader()}</Text>
            {shopInfo && (
              <Text style={styles.headerSubtitle}>{shopInfo.name}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Week day picker */}
        <View style={styles.weekPicker}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekDaysContainer}
          >
            {weekDays.map((date, index) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isTodayDate = date.toDateString() === new Date().toDateString();
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[
                    styles.dayName,
                    isSelected && styles.dayNameSelected,
                    isTodayDate && !isSelected && styles.dayNameToday,
                  ]}>
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()]}
                  </Text>
                  <Text style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                    isTodayDate && !isSelected && styles.dayNumberToday,
                  ]}>
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Today button */}
        {!isToday() && (
          <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
            <Text style={styles.todayButtonText}>TODAY</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Provider Headers */}
      <View style={styles.providerHeaderContainer}>
        <View style={styles.timeColumnHeader} />
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {providers.map((provider, index) => (
            <View
              key={provider.id}
              style={[styles.providerHeader, { borderBottomColor: provider.color.border }]}
            >
              {provider.profileImage ? (
                <Image source={{ uri: provider.profileImage }} style={styles.providerAvatar} />
              ) : (
                <View style={[styles.providerAvatarPlaceholder, { backgroundColor: provider.color.bg }]}>
                  <Ionicons name="person" size={16} color={provider.color.text} />
                </View>
              )}
              <Text style={styles.providerName} numberOfLines={1}>
                {provider.name}
              </Text>
              <Text style={styles.providerHours}>8:30 AM-6:00 PM</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Calendar Grid */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.calendarContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarGrid}>
          {/* Time Column */}
          <View style={styles.timeColumn}>
            {TIME_SLOTS.map((slot, index) => (
              <View key={slot.hour} style={[styles.timeSlot, { height: HOUR_HEIGHT }]}>
                <Text style={styles.timeLabel}>{slot.label}</Text>
              </View>
            ))}
          </View>

          {/* Provider Columns */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              // Sync horizontal scroll with header
              horizontalScrollRef.current?.scrollTo({
                x: e.nativeEvent.contentOffset.x,
                animated: false,
              });
            }}
          >
            <View style={styles.providersContainer}>
              {providers.map((provider, providerIndex) => (
                <View key={provider.id} style={styles.providerColumn}>
                  {/* Grid lines */}
                  {TIME_SLOTS.map((slot, index) => (
                    <View
                      key={slot.hour}
                      style={[
                        styles.gridCell,
                        { height: HOUR_HEIGHT },
                        providerIndex % 2 === 1 && styles.gridCellAlt,
                      ]}
                    />
                  ))}

                  {/* Bookings for this provider */}
                  {bookings
                    .filter(b => b.provider_id === provider.id)
                    .map((booking) => {
                      const { top, height } = getBookingPosition(booking);
                      const isPast = isBookingPast(booking);
                      const color = provider.color;

                      return (
                        <TouchableOpacity
                          key={booking.id}
                          style={[
                            styles.bookingCard,
                            {
                              top,
                              height,
                              backgroundColor: color.bg,
                              borderLeftColor: color.border,
                              opacity: isPast ? 0.5 : 1,
                            },
                          ]}
                          onPress={() => handleBookingPress(booking)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.bookingTime, { color: color.text }]} numberOfLines={1}>
                            {formatTime(booking.appointment_time)}
                          </Text>
                          <Text style={[styles.bookingCustomer, { color: color.text }]} numberOfLines={1}>
                            {booking.customer?.name || 'Walk-in'}
                          </Text>
                          <Text style={[styles.bookingService, { color: color.text }]} numberOfLines={1}>
                            {getServiceNames(booking)}
                          </Text>
                          {booking.status === 'confirmed' && (
                            <View style={styles.confirmedBadge}>
                              <Ionicons name="checkmark-circle" size={12} color={COLORS.error} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))}

              {/* Current Time Indicator (Red Line) */}
              {timePosition !== null && (
                <View style={[styles.currentTimeIndicator, { top: timePosition }]}>
                  <View style={styles.currentTimeDot} />
                  <View style={styles.currentTimeLine} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BookingConfirmationScreen')}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // Header Styles
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  refreshButton: {
    padding: 4,
  },

  // Week Picker Styles
  weekPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 44,
  },
  dayButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: COLORS.white,
  },
  dayNameToday: {
    color: COLORS.primary,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayNumberSelected: {
    color: COLORS.white,
  },
  dayNumberToday: {
    color: COLORS.primary,
  },
  todayButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray100,
    borderRadius: 16,
    marginTop: 8,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Provider Header Styles
  providerHeaderContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeColumnHeader: {
    width: TIME_COLUMN_WIDTH,
  },
  providerHeader: {
    width: PROVIDER_COLUMN_WIDTH,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
  },
  providerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 4,
  },
  providerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  providerHours: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Calendar Grid Styles
  calendarContainer: {
    flex: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  timeSlot: {
    justifyContent: 'flex-start',
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'right',
    paddingRight: 8,
    marginTop: -6,
  },
  providersContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  providerColumn: {
    width: PROVIDER_COLUMN_WIDTH,
    position: 'relative',
  },
  gridCell: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  gridCellAlt: {
    backgroundColor: COLORS.gray100,
  },

  // Booking Card Styles
  bookingCard: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 6,
    borderLeftWidth: 4,
    padding: 4,
    overflow: 'hidden',
  },
  bookingTime: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookingCustomer: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  bookingService: {
    fontSize: 9,
    marginTop: 1,
  },
  confirmedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },

  // Current Time Indicator
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    marginLeft: -5,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.error,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default StaffCalendarScreen;
