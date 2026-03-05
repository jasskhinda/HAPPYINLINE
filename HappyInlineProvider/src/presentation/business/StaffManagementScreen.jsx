import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Image, Switch, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getProviderShop } from '../../lib/providerAuth';
import { getShopStaff, removeShopStaff, updateShopStaff } from '../../lib/shopAuth';
import { supabase } from '../../lib/supabase';
import AddStaffModal from '../../components/shop/AddStaffModal';
import Toast from 'react-native-toast-message';

const ROLE_LABELS = {
  barber: 'Provider',
  admin: 'Admin',
  manager: 'Manager',
  owner: 'Owner',
};

const ROLE_COLORS = {
  barber: '#4A90E2',
  admin: '#34C759',
  manager: '#FF9500',
  owner: '#6366F1',
};

const StaffManagementScreen = () => {
  const navigation = useNavigation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopId, setShopId] = useState(null);
  const [shop, setShop] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [maxLicenses, setMaxLicenses] = useState(0);

  useFocusEffect(useCallback(() => { init(); }, []));

  const init = async () => {
    const result = await getProviderShop();
    if (result.success) {
      setShopId(result.shop.id);
      setShop(result.shop);
      await loadStaff(result.shop.id);
      // Fetch max_licenses from owner profile
      await fetchOwnerLicenses(result.shop.created_by);
    }
    setLoading(false);
  };

  const fetchOwnerLicenses = async (ownerId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('max_licenses')
        .eq('id', ownerId)
        .single();
      if (data) setMaxLicenses(data.max_licenses || 0);
    } catch (e) {
      console.error('Error fetching licenses:', e);
    }
  };

  const loadStaff = async (sid) => {
    const result = await getShopStaff(sid || shopId);
    if (result.success) setStaff(result.staff || []);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStaff(shopId);
    setRefreshing(false);
  };

  const providerCount = staff.filter(s => s.role === 'barber').length;
  const canAddProvider = providerCount < maxLicenses;

  const handleAddPress = () => {
    if (!canAddProvider) {
      Alert.alert(
        'Unable to Add Provider',
        'You are unable to add more providers at this time. Please contact our support team for assistance.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowAddModal(true);
  };

  const handleStaffAdded = async (userData) => {
    setShowAddModal(false);
    await loadStaff(shopId);
    Toast.show({ type: 'success', text1: 'Provider Added', text2: `${userData?.name || 'Provider'} has been added to your team` });
  };

  const handleToggleAvailability = async (staffMember) => {
    const newValue = !staffMember.is_available;
    // Optimistic update
    setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, is_available: newValue } : s));

    const result = await updateShopStaff(staffMember.id, { is_available: newValue });
    if (!result.success) {
      // Revert
      setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, is_available: !newValue } : s));
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update availability' });
    }
  };

  const handleRemoveStaff = (staffMember) => {
    const name = staffMember.user?.name || staffMember.name || 'this provider';
    Alert.alert(
      'Remove Provider',
      `Are you sure you want to remove ${name} from your team?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeShopStaff(staffMember.id);
            if (result.success) {
              Toast.show({ type: 'success', text1: 'Removed', text2: `${name} has been removed` });
              loadStaff(shopId);
            } else {
              Toast.show({ type: 'error', text1: 'Error', text2: result.error || 'Failed to remove' });
            }
          },
        },
      ]
    );
  };

  const renderProviderCard = ({ item }) => {
    const user = item.user || {};
    const name = user.name || item.name || 'Provider';
    const email = user.email || '';
    const phone = user.phone || '';
    const roleLabel = ROLE_LABELS[item.role] || item.role;
    const roleColor = ROLE_COLORS[item.role] || '#666';
    const initials = name.charAt(0).toUpperCase();

    // Parse specialties
    let specialties = [];
    if (item.specialties) {
      specialties = Array.isArray(item.specialties) ? item.specialties : [];
    }

    return (
      <View style={styles.card}>
        {/* Top row: avatar + info + role badge */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardLeft}>
            {user.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.avatarInitials, { color: roleColor }]}>{initials}</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
              {email ? (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={13} color="#8E8E93" />
                  <Text style={styles.contactText} numberOfLines={1}>{email}</Text>
                </View>
              ) : null}
              {phone ? (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={13} color="#8E8E93" />
                  <Text style={styles.contactText}>{phone}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '18' }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Specialties */}
        {specialties.length > 0 && (
          <View style={styles.specialtiesRow}>
            {specialties.slice(0, 3).map((spec, idx) => (
              <View key={idx} style={styles.specialtyPill}>
                <Text style={styles.specialtyText}>{spec}</Text>
              </View>
            ))}
            {specialties.length > 3 && (
              <View style={styles.specialtyMore}>
                <Text style={styles.specialtyMoreText}>+{specialties.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Rating */}
        {item.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F5A623" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            {item.total_reviews > 0 && (
              <Text style={styles.reviewCount}>({item.total_reviews} reviews)</Text>
            )}
          </View>
        )}

        {/* Bottom row: availability toggle + remove */}
        <View style={styles.cardBottomRow}>
          <View style={styles.availabilityRow}>
            <Switch
              value={item.is_available !== false}
              onValueChange={() => handleToggleAvailability(item)}
              trackColor={{ false: '#E0E0E0', true: '#34C75966' }}
              thumbColor={item.is_available !== false ? '#34C759' : '#CCC'}
            />
            <Text style={[
              styles.availabilityText,
              { color: item.is_available !== false ? '#34C759' : '#8E8E93' }
            ]}>
              {item.is_available !== false ? 'Available' : 'Unavailable'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleRemoveStaff(item)}
            style={styles.removeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Providers</Text>
        <TouchableOpacity onPress={handleAddPress} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{staff.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{providerCount}</Text>
          <Text style={styles.statLabel}>Providers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{staff.filter(s => s.is_available !== false).length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderProviderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={40} color="#4A90E2" />
            </View>
            <Text style={styles.emptyTitle}>No Providers Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add providers to your team so they can accept bookings
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddPress} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.emptyAddBtnText}>Add Provider</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {showAddModal && shopId && (
        <AddStaffModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          shopId={shopId}
          shopData={{ ...shop, max_licenses: maxLicenses }}
          existingStaff={staff.map(s => ({
            id: s.user?.id || s.user_id,
            role: s.role,
          }))}
          onAdd={handleStaffAdded}
          onStaffAdded={handleStaffAdded}
        />
      )}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    letterSpacing: 0.3,
  },
  addBtn: {
    padding: 4,
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F0F0F5',
    alignSelf: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 0.1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  contactText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Specialties
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  specialtyPill: {
    backgroundColor: '#F0F1F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  specialtyMore: {
    backgroundColor: '#E8E9ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialtyMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
  },

  // Rating
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 2,
  },

  // Bottom row
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddBtn: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyAddBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default StaffManagementScreen;
