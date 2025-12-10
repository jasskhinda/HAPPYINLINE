import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { getCurrentUser } from '../../../../lib/auth';

const ProviderServicesScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);

  const fetchData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }

      const { user, profile: userProfile } = await getCurrentUser();
      if (!userProfile) {
        setLoading(false);
        return;
      }

      // Get the shop where this provider works
      const { data: staffData, error: staffError } = await supabase
        .from('shop_staff')
        .select(`
          shop_id,
          role,
          is_active,
          shops:shop_id (
            id, name, logo_url, address, city, phone
          )
        `)
        .eq('user_id', userProfile.id)
        .eq('is_active', true);

      if (staffError) {
        console.error('Error fetching shop staff:', staffError);
      } else if (staffData && staffData.length > 0) {
        const barberShop = staffData.find(s => s.role === 'barber') || staffData[0];

        if (barberShop?.shops) {
          setShop(barberShop.shops);

          // Fetch services assigned to this provider
          const { data: providerServices, error: servicesError } = await supabase
            .from('service_providers')
            .select('*')
            .eq('provider_id', userProfile.id)
            .eq('shop_id', barberShop.shop_id);

          if (!servicesError && providerServices && providerServices.length > 0) {
            const shopServiceIds = providerServices.map(sp => sp.shop_service_id);

            const { data: shopServices, error: shopServicesError } = await supabase
              .from('shop_services')
              .select('id, name, price, duration, description')
              .in('id', shopServiceIds);

            if (!shopServicesError && shopServices) {
              setServices(shopServices);
            }
          } else {
            setServices([]);
          }
        }
      }
    } catch (error) {
      console.error('Error in ProviderServicesScreen fetchData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
  }, []);

  const renderServiceCard = (service, index) => (
    <View key={service.id || index} style={styles.serviceCard}>
      <View style={styles.serviceIconContainer}>
        <Ionicons name="cut-outline" size={24} color="#4A90E2" />
      </View>
      <View style={styles.serviceDetails}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDuration}>{service.duration} min</Text>
        {service.description && (
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {service.description}
          </Text>
        )}
      </View>
      <Text style={styles.servicePrice}>${service.price?.toFixed(2)}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.outerWrapper}>
      <View style={styles.container}>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../../../../assets/logowithouttagline.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>My Services</Text>
              <Text style={styles.headerSubtitle}>Services assigned to you</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4A90E2']}
                tintColor="#4A90E2"
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {/* Store Header Card */}
            {shop && (
              <View style={styles.storeCard}>
                {shop.logo_url ? (
                  <Image source={{ uri: shop.logo_url }} style={styles.storeLogo} />
                ) : (
                  <View style={[styles.storeLogo, styles.storeLogoPlaceholder]}>
                    <Ionicons name="storefront" size={32} color="#FFF" />
                  </View>
                )}
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{shop.name}</Text>
                  <View style={styles.storeAddressRow}>
                    <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.storeAddress}>{shop.address}, {shop.city}</Text>
                  </View>
                  {shop.phone && (
                    <View style={styles.storeAddressRow}>
                      <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.storeAddress}>{shop.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Services Section */}
            <View style={styles.servicesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Assigned Services</Text>
                <View style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeText}>{services.length}</Text>
                </View>
              </View>

              {services.length > 0 ? (
                <View style={styles.servicesList}>
                  {services.map((service, index) => renderServiceCard(service, index))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="cut-outline" size={50} color="#DDD" />
                  </View>
                  <Text style={styles.emptyTitle}>No Services Assigned</Text>
                  <Text style={styles.emptyText}>
                    Your manager hasn't assigned any services to you yet.
                  </Text>
                  <Text style={styles.emptyText}>
                    Contact them to get started!
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  storeLogoPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
    marginLeft: 15,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  storeAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  storeAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  servicesSection: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  serviceBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceDetails: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#999',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 22,
  },
});

export default ProviderServicesScreen;
