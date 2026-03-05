import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DAYS_MAP = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

/**
 * Component to display shop status and operating hours
 * @param {Array} operatingDays - Array of day IDs (e.g. ['monday', 'tuesday'])
 * @param {string} openingTime - Opening time (e.g. '09:00:00' or '09:00 AM')
 * @param {string} closingTime - Closing time (e.g. '18:00:00' or '06:00 PM')
 * @param {boolean} isManuallyClosed - Whether shop is manually closed
 * @param {boolean} isCurrentlyOpen - Whether shop is currently open (calculated)
 * @param {boolean} compact - Show compact version (for lists)
 */
const ShopStatusBadge = ({
  operatingDays = [],
  openingTime,
  closingTime,
  isManuallyClosed = false,
  isCurrentlyOpen = false,
  compact = false,
}) => {
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // If already formatted (contains AM/PM)
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Parse HH:MM:SS format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getOperatingDaysText = () => {
    if (operatingDays.length === 0) return 'No days set';
    if (operatingDays.length === 7) return 'All week';
    
    // Show first and last day
    const sortedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      .filter(day => operatingDays.includes(day));
    
    if (sortedDays.length === 1) {
      return DAYS_MAP[sortedDays[0]];
    }
    
    const first = DAYS_MAP[sortedDays[0]];
    const last = DAYS_MAP[sortedDays[sortedDays.length - 1]];
    
    return `${first} - ${last}`;
  };

  const getStatusInfo = () => {
    if (isManuallyClosed) {
      return {
        text: 'Closed',
        color: '#FF4444',
        icon: 'close-circle',
        bgColor: '#FFE5E5',
      };
    }
    
    if (isCurrentlyOpen) {
      return {
        text: 'Open Now',
        color: '#4CAF50',
        icon: 'checkmark-circle',
        bgColor: '#E8F5E9',
      };
    }
    
    return {
      text: 'Closed',
      color: '#FF9800',
      icon: 'time',
      bgColor: '#FFF3E0',
    };
  };

  const status = getStatusInfo();

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactStatusBadge, { backgroundColor: status.bgColor }]}>
          <Ionicons name={status.icon} size={12} color={status.color} />
          <Text style={[styles.compactStatusText, { color: status.color }]}>
            {status.text}
          </Text>
        </View>
        <Text style={styles.compactHoursText}>
          {formatTime(openingTime)} - {formatTime(closingTime)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
        <Ionicons name={status.icon} size={20} color={status.color} />
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.text}
        </Text>
      </View>

      {/* Operating Hours */}
      <View style={styles.hoursContainer}>
        <View style={styles.hoursRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.hoursText}>
            {formatTime(openingTime)} - {formatTime(closingTime)}
          </Text>
        </View>
        
        <View style={styles.daysRow}>
          <Ionicons name="calendar-outline" size={18} color="#666" />
          <Text style={styles.daysText}>
            {getOperatingDaysText()}
          </Text>
        </View>
      </View>

      {/* Manual Close Warning */}
      {isManuallyClosed && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color="#FF9800" />
          <Text style={styles.warningText}>
            Temporarily closed by shop
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full Version
  container: {
    marginVertical: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  hoursContainer: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#F57C00',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  
  // Compact Version
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  compactHoursText: {
    fontSize: 12,
    color: '#666',
  },
});

export default ShopStatusBadge;
