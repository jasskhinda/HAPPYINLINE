import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

/**
 * Component for selecting operating days and hours
 * @param {Array} selectedDays - Array of day IDs (e.g. ['monday', 'tuesday'])
 * @param {Function} onDaysChange - Callback when days selection changes
 * @param {Date} openingTime - Opening time as Date object
 * @param {Date} closingTime - Closing time as Date object
 * @param {Function} onOpeningTimeChange - Callback when opening time changes
 * @param {Function} onClosingTimeChange - Callback when closing time changes
 */
const OperatingHoursSelector = ({
  selectedDays = [],
  onDaysChange,
  openingTime,
  closingTime,
  onOpeningTimeChange,
  onClosingTimeChange,
}) => {
  const [showOpeningPicker, setShowOpeningPicker] = useState(false);
  const [showClosingPicker, setShowClosingPicker] = useState(false);
  const [tempOpeningTime, setTempOpeningTime] = useState(null);
  const [tempClosingTime, setTempClosingTime] = useState(null);

  const toggleDay = (dayId) => {
    const isSelected = selectedDays.includes(dayId);
    let newDays;
    
    if (isSelected) {
      newDays = selectedDays.filter(d => d !== dayId);
    } else {
      newDays = [...selectedDays, dayId];
    }
    
    onDaysChange(newDays);
  };

  const formatTime = (date) => {
    if (!date) return '09:00 AM';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleOpeningTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowOpeningPicker(false);
      if (event.type === 'set' && selectedDate) {
        onOpeningTimeChange(selectedDate);
      }
    } else {
      // iOS - update temp value
      if (selectedDate) {
        setTempOpeningTime(selectedDate);
      }
    }
  };

  const handleClosingTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowClosingPicker(false);
      if (event.type === 'set' && selectedDate) {
        onClosingTimeChange(selectedDate);
      }
    } else {
      // iOS - update temp value
      if (selectedDate) {
        setTempClosingTime(selectedDate);
      }
    }
  };

  const confirmOpeningTime = () => {
    if (tempOpeningTime) {
      onOpeningTimeChange(tempOpeningTime);
    }
    setShowOpeningPicker(false);
    setTempOpeningTime(null);
  };

  const cancelOpeningTime = () => {
    setShowOpeningPicker(false);
    setTempOpeningTime(null);
  };

  const confirmClosingTime = () => {
    if (tempClosingTime) {
      onClosingTimeChange(tempClosingTime);
    }
    setShowClosingPicker(false);
    setTempClosingTime(null);
  };

  const cancelClosingTime = () => {
    setShowClosingPicker(false);
    setTempClosingTime(null);
  };

  const openOpeningTimePicker = () => {
    setTempOpeningTime(openingTime || new Date());
    setShowOpeningPicker(true);
  };

  const openClosingTimePicker = () => {
    setTempClosingTime(closingTime || new Date());
    setShowClosingPicker(true);
  };

  return (
    <View style={styles.container}>
      {/* Days Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating Days *</Text>
        <Text style={styles.sectionSubtitle}>Select the days your shop is open</Text>
        
        <View style={styles.daysContainer}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDays.includes(day.id);
            return (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                ]}
                onPress={() => toggleDay(day.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayButtonText,
                  isSelected && styles.dayButtonTextSelected,
                ]}>
                  {day.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {selectedDays.length === 0 && (
          <Text style={styles.errorText}>Please select at least one day</Text>
        )}
      </View>

      {/* Time Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating Hours *</Text>
        <Text style={styles.sectionSubtitle}>Set opening and closing time (same for all selected days)</Text>
        
        <View style={styles.timeContainer}>
          {/* Opening Time */}
          <View style={styles.timeInputWrapper}>
            <Text style={styles.timeLabel}>Opening Time</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={openOpeningTimePicker}
            >
              <Ionicons name="time-outline" size={20} color="#FF6B35" />
              <Text style={styles.timeText}>{formatTime(openingTime)}</Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Arrow */}
          <Ionicons name="arrow-forward" size={20} color="#999" style={styles.arrowIcon} />

          {/* Closing Time */}
          <View style={styles.timeInputWrapper}>
            <Text style={styles.timeLabel}>Closing Time</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={openClosingTimePicker}
            >
              <Ionicons name="time-outline" size={20} color="#FF6B35" />
              <Text style={styles.timeText}>{formatTime(closingTime)}</Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Opening Time Picker Modal */}
      {showOpeningPicker && Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showOpeningPicker}
          onRequestClose={cancelOpeningTime}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Opening Time</Text>
              </View>
              
              <DateTimePicker
                value={tempOpeningTime || openingTime || new Date()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleOpeningTimeChange}
                textColor="#333"
                style={styles.picker}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={cancelOpeningTime}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmOpeningTime}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Closing Time Picker Modal */}
      {showClosingPicker && Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showClosingPicker}
          onRequestClose={cancelClosingTime}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Closing Time</Text>
              </View>
              
              <DateTimePicker
                value={tempClosingTime || closingTime || new Date()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleClosingTimeChange}
                textColor="#333"
                style={styles.picker}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={cancelClosingTime}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmClosingTime}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android Time Pickers */}
      {showOpeningPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={openingTime || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleOpeningTimeChange}
        />
      )}

      {showClosingPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={closingTime || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleClosingTimeChange}
        />
      )}

      {/* Summary */}
      {selectedDays.length > 0 && openingTime && closingTime && (
        <View style={styles.summaryContainer}>
          <Ionicons name="information-circle" size={20} color="#4CAF50" />
          <Text style={styles.summaryText}>
            Open {selectedDays.length} day{selectedDays.length > 1 ? 's' : ''} a week, {formatTime(openingTime)} - {formatTime(closingTime)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#FFF5F0',
    borderColor: '#FF6B35',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextSelected: {
    color: '#FF6B35',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  arrowIcon: {
    marginHorizontal: 10,
    marginTop: 20,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F4',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginTop: 10,
  },
  summaryText: {
    fontSize: 13,
    color: '#2E7D32',
    marginLeft: 10,
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  picker: {
    width: '100%',
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: 'transparent',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
});

export default OperatingHoursSelector;
