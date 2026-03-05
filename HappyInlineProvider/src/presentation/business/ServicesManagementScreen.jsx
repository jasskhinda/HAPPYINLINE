import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getProviderShop } from '../../lib/providerAuth';
import { updateShopService, removeServiceFromShop } from '../../lib/shopAuth';
import { supabase } from '../../lib/supabase';
import AddCustomServiceModal from '../../components/shop/AddCustomServiceModal';
import Toast from 'react-native-toast-message';

const TYPE_CONFIG = {
  in_person: { label: 'In-Person', color: '#34C759', bg: '#E8FAF0', icon: 'location-outline' },
  online: { label: 'Online', color: '#AF52DE', bg: '#F5EEFA', icon: 'videocam-outline' },
  both: { label: 'Both', color: '#007AFF', bg: '#E8F0FE', icon: 'globe-outline' },
};

const ServicesManagementScreen = () => {
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const result = await getProviderShop();
    if (result.success) {
      setShopId(result.shop.id);
      await fetchServices(result.shop.id);
    }
    setLoading(false);
  };

  const fetchServices = async (sid) => {
    const id = sid || shopId;
    if (!id) return;
    const { data, error } = await supabase
      .from('shop_services')
      .select('*')
      .eq('shop_id', id)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (!error) setServices(data || []);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editingService) {
        const { error } = await supabase
          .from('shop_services')
          .update({
            name: formData.name,
            description: formData.description,
            duration: formData.duration,
            price: formData.price,
            category: formData.category,
            service_type: formData.service_type,
            online_meeting_link: formData.online_meeting_link,
            online_meeting_password: formData.online_meeting_password,
            online_instructions: formData.online_instructions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingService.id);

        if (error) {
          Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        } else {
          Toast.show({ type: 'success', text1: 'Updated', text2: 'Service updated successfully' });
          setShowModal(false);
          setEditingService(null);
          await fetchServices();
        }
      } else {
        const { error } = await supabase
          .from('shop_services')
          .insert({
            shop_id: shopId,
            name: formData.name,
            description: formData.description,
            duration: formData.duration,
            price: formData.price,
            category: formData.category,
            service_type: formData.service_type,
            online_meeting_link: formData.online_meeting_link,
            online_meeting_password: formData.online_meeting_password,
            online_instructions: formData.online_instructions,
            is_active: true,
            display_order: services.length + 1,
          });

        if (error) {
          Toast.show({ type: 'error', text1: 'Error', text2: error.message });
        } else {
          Toast.show({ type: 'success', text1: 'Added', text2: 'Service added successfully' });
          setShowModal(false);
          await fetchServices();
        }
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    }
    setSaving(false);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingService(null);
    setShowModal(true);
  };

  const handleToggleActive = async (service) => {
    setTogglingId(service.id);
    const result = await updateShopService(service.id, { is_active: !service.is_active });
    if (result.success) {
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s));
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: result.error });
    }
    setTogglingId(null);
  };

  const handleDelete = (service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const result = await removeServiceFromShop(service.id);
            if (result.success) {
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Service removed' });
              setServices(prev => prev.filter(s => s.id !== service.id));
            } else {
              Toast.show({ type: 'error', text1: 'Error', text2: result.error });
            }
          },
        },
      ],
    );
  };

  const handleMove = useCallback(async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    // Swap in state
    const newServices = [...services];
    const temp = newServices[index];
    newServices[index] = newServices[targetIndex];
    newServices[targetIndex] = temp;
    setServices(newServices);

    // Persist both items
    const updates = [
      { id: newServices[index].id, display_order: index + 1 },
      { id: newServices[targetIndex].id, display_order: targetIndex + 1 },
    ];
    const results = await Promise.all(
      updates.map(({ id, display_order }) =>
        supabase.from('shop_services').update({ display_order }).eq('id', id)
      )
    );
    if (results.some(r => r.error)) {
      await fetchServices(); // Restore on failure
    }
  }, [services, shopId]);

  const renderServiceCard = ({ item, index }) => {
    const typeInfo = TYPE_CONFIG[item.service_type] || TYPE_CONFIG.in_person;
    const price = item.custom_price || item.price || 0;
    const isFirst = index === 0;
    const isLast = index === services.length - 1;

    return (
      <View style={[styles.card, !item.is_active && styles.cardInactive]}>
        <View style={styles.cardRow}>
          {/* Reorder buttons */}
          {services.length > 1 && (
            <View style={styles.reorderCol}>
              <TouchableOpacity
                onPress={() => handleMove(index, -1)}
                disabled={isFirst}
                style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
              >
                <Ionicons name="chevron-up" size={18} color={isFirst ? '#D0D0D0' : '#666'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMove(index, 1)}
                disabled={isLast}
                style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
              >
                <Ionicons name="chevron-down" size={18} color={isLast ? '#D0D0D0' : '#666'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Card Content */}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.nameRow}>
                <Text style={[styles.serviceName, !item.is_active && styles.textInactive]} numberOfLines={1}>
                  {item.name}
                </Text>
                {!item.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={20} color="#4A90E2" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            ) : null}

            <View style={styles.metaRow}>
              {item.duration > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#8E8E93" />
                  <Text style={styles.metaText}>{item.duration} min</Text>
                </View>
              )}
              {price > 0 && (
                <View style={styles.metaItem}>
                  <Text style={styles.priceText}>${price.toFixed(2)}</Text>
                </View>
              )}
              {item.category && item.category !== 'General' && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              )}
            </View>

            <View style={styles.cardBottom}>
              <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
                <Ionicons name={typeInfo.icon} size={13} color={typeInfo.color} />
                <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{item.is_active ? 'Active' : 'Inactive'}</Text>
                <Switch
                  value={item.is_active}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: '#D1D1D6', true: '#4CD964' }}
                  thumbColor="#FFF"
                  disabled={togglingId === item.id}
                  style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : {}}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtnHeader}>
          <Ionicons name="add-circle" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {services.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{services.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>
              {services.filter(s => s.is_active).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#8E8E93' }]}>
              {services.filter(s => !s.is_active).length}
            </Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>
      )}

      {/* Services List */}
      <FlatList
        data={services}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderServiceCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cut-outline" size={40} color="#4A90E2" />
            </View>
            <Text style={styles.emptyTitle}>No Services Yet</Text>
            <Text style={styles.emptySubtitle}>Add your first service to start accepting bookings</Text>
            <TouchableOpacity style={styles.addServiceBtn} onPress={handleAdd}>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.addServiceBtnText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal */}
      <AddCustomServiceModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditingService(null); }}
        onSave={handleSave}
        service={editingService}
        loading={saving}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C' },
  addBtnHeader: { padding: 4 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginBottom: 16, backgroundColor: '#FFF',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#1A202C' },
  statLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#E5E5EA', marginHorizontal: 8 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardInactive: { opacity: 0.7, backgroundColor: '#FAFAFA' },
  cardRow: { flexDirection: 'row' },
  reorderCol: {
    width: 36, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8F9FC', borderRightWidth: 1, borderRightColor: '#F0F0F0',
    paddingVertical: 8,
  },
  reorderBtn: { padding: 6 },
  reorderBtnDisabled: { opacity: 0.4 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#1A202C', flexShrink: 1 },
  textInactive: { color: '#8E8E93' },
  inactiveBadge: {
    backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  inactiveBadgeText: { fontSize: 10, fontWeight: '600', color: '#8E8E93' },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  description: { fontSize: 13, color: '#666', marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  priceText: { fontSize: 15, fontWeight: '700', color: '#34C759' },
  categoryBadge: {
    backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#666' },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBF4FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingHorizontal: 40,
    lineHeight: 20, marginBottom: 24,
  },
  addServiceBtn: {
    backgroundColor: '#4A90E2', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  addServiceBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});

export default ServicesManagementScreen;
