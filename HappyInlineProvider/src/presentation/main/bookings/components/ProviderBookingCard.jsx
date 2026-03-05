import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS = {
  pending: '#FF9500',
  confirmed: '#34C759',
  completed: '#4A90E2',
  cancelled: '#FF3B30',
  no_show: '#8E8E93',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch {
    return timeString;
  }
};

const MAX_VISIBLE_SERVICES = 2;

const ProviderBookingCard = ({ booking, onPress, onConfirm, onCancel, onComplete }) => {
  const statusColor = STATUS_COLORS[booking.status] || '#666';
  const customer = booking.customer;

  // Parse services - handle JSON string or array
  let services = [];
  try {
    if (typeof booking.services === 'string') {
      services = JSON.parse(booking.services);
    } else if (Array.isArray(booking.services)) {
      services = booking.services;
    }
  } catch {
    services = [];
  }

  const visibleServices = services.slice(0, MAX_VISIBLE_SERVICES);
  const remainingCount = services.length - MAX_VISIBLE_SERVICES;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Colored left accent border */}
      <View style={[styles.leftAccent, { backgroundColor: statusColor }]} />

      <View style={styles.cardContent}>
        {/* Top row: customer info + status badge */}
        <View style={styles.topRow}>
          <View style={styles.customerInfo}>
            {customer?.profile_image ? (
              <Image
                source={{ uri: customer.profile_image }}
                style={[styles.avatar, { borderColor: statusColor + '4D' }]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { borderColor: statusColor + '4D' }]}>
                <Ionicons name="person" size={22} color="#999" />
              </View>
            )}
            <View style={styles.nameContainer}>
              <Text style={styles.customerName} numberOfLines={1}>
                {customer?.name || 'Customer'}
              </Text>
              <View style={styles.dateTimeRow}>
                <Ionicons name="calendar-outline" size={12} color="#888" />
                <Text style={styles.dateTimeText}>
                  {formatDate(booking.appointment_date)}
                </Text>
                <Ionicons name="time-outline" size={12} color="#888" style={styles.timeIcon} />
                <Text style={styles.dateTimeText}>
                  {formatTime(booking.appointment_time)}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[booking.status] || booking.status}
            </Text>
          </View>
        </View>

        {/* Service pills */}
        {services.length > 0 && (
          <View style={styles.servicesRow}>
            {visibleServices.map((service, index) => (
              <View key={index} style={styles.servicePill}>
                <Text style={styles.servicePillText} numberOfLines={1}>
                  {service.name || service}
                </Text>
              </View>
            ))}
            {remainingCount > 0 && (
              <View style={styles.moreServicesPill}>
                <Text style={styles.moreServicesText}>+{remainingCount} more</Text>
              </View>
            )}
          </View>
        )}

        {/* Amount */}
        {booking.total_amount > 0 && (
          <View style={styles.amountRow}>
            <View style={styles.amountBadge}>
              <Ionicons name="cash-outline" size={14} color="#2E7D32" />
              <Text style={styles.amountText}>${booking.total_amount?.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {booking.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        {booking.status === 'confirmed' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={onComplete}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  leftAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 18,
  },

  // --- Top Row ---
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F7',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
  },
  timeIcon: {
    marginLeft: 10,
  },

  // --- Status Badge ---
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // --- Service Pills ---
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  servicePill: {
    backgroundColor: '#F0F1F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '45%',
  },
  servicePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  moreServicesPill: {
    backgroundColor: '#E8E9ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  moreServicesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
  },

  // --- Amount ---
  amountRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
  },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E7D32',
  },

  // --- Action Buttons ---
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  confirmBtn: {
    backgroundColor: '#34C759',
  },
  cancelBtn: {
    backgroundColor: '#FF3B30',
  },
  completeBtn: {
    backgroundColor: '#4A90E2',
  },
});

export default ProviderBookingCard;
