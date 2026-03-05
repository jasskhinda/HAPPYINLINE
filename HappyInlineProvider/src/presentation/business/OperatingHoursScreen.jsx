import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getProviderShop } from '../../lib/providerAuth';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Generate time options in 30-min increments
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    TIME_OPTIONS.push(val);
  }
}
TIME_OPTIONS.push('23:59');

const to12h = (time24) => {
  if (!time24) return '';
  if (time24 === '23:59') return '11:59 PM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
};

const OperatingHoursScreen = () => {
  const navigation = useNavigation();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDay, setPickerDay] = useState(null);
  const [pickerField, setPickerField] = useState(null); // 'open' or 'close'

  useEffect(() => { init(); }, []);

  const init = async () => {
    const result = await getProviderShop();
    if (result.success) {
      setShop(result.shop);
      setHours(result.shop.operating_hours || getDefaultHours());
    }
    setLoading(false);
  };

  const getDefaultHours = () => {
    const h = {};
    DAYS.forEach(day => { h[day] = { open: '09:00', close: '17:00', closed: false }; });
    return h;
  };

  const toggleDay = (day) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day]?.closed },
    }));
  };

  const openTimePicker = (day, field) => {
    setPickerDay(day);
    setPickerField(field);
    setPickerVisible(true);
  };

  const selectTime = (time) => {
    setHours(prev => ({
      ...prev,
      [pickerDay]: { ...prev[pickerDay], [pickerField]: time },
    }));
    setPickerVisible(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Derive legacy fields from operating_hours for backward compatibility
      const openDays = DAYS.filter(day => !hours[day]?.closed);
      const operatingDays = openDays.map(d => d.toLowerCase());

      // Find earliest open and latest close across all open days
      let earliestOpen = '23:59';
      let latestClose = '00:00';
      openDays.forEach(day => {
        const d = hours[day];
        if (d?.open && d.open < earliestOpen) earliestOpen = d.open;
        if (d?.close && d.close > latestClose) latestClose = d.close;
      });

      const updateData = {
        operating_hours: hours,
        operating_days: operatingDays,
        opening_time: openDays.length > 0 ? earliestOpen : null,
        closing_time: openDays.length > 0 ? latestClose : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shop.id);
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Operating hours updated' });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save hours' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Operating Hours</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {DAYS.map(day => {
          const dayData = hours[day] || { open: '09:00', close: '17:00', closed: false };
          return (
            <View key={day} style={styles.dayRow}>
              <TouchableOpacity style={styles.dayToggle} onPress={() => toggleDay(day)}>
                <Ionicons name={dayData.closed ? 'square-outline' : 'checkbox'} size={24} color={dayData.closed ? '#CCC' : '#4A90E2'} />
                <Text style={[styles.dayName, dayData.closed && styles.closedDayName]}>{day}</Text>
              </TouchableOpacity>
              {!dayData.closed ? (
                <View style={styles.timeRow}>
                  <TouchableOpacity style={styles.timePill} onPress={() => openTimePicker(day, 'open')}>
                    <Text style={styles.timeText}>{to12h(dayData.open)}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeSeparator}>-</Text>
                  <TouchableOpacity style={styles.timePill} onPress={() => openTimePicker(day, 'close')}>
                    <Text style={styles.timeText}>{to12h(dayData.close)}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.closedText}>Closed</Text>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Hours</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>
              {pickerDay} — {pickerField === 'open' ? 'Opening' : 'Closing'} Time
            </Text>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {TIME_OPTIONS.map(time => {
                const currentVal = pickerDay && pickerField ? hours[pickerDay]?.[pickerField] : null;
                const isSelected = time === currentVal;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => selectTime(time)}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                      {to12h(time)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  dayRow: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dayName: { fontSize: 16, fontWeight: '600', color: '#000' },
  closedDayName: { color: '#999' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timePill: { backgroundColor: '#EBF5FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  timeText: { fontSize: 13, color: '#4A90E2', fontWeight: '600' },
  timeSeparator: { fontSize: 14, color: '#999', fontWeight: '600' },
  closedText: { fontSize: 14, color: '#999' },
  saveButton: { backgroundColor: '#4A90E2', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  saveButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },

  // Time Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%', padding: 20 },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 16, textAlign: 'center' },
  pickerScroll: { maxHeight: 300 },
  pickerOption: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 2 },
  pickerOptionSelected: { backgroundColor: '#EBF5FF' },
  pickerOptionText: { fontSize: 16, color: '#333', textAlign: 'center' },
  pickerOptionTextSelected: { color: '#4A90E2', fontWeight: '700' },
});

export default OperatingHoursScreen;
