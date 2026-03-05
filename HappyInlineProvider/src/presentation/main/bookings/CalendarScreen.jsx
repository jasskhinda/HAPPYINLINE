import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { getProviderShop } from '../../../lib/providerAuth';
import { getShopStaff } from '../../../lib/shopAuth';
import { getCurrentUser } from '../../../lib/auth';

// ─── Constants ───────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 72;
const START_HOUR = 0;
const END_HOUR = 24;
const TIME_COL_WIDTH = 52;
const STAFF_HEADER_HEIGHT = 88;
const GRID_TOP_PAD = 8; // padding so 12 AM label isn't clipped
const TOTAL_HOURS = END_HOUR - START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT + GRID_TOP_PAD;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_COL_WIDTH = 170;

const STATUS_COLORS = {
  pending: '#FF9500',
  confirmed: '#34C759',
  completed: '#4A90E2',
  cancelled: '#FF3B30',
};

const STATUS_BG = {
  pending: '#FFF8F0',
  confirmed: '#F0FFF4',
  completed: '#F0F7FF',
  cancelled: '#FFF0F0',
};

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const todayStr = () => formatDateStr(new Date());

const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(sunday);
    dt.setDate(sunday.getDate() + i);
    dates.push(dt);
  }
  return dates;
};

const formatTime12 = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const display = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${display}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatTimeShort = (timeStr) => {
  if (!timeStr) return '';
  const [h] = timeStr.split(':').map(Number);
  const display = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${display}${ampm}`;
};

const getBookingDuration = (booking) => {
  if (booking.services && Array.isArray(booking.services) && booking.services.length > 0) {
    return booking.services.reduce((sum, s) => sum + (s.duration || 30), 0);
  }
  return 30;
};

const getServiceNames = (booking) => {
  if (booking.services && Array.isArray(booking.services) && booking.services.length > 0) {
    return booking.services.map((s) => s.name).join(', ');
  }
  return 'Service';
};

const generateTimeSlots = () => {
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    slots.push({ hour: h, label: `${display} ${ampm}` });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const isBookingPast = (booking, selectedDateStr) => {
  const now = new Date();
  const tStr = todayStr();
  if (selectedDateStr < tStr) return true;
  if (selectedDateStr > tStr) return false;
  if (!booking.appointment_time) return false;
  const [h, m] = booking.appointment_time.split(':').map(Number);
  const bookingEndMin = h * 60 + m + getBookingDuration(booking);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return bookingEndMin <= nowMin;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const CalendarScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isPushed = route.name === 'CalendarScreen'; // true when navigated from Profile (not as tab)
  const gridScrollRef = useRef(null);
  const timeScrollRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shopId, setShopId] = useState(null);
  const [shop, setShop] = useState(null);
  const [staff, setStaff] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userRole, setUserRole] = useState('owner');
  const [userId, setUserId] = useState(null);
  const [didAutoScroll, setDidAutoScroll] = useState(false);

  const selectedDateStr = formatDateStr(selectedDate);
  const isToday = selectedDateStr === todayStr();
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDateStr]);

  // Column width calculation
  const availableWidth = SCREEN_WIDTH - TIME_COL_WIDTH;
  const staffColWidth = useMemo(() => {
    if (staff.length === 0) return availableWidth;
    const perCol = availableWidth / staff.length;
    return Math.max(MIN_COL_WIDTH, perCol);
  }, [staff.length]);
  const totalGridWidth = Math.max(staff.length * staffColWidth, availableWidth);

  // ─── Init ──────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const init = async () => {
      setLoading(true);
      const result = await getProviderShop();
      const { profile } = await getCurrentUser();
      if (profile?.id) setUserId(profile.id);

      if (result.success) {
        setShopId(result.shop.id);
        setShop(result.shop);
        const role = result.role || 'owner';
        setUserRole(role);
        await loadStaff(result.shop.id, role, profile?.id);
      }
      setLoading(false);
    };
    init();
  }, []));

  const loadStaff = async (sid, role, uid) => {
    const result = await getShopStaff(sid);

    if (result.success && result.staff) {
      let staffList = result.staff.map((s) => ({
        id: s.id,
        userId: s.user?.id,
        name: s.user?.name || 'Staff',
        image: s.user?.profile_image,
        role: s.role,
      }));

      // If no staff found, add current user as column
      if (staffList.length === 0) {
        const { profile } = await getCurrentUser();
        if (profile) {
          staffList = [{
            id: 'self',
            userId: profile.id,
            name: profile.name || 'My Schedule',
            image: profile.profile_image,
            role: role,
          }];
        }
      }

      setStaff(staffList);
    }
  };

  // ─── Clock update ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ─── Fetch bookings ───────────────────────────────────────────────
  useEffect(() => {
    if (shopId) fetchBookings();
  }, [shopId, selectedDateStr]);

  const fetchBookings = async () => {
    if (!shopId) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, appointment_date, appointment_time, status, total_amount, services, barber_id, provider_id,
          customer:profiles!bookings_customer_id_fkey(id, name, profile_image)
        `)
        .eq('shop_id', shopId)
        .eq('appointment_date', selectedDateStr)
        .in('status', ['pending', 'confirmed', 'completed', 'cancelled'])
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  // ─── Auto-scroll to relevant position ─────────────────────────────
  useEffect(() => {
    if (!didAutoScroll && !loading && staff.length > 0) {
      setTimeout(() => {
        let scrollToHour;

        if (isToday) {
          // Today: scroll so current time is ~1/3 from top of viewport
          const now = new Date();
          scrollToHour = now.getHours() + now.getMinutes() / 60 - 1;
        } else if (bookings.length > 0) {
          // Other days with bookings: scroll to first booking minus a bit of padding
          const firstTime = bookings[0]?.appointment_time;
          if (firstTime) {
            const [fh, fm] = firstTime.split(':').map(Number);
            scrollToHour = fh + fm / 60 - 0.5;
          }
        }

        // Fallback: scroll to shop opening time minus 1 hour
        if (scrollToHour == null) {
          const openH = shop?.opening_time ? parseInt(shop.opening_time.split(':')[0]) : 8;
          scrollToHour = openH - 1;
        }

        const y = Math.max(0, Math.min((scrollToHour - START_HOUR) * HOUR_HEIGHT + GRID_TOP_PAD, GRID_HEIGHT - 200));
        gridScrollRef.current?.scrollTo({ y, animated: false });
        timeScrollRef.current?.scrollTo({ y, animated: false });
      }, 300);
      setDidAutoScroll(true);
    }
  }, [loading, staff, didAutoScroll, bookings]);

  useEffect(() => {
    setDidAutoScroll(false);
  }, [selectedDateStr]);

  // ─── Group bookings by staff ───────────────────────────────────────
  const bookingsByStaff = useMemo(() => {
    const map = {};
    staff.forEach((s) => { map[s.userId] = []; });
    bookings.forEach((b) => {
      const providerId = b.barber_id || b.provider_id;
      if (providerId && map[providerId]) {
        map[providerId].push(b);
      }
    });
    return map;
  }, [bookings, staff]);

  // ─── Current time position ────────────────────────────────────────
  const currentTimePosition = useMemo(() => {
    if (!isToday) return null;
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    if (h < START_HOUR || h >= END_HOUR) return null;
    return ((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT + GRID_TOP_PAD;
  }, [isToday, currentTime]);

  // ─── Non-working hour overlays ────────────────────────────────────
  const nonWorkingOverlays = useMemo(() => {
    if (!shop) return [];
    const overlays = [];

    const openH = shop.opening_time ? parseInt(shop.opening_time.split(':')[0]) : START_HOUR;
    const openM = shop.opening_time ? parseInt(shop.opening_time.split(':')[1] || '0') : 0;
    const closeH = shop.closing_time ? parseInt(shop.closing_time.split(':')[0]) : END_HOUR;
    const closeM = shop.closing_time ? parseInt(shop.closing_time.split(':')[1] || '0') : 0;

    // Before opening
    if (openH > START_HOUR || (openH === START_HOUR && openM > 0)) {
      const height = ((openH - START_HOUR) * 60 + openM) / 60 * HOUR_HEIGHT;
      overlays.push({ top: GRID_TOP_PAD, height });
    }

    // After closing
    if (closeH < END_HOUR) {
      const top = ((closeH - START_HOUR) * 60 + closeM) / 60 * HOUR_HEIGHT + GRID_TOP_PAD;
      const height = GRID_HEIGHT - top;
      overlays.push({ top, height });
    }

    return overlays;
  }, [shop]);

  // ─── Navigation ───────────────────────────────────────────────────
  const goToPrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };
  const goToNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };
  const goToToday = () => setSelectedDate(new Date());

  const navigateToBooking = (booking) => {
    navigation.navigate('BookingDetailScreen', { bookingId: booking.id });
  };

  // ─── Sync vertical scroll ────────────────────────────────────────
  const onGridScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    timeScrollRef.current?.scrollTo({ y, animated: false });
  };

  // ─── Month header text ────────────────────────────────────────────
  const monthYear = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ─── Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isPushed && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#1A202C" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.screenTitle}>Schedule</Text>
            <Text style={styles.monthYear}>{monthYear}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {!isToday && (
            <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={fetchBookings} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Week Strip ───────────────────────────────────────────── */}
      <View style={styles.weekStrip}>
        <TouchableOpacity onPress={goToPrevWeek} style={styles.weekArrow}>
          <Ionicons name="chevron-back" size={18} color="#8E8E93" />
        </TouchableOpacity>

        {weekDates.map((date, idx) => {
          const dStr = formatDateStr(date);
          const isDateToday = dStr === todayStr();
          const isSelected = dStr === selectedDateStr;

          return (
            <TouchableOpacity
              key={dStr}
              style={styles.weekDay}
              activeOpacity={0.7}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[
                styles.weekDayName,
                isDateToday && styles.weekDayNameToday,
                isSelected && styles.weekDayNameSelected,
              ]}>
                {DAY_NAMES[idx]}
              </Text>
              <View style={[
                styles.weekDayCircle,
                isSelected && styles.weekDayCircleSelected,
                isDateToday && !isSelected && styles.weekDayCircleToday,
              ]}>
                <Text style={[
                  styles.weekDayDate,
                  isSelected && styles.weekDayDateSelected,
                  isDateToday && !isSelected && styles.weekDayDateToday,
                ]}>
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity onPress={goToNextWeek} style={styles.weekArrow}>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* ─── Calendar Grid ────────────────────────────────────────── */}
      <View style={styles.calendarArea}>
        <View style={styles.gridRow}>
          {/* Fixed time column */}
          <View style={styles.timeColumn}>
            <View style={styles.timeColumnCorner} />
            <ScrollView
              ref={timeScrollRef}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ height: GRID_HEIGHT }}
            >
              {TIME_SLOTS.map((slot) => {
                const top = (slot.hour - START_HOUR) * HOUR_HEIGHT + GRID_TOP_PAD;
                return (
                  <View key={slot.hour} style={[styles.timeLabelRow, { top }]}>
                    <Text style={styles.timeLabel}>{slot.label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Scrollable staff grid */}
          <ScrollView
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            contentContainerStyle={{ width: totalGridWidth }}
          >
            <View style={{ width: totalGridWidth }}>
              {/* Staff header row */}
              <View style={styles.staffHeaderRow}>
                {staff.map((s, idx) => (
                  <View
                    key={s.id}
                    style={[
                      styles.staffHeader,
                      { width: staffColWidth },
                      idx < staff.length - 1 && styles.staffHeaderBorder,
                    ]}
                  >
                    {s.image ? (
                      <Image source={{ uri: s.image }} style={styles.staffAvatar} />
                    ) : (
                      <View style={styles.staffAvatarPlaceholder}>
                        <Text style={styles.staffAvatarInitial}>
                          {(s.name || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.staffName} numberOfLines={1}>{s.name}</Text>
                    {shop && shop.opening_time && shop.closing_time && (
                      <Text style={styles.staffHours}>
                        {formatTimeShort(shop.opening_time)} - {formatTimeShort(shop.closing_time)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Booking grid */}
              <ScrollView
                ref={gridScrollRef}
                showsVerticalScrollIndicator={false}
                onScroll={onGridScroll}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                contentContainerStyle={{ height: GRID_HEIGHT }}
              >
                <View style={[styles.gridContent, { width: totalGridWidth, height: GRID_HEIGHT }]}>
                  {/* Hour lines */}
                  {TIME_SLOTS.map((slot) => {
                    const top = (slot.hour - START_HOUR) * HOUR_HEIGHT + GRID_TOP_PAD;
                    return (
                      <View key={slot.hour} style={[styles.hourLine, { top }]} />
                    );
                  })}

                  {/* Half-hour lines */}
                  {TIME_SLOTS.slice(0, -1).map((slot) => {
                    const top = (slot.hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 + GRID_TOP_PAD;
                    return (
                      <View key={`half-${slot.hour}`} style={[styles.halfHourLine, { top }]} />
                    );
                  })}

                  {/* Staff columns */}
                  {staff.map((s, idx) => {
                    const colBookings = bookingsByStaff[s.userId] || [];
                    const left = idx * staffColWidth;

                    return (
                      <View
                        key={s.id}
                        style={[styles.staffColumn, { left, width: staffColWidth }]}
                      >
                        {/* Column divider */}
                        {idx > 0 && <View style={styles.columnDivider} />}

                        {/* Non-working overlays */}
                        {nonWorkingOverlays.map((overlay, oIdx) => (
                          <View
                            key={`nw-${oIdx}`}
                            style={[styles.nonWorkingOverlay, {
                              top: overlay.top,
                              height: overlay.height,
                            }]}
                          >
                            {/* Diagonal stripe pattern */}
                            {Array.from({ length: Math.ceil(overlay.height / 12) }).map((_, i) => (
                              <View
                                key={i}
                                style={[styles.stripeRow, {
                                  top: i * 12,
                                  opacity: i % 2 === 0 ? 0.06 : 0,
                                }]}
                              />
                            ))}
                          </View>
                        ))}

                        {/* Booking blocks */}
                        {colBookings.map((booking) => {
                          if (!booking.appointment_time) return null;
                          const [h, m] = booking.appointment_time.split(':').map(Number);
                          const top = ((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT + GRID_TOP_PAD;
                          const duration = getBookingDuration(booking);
                          const height = Math.max((duration / 60) * HOUR_HEIGHT, 44);
                          const statusColor = STATUS_COLORS[booking.status] || '#999';
                          const bgColor = STATUS_BG[booking.status] || '#F5F5F5';
                          const past = isBookingPast(booking, selectedDateStr);

                          return (
                            <TouchableOpacity
                              key={booking.id}
                              activeOpacity={0.75}
                              onPress={() => navigateToBooking(booking)}
                              style={[
                                styles.bookingBlock,
                                {
                                  top,
                                  height,
                                  backgroundColor: past ? '#F0F0F2' : bgColor,
                                  borderLeftColor: past ? '#C0C0C0' : statusColor,
                                  opacity: past ? 0.5 : 1,
                                },
                              ]}
                            >
                              <Text
                                style={[styles.bookingTime, { color: past ? '#999' : statusColor }]}
                                numberOfLines={1}
                              >
                                {formatTime12(booking.appointment_time)}
                              </Text>
                              <Text style={[styles.bookingCustomer, past && { color: '#888' }]} numberOfLines={1}>
                                {booking.customer?.name || 'Customer'}
                              </Text>
                              {height > 54 && (
                                <Text style={[styles.bookingService, past && { color: '#AAA' }]} numberOfLines={1}>
                                  {getServiceNames(booking)}
                                </Text>
                              )}
                              <View
                                style={[styles.bookingStatusDot, { backgroundColor: past ? '#C0C0C0' : statusColor }]}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}

                  {/* Current time indicator */}
                  {currentTimePosition !== null && (
                    <View style={[styles.currentTimeRow, { top: currentTimePosition }]} pointerEvents="none">
                      <View style={styles.currentTimeLabel}>
                        <Text style={styles.currentTimeLabelText}>
                          {currentTime.getHours() % 12 || 12}:{String(currentTime.getMinutes()).padStart(2, '0')} {currentTime.getHours() >= 12 ? 'PM' : 'AM'}
                        </Text>
                      </View>
                      <View style={styles.currentTimeDot} />
                      <View style={styles.currentTimeLine} />
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* ─── Booking count footer ─────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} on{' '}
          {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
    paddingBottom: 8,
    backgroundColor: '#F8F9FC',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A202C',
    letterSpacing: -0.3,
  },
  monthYear: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Week Strip ─────────────────────────────────────────────────────
  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  weekArrow: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B0B8C1',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  weekDayNameToday: {
    color: '#4A90E2',
  },
  weekDayNameSelected: {
    color: '#4A90E2',
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayCircleSelected: {
    backgroundColor: '#4A90E2',
  },
  weekDayCircleToday: {
    backgroundColor: '#EBF5FF',
  },
  weekDayDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  weekDayDateSelected: {
    color: '#FFFFFF',
  },
  weekDayDateToday: {
    color: '#4A90E2',
  },

  // ─── Calendar Area ──────────────────────────────────────────────────
  calendarArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },

  // ─── Time Column ────────────────────────────────────────────────────
  timeColumn: {
    width: TIME_COL_WIDTH,
    backgroundColor: '#FAFBFD',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E8ECF0',
  },
  timeColumnCorner: {
    height: STAFF_HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8ECF0',
  },
  timeLabelRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: -7,
  },

  // ─── Staff Headers ──────────────────────────────────────────────────
  staffHeaderRow: {
    flexDirection: 'row',
    height: STAFF_HEADER_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8ECF0',
    backgroundColor: '#FAFBFD',
  },
  staffHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  staffHeaderBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E8ECF0',
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  staffAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8ECF0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  staffAvatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A90E2',
  },
  staffName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 120,
  },
  staffHours: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 1,
  },

  // ─── Grid Content ──────────────────────────────────────────────────
  gridContent: {
    position: 'relative',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8ECF0',
  },
  halfHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F2F3F5',
  },

  // ─── Staff Columns ─────────────────────────────────────────────────
  staffColumn: {
    position: 'absolute',
    top: 0,
    height: GRID_HEIGHT,
  },
  columnDivider: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E8ECF0',
  },

  // ─── Non-working Overlay ───────────────────────────────────────────
  nonWorkingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#F5F6F8',
    overflow: 'hidden',
  },
  stripeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#E0E2E6',
  },

  // ─── Booking Block ─────────────────────────────────────────────────
  bookingBlock: {
    position: 'absolute',
    left: 6,
    right: 6,
    borderRadius: 8,
    borderLeftWidth: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  bookingTime: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bookingCustomer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 1,
  },
  bookingService: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 1,
  },
  bookingStatusDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ─── Current Time ──────────────────────────────────────────────────
  currentTimeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  currentTimeLabel: {
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 2,
  },
  currentTimeLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  currentTimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  currentTimeLine: {
    flex: 1,
    height: 2.5,
    backgroundColor: '#FF3B30',
  },

  // ─── Footer ────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default CalendarScreen;
