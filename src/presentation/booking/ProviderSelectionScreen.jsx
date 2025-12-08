import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

const ProviderSelectionScreen = ({ route, navigation }) => {
  const { shopId, shopName, selectedServices = [] } = route.params;

  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);

      if (selectedServices.length === 0) {
        Alert.alert('Error', 'No services selected');
        navigation.goBack();
        return;
      }

      const serviceIds = selectedServices.map(s => s.id);

      // Step 1: Get provider IDs from service_providers junction table
      const { data: serviceProviders, error: spError } = await supabase
        .from('service_providers')
        .select('provider_id')
        .in('shop_service_id', serviceIds);

      if (spError) {
        console.error('Error loading service providers:', spError);
        // If error, go directly to booking confirmation
        navigation.replace('BookingConfirmationScreen', {
          shopId,
          shopName,
          selectedServices,
          selectedBarber: null,
        });
        return;
      }

      // Extract unique provider IDs
      const providerIds = [...new Set(serviceProviders?.map(sp => sp.provider_id).filter(Boolean) || [])];

      if (providerIds.length === 0) {
        // No providers assigned to these services, skip provider selection
        console.log('No providers assigned to services, skipping to booking confirmation');
        navigation.replace('BookingConfirmationScreen', {
          shopId,
          shopName,
          selectedServices,
          selectedBarber: null,
        });
        return;
      }

      // Step 2: Fetch profiles for these provider IDs
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, profile_image')
        .in('id', providerIds);

      if (profileError) {
        console.error('Error loading provider profiles:', profileError);
        navigation.replace('BookingConfirmationScreen', {
          shopId,
          shopName,
          selectedServices,
          selectedBarber: null,
        });
        return;
      }

      // Map profiles to provider format
      const uniqueProviders = (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name || profile.email || 'Provider',
        email: profile.email,
        profile_image: profile.profile_image,
      }));

      if (uniqueProviders.length === 0) {
        // No providers found, skip provider selection
        navigation.replace('BookingConfirmationScreen', {
          shopId,
          shopName,
          selectedServices,
          selectedBarber: null,
        });
        return;
      }

      setProviders(uniqueProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
      Alert.alert('Error', 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
  };

  const handleContinue = () => {
    navigation.navigate('BookingConfirmationScreen', {
      shopId,
      shopName,
      selectedServices,
      selectedBarber: selectedProvider ? { id: selectedProvider.id, user: { name: selectedProvider.name } } : null,
    });
  };

  const handleSkip = () => {
    navigation.navigate('BookingConfirmationScreen', {
      shopId,
      shopName,
      selectedServices,
      selectedBarber: null,
    });
  };

  const calculateTotal = () => {
    return selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading providers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Provider</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Selected Services Summary */}
      <View style={styles.servicesSummary}>
        <Text style={styles.summaryTitle}>Selected Services</Text>
        <View style={styles.servicesChips}>
          {selectedServices.map((service, index) => (
            <View key={index} style={styles.serviceChip}>
              <Text style={styles.serviceChipText}>{service.name}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.totalText}>Total: ${calculateTotal().toFixed(2)}</Text>
      </View>

      {/* Provider List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Choose a Provider</Text>
        <Text style={styles.sectionSubtitle}>Select who will perform your service</Text>

        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerCard,
              selectedProvider?.id === provider.id && styles.providerCardSelected,
            ]}
            onPress={() => handleSelectProvider(provider)}
            activeOpacity={0.7}
          >
            <View style={styles.providerInfo}>
              {provider.profile_image ? (
                <Image
                  source={{ uri: provider.profile_image }}
                  style={styles.providerImage}
                />
              ) : (
                <View style={styles.providerImagePlaceholder}>
                  <Ionicons name="person" size={28} color="#4A90E2" />
                </View>
              )}
              <View style={styles.providerDetails}>
                <Text style={styles.providerName}>{provider.name}</Text>
                {provider.email && (
                  <Text style={styles.providerEmail}>{provider.email}</Text>
                )}
              </View>
            </View>
            <View style={[
              styles.radioButton,
              selectedProvider?.id === provider.id && styles.radioButtonSelected,
            ]}>
              {selectedProvider?.id === provider.id && (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Any Available Option */}
        <TouchableOpacity
          style={[
            styles.providerCard,
            styles.anyProviderCard,
            selectedProvider === null && styles.providerCardSelected,
          ]}
          onPress={() => setSelectedProvider(null)}
          activeOpacity={0.7}
        >
          <View style={styles.providerInfo}>
            <View style={[styles.providerImagePlaceholder, styles.anyProviderIcon]}>
              <Ionicons name="people" size={28} color="#666" />
            </View>
            <View style={styles.providerDetails}>
              <Text style={styles.providerName}>Any Available Provider</Text>
              <Text style={styles.providerEmail}>We'll assign the first available</Text>
            </View>
          </View>
          <View style={[
            styles.radioButton,
            selectedProvider === null && styles.radioButtonSelected,
          ]}>
            {selectedProvider === null && (
              <Ionicons name="checkmark" size={16} color="#FFF" />
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Action */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity onPress={handleContinue} activeOpacity={0.8}>
          <LinearGradient
            colors={['#4A90E2', '#3A7BC8', '#2A6BA8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>Continue to Booking</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  servicesSummary: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  servicesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  serviceChip: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  providerCardSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F8FBFF',
  },
  anyProviderCard: {
    backgroundColor: '#F8F9FA',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  providerImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  anyProviderIcon: {
    backgroundColor: '#F0F0F0',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  providerEmail: {
    fontSize: 13,
    color: '#666',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ProviderSelectionScreen;
