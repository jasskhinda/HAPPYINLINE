import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SettingAppBar from '../../../../../components/appBar/SettingAppBar';
import CircularProgressBar from '../../../../../components/loadingBar/CircularProgressBar';
import {
  fetchAllBarbers,
  createBarber,
  updateBarber,
  deleteBarber,
  fetchServices,
  checkLicenseAvailability
} from '../../../../../lib/auth';
import { useNavigation } from '@react-navigation/native';
import {
  getAvailableShopsForAssignment,
  assignStaffToShop,
  getStaffAssignments,
  getCurrentShopId,
  getMyShops
} from '../../../../../lib/shopAuth';
import { getShopServices } from '../../../../../lib/multiShopAuth';
import { supabase } from '../../../../../lib/supabase';

const BarberManagementScreen = () => {
  const navigation = useNavigation();
  const [barbers, setBarbers] = useState([]);
  const [filteredBarbers, setFilteredBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingBarberId, setDeletingBarberId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberName, setBarberName] = useState('');
  const [barberPhone, setBarberPhone] = useState('');
  const [barberEmail, setBarberEmail] = useState('');

  // License state
  const [licenseInfo, setLicenseInfo] = useState({ canAdd: true, currentCount: 0, maxLicenses: 0, planName: 'none' });

  // Current shop for auto-assignment
  const [currentShopId, setCurrentShopId] = useState(null);

  // Shop assignment states
  const [shopAssignmentModalVisible, setShopAssignmentModalVisible] = useState(false);
  const [newlyCreatedStaff, setNewlyCreatedStaff] = useState(null);
  const [availableShops, setAvailableShops] = useState([]);
  const [selectedShops, setSelectedShops] = useState([]);
  const [assigningShops, setAssigningShops] = useState(false);

  // Service assignment states
  const [serviceAssignmentModalVisible, setServiceAssignmentModalVisible] = useState(false);
  const [selectedProviderForServices, setSelectedProviderForServices] = useState(null);
  const [providerServices, setProviderServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [assigningServices, setAssigningServices] = useState(false);

  // Load barbers and services on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter barbers when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBarbers(barbers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = barbers.filter(barber =>
        barber.name?.toLowerCase().includes(query) ||
        barber.email?.toLowerCase().includes(query)
      );
      setFilteredBarbers(filtered);
    }
  }, [searchQuery, barbers]);

  const loadData = async () => {
    try {
      setLoading(true);

      // First, get shop ID and my shops
      const [shopId, myShopsResult, barbersResult, licenseResult] = await Promise.all([
        getCurrentShopId(),
        getMyShops(),
        fetchAllBarbers(),
        checkLicenseAvailability()
      ]);

      // Get current shop ID - if not set, use the first shop the user owns
      let activeShopId = shopId;
      if (!activeShopId && myShopsResult.success && myShopsResult.shops?.length > 0) {
        // Get the first shop where user is owner or admin
        const ownerShop = myShopsResult.shops.find(s => s.role === 'owner' || s.role === 'admin');
        activeShopId = ownerShop?.shop_id || myShopsResult.shops[0].shop_id;
      }
      setCurrentShopId(activeShopId);
      console.log('🏪 Current shop for provider assignment:', activeShopId);

      // Now fetch shop-specific services (not global template services)
      if (activeShopId) {
        const servicesResult = await getShopServices(activeShopId);
        if (servicesResult.success) {
          console.log('✅ Loaded shop services:', servicesResult.services?.length);
          setServices(servicesResult.services || []);
        } else {
          console.error('❌ Failed to load shop services:', servicesResult.error);
          setServices([]);
        }
      } else {
        console.log('⚠️ No shop ID - cannot load services');
        setServices([]);
      }

      if (barbersResult.success) {
        console.log('📋 Setting barbers state:', barbersResult.data?.length, 'items');
        if (barbersResult.data?.length > 0) {
          console.log('   First barber:', barbersResult.data[0]?.name, barbersResult.data[0]?.id);
        }
        setBarbers(barbersResult.data);
        setFilteredBarbers(barbersResult.data);
      } else {
        console.error('❌ Failed to load barbers:', barbersResult.error);
        Alert.alert('Error', barbersResult.error || 'Failed to load barbers');
      }

      // Set license info
      setLicenseInfo(licenseResult);
      console.log('📊 License info:', licenseResult);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddBarber = async () => {
    // Check license limit before allowing add
    if (!licenseInfo.canAdd) {
      const planName = licenseInfo.planName?.charAt(0).toUpperCase() + licenseInfo.planName?.slice(1) || 'Current';

      Alert.alert(
        '📊 License Limit Reached',
        `Your ${planName} plan allows ${licenseInfo.maxLicenses} service providers.\n\n` +
        `You currently have: ${licenseInfo.currentCount}/${licenseInfo.maxLicenses} providers.\n\n` +
        `To add more providers, please upgrade your plan.`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade Plan',
            onPress: async () => {
              const { data: { user } } = await supabase.auth.getUser();
              navigation.navigate('UpgradePlanScreen', { userId: user?.id });
            }
          }
        ]
      );
      return;
    }

    setEditingBarber(null);
    setBarberName('');
    setBarberPhone('');
    setBarberEmail('');
    setModalVisible(true);
  };

  const handleEditBarber = (barber) => {
    setEditingBarber(barber);
    setBarberName(barber.name || '');
    setBarberPhone(barber.phone || '');
    setBarberEmail(barber.email || '');
    setModalVisible(true);
  };

  const handleSaveBarber = async () => {
    // Validation
    if (!barberName.trim()) {
      Alert.alert('Error', 'Please enter staff member name');
      return;
    }
    if (!barberEmail.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }

    try {
      setSaving(true);

      if (editingBarber) {
        // Update existing barber
        const updates = {
          name: barberName.trim(),
          phone: barberPhone.trim() || null,
          email: barberEmail.trim(),
        };

        const result = await updateBarber(editingBarber.id, updates);

        if (result.success) {
          Alert.alert('Success', 'Staff member updated successfully');
          setModalVisible(false);
          await loadData(); // Reload data
        } else {
          Alert.alert('Error', result.error || 'Failed to update staff member');
        }
      } else {
        // Create new barber profile - password will be auto-generated
        const barberData = {
          name: barberName.trim(),
          phone: barberPhone.trim() || null,
          email: barberEmail.trim(),
        };

        // Pass currentShopId to auto-assign provider to the current shop
        console.log('🏪 Creating provider with auto-assignment to shop:', currentShopId);
        const result = await createBarber(barberData, currentShopId);

        if (result.success) {
          const savedEmail = barberEmail.trim();
          const savedName = barberName.trim();
          const generatedPassword = result.generatedPassword;

          setModalVisible(false);
          await loadData(); // Reload data

          // Show success message with login credentials
          const credentialsText = `Email: ${savedEmail}\nPassword: ${generatedPassword}`;

          Alert.alert(
            'Provider Added!',
            `${savedName} has been added to your team!\n\n` +
            `Login Details:\n` +
            `📧 Email: ${savedEmail}\n` +
            `🔑 Password: ${generatedPassword}\n\n` +
            `They can now:\n` +
            `1. Open the Happy Inline app\n` +
            `2. Tap "Provider Login"\n` +
            `3. Sign in with the credentials above`,
            [
              {
                text: 'Copy Credentials',
                onPress: async () => {
                  await Clipboard.setStringAsync(credentialsText);
                  Alert.alert('Copied!', 'Login credentials copied to clipboard');
                },
              },
              { text: 'Done', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to add staff member');
        }
      }
    } catch (error) {
      console.error('Error saving staff member:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const loadAvailableShops = async () => {
    try {
      const result = await getAvailableShopsForAssignment();
      if (result.success) {
        setAvailableShops(result.shops || []);
      } else {
        console.error('Error loading shops:', result.error);
      }
    } catch (error) {
      console.error('Error loading available shops:', error);
    }
  };

  const handleShopToggle = (shopId) => {
    setSelectedShops(prev => {
      if (prev.includes(shopId)) {
        return prev.filter(id => id !== shopId);
      } else {
        return [...prev, shopId];
      }
    });
  };

  const handleAssignShops = async () => {
    if (selectedShops.length === 0) {
      Alert.alert('Notice', 'Please select at least one business to assign this staff member to.');
      return;
    }

    try {
      setAssigningShops(true);

      // Assign staff to each selected shop
      const assignmentPromises = selectedShops.map(shopId =>
        assignStaffToShop(newlyCreatedStaff.id, shopId, 'barber')
      );

      const results = await Promise.all(assignmentPromises);

      // Check if all assignments were successful
      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        Alert.alert(
          'Success',
          `${newlyCreatedStaff.name} has been assigned to ${selectedShops.length} business(es) and can now login with their email and password!`
        );
        setShopAssignmentModalVisible(false);
        setSelectedShops([]);
        setNewlyCreatedStaff(null);
      } else {
        Alert.alert('Warning', 'Some business assignments failed. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning businesses:', error);
      Alert.alert('Error', 'Failed to assign businesses');
    } finally {
      setAssigningShops(false);
    }
  };

  const handleSkipAssignment = () => {
    Alert.alert(
      'Skip Business Assignment',
      `${newlyCreatedStaff?.name} can be assigned to businesses later. They won't be able to access any businesses until assigned.`,
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            setShopAssignmentModalVisible(false);
            setSelectedShops([]);
            setNewlyCreatedStaff(null);
            Alert.alert('Success', `${newlyCreatedStaff?.name} can now login with their email and password!`);
          }
        }
      ]
    );
  };

  // ============ SERVICE ASSIGNMENT FUNCTIONS ============
  const handleManageServices = async (provider) => {
    setSelectedProviderForServices(provider);
    setAssigningServices(false);

    // Load current service assignments for this provider
    if (currentShopId) {
      const { data: existingAssignments, error } = await supabase
        .from('service_providers')
        .select('shop_service_id')
        .eq('provider_id', provider.id)
        .eq('shop_id', currentShopId);

      if (!error && existingAssignments) {
        const assignedServiceIds = existingAssignments.map(a => a.shop_service_id);
        setSelectedServices(assignedServiceIds);
        console.log('📋 Provider current services:', assignedServiceIds.length);
      } else {
        setSelectedServices([]);
      }
    }

    setServiceAssignmentModalVisible(true);
  };

  const handleServiceToggle = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSaveServiceAssignments = async () => {
    if (!selectedProviderForServices || !currentShopId) {
      Alert.alert('Error', 'Missing provider or shop information');
      return;
    }

    try {
      setAssigningServices(true);

      // First, remove all existing service assignments for this provider at this shop
      const { error: deleteError } = await supabase
        .from('service_providers')
        .delete()
        .eq('provider_id', selectedProviderForServices.id)
        .eq('shop_id', currentShopId);

      if (deleteError) {
        console.error('Error removing old assignments:', deleteError);
        Alert.alert('Error', 'Failed to update service assignments');
        return;
      }

      // Then add new assignments
      if (selectedServices.length > 0) {
        const newAssignments = selectedServices.map(serviceId => ({
          provider_id: selectedProviderForServices.id,
          shop_id: currentShopId,
          shop_service_id: serviceId
        }));

        const { error: insertError } = await supabase
          .from('service_providers')
          .insert(newAssignments);

        if (insertError) {
          console.error('Error adding new assignments:', insertError);
          Alert.alert('Error', 'Failed to assign services');
          return;
        }
      }

      Alert.alert(
        'Success',
        `${selectedProviderForServices.name} has been assigned ${selectedServices.length} service(s).`
      );
      setServiceAssignmentModalVisible(false);
      setSelectedProviderForServices(null);
      setSelectedServices([]);
    } catch (error) {
      console.error('Error saving service assignments:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setAssigningServices(false);
    }
  };

  const handleDeleteBarber = (barberId, barberName) => {
    Alert.alert(
      'Delete Barber',
      `Are you sure you want to remove ${barberName}? This will change their role to customer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              setDeletingBarberId(barberId);

              const result = await deleteBarber(barberId);

              if (result.success) {
                Alert.alert('Success', 'Barber removed successfully');
                await loadData(); // Reload data
              } else {
                Alert.alert('Error', result.error || 'Failed to delete barber');
              }
            } catch (error) {
              console.error('❌ Error deleting barber:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setDeleting(false);
              setDeletingBarberId(null);
            }
          },
        },
      ]
    );
  };

  const handleAssignExistingStaff = async (staff) => {
    setNewlyCreatedStaff(staff);
    await loadAvailableShops();

    // Load current assignments for this staff member
    const assignmentsResult = await getStaffAssignments(staff.id);
    if (assignmentsResult.success) {
      const assignedShopIds = assignmentsResult.shops.map(s => s.id);
      setSelectedShops(assignedShopIds);
    }

    setShopAssignmentModalVisible(true);
  };

  const renderBarberItem = ({ item }) => {
    const isDeleting = deleting && deletingBarberId === item.id;

    return (
      <View style={styles.barberCard}>
        {isDeleting && (
          <View style={styles.cardOverlay}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.overlayText}>Deleting...</Text>
          </View>
        )}
        <View style={[styles.barberContent, isDeleting && styles.contentDisabled]}>
          {/* Staff Avatar */}
          <View style={styles.staffAvatar}>
            <Ionicons name="person" size={32} color="#FFF" />
          </View>

          {/* Staff Info */}
          <View style={styles.staffInfoSection}>
            <Text style={styles.staffName}>{item.name}</Text>

            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color="#666" />
              <Text style={styles.contactText}>{item.phone || 'No phone'}</Text>
            </View>

            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={14} color="#666" />
              <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.assignButton}
                onPress={() => handleManageServices(item)}
                disabled={isDeleting}
              >
                <Ionicons name="cut-outline" size={16} color="#4A90E2" />
                <Text style={[styles.assignButtonText, { color: '#4A90E2' }]}>Manage Services</Text>
              </TouchableOpacity>

              <View style={styles.iconButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleEditBarber(item)}
                  disabled={isDeleting}
                >
                  <Ionicons name="create-outline" size={20} color="#333" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDeleteBarber(item.id, item.name)}
                  disabled={isDeleting}
                >
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Show initial loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <SettingAppBar title="Staff Management" />
          <View style={styles.loadingContainer}>
            <CircularProgressBar />
            <Text style={styles.loadingText}>Loading barbers...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Global deleting overlay */}
      {deleting && (
        <View style={styles.globalOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingCardText}>Deleting barber...</Text>
          </View>
        </View>
      )}

      <SettingAppBar title="Provider Management" />

      <View style={styles.content}>
          {/* License Usage Banner */}
          <View style={[
            styles.licenseBanner,
            { backgroundColor: licenseInfo.canAdd ? '#E8F5E9' : '#FFF3E0' }
          ]}>
            <View style={styles.licenseBannerContent}>
              <Ionicons
                name={licenseInfo.canAdd ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={licenseInfo.canAdd ? '#4CAF50' : '#FF9800'}
              />
              <Text style={styles.licenseBannerText}>
                {licenseInfo.currentCount}/{licenseInfo.maxLicenses} provider licenses used
              </Text>
            </View>
            {!licenseInfo.canAdd && (
              <TouchableOpacity
                style={styles.upgradeLink}
                onPress={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  navigation.navigate('UpgradePlanScreen', { userId: user?.id });
                }}
              >
                <Text style={styles.upgradeLinkText}>Upgrade</Text>
                <Ionicons name="arrow-forward" size={14} color="#4A90E2" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Service Providers</Text>
            <TouchableOpacity
              style={[styles.addButton, !licenseInfo.canAdd && styles.addButtonDisabled]}
              onPress={handleAddBarber}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Provider</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Provider List */}
          {filteredBarbers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No providers found' : 'No providers yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add your first service provider to get started'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredBarbers}
              renderItem={renderBarberItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#4A90E2']}
                  tintColor="#4A90E2"
                />
              }
            />
          )}
        </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBarber ? 'Edit Provider' : 'Add New Provider'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Provider Name *</Text>
              <TextInput
                style={styles.textInput}
                value={barberName}
                onChangeText={setBarberName}
                placeholder="Enter provider name"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={barberPhone}
                onChangeText={setBarberPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                value={barberEmail}
                onChangeText={setBarberEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {!editingBarber && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#4A90E2" />
                  <Text style={styles.infoBoxText}>
                    A password will be auto-generated. Share the login credentials with the provider after adding them.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSaveBarber}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingBarber ? 'Update' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shop Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shopAssignmentModalVisible}
        onRequestClose={() => setShopAssignmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Businesses</Text>
              <TouchableOpacity onPress={handleSkipAssignment}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.assignmentInfoBox}>
                <Ionicons name="information-circle" size={24} color="#4A90E2" />
                <View style={styles.assignmentInfoText}>
                  <Text style={styles.assignmentInfoTitle}>
                    {newlyCreatedStaff?.name}
                  </Text>
                  <Text style={styles.assignmentInfoSubtitle}>
                    Select which business(es) this provider should have access to.
                  </Text>
                </View>
              </View>

              {availableShops.length === 0 ? (
                <View style={styles.emptyShopsContainer}>
                  <Ionicons name="storefront-outline" size={60} color="#CCC" />
                  <Text style={styles.emptyShopsText}>
                    No businesses available. Create a business first.
                  </Text>
                </View>
              ) : (
                <View style={styles.shopsListContainer}>
                  <Text style={styles.shopsListTitle}>
                    Select Businesses ({selectedShops.length} selected)
                  </Text>
                  {availableShops.map((shop) => (
                    <TouchableOpacity
                      key={shop.id}
                      style={[
                        styles.shopItem,
                        selectedShops.includes(shop.id) && styles.shopItemSelected
                      ]}
                      onPress={() => handleShopToggle(shop.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.shopItemContent}>
                        <View style={styles.shopIconContainer}>
                          <Ionicons
                            name="storefront"
                            size={24}
                            color={selectedShops.includes(shop.id) ? '#4A90E2' : '#666'}
                          />
                        </View>
                        <View style={styles.shopItemInfo}>
                          <Text style={styles.shopItemName}>{shop.name}</Text>
                          {shop.address && (
                            <Text style={styles.shopItemAddress}>{shop.address}</Text>
                          )}
                        </View>
                      </View>
                      <View style={[
                        styles.checkbox,
                        selectedShops.includes(shop.id) && styles.checkboxSelected
                      ]}>
                        {selectedShops.includes(shop.id) && (
                          <Ionicons name="checkmark" size={18} color="#FFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleSkipAssignment}
                disabled={assigningShops}
              >
                <Text style={styles.cancelButtonText}>Skip for Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (assigningShops || selectedShops.length === 0) && styles.disabledButton
                ]}
                onPress={handleAssignShops}
                disabled={assigningShops || selectedShops.length === 0}
              >
                {assigningShops ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Assign ({selectedShops.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={serviceAssignmentModalVisible}
        onRequestClose={() => setServiceAssignmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Services</Text>
              <TouchableOpacity onPress={() => setServiceAssignmentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.assignmentInfoBox}>
                <Ionicons name="cut" size={24} color="#4A90E2" />
                <View style={styles.assignmentInfoText}>
                  <Text style={styles.assignmentInfoTitle}>
                    {selectedProviderForServices?.name}
                  </Text>
                  <Text style={styles.assignmentInfoSubtitle}>
                    Select services this provider can perform. Customers will see these services when booking with this provider.
                  </Text>
                </View>
              </View>

              {services.length === 0 ? (
                <View style={styles.emptyShopsContainer}>
                  <Ionicons name="cut-outline" size={60} color="#CCC" />
                  <Text style={styles.emptyShopsText}>
                    No services available. Add services first in Service Management.
                  </Text>
                </View>
              ) : (
                services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.shopItem,
                      selectedServices.includes(service.id) && styles.shopItemSelected,
                    ]}
                    onPress={() => handleServiceToggle(service.id)}
                  >
                    <View style={styles.shopItemContent}>
                      <View style={[styles.shopIconContainer, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="cut" size={20} color="#4A90E2" />
                      </View>
                      <View style={styles.shopItemInfo}>
                        <Text style={styles.shopItemName}>{service.name}</Text>
                        <Text style={styles.shopItemAddress}>
                          ${service.price?.toFixed(2)} • {service.duration} min
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.checkbox,
                      selectedServices.includes(service.id) && styles.checkboxSelected,
                    ]}>
                      {selectedServices.includes(service.id) && (
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setServiceAssignmentModalVisible(false);
                  setSelectedProviderForServices(null);
                  setSelectedServices([]);
                }}
                disabled={assigningServices}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  assigningServices && styles.disabledButton
                ]}
                onPress={handleSaveServiceAssignments}
                disabled={assigningServices}
              >
                {assigningServices ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Save ({selectedServices.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  licenseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  licenseBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  licenseBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  upgradeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upgradeLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  globalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 150,
  },
  loadingCardText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  barberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  overlayText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  barberContent: {
    flexDirection: 'row',
    padding: 16,
  },
  contentDisabled: {
    opacity: 0.5,
  },
  staffAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  staffInfoSection: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  assignButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginLeft: 6,
  },
  iconButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  inputHint: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#999',
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    gap: 10,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noServicesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  specialtyOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  selectedSpecialtyOption: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  specialtyOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedSpecialtyText: {
    color: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Shop Assignment Modal Styles
  assignmentInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  assignmentInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  assignmentInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  assignmentInfoSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyShopsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyShopsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  shopsListContainer: {
    marginTop: 10,
  },
  shopsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  shopItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  shopItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shopIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shopItemInfo: {
    flex: 1,
  },
  shopItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shopItemAddress: {
    fontSize: 13,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
});

export default BarberManagementScreen;