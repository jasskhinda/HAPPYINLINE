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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SettingAppBar from '../../../../../components/appBar/SettingAppBar';
import CircularProgressBar from '../../../../../components/loadingBar/CircularProgressBar';
import { 
  fetchAllBarbers, 
  createBarber, 
  updateBarber, 
  deleteBarber,
  fetchServices 
} from '../../../../../lib/auth';

const BarberManagementScreen = () => {
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
  const [barberBio, setBarberBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);

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
      
      // Load barbers and services in parallel
      const [barbersResult, servicesResult] = await Promise.all([
        fetchAllBarbers(),
        fetchServices()
      ]);

      if (barbersResult.success) {
        setBarbers(barbersResult.data);
        setFilteredBarbers(barbersResult.data);
      } else {
        Alert.alert('Error', barbersResult.error || 'Failed to load barbers');
      }

      if (servicesResult.success) {
        setServices(servicesResult.data);
      }
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

  const handleAddBarber = () => {
    setEditingBarber(null);
    setBarberName('');
    setBarberPhone('');
    setBarberEmail('');
    setBarberBio('');
    setSelectedSpecialties([]);
    setModalVisible(true);
  };

  const handleEditBarber = (barber) => {
    setEditingBarber(barber);
    setBarberName(barber.name || '');
    setBarberPhone(barber.phone || '');
    setBarberEmail(barber.email || '');
    setBarberBio(barber.bio || '');
    setSelectedSpecialties(barber.specialties || []);
    setModalVisible(true);
  };

  const toggleSpecialty = (serviceId) => {
    setSelectedSpecialties(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSaveBarber = async () => {
    // Validation
    if (!barberName.trim()) {
      Alert.alert('Error', 'Please enter barber name');
      return;
    }
    if (!barberEmail.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }
    if (selectedSpecialties.length === 0) {
      Alert.alert('Error', 'Please select at least one specialty');
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
          bio: barberBio.trim() || null,
          specialties: selectedSpecialties,
        };

        const result = await updateBarber(editingBarber.id, updates);

        if (result.success) {
          Alert.alert('Success', 'Barber updated successfully');
          setModalVisible(false);
          await loadData(); // Reload data
        } else {
          Alert.alert('Error', result.error || 'Failed to update barber');
        }
      } else {
        // Create new barber
        const barberData = {
          name: barberName.trim(),
          phone: barberPhone.trim() || null,
          email: barberEmail.trim(),
          bio: barberBio.trim() || null,
          specialties: selectedSpecialties,
        };

        const result = await createBarber(barberData);

        if (result.success) {
          const message = result.message || 'Barber added successfully';
          Alert.alert('Success', message);
          setModalVisible(false);
          await loadData(); // Reload data
        } else {
          Alert.alert('Error', result.error || 'Failed to add barber');
        }
      }
    } catch (error) {
      console.error('❌ Error saving barber:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
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

  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color="#FFD700" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FFD700" />);
    }

    return stars;
  };

  const getSpecialtyNames = (specialtyIds) => {
    if (!Array.isArray(specialtyIds)) return [];
    return specialtyIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean);
  };

  const renderBarberItem = ({ item }) => {
    const isDeleting = deleting && deletingBarberId === item.id;
    const specialtyNames = getSpecialtyNames(item.specialties);

    return (
      <View style={styles.barberCard}>
        {isDeleting && (
          <View style={styles.cardOverlay}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.overlayText}>Deleting...</Text>
          </View>
        )}
        <View style={[styles.barberContent, isDeleting && styles.contentDisabled]}>
          <View style={styles.barberIconContainer}>
            <Ionicons name="person" size={30} color="#FF6B6B" />
          </View>
          <View style={styles.barberInfo}>
            <Text style={styles.barberName}>{item.name}</Text>
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStarRating(item.rating || 0)}
              </View>
              <Text style={styles.ratingText}>
                {item.rating?.toFixed(1) || '0.0'} ({item.total_reviews || 0} reviews)
              </Text>
            </View>
            {item.phone && <Text style={styles.contactInfo}>📞 {item.phone}</Text>}
            <Text style={styles.contactInfo}>✉️ {item.email}</Text>
            {specialtyNames.length > 0 && (
              <View style={styles.specialtiesContainer}>
                {specialtyNames.map((specialty, index) => (
                  <View key={index} style={styles.specialtyTag}>
                    <Text style={styles.specialtyText}>{specialty}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.barberActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditBarber(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Ionicons name="pencil" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteBarber(item.id, item.name)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <Ionicons name="trash" size={20} color="#FF6B6B" />
              )}
            </TouchableOpacity>
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
          <SettingAppBar title="Barber Management" />
          <View style={styles.loadingContainer}>
            <CircularProgressBar />
            <Text style={styles.loadingText}>Loading barbers...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Global deleting overlay */}
      {deleting && (
        <View style={styles.globalOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingCardText}>Deleting barber...</Text>
          </View>
        </View>
      )}

      <View style={styles.container}>
        <SettingAppBar title="Barber Management" />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Barbers</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddBarber}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Barber</Text>
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

          {/* Barber List */}
          {filteredBarbers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No barbers found' : 'No barbers yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Add your first barber to get started'}
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
                  colors={['#FF6B6B']}
                  tintColor="#FF6B6B"
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
                {editingBarber ? 'Edit Barber' : 'Add New Barber'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Barber Name</Text>
              <TextInput
                style={styles.textInput}
                value={barberName}
                onChangeText={setBarberName}
                placeholder="Enter barber name"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={barberPhone}
                onChangeText={setBarberPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={barberEmail}
                onChangeText={setBarberEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Bio (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={barberBio}
                onChangeText={setBarberBio}
                placeholder="Enter bio or description"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Specialties *</Text>
              {services.length === 0 ? (
                <Text style={styles.noServicesText}>No services available. Please add services first.</Text>
              ) : (
                <View style={styles.specialtiesGrid}>
                  {services.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.specialtyOption,
                        selectedSpecialties.includes(service.id) && styles.selectedSpecialtyOption,
                      ]}
                      onPress={() => toggleSpecialty(service.id)}
                    >
                      <Text
                        style={[
                          styles.specialtyOptionText,
                          selectedSpecialties.includes(service.id) && styles.selectedSpecialtyText,
                        ]}
                      >
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  content: {
    flex: 1,
    padding: 15,
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
    backgroundColor: '#FF6B6B',
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
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
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
    borderRadius: 15,
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
    alignItems: 'flex-start',
    padding: 15,
  },
  contentDisabled: {
    opacity: 0.5,
  },
  barberIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  barberInfo: {
    flex: 1,
  },
  barberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  contactInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 5,
  },
  specialtyTag: {
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  barberActions: {
    flexDirection: 'column',
    gap: 10,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF5020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B20',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
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
    backgroundColor: '#FF6B6B',
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
});

export default BarberManagementScreen;