import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const CATEGORY_OPTIONS = [
  'General', 'Haircuts', 'Coloring', 'Styling', 'Treatments',
  'Skin Care', 'Nails', 'Massage', 'Wellness', 'Consultation', 'Other',
];

const SERVICE_TYPES = [
  { key: 'in_person', label: 'In-Person', icon: 'location-outline' },
  { key: 'online', label: 'Online', icon: 'videocam-outline' },
  { key: 'both', label: 'Both', icon: 'globe-outline' },
];

const DEFAULT_FORM = {
  name: '',
  description: '',
  duration: 30,
  price: '',
  category: 'General',
  service_type: 'in_person',
  online_meeting_link: '',
  online_meeting_password: '',
  online_instructions: '',
};

const AddCustomServiceModal = ({ visible, onClose, onSave, service, loading }) => {
  const isEditing = !!service;
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    if (visible) {
      if (service) {
        setFormData({
          name: service.name || '',
          description: service.description || '',
          duration: service.duration || 30,
          price: service.price ? String(service.price) : service.custom_price ? String(service.custom_price) : '',
          category: service.category || 'General',
          service_type: service.service_type || 'in_person',
          online_meeting_link: service.online_meeting_link || '',
          online_meeting_password: service.online_meeting_password || '',
          online_instructions: service.online_instructions || '',
        });
      } else {
        setFormData(DEFAULT_FORM);
      }
      setErrors({});
      setShowCategories(false);
    }
  }, [visible, service]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Service name is required';
    if (formData.price && (isNaN(formData.price) || parseFloat(formData.price) < 0)) {
      e.price = 'Price must be a valid number';
    }
    const showOnline = formData.service_type === 'online' || formData.service_type === 'both';
    if (showOnline && !formData.online_meeting_link.trim()) {
      e.online_meeting_link = 'Meeting link is required for online services';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: formData.price ? parseFloat(formData.price) : 0,
      online_meeting_link: formData.online_meeting_link.trim() || null,
      online_meeting_password: formData.online_meeting_password.trim() || null,
      online_instructions: formData.online_instructions.trim() || null,
    });
  };

  const handleClose = () => {
    setFormData(DEFAULT_FORM);
    setErrors({});
    onClose();
  };

  const showOnlineFields = formData.service_type === 'online' || formData.service_type === 'both';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{isEditing ? 'Edit Service' : 'Add Service'}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="e.g., Haircut, Massage, Consultation"
                  value={formData.name}
                  onChangeText={v => updateField('name', v)}
                  placeholderTextColor="#999"
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description of the service..."
                  value={formData.description}
                  onChangeText={v => updateField('description', v)}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Duration */}
              <View style={styles.field}>
                <Text style={styles.label}>Duration (minutes)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                  <View style={styles.pillRow}>
                    {DURATION_OPTIONS.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.pill, formData.duration === d && styles.pillActive]}
                        onPress={() => updateField('duration', d)}
                      >
                        <Text style={[styles.pillText, formData.duration === d && styles.pillTextActive]}>
                          {d} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Price */}
              <View style={styles.field}>
                <Text style={styles.label}>Price ($)</Text>
                <View style={[styles.priceRow, errors.price && styles.inputError]}>
                  <Text style={styles.currencySign}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    value={formData.price}
                    onChangeText={v => {
                      const cleaned = v.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      updateField('price', parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned);
                    }}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#999"
                  />
                </View>
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
              </View>

              {/* Category */}
              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowCategories(!showCategories)}
                >
                  <Text style={styles.dropdownText}>{formData.category}</Text>
                  <Ionicons name={showCategories ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                </TouchableOpacity>
                {showCategories && (
                  <View style={styles.dropdownList}>
                    {CATEGORY_OPTIONS.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.dropdownItem, formData.category === cat && styles.dropdownItemActive]}
                        onPress={() => { updateField('category', cat); setShowCategories(false); }}
                      >
                        <Text style={[styles.dropdownItemText, formData.category === cat && styles.dropdownItemTextActive]}>
                          {cat}
                        </Text>
                        {formData.category === cat && <Ionicons name="checkmark" size={18} color="#4A90E2" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Service Type */}
              <View style={styles.field}>
                <Text style={styles.label}>Service Type</Text>
                <View style={styles.typeRow}>
                  {SERVICE_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.typeBtn, formData.service_type === t.key && styles.typeBtnActive]}
                      onPress={() => updateField('service_type', t.key)}
                    >
                      <Ionicons
                        name={t.icon}
                        size={18}
                        color={formData.service_type === t.key ? '#FFF' : '#666'}
                      />
                      <Text style={[styles.typeBtnText, formData.service_type === t.key && styles.typeBtnTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Online Meeting Fields */}
              {showOnlineFields && (
                <View style={styles.onlineSection}>
                  <View style={styles.onlineHeader}>
                    <Ionicons name="videocam" size={18} color="#4A90E2" />
                    <Text style={styles.onlineSectionTitle}>Online Meeting Details</Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Meeting Link *</Text>
                    <TextInput
                      style={[styles.input, errors.online_meeting_link && styles.inputError]}
                      placeholder="https://zoom.us/j/..."
                      value={formData.online_meeting_link}
                      onChangeText={v => updateField('online_meeting_link', v)}
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                    {errors.online_meeting_link && <Text style={styles.errorText}>{errors.online_meeting_link}</Text>}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Meeting Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Optional password"
                      value={formData.online_meeting_password}
                      onChangeText={v => updateField('online_meeting_password', v)}
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Instructions for Customer</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="e.g., Please join 5 minutes early..."
                      value={formData.online_instructions}
                      onChangeText={v => updateField('online_instructions', v)}
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Ionicons name={isEditing ? 'checkmark-circle' : 'add-circle'} size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>
                  {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Service'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A202C' },
  closeBtn: { padding: 4 },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 13 },
  inputError: { borderColor: '#FF3B30' },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 4, marginLeft: 4 },
  pillScroll: { marginTop: 2 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0',
  },
  pillActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  pillText: { fontSize: 14, fontWeight: '600', color: '#666' },
  pillTextActive: { color: '#FFF' },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: '#E0E0E0', borderRadius: 12, backgroundColor: '#FAFAFA', paddingLeft: 16,
  },
  currencySign: { fontSize: 17, fontWeight: '600', color: '#333', marginRight: 6 },
  priceInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 13, fontSize: 15, color: '#333' },
  dropdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#FAFAFA',
  },
  dropdownText: { fontSize: 15, color: '#333' },
  dropdownList: {
    marginTop: 8, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    backgroundColor: '#FFF', overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  dropdownItemActive: { backgroundColor: '#F0F7FF' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemTextActive: { color: '#4A90E2', fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0',
  },
  typeBtnActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  typeBtnTextActive: { color: '#FFF' },
  onlineSection: {
    backgroundColor: '#F8FAFF', borderRadius: 16, padding: 16, marginBottom: 4,
    borderWidth: 1, borderColor: '#E8F0FE',
  },
  onlineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  onlineSectionTitle: { fontSize: 15, fontWeight: '700', color: '#4A90E2' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  saveBtn: {
    backgroundColor: '#4A90E2', flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 16, borderRadius: 14, gap: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default AddCustomServiceModal;
