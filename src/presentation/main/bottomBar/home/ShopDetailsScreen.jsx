import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  Switch,
  Animated,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import SelectableServiceItem from '../../../../components/services/SelectableServiceItem';
import {
  getShopDetails,
  getShopStaff,
  getShopServices,
  getShopReviews,
  getUserRoleInShop,
  deleteShop,
  toggleShopStatus,
  isShopOpen
} from '../../../../lib/shopAuth';
import { getCurrentUser } from '../../../../lib/auth';
import { getOrCreateConversation } from '../../../../lib/messaging';
import { supabase } from '../../../../lib/supabase';

const ShopDetailsScreen = ({ route, navigation }) => {
  const { shopId } = route.params;
  
  // Default avatar for users without profile image
  const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=007AFF&color=fff&size=200';
  
  const [shop, setShop] = useState(null);
  const [staff, setStaff] = useState([]);
  const [managers, setManagers] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'services', title: 'Services' },
    { key: 'reviews', title: 'Reviews' },
    { key: 'about', title: 'About' },
  ]);

  // Service selection state
  const [selectedServices, setSelectedServices] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShopData();
  }, [shopId]);

  const loadShopData = async () => {
    try {
      setLoading(true);

      // Check if user is super admin
      const { user, profile } = await getCurrentUser();
      if (profile && profile.is_super_admin) {
        console.log('👑 Super Admin viewing shop - read-only mode');
        setIsSuperAdmin(true);
      }

      // Load shop details
      const { success: shopSuccess, shop: shopData } = await getShopDetails(shopId);
      if (shopSuccess && shopData) {
        setShop(shopData);
      }

      // Load staff (managers and barbers)
      const { success: staffSuccess, staff: staffData } = await getShopStaff(shopId);
      if (staffSuccess && staffData) {
        setStaff(staffData);
        // Separate managers and barbers
        // Managers are those with 'admin' role in shop_staff (includes both owners and managers)
        const managersData = staffData.filter(s => s.role === 'admin' || s.role === 'manager');
        const barbersData = staffData.filter(s => s.role === 'barber');
        setManagers(managersData);
        setBarbers(barbersData);
      }

      // Load services
      const { success: servicesSuccess, services: servicesData } = await getShopServices(shopId);
      if (servicesSuccess) {
        setServices(servicesData || []);
      }

      // Load reviews
      const { success: reviewsSuccess, reviews: reviewsData } = await getShopReviews(shopId);
      if (reviewsSuccess) {
        setReviews(reviewsData || []);
      }

      // Check user role in shop
      const { success: roleSuccess, role } = await getUserRoleInShop(shopId);
      if (roleSuccess) {
        setUserRole(role);
      }

    } catch (error) {
      console.error('Error loading shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadShopData();
    setRefreshing(false);
  };

  // Handle service selection toggle
  const handleServiceToggle = (service) => {
    setSelectedServices((prev) => {
      const isSelected = prev.some(s => s.id === service.id);
      let newSelection;
      
      if (isSelected) {
        newSelection = prev.filter(s => s.id !== service.id);
      } else {
        newSelection = [...prev, service];
      }
      
      // Calculate totals
      const price = newSelection.reduce((sum, s) => sum + Number(s.price), 0);
      const duration = newSelection.reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
      
      setTotalPrice(price);
      setTotalDuration(duration);
      
      return newSelection;
    });
  };

  const handleBookNow = (service = null, barber = null) => {
    // Check if user is shop staff (admin, manager, or barber)
    if (userRole && (userRole === 'admin' || userRole === 'manager' || userRole === 'barber')) {
      Alert.alert(
        'Staff Member',
        'You are a shop staff member and cannot book appointments at your own shop.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    navigation.navigate('BookingConfirmationScreen', {
      shopId,
      shopName: shop?.name,
      selectedServices: selectedServices.length > 0 ? selectedServices : (service ? [service] : []),
      selectedBarber: barber
    });
  };

  const handleManageShop = () => {
    navigation.navigate('ShopManagementScreen', { shopId });
  };

  // Handle message shop button
  const handleMessageShop = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser?.id) {
        Alert.alert('Please log in', 'You need to be logged in to message this shop');
        return;
      }

      console.log('🔍 Looking for shop admin/manager for shopId:', shopId);

      // Get shop owner/manager ID from shop staff (try admin first, then manager)
      const { data: ownerData, error: queryError } = await supabase
        .from('shop_staff')
        .select('user_id, role')
        .eq('shop_id', shopId)
        .in('role', ['admin', 'manager'])
        .eq('is_active', true)
        .order('role', { ascending: true }) // admin first, then manager
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found

      console.log('📊 Query result:', { ownerData, queryError });

      if (queryError) {
        console.error('❌ Query error:', queryError);
        Alert.alert('Error', 'Database error: ' + queryError.message);
        return;
      }

      if (!ownerData) {
        console.error('❌ No admin/manager found for shop:', shopId);
        Alert.alert('Error', 'Could not find shop owner or manager');
        return;
      }

      console.log('✅ Found admin/manager:', ownerData);

      // Create or get existing conversation
      const conversation = await getOrCreateConversation(currentUser.id, ownerData.user_id, shopId);

      if (conversation) {
        console.log('✅ Conversation created/found:', conversation.id);
        // Navigate to chat conversation screen
        navigation.navigate('ChatConversationScreen', {
          conversationId: conversation.id,
          recipientName: shop.name,
          recipientId: ownerData.user_id,
        });
      }
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      Alert.alert('Error', 'Could not start conversation: ' + error.message);
    }
  };

  // Handle manual shop status toggle
  const handleToggleShopStatus = async (newValue) => {
    try {
      setIsTogglingStatus(true);
      const isClosed = !newValue; // true = shop is open, false = shop is closed

      const { success, error } = await toggleShopStatus(shopId, isClosed);

      if (success) {
        // Update local state
        setShop(prev => ({
          ...prev,
          is_manually_closed: isClosed
        }));

        const statusMessage = newValue
          ? '✅ Shop is now OPEN for business'
          : '🔒 Shop is now CLOSED';

        Alert.alert('Status Updated', statusMessage, [{ text: 'OK' }]);
      } else {
        Alert.alert('Error', error || 'Failed to update shop status');
      }
    } catch (err) {
      console.error('Toggle shop status error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Super Admin: Suspend/Resume Shop
  const handleSuspendShop = async () => {
    const action = shop.is_manually_closed ? 'Resume' : 'Suspend';
    const message = shop.is_manually_closed
      ? 'This will make the shop visible to customers and allow bookings.'
      : 'This will hide the shop from customers and prevent new bookings.';

    Alert.alert(
      `${action} Shop?`,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: shop.is_manually_closed ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setIsTogglingStatus(true);
              const isClosed = !shop.is_manually_closed;

              const { success, error } = await toggleShopStatus(shopId, isClosed);

              if (success) {
                setShop(prev => ({
                  ...prev,
                  is_manually_closed: isClosed
                }));

                Alert.alert(
                  'Success',
                  isClosed ? '🔒 Shop has been suspended' : '✅ Shop has been resumed',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', error || `Failed to ${action.toLowerCase()} shop`);
              }
            } catch (err) {
              console.error('Suspend shop error:', err);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsTogglingStatus(false);
            }
          }
        }
      ]
    );
  };

  // Super Admin: Delete Shop Permanently
  const handleDeleteShopAsAdmin = async () => {
    Alert.alert(
      '⚠️ Delete Shop Permanently?',
      `Are you sure you want to delete "${shop?.name}"?\n\nThis will:\n• Remove the shop permanently\n• Delete all staff associations\n• Cancel all bookings\n• This action CANNOT be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { success, error } = await deleteShop(shopId);

              if (success) {
                Alert.alert(
                  'Shop Deleted',
                  `${shop?.name} has been permanently deleted.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                Alert.alert('Error', error || 'Failed to delete shop');
              }
            } catch (err) {
              console.error('Delete shop error:', err);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          }
        }
      ]
    );
  };

  const handleMessageManager = () => {
    // Find the shop manager
    const manager = managers.find(m => m.role === 'manager' || m.role === 'admin');

    if (!manager) {
      Alert.alert('No Manager Found', 'This shop does not have a manager assigned yet.');
      return;
    }

    // Navigate to messaging screen with manager info
    navigation.navigate('SuperAdminChatScreen', {
      shopId: shopId,
      shopName: shop?.name,
      managerId: manager.user_id,
      managerName: manager.user?.name || 'Shop Manager',
      managerEmail: manager.user?.email,
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  // Format operating days for display
  const formatOperatingDays = (operatingDays) => {
    if (!operatingDays) return 'Not set';
    
    const days = Array.isArray(operatingDays) 
      ? operatingDays 
      : JSON.parse(operatingDays || '[]');
    
    if (days.length === 0) return 'Closed';
    if (days.length === 7) return 'All week';
    
    const dayNames = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };
    
    return days.map(d => dayNames[d] || d).join(', ');
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Services Tab with Selection
  const ServicesRoute = () => (
    <View style={styles.tabContainer}>
      <ScrollView 
        style={styles.tabContent}
        contentContainerStyle={{ paddingBottom: selectedServices.length > 0 ? 180 : 20 }}
      >
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cut-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>No services available</Text>
            {userRole && ['admin', 'manager'].includes(userRole) && !isSuperAdmin && (
              <TouchableOpacity
                style={styles.addServiceButton}
                onPress={() => navigation.navigate('ServiceManagementScreen', { shopId })}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.addServiceText}>Add Services</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.servicesListContainer}>
            <View style={styles.servicesHeader}>
              <Text style={styles.sectionTitle}>
                {isSuperAdmin ? 'Services Offered:' : 'Select services for your appointment:'}
              </Text>
              {userRole && ['admin', 'manager'].includes(userRole) && !isSuperAdmin && (
                <TouchableOpacity
                  style={styles.manageServicesButton}
                  onPress={() => navigation.navigate('ServiceManagementScreen', { shopId })}
                >
                  <Ionicons name="settings-outline" size={20} color="#007AFF" />
                  <Text style={styles.manageServicesText}>Manage</Text>
                </TouchableOpacity>
              )}
            </View>
            {services.map((service) => (
              isSuperAdmin ? (
                // Read-only view for super admin
                <View key={service.id} style={styles.serviceItemReadOnly}>
                  <View style={styles.serviceIconContainer}>
                    {service.icon_url ? (
                      <Image source={{ uri: service.icon_url }} style={styles.serviceIcon} />
                    ) : (
                      <Ionicons name="cut-outline" size={24} color="#007AFF" />
                    )}
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                    <Text style={styles.servicePrice}>${service.price} • {service.duration_minutes} min</Text>
                  </View>
                </View>
              ) : (
                // Selectable view for customers/managers
                <SelectableServiceItem
                  key={service.id}
                  service={service}
                  selected={selectedServices.some(s => s.id === service.id)}
                  onToggle={handleServiceToggle}
                />
              )
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  // Staff Tab - Shows Managers and Barbers
  const StaffRoute = () => (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: selectedServices.length > 0 ? 180 : 20 }}
    >
      {/* Managers Section */}
      {userRole && ['admin', 'manager', 'barber'].includes(userRole) && (
        <View style={styles.staffSection}>
        <View style={styles.staffSectionHeader}>
          <Text style={styles.staffSectionTitle}>Managers</Text>
          {userRole && userRole === 'admin' && (
            <TouchableOpacity 
              style={styles.manageIconButton}
              onPress={() => navigation.navigate('StaffManagementScreen', { shopId, section: 'managers' })}
            >
              <Ionicons name="settings-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
        {managers.length === 0 ? (
          <View style={styles.emptyStaffState}>
            <Ionicons name="people-outline" size={40} color="#DDD" />
            <Text style={styles.emptyStaffText}>No managers yet</Text>
          </View>
        ) : (
          managers.map((manager) => (
            <View key={manager.id} style={styles.staffCard}>
              {manager.user?.profile_image ? (
                <Image
                  source={{ uri: manager.user.profile_image }}
                  style={styles.staffImage}
                />
              ) : (
                <View style={styles.defaultAvatarContainer}>
                  <Ionicons name="person" size={30} color="#007AFF" />
                </View>
              )}
              <View style={styles.staffInfo}>
                <View style={styles.staffNameRow}>
                  <Text style={styles.staffName}>{manager.user?.name}</Text>
                  <View style={styles.roleChip}>
                    <Text style={styles.roleChipText}>{manager.role.toUpperCase()}</Text>
                  </View>
                </View>
                {manager.user?.email && (
                  <Text style={styles.staffEmail}>{manager.user.email}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
      )}

      {/* Team Section */}
      <View style={styles.staffSection}>
        <View style={styles.staffSectionHeader}>
          <Text style={styles.staffSectionTitle}>Team</Text>
          {userRole && ['admin', 'manager'].includes(userRole) && !isSuperAdmin && (
            <TouchableOpacity
              style={styles.manageIconButton}
              onPress={() => navigation.navigate('StaffManagementScreen', { shopId, section: 'barbers' })}
            >
              <Ionicons name="settings-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
        {barbers.length === 0 ? (
          <View style={styles.emptyStaffState}>
            <Ionicons name="people-outline" size={40} color="#DDD" />
            <Text style={styles.emptyStaffText}>No team members yet</Text>
          </View>
        ) : (
          barbers.map((barber) => (
            <TouchableOpacity
              key={barber.id}
              style={styles.staffCard}
              onPress={() => {
                if (isSuperAdmin) {
                  // For super admin, just show an alert with barber info (no booking)
                  Alert.alert(
                    barber.user?.name || 'Barber',
                    `Email: ${barber.user?.email || 'N/A'}\n${barber.bio || 'No bio available'}`,
                    [{ text: 'OK' }]
                  );
                } else {
                  // For customers, book appointment with this barber
                  handleBookNow(null, barber);
                }
              }}
            >
              {barber.user?.profile_image ? (
                <Image
                  source={{ uri: barber.user.profile_image }}
                  style={styles.staffImage}
                />
              ) : (
                <View style={styles.defaultAvatarContainer}>
                  <Ionicons name="person" size={30} color="#FF6B35" />
                </View>
              )}
              <View style={styles.staffInfo}>
                <View style={styles.staffNameRow}>
                  <Text style={styles.staffName}>{barber.user?.name}</Text>
                  <View style={[styles.roleChip, styles.barberRoleChip]}>
                    <Text style={styles.roleChipText}>BARBER</Text>
                  </View>
                </View>
                {barber.user?.email && (
                  <Text style={styles.staffEmail}>{barber.user.email}</Text>
                )}
                {barber.bio && (
                  <Text style={styles.staffBio} numberOfLines={2}>{barber.bio}</Text>
                )}
                {barber.specialties && barber.specialties.length > 0 && (
                  <View style={styles.specialtiesContainer}>
                    {barber.specialties.slice(0, 3).map((specialty, index) => (
                      <View key={index} style={styles.specialtyChip}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {barber.rating > 0 && (
                  <View style={styles.barberRating}>
                    {renderStars(Math.round(barber.rating))}
                    <Text style={styles.barberRatingText}>
                      {barber.rating.toFixed(1)} ({barber.total_reviews})
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Reviews Tab
  const ReviewsRoute = () => (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: selectedServices.length > 0 ? 180 : 20 }}
    >
      {reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={60} color="#DDD" />
          <Text style={styles.emptyText}>No reviews yet</Text>
        </View>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              {review.customer?.profile_image ? (
                <Image
                  source={{ uri: review.customer.profile_image }}
                  style={styles.reviewerImage}
                />
              ) : (
                <View style={styles.defaultReviewerAvatar}>
                  <Ionicons name="person" size={20} color="#999" />
                </View>
              )}
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>{review.customer?.name || 'Anonymous'}</Text>
                <View style={styles.reviewStars}>
                  {renderStars(Math.round(review.rating))}
                </View>
              </View>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString()}
              </Text>
            </View>
            {review.review_text && (
              <Text style={styles.reviewText}>{review.review_text}</Text>
            )}
            {review.barber && (
              <Text style={styles.reviewBarber}>Barber: {review.barber.name}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  // About Tab
  const AboutRoute = () => (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={{ paddingBottom: selectedServices.length > 0 ? 180 : 20 }}
    >
      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>Description</Text>
        <Text style={styles.aboutText}>
          {shop?.description || 'No description available'}
        </Text>
      </View>

      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>Address</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={20} color="#007AFF" />
          <Text style={styles.aboutText}>{shop?.address}</Text>
        </View>
      </View>

      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>Contact</Text>
        <View style={styles.contactRow}>
          <Ionicons name="call" size={20} color="#007AFF" />
          <Text style={styles.aboutText}>{shop?.phone}</Text>
        </View>
      </View>

      {shop?.business_hours && (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>Business Hours</Text>
          {Object.entries(JSON.parse(JSON.stringify(shop.business_hours))).map(([day, hours]) => (
            <View key={day} style={styles.hoursRow}>
              <Text style={styles.dayText}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
              <Text style={styles.hoursText}>
                {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderScene = SceneMap({
    services: ServicesRoute,
    staff: StaffRoute,
    reviews: ReviewsRoute,
    about: AboutRoute,
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading shop...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{shop?.name || 'Shop Details'}</Text>
        {userRole === 'admin' && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('ShopSettingsScreen', { shopId })}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        {userRole !== 'admin' && <View style={{ width: 24 }} />}
      </View>

      {/* Scrollable Content with Tabs */}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {/* Shop Cover and Info - Scrollable */}
        <View>
          {/* Shop Cover */}
          <View style={styles.coverContainer}>
            {shop?.cover_image_url || shop?.logo_url ? (
              <Image
                source={{ uri: shop.cover_image_url || shop.logo_url }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverImage, styles.placeholderCover]}>
                <Ionicons name="storefront" size={60} color="#999" />
              </View>
            )}
          </View>

          {/* Shop Info */}
          <View style={styles.shopInfoContainer}>
            <View style={styles.shopTitleRow}>
              <Text style={styles.shopTitle}>{shop?.name}</Text>
              {shop?.is_verified && (
                <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              )}
            </View>
            
            {shop?.rating > 0 && (
              <View style={styles.ratingRow}>
                {renderStars(Math.round(shop.rating))}
                <Text style={styles.ratingText}>
                  {shop.rating.toFixed(1)} ({shop.total_reviews} reviews)
                </Text>
              </View>
            )}

            {isSuperAdmin ? (
              <View style={[styles.roleBadge, { backgroundColor: '#FFF3E0', borderColor: '#FF6B35' }]}>
                <Ionicons name="shield-checkmark" size={16} color="#FF6B35" />
                <Text style={[styles.roleBadgeText, { color: '#FF6B35', marginLeft: 6 }]}>
                  SUPER ADMIN (View Only)
                </Text>
              </View>
            ) : userRole && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  Your Role: {userRole.toUpperCase()}
                </Text>
              </View>
            )}

            {/* Operating Hours - Show to Everyone */}
            {shop && shop.operating_days && shop.opening_time && shop.closing_time && (
              <View style={styles.operatingHoursCard}>
                <View style={styles.hoursHeader}>
                  <Ionicons name="time-outline" size={20} color="#FF6B35" />
                  <Text style={styles.hoursTitle}>Operating Hours</Text>
                </View>
                <View style={styles.hoursDetails}>
                  <View style={styles.hoursRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.hoursLabel}>Days:</Text>
                    <Text style={styles.hoursValue}>{formatOperatingDays(shop.operating_days)}</Text>
                  </View>
                  <View style={styles.hoursRow}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.hoursLabel}>Hours:</Text>
                    <Text style={styles.hoursValue}>
                      {formatTime(shop.opening_time)} - {formatTime(shop.closing_time)}
                    </Text>
                  </View>
                </View>
                <View style={styles.hoursNote}>
                  <Ionicons name="information-circle-outline" size={14} color="#999" />
                  <Text style={styles.hoursNoteText}>
                    These are regular operating hours. Actual availability may vary.
                  </Text>
                </View>
              </View>
            )}

            {/* Admin/Manager Toggle - Manual Open/Close - HIDE FOR SUPER ADMIN */}
            {userRole && ['admin', 'manager'].includes(userRole) && !isSuperAdmin && shop && (
              <View style={styles.shopStatusControlCard}>
                <View style={styles.statusHeader}>
                  <View style={styles.statusIconContainer}>
                    <Ionicons 
                      name={!shop.is_manually_closed ? "radio-button-on" : "radio-button-off"} 
                      size={32} 
                      color={!shop.is_manually_closed ? "#4CAF50" : "#FF4444"} 
                    />
                  </View>
                  <View style={styles.statusInfoContainer}>
                    <Text style={styles.statusTitle}>
                      {!shop.is_manually_closed ? 'Shop is OPEN' : 'Shop is CLOSED'}
                    </Text>
                    <Text style={styles.statusSubtitle}>
                      {!shop.is_manually_closed 
                        ? 'Customers can book appointments' 
                        : 'Not accepting bookings'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleActionText}>
                    {!shop.is_manually_closed ? 'Close Shop' : 'Open Shop'}
                  </Text>
                  <Switch
                    value={!shop.is_manually_closed}
                    onValueChange={handleToggleShopStatus}
                    disabled={isTogglingStatus}
                    trackColor={{ false: '#FFB3B3', true: '#81C784' }}
                    thumbColor={!shop.is_manually_closed ? '#4CAF50' : '#FF4444'}
                    ios_backgroundColor="#FFB3B3"
                  />
                </View>
              </View>
            )}

            {/* Shop Status and Message Button for Customers */}
            {(!userRole || !['admin', 'manager'].includes(userRole)) && !isSuperAdmin && shop && (
              <View style={styles.customerActionsContainer}>
                <View style={[
                  styles.customerStatusBadge,
                  !shop.is_manually_closed ? styles.statusOpen : styles.statusClosed
                ]}>
                  <Ionicons
                    name={!shop.is_manually_closed ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={!shop.is_manually_closed ? "#4CAF50" : "#FF4444"}
                  />
                  <Text style={[
                    styles.customerStatusText,
                    !shop.is_manually_closed ? { color: '#4CAF50' } : { color: '#FF4444' }
                  ]}>
                    {!shop.is_manually_closed ? 'OPEN NOW' : 'CURRENTLY CLOSED'}
                  </Text>
                </View>

                {/* Message Shop Button */}
                <TouchableOpacity
                  style={styles.messageShopButton}
                  onPress={handleMessageShop}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
                  <Text style={styles.messageShopButtonText}>Message Shop</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Super Admin Actions */}
            {isSuperAdmin && shop && (
              <View style={styles.superAdminActionsCard}>
                <View style={styles.adminActionsHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#FF6B35" />
                  <Text style={styles.adminActionsTitle}>Admin Actions</Text>
                </View>

                <View style={styles.adminActionsButtons}>
                  {/* Suspend/Resume Shop */}
                  <TouchableOpacity
                    style={[styles.adminActionButton, styles.suspendButton]}
                    onPress={() => handleSuspendShop()}
                  >
                    <Ionicons
                      name={shop.is_manually_closed ? "play-circle" : "pause-circle"}
                      size={20}
                      color="#FF9800"
                    />
                    <Text style={styles.adminActionButtonText}>
                      {shop.is_manually_closed ? 'Resume Shop' : 'Suspend Shop'}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Shop */}
                  <TouchableOpacity
                    style={[styles.adminActionButton, styles.deleteButton]}
                    onPress={() => handleDeleteShopAsAdmin()}
                  >
                    <Ionicons name="trash" size={20} color="#F44336" />
                    <Text style={styles.adminActionButtonText}>Delete Shop</Text>
                  </TouchableOpacity>
                </View>

                {/* Message Manager Button */}
                <TouchableOpacity
                  style={[styles.adminActionButton, styles.messageButton]}
                  onPress={() => handleMessageManager()}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#007AFF" />
                  <Text style={styles.adminActionButtonText}>Message Manager</Text>
                </TouchableOpacity>

                <View style={styles.adminActionsNote}>
                  <Ionicons name="information-circle-outline" size={14} color="#999" />
                  <Text style={styles.adminActionsNoteText}>
                    Suspended shops are hidden from customers. Deleted shops are permanently removed.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Sticky Tab Bar */}
        <View style={styles.stickyTabBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {routes.map((route, i) => (
              <TouchableOpacity
                key={route.key}
                style={[
                  styles.customTab,
                  index === i && styles.customTabActive
                ]}
                onPress={() => setIndex(i)}
              >
                <Text style={[
                  styles.customTabText,
                  index === i && styles.customTabTextActive
                ]}>
                  {route.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {index === 0 && <ServicesRoute />}
          {index === 1 && <StaffRoute />}
          {index === 2 && <ReviewsRoute />}
          {index === 3 && <AboutRoute />}
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar - Booking Summary (Always visible when services selected) - HIDE FOR SUPER ADMIN */}
      {selectedServices.length > 0 && !isSuperAdmin && (
        <SafeAreaView edges={['bottom']} style={styles.fixedBottomBarContainer}>
          <View style={styles.bookingBottomBar}>
            <View style={styles.bookingSummary}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summarySubLabel}>Total Price</Text>
                <Text style={styles.summaryLabel}>{selectedServices.length} service(s) selected</Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryValue}>${totalPrice}</Text>
              </View>
            </View>

            {/* Show different button based on shop status */}
            {shop && !shop.is_manually_closed ? (
              <TouchableOpacity
                style={styles.bookAppointmentButton}
                onPress={() => handleBookNow()}
              >
                <Text style={styles.bookAppointmentText}>Book Now</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.shopClosedButton}>
                <Ionicons name="lock-closed" size={20} color="#999" />
                <Text style={styles.shopClosedButtonText}>Shop is Closed</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsButton: {
    padding: 4,
  },
  coverContainer: {
    width: '100%',
    height: 200,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfoContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  roleBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
  },
  tabIndicator: {
    backgroundColor: '#007AFF',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  bookButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  barberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  barberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  barberInfo: {
    flex: 1,
  },
  barberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  barberBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  specialtyChip: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  specialtyText: {
    fontSize: 12,
    color: '#007AFF',
  },
  barberRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barberRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  defaultReviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  // Service Selection Styles
  tabContainer: {
    flex: 1,
    position: 'relative',
  },
  servicesListContainer: {
    paddingTop: 10,
  },
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  manageServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  manageServicesText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 20,
  },
  addServiceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Bottom Booking Bar
  bookingBottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3A3A3A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 12,
  },
  fixedBottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3A3A3A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 12,
  },
  bookingBottomBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  bookingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  summaryRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#AAAAAA',
    marginBottom: 4,
    fontWeight: '500',
  },
  summarySubLabel: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bookAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 18,
  },
  bookAppointmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shopClosedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A4A4A',
    paddingVertical: 14,
    borderRadius: 18,
    opacity: 0.6,
  },
  shopClosedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginLeft: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewBarber: {
    fontSize: 12,
    color: '#007AFF',
  },
  aboutSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  hoursText: {
    fontSize: 14,
    color: '#666',
  },
  // Staff Section Styles
  staffSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingBottom: 16,
  },
  staffSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  staffSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addIconButton: {
    padding: 4,
  },
  manageIconButton: {
    padding: 4,
  },
  emptyStaffState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStaffText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  staffImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  defaultAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  staffInfo: {
    flex: 1,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  roleChip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  barberRoleChip: {
    backgroundColor: '#FF6B35',
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  staffEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  staffBio: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  shopStatusControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIconContainer: {
    marginRight: 15,
  },
  statusInfoContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  toggleActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  scheduleText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  manualToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  toggleSubtext: {
    fontSize: 13,
    color: '#666',
  },
  // New styles for scrollable layout
  scrollContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  operatingHoursCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  hoursDetails: {
    marginLeft: 28,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hoursLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 50,
  },
  hoursValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  hoursNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  hoursNoteText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 6,
    flex: 1,
  },
  customerActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  customerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  statusOpen: {
    backgroundColor: '#E8F5E9',
  },
  statusClosed: {
    backgroundColor: '#FFEBEE',
  },
  customerStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  messageShopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stickyTabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  customTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderRadius: 8,
  },
  customTabActive: {
    backgroundColor: '#007AFF',
  },
  customTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  customTabTextActive: {
    color: '#FFFFFF',
  },
  tabContentContainer: {
    flex: 1,
  },
  // Super Admin Read-Only Service Item Styles
  serviceItemReadOnly: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  // Super Admin Actions Card Styles
  superAdminActionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  adminActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 8,
  },
  adminActionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  adminActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  suspendButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  messageButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 12,
  },
  adminActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  adminActionsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 6,
  },
  adminActionsNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
});

export default ShopDetailsScreen;