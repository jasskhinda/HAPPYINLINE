// ============================================
// MULTI-SHOP AUTH HELPERS
// Updated authentication functions for multi-shop support
// ============================================

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// MULTI-SHOP FUNCTIONS
// ============================================

/**
 * Get all shops that the current user belongs to
 * @returns {Promise<{success: boolean, shops?: Array, error?: string}>}
 */
export const getUserShops = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's shops using the helper function
    const { data: shops, error } = await supabase
      .rpc('get_user_shops', { user_id: user.id });

    if (error) {
      console.error('❌ Error fetching user shops:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Fetched user shops:', shops);
    return { success: true, shops: shops || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current shop ID from AsyncStorage
 * @returns {Promise<string|null>}
 */
export const getCurrentShopId = async () => {
  try {
    const shopId = await AsyncStorage.getItem('current_shop_id');
    return shopId;
  } catch (error) {
    console.error('❌ Error getting current shop ID:', error);
    return null;
  }
};

/**
 * Set current shop ID in AsyncStorage
 * @param {string} shopId - Shop ID to set as current
 * @returns {Promise<boolean>}
 */
export const setCurrentShopId = async (shopId) => {
  try {
    if (shopId) {
      await AsyncStorage.setItem('current_shop_id', shopId);
    } else {
      await AsyncStorage.removeItem('current_shop_id');
    }
    return true;
  } catch (error) {
    console.error('❌ Error setting current shop ID:', error);
    return false;
  }
};

/**
 * Get current user's role in a specific shop
 * @param {string} shopId - Shop ID
 * @returns {Promise<{success: boolean, role?: string, error?: string}>}
 */
export const getUserShopRole = async (shopId) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: role, error } = await supabase
      .rpc('get_user_shop_role', { 
        user_id: user.id, 
        shop_id: shopId 
      });

    if (error) {
      console.error('❌ Error fetching user shop role:', error);
      return { success: false, error: error.message };
    }

    return { success: true, role };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a new shop
 * @param {Object} shopData - Shop details
 * @returns {Promise<{success: boolean, shop?: Object, error?: string}>}
 */
export const createShop = async (shopData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: shop, error } = await supabase
      .from('shops')
      .insert({
        name: shopData.name,
        description: shopData.description,
        address: shopData.address,
        phone: shopData.phone,
        email: shopData.email,
        website: shopData.website,
        owner_id: user.id,
        business_hours: shopData.business_hours || {
          "monday": {"open": "09:00", "close": "18:00", "closed": false},
          "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
          "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
          "thursday": {"open": "09:00", "close": "18:00", "closed": false},
          "friday": {"open": "09:00", "close": "18:00", "closed": false},
          "saturday": {"open": "09:00", "close": "17:00", "closed": false},
          "sunday": {"open": "10:00", "close": "16:00", "closed": false}
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating shop:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Shop created successfully:', shop);
    
    // Set as current shop if user has no current shop
    const currentShop = await getCurrentShopId();
    if (!currentShop) {
      await setCurrentShopId(shop.id);
    }

    return { success: true, shop };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get shop details by ID
 * @param {string} shopId - Shop ID
 * @returns {Promise<{success: boolean, shop?: Object, error?: string}>}
 */
export const getShopDetails = async (shopId) => {
  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select(`
        *,
        owner:profiles!shops_owner_id_fkey(id, name, email, profile_image)
      `)
      .eq('id', shopId)
      .single();

    if (error) {
      console.error('❌ Error fetching shop details:', error);
      return { success: false, error: error.message };
    }

    return { success: true, shop };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get shop services
 * @param {string} shopId - Shop ID
 * @returns {Promise<{success: boolean, services?: Array, error?: string}>}
 */
export const getShopServices = async (shopId) => {
  try {
    const { data: services, error } = await supabase
      .from('shop_services')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Error fetching shop services:', error);
      return { success: false, error: error.message };
    }

    return { success: true, services: services || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get shop barbers
 * @param {string} shopId - Shop ID
 * @returns {Promise<{success: boolean, barbers?: Array, error?: string}>}
 */
export const getShopBarbers = async (shopId) => {
  try {
    const { data: barbers, error } = await supabase
      .from('shop_members')
      .select(`
        user_id,
        role,
        is_active,
        user:profiles!shop_members_user_id_fkey(
          id,
          name,
          email,
          profile_image,
          bio,
          rating,
          total_reviews,
          phone
        )
      `)
      .eq('shop_id', shopId)
      .eq('role', 'barber')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching shop barbers:', error);
      return { success: false, error: error.message };
    }

    // Transform data structure
    const transformedBarbers = barbers?.map(member => ({
      ...member.user,
      shop_role: member.role
    })) || [];

    return { success: true, barbers: transformedBarbers };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Invite user to shop
 * @param {string} shopId - Shop ID
 * @param {string} email - User email to invite
 * @param {string} role - Role to assign (barber, manager, staff)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const inviteUserToShop = async (shopId, email, role) => {
  try {
    // First, check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error checking user:', userError);
      return { success: false, error: userError.message };
    }

    if (!existingUser) {
      return { success: false, error: 'User with this email does not exist. They need to create an account first.' };
    }

    // Check if already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('shop_members')
      .select('id')
      .eq('shop_id', shopId)
      .eq('user_id', existingUser.id)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('❌ Error checking membership:', memberError);
      return { success: false, error: memberError.message };
    }

    if (existingMember) {
      return { success: false, error: 'User is already a member of this shop.' };
    }

    // Add user to shop
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { error: insertError } = await supabase
      .from('shop_members')
      .insert({
        shop_id: shopId,
        user_id: existingUser.id,
        role: role,
        invited_by: currentUser?.id,
        permissions: getDefaultPermissions(role)
      });

    if (insertError) {
      console.error('❌ Error inviting user:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('✅ User invited successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get default permissions for a role
 * @param {string} role - Role name
 * @returns {Object} - Permissions object
 */
const getDefaultPermissions = (role) => {
  switch (role) {
    case 'owner':
      return {
        can_manage_bookings: true,
        can_edit_services: true,
        can_manage_staff: true,
        can_edit_shop: true
      };
    case 'manager':
      return {
        can_manage_bookings: true,
        can_edit_services: true,
        can_manage_staff: true,
        can_edit_shop: false
      };
    case 'barber':
      return {
        can_manage_bookings: false,
        can_edit_services: false,
        can_manage_staff: false,
        can_edit_shop: false
      };
    case 'staff':
      return {
        can_manage_bookings: false,
        can_edit_services: false,
        can_manage_staff: false,
        can_edit_shop: false
      };
    default:
      return {};
  }
};

/**
 * Get bookings for specific shop
 * @param {string} shopId - Shop ID
 * @param {Object} filters - Optional filters (status, date, etc.)
 * @returns {Promise<{success: boolean, bookings?: Array, error?: string}>}
 */
export const getShopBookings = async (shopId, filters = {}) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(id, name, email, phone, profile_image),
        barber:profiles!bookings_barber_id_fkey(id, name, email, phone, profile_image)
      `)
      .eq('shop_id', shopId);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.barber_id) {
      query = query.eq('barber_id', filters.barber_id);
    }
    if (filters.date) {
      query = query.eq('appointment_date', filters.date);
    }

    query = query.order('appointment_date', { ascending: true })
                  .order('appointment_time', { ascending: true });

    const { data: bookings, error } = await query;

    if (error) {
      console.error('❌ Error fetching shop bookings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, bookings: bookings || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create booking for shop
 * @param {Object} bookingData - Booking details including shop_id
 * @returns {Promise<{success: boolean, booking?: Object, error?: string}>}
 */
export const createShopBooking = async (bookingData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const bookingPayload = {
      customer_id: user.id,
      shop_id: bookingData.shop_id,
      barber_id: bookingData.barber_id, // Can be null for shop-only booking
      services: bookingData.services,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      total_amount: bookingData.total_amount,
      customer_notes: bookingData.customer_notes || null,
      status: 'pending'
    };

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(bookingPayload)
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(id, name, email, phone),
        barber:profiles!bookings_barber_id_fkey(id, name, email, phone),
        shop:shops!bookings_shop_id_fkey(id, name, address, phone)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating booking:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Booking created successfully:', booking);
    return { success: true, booking };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user needs to select a shop
 * @returns {Promise<boolean>}
 */
export const needsShopSelection = async () => {
  try {
    const currentShopId = await getCurrentShopId();
    if (!currentShopId) {
      const { success, shops } = await getUserShops();
      return success && shops && shops.length > 0;
    }
    return false;
  } catch (error) {
    console.error('❌ Error checking shop selection need:', error);
    return false;
  }
};

/**
 * Clear all shop-related data (logout helper)
 */
export const clearShopData = async () => {
  try {
    await AsyncStorage.removeItem('current_shop_id');
    console.log('✅ Shop data cleared');
  } catch (error) {
    console.error('❌ Error clearing shop data:', error);
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

// Export existing auth functions (to be imported from original auth.js)
export * from './auth';

// Export new multi-shop functions
export {
  getUserShops,
  getCurrentShopId,
  setCurrentShopId,
  getUserShopRole,
  createShop,
  getShopDetails,
  getShopServices,
  getShopBarbers,
  inviteUserToShop,
  getShopBookings,
  createShopBooking,
  needsShopSelection,
  clearShopData
};