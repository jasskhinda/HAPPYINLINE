import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';
import Toast from 'react-native-toast-message';

const STATUS_COLORS = {
  pending: '#FF9500',
  confirmed: '#34C759',
  completed: '#4A90E2',
  cancelled: '#FF3B30',
  no_show: '#8E8E93',
};

const STATUS_GRADIENTS = {
  pending: ['#FF9500', '#F57C00'],
  confirmed: ['#34C759', '#2DA44E'],
  completed: ['#4A90E2', '#3B7DD8'],
  cancelled: ['#FF3B30', '#D32F2F'],
  no_show: ['#8E8E93', '#6D6D72'],
};

const STATUS_ICONS = {
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  completed: 'trophy-outline',
  cancelled: 'close-circle-outline',
  no_show: 'eye-off-outline',
};

const ACTION_GRADIENTS = {
  confirm: ['#34C759', '#2DA44E'],
  complete: ['#4A90E2', '#3B7DD8'],
  reschedule: ['#FF9500', '#F57C00'],
  cancel: ['#FF3B30', '#D32F2F'],
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch {
    return timeString;
  }
};

const BookingDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId } = route.params || {};
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBooking();
    }, [bookingId])
  );

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          shop:shops!bookings_shop_id_fkey(id, name, address, phone, logo_url),
          customer:profiles!bookings_customer_id_fkey(id, name, email, phone, profile_image),
          barber:profiles!bookings_barber_id_fkey(id, name, profile_image)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load booking details' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const statusLabel = newStatus === 'confirmed' ? 'confirm' : newStatus === 'completed' ? 'complete' : 'cancel';

    Alert.alert(
      `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} Booking`,
      `Are you sure you want to ${statusLabel} this booking?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setUpdating(true);
            try {
              const { error } = await supabase
                .from('bookings')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', bookingId);

              if (error) throw error;

              setBooking(prev => ({ ...prev, status: newStatus }));
              Toast.show({ type: 'success', text1: 'Updated', text2: `Booking ${newStatus}` });
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update booking' });
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleReschedule = () => {
    navigation.navigate('RescheduleBookingScreen', { booking });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || '#666';
  const statusGradient = STATUS_GRADIENTS[booking.status] || ['#666', '#555'];
  const statusIcon = STATUS_ICONS[booking.status] || 'help-circle-outline';

  let services = [];
  if (booking.services) {
    try {
      services = typeof booking.services === 'string' ? JSON.parse(booking.services) : booking.services;
    } catch {
      services = [];
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Banner */}
        <View style={styles.statusBannerWrapper}>
          <LinearGradient
            colors={statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusBanner}
          >
            <View style={styles.statusBannerIconCircle}>
              <Ionicons name={statusIcon} size={22} color="#FFF" />
            </View>
            <View style={styles.statusBannerTextContainer}>
              <Text style={styles.statusBannerLabel}>
                {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
              </Text>
              {booking.appointment_date && (
                <Text style={styles.statusBannerDate}>
                  {formatDate(booking.appointment_date)}
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleIconCircle}>
              <Ionicons name="person" size={16} color="#4A90E2" />
            </View>
            <Text style={styles.cardTitle}>Customer</Text>
          </View>
          <View style={styles.customerRow}>
            {booking.customer?.profile_image ? (
              <View style={[styles.avatarRing, { borderColor: statusColor }]}>
                <Image source={{ uri: booking.customer.profile_image }} style={styles.avatar} />
              </View>
            ) : (
              <View style={[styles.avatarRing, { borderColor: statusColor }]}>
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={30} color="#999" />
                </View>
              </View>
            )}
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{booking.customer?.name || 'Customer'}</Text>
              {booking.customer?.email && (
                <View style={styles.customerContactRow}>
                  <Ionicons name="mail-outline" size={14} color="#8E8E93" />
                  <Text style={styles.customerContact}>{booking.customer.email}</Text>
                </View>
              )}
              {booking.customer?.phone && (
                <View style={styles.customerContactRow}>
                  <Ionicons name="call-outline" size={14} color="#8E8E93" />
                  <Text style={styles.customerContact}>{booking.customer.phone}</Text>
                </View>
              )}
            </View>
          </View>
          {booking.customer?.phone && (
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`tel:${booking.customer.phone}`)}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="call" size={16} color="#34C759" />
                </View>
                <Text style={[styles.contactBtnText, { color: '#34C759' }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => navigation.navigate('ChatConversationScreen', {
                  recipientId: booking.customer.id,
                  recipientName: booking.customer.name,
                  shopId: booking.shop?.id,
                })}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="chatbubble" size={16} color="#4A90E2" />
                </View>
                <Text style={[styles.contactBtnText, { color: '#4A90E2' }]}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Appointment Info */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitleIconCircle}>
              <Ionicons name="calendar" size={16} color="#4A90E2" />
            </View>
            <Text style={styles.cardTitle}>Appointment</Text>
          </View>

          <View style={styles.appointmentInfoBlock}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="calendar-outline" size={18} color="#4A90E2" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(booking.appointment_date)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="time-outline" size={18} color="#4A90E2" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{formatTime(booking.appointment_time)}</Text>
              </View>
            </View>

            {booking.barber && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconCircle}>
                  <Ionicons name="person-outline" size={18} color="#4A90E2" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Provider</Text>
                  <Text style={styles.infoValue}>{booking.barber.name}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Services List */}
          {services.length > 0 && (
            <View style={styles.servicesSection}>
              <View style={styles.servicesDivider} />
              <Text style={styles.servicesHeading}>Services</Text>
              {services.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <View style={styles.serviceItemLeft}>
                    <View style={styles.serviceDot} />
                    <Text style={styles.serviceName}>{service.name}</Text>
                  </View>
                  {service.price != null && (
                    <Text style={styles.servicePrice}>${Number(service.price).toFixed(2)}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Total Amount */}
          {booking.total_amount > 0 && (
            <View style={styles.totalSection}>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>${booking.total_amount?.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Customer Notes */}
        {booking.customer_notes && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleIconCircle}>
                <Ionicons name="document-text" size={16} color="#4A90E2" />
              </View>
              <Text style={styles.cardTitle}>Customer Notes</Text>
            </View>
            <Text style={styles.notesText}>{booking.customer_notes}</Text>
          </View>
        )}

        {/* Actions */}
        {updating ? (
          <View style={styles.actionsContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            {booking.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={styles.actionButtonWrapper}
                  onPress={() => handleStatusChange('confirmed')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={ACTION_GRADIENTS.confirm}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text style={styles.actionButtonText}>Confirm Booking</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButtonWrapper}
                  onPress={handleReschedule}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={ACTION_GRADIENTS.reschedule}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="calendar-outline" size={22} color="#FFF" />
                    <Text style={styles.actionButtonText}>Reschedule</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButtonWrapper}
                  onPress={() => handleStatusChange('cancelled')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={ACTION_GRADIENTS.cancel}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="close-circle" size={22} color="#FFF" />
                    <Text style={styles.actionButtonText}>Decline Booking</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
            {booking.status === 'confirmed' && (
              <>
                <TouchableOpacity
                  style={styles.actionButtonWrapper}
                  onPress={() => handleStatusChange('completed')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={ACTION_GRADIENTS.complete}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="checkmark-done-circle" size={22} color="#FFF" />
                    <Text style={styles.actionButtonText}>Mark Complete</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButtonWrapper}
                  onPress={handleReschedule}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={ACTION_GRADIENTS.reschedule}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="calendar-outline" size={22} color="#FFF" />
                    <Text style={styles.actionButtonText}>Reschedule</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButtonWrapper}
                  onPress={() => handleStatusChange('cancelled')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={ACTION_GRADIENTS.cancel}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Ionicons name="close-circle" size={22} color="#FFF" />
                    <Text style={styles.actionButtonText}>Cancel Booking</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
  errorText: {
    fontSize: 16,
    color: '#999',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
      android: {
        elevation: 3,
      },
    }),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.3,
  },

  // Status Banner
  statusBannerWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  statusBannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusBannerTextContainer: {
    flex: 1,
  },
  statusBannerLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  statusBannerDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTitleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.2,
  },

  // Customer
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  customerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  customerContact: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FAFBFE',
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Appointment Info
  appointmentInfoBlock: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },

  // Services
  servicesSection: {
    marginTop: 8,
  },
  servicesDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginVertical: 16,
  },
  servicesHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  serviceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
    marginRight: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginLeft: 12,
  },

  // Total
  totalSection: {
    marginTop: 4,
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginVertical: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
  },

  // Notes
  notesText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 23,
    fontWeight: '400',
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
    gap: 12,
  },
  actionButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
});

export default BookingDetailScreen;
