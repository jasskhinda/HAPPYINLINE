// ============================================
// SHOP-FIRST AUTH & API FUNCTIONS
// Complete rewrite for multi-shop architecture
// ============================================

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// SHOP MANAGEMENT
// ============================================

/**
 * Get all shops (for browsing/discovery)
 * @param {Object} filters - Optional filters {city, search, minRating, status, includeAll}
 * @returns {Promise<{success: boolean, shops?: Array, error?: string}>}
 */
export const getAllShops = async (filters = {}) => {
  try {
    console.log('🔍 getAllShops called with filters:', JSON.stringify(filters));

    let query = supabase
      .from('shops')
      .select(`
        id,
        name,
        description,
        address,
        city,
        phone,
        logo_url,
        cover_image_url,
        rating,
        total_reviews,
        is_verified,
        operating_days,
        opening_time,
        closing_time,
        is_manually_closed,
        status,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Only filter by is_active if not requesting all shops (for admin use)
    if (!filters.includeAll) {
      console.log('📋 Filtering by is_active = true');
      query = query.eq('is_active', true);
    } else {
      console.log('📋 Including ALL shops (no is_active filter)');
    }

    // Apply filters
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }
    if (filters.status) {
      console.log('📋 Filtering by status:', filters.status);
      query = query.eq('status', filters.status);
    }

    const { data: shops, error } = await query;

    if (error) {
      console.error('❌ Error fetching shops:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ getAllShops returned ${shops?.length || 0} shops`);
    if (shops && shops.length > 0) {
      shops.forEach(s => console.log(`  - ${s.name} | status: ${s.status} | is_active: ${s.is_active}`));
    }

    return { success: true, shops: shops || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get single shop details
 * @param {string} shopId
 * @returns {Promise<{success: boolean, shop?: Object, error?: string}>}
 */
export const getShopDetails = async (shopId) => {
  try {
    // First get the shop data
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError) {
      console.error('❌ Error fetching shop details:', shopError);
      return { success: false, error: shopError.message };
    }

    // Then get owner data separately if created_by exists
    if (shop && shop.created_by) {
      const { data: owner, error: ownerError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, profile_image')
        .eq('id', shop.created_by)
        .single();

      if (!ownerError && owner) {
        shop.owner = owner;
      }
    }

    return { success: true, shop };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get shops where current user is staff
 * @returns {Promise<{success: boolean, shops?: Array, error?: string}>}
 */
export const getMyShops = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .rpc('get_user_shops', { p_user_id: user.id });

    if (error) {
      console.error('❌ Error fetching user shops:', error);
      return { success: false, error: error.message };
    }

    return { success: true, shops: data || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a new shop
 * @param {Object} shopData 
 * @returns {Promise<{success: boolean, shop?: Object, error?: string}>}
 */
export const createShop = async (shopData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user already owns a business (1 account = 1 business rule)
    const { data: existingShops, error: checkError } = await supabase
      .from('shops')
      .select('id, name')
      .eq('created_by', user.id)
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking existing shops:', checkError);
      return { success: false, error: 'Failed to verify business ownership' };
    }

    if (existingShops && existingShops.length > 0) {
      console.log('⚠️ User already owns a business:', existingShops[0].name);
      return {
        success: false,
        error: 'You already own a business. Each account can own one business only. If you need another business, please create a new account with a different email.'
      };
    }

    // NOTE: Subscription fields are now on the profiles table, not shops
    // The owner's profile already has subscription data from payment flow

    const { data: shop, error } = await supabase
      .from('shops')
      .insert({
        name: shopData.name,
        description: shopData.description,
        address: shopData.address,
        city: shopData.city,
        state: shopData.state,
        zip_code: shopData.zip_code,
        phone: shopData.phone,
        email: shopData.email,
        website: shopData.website,
        created_by: user.id,
        business_hours: shopData.business_hours,
        status: 'draft', // New shops start as draft, will be 'pending_review' after submission
        category_id: shopData.category_id,
        business_type_id: shopData.business_type_id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating shop:', error);
      return { success: false, error: error.message };
    }

    // Add creator as shop admin
    const { error: staffError } = await supabase
      .from('shop_staff')
      .insert({
        shop_id: shop.id,
        user_id: user.id,
        role: 'admin',
        is_active: true
      });

    if (staffError) {
      console.error('⚠️ Shop created but failed to add admin:', staffError);
    }

    // Set as current shop
    await setCurrentShopId(shop.id);

    console.log('✅ Shop created successfully:', shop.id);
    return { success: true, shop };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update shop details (admins only)
 * @param {string} shopId 
 * @param {Object} updates 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateShop = async (shopId, updates) => {
  try {
    const { error } = await supabase
      .from('shops')
      .update(updates)
      .eq('id', shopId);

    if (error) {
      console.error('❌ Error updating shop:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// SHOP STAFF MANAGEMENT
// ============================================

/**
 * Get shop barbers
 * @param {string} shopId 
 * @returns {Promise<{success: boolean, barbers?: Array, error?: string}>}
 */
export const getShopBarbers = async (shopId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_shop_barbers', { p_shop_id: shopId });

    if (error) {
      console.error('❌ Error fetching barbers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, barbers: data || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all shop staff (admins, managers, barbers)
 * @param {string} shopId 
 * @returns {Promise<{success: boolean, staff?: Array, error?: string}>}
 */
export const getShopStaff = async (shopId) => {
  try {
    const { data: staff, error } = await supabase
      .from('shop_staff')
      .select(`
        id,
        role,
        bio,
        specialties,
        rating,
        total_reviews,
        is_available,
        is_active,
        hired_date,
        user:profiles!shop_staff_user_id_fkey(
          id,
          name,
          email,
          phone,
          profile_image
        )
      `)
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('role', { ascending: true })
      .order('hired_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching staff:', error);
      return { success: false, error: error.message };
    }

    return { success: true, staff: staff || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's role in a shop
 * @param {string} shopId 
 * @returns {Promise<{success: boolean, role?: string, staffData?: Object, error?: string}>}
 */
export const getUserRoleInShop = async (shopId) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('shop_staff')
      .select('*')
      .eq('shop_id', shopId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return { success: true, role: null, staffData: null };
      }
      console.error('❌ Error fetching user role:', error);
      return { success: false, error: error.message };
    }

    return { success: true, role: data.role, staffData: data };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add staff to shop (admins only)
 * @param {string} shopId
 * @param {string} userId
 * @param {string} role - 'admin' or 'barber'
 * @param {Object} additionalData - bio, specialties, etc.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const addShopStaff = async (shopId, userId, role, additionalData = {}) => {
  try {
    const { error } = await supabase
      .from('shop_staff')
      .insert({
        shop_id: shopId,
        user_id: userId,
        role: role,
        bio: additionalData.bio || null,
        specialties: additionalData.specialties || [],
        is_active: true
      });

    if (error) {
      console.error('❌ Error adding staff:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update staff member
 * @param {string} staffId 
 * @param {Object} updates 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateShopStaff = async (staffId, updates) => {
  try {
    const { error } = await supabase
      .from('shop_staff')
      .update(updates)
      .eq('id', staffId);

    if (error) {
      console.error('❌ Error updating staff:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove staff from shop
 * @param {string} staffId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const removeShopStaff = async (staffId) => {
  try {
    const { error } = await supabase
      .from('shop_staff')
      .delete()
      .eq('id', staffId);

    if (error) {
      console.error('❌ Error removing staff:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// ============================================
// SERVICES MANAGEMENT (Two-Table Approach)
// ============================================
// services = Global catalog (no shop_id, no price)
// shop_services = Links shops to services with custom pricing

/**
 * Get ALL services from global catalog
 * @returns {Promise<{success: boolean, services?: Array, error?: string}>}
 */
export const getAllServices = async () => {
  try {
    console.log('🔍 Fetching all services from global catalog');

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching services:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Found ${services?.length || 0} global services`);
    return { success: true, services: services || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get services for a specific shop (with custom pricing)
 * @param {string} shopId - Shop ID
 * @returns {Promise<{success: boolean, services?: Array, error?: string}>}
 */
export const getShopServices = async (shopId) => {
  try {
    console.log('🔍 Fetching services for shop:', shopId);

    // Fetch shop_services with all fields (supports both custom services and catalog services)
    const { data: shopServices, error } = await supabase
      .from('shop_services')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching services:', error);
      return { success: false, error: error.message };
    }

    // Transform to flat structure
    // Supports both:
    // 1. Custom services (name, price, description stored directly)
    // 2. Catalog services (service_id with custom_price override)
    const services = (shopServices || []).map(ss => ({
      id: ss.id, // shop_service id
      service_id: ss.service_id || null,
      name: ss.name || 'Unnamed Service',
      description: ss.description || '',
      duration: ss.duration || 30,
      category: ss.category || 'General',
      icon_url: ss.icon_url || null,
      price: ss.price || ss.custom_price || 0,
      is_active: ss.is_active
    }));

    console.log(`✅ Found ${services.length} services for shop`);
    if (services.length > 0) {
      console.log('📊 Sample service:', services[0]); // Debug: log first service
    }
    return { success: true, services };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add existing service to shop (create shop_services link)
 * @param {string} shopId 
 * @param {string} serviceId - ID from services table
 * @param {number} customPrice 
 * @returns {Promise<{success: boolean, shopService?: Object, error?: string}>}
 */
export const addServiceToShop = async (shopId, serviceId, customPrice) => {
  try {
    console.log('➕ Adding service to shop:', { shopId, serviceId, customPrice });

    const { data: shopService, error } = await supabase
      .from('shop_services')
      .insert({
        shop_id: shopId,
        service_id: serviceId,
        custom_price: customPrice,
        is_active: true
      })
      .select(`
        id,
        custom_price,
        is_active,
        service_id,
        services (
          id,
          name,
          description,
          default_duration,
          category,
          icon_url
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error adding service:', error);
      return { success: false, error: error.message };
    }

    // Transform to flat structure
    const result = {
      id: shopService.id,
      service_id: shopService.service_id,
      name: shopService.services.name,
      description: shopService.services.description,
      duration: shopService.services.default_duration,
      category: shopService.services.category,
      icon_url: shopService.services.icon_url,
      price: shopService.custom_price,
      is_active: shopService.is_active
    };

    console.log('✅ Service added to shop');
    return { success: true, shopService: result };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create custom service and add to shop
 * @param {string} shopId 
 * @param {Object} serviceData - {name, description, default_duration, category, icon_url}
 * @param {number} customPrice 
 * @returns {Promise<{success: boolean, shopService?: Object, error?: string}>}
 */
export const createCustomService = async (shopId, serviceData, customPrice) => {
  try {
    console.log('✨ Creating custom service:', serviceData);

    // 1. Create service in global catalog
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert({
        name: serviceData.name,
        description: serviceData.description,
        default_duration: serviceData.default_duration || 30,
        category: serviceData.category || 'Other',
        icon_url: serviceData.icon_url || null
      })
      .select()
      .single();

    if (serviceError) {
      console.error('❌ Error creating service:', serviceError);
      return { success: false, error: serviceError.message };
    }

    // 2. Link to shop
    const result = await addServiceToShop(shopId, service.id, customPrice);
    
    console.log('✅ Custom service created and linked');
    return result;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update shop service (price, is_active)
 * @param {string} shopServiceId - ID from shop_services table
 * @param {Object} updates 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateShopService = async (shopServiceId, updates) => {
  try {
    const { error } = await supabase
      .from('shop_services')
      .update(updates)
      .eq('id', shopServiceId);

    if (error) {
      console.error('❌ Error updating service:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove service from shop (delete shop_services link)
 * @param {string} shopServiceId - ID from shop_services table
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const removeServiceFromShop = async (shopServiceId) => {
  try {
    const { error } = await supabase
      .from('shop_services')
      .delete()
      .eq('id', shopServiceId);

    if (error) {
      console.error('❌ Error removing service:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// BOOKINGS MANAGEMENT
// ============================================

/**
 * Create booking (shop-centric)
 * @param {Object} bookingData 
 * @returns {Promise<{success: boolean, booking?: Object, error?: string}>}
 */
export const createBooking = async (bookingData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: user.id,
        shop_id: bookingData.shop_id,
        barber_id: bookingData.barber_id || null, // Optional barber
        services: bookingData.services,
        appointment_date: bookingData.appointment_date,
        appointment_time: bookingData.appointment_time,
        total_amount: bookingData.total_amount,
        customer_notes: bookingData.customer_notes,
        status: 'pending'
      })
      .select(`
        *,
        shop:shops!bookings_shop_id_fkey(id, name, address, phone),
        customer:profiles!bookings_customer_id_fkey(id, name, email, phone),
        barber:profiles!bookings_barber_id_fkey(id, name, email, phone)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating booking:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Booking created:', booking.booking_id);
    return { success: true, booking };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's bookings
 * @returns {Promise<{success: boolean, bookings?: Array, error?: string}>}
 */
export const getMyBookings = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        shop:shops!bookings_shop_id_fkey(id, name, logo_url, address, phone),
        barber:profiles!bookings_barber_id_fkey(id, name, profile_image)
      `)
      .eq('customer_id', user.id)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, bookings: bookings || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get shop bookings (for staff)
 * @param {string} shopId 
 * @param {Object} filters 
 * @returns {Promise<{success: boolean, bookings?: Array, error?: string}>}
 */
export const getShopBookings = async (shopId, filters = {}) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(id, name, email, phone, profile_image),
        barber:profiles!bookings_barber_id_fkey(id, name, profile_image)
      `)
      .eq('shop_id', shopId);

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
 * Update booking status
 * @param {string} bookingId 
 * @param {string} status 
 * @param {Object} additionalData 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateBookingStatus = async (bookingId, status, additionalData = {}) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        status,
        ...additionalData
      })
      .eq('id', bookingId);

    if (error) {
      console.error('❌ Error updating booking:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// REVIEWS MANAGEMENT
// ============================================

/**
 * Get shop reviews
 * @param {string} shopId 
 * @returns {Promise<{success: boolean, reviews?: Array, error?: string}>}
 */
export const getShopReviews = async (shopId) => {
  try {
    const { data: reviews, error } = await supabase
      .from('shop_reviews')
      .select(`
        *,
        customer:profiles!shop_reviews_customer_id_fkey(id, name, profile_image),
        barber:profiles!shop_reviews_barber_id_fkey(id, name)
      `)
      .eq('shop_id', shopId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching reviews:', error);
      return { success: false, error: error.message };
    }

    return { success: true, reviews: reviews || [] };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create review for shop
 * @param {Object} reviewData 
 * @returns {Promise<{success: boolean, review?: Object, error?: string}>}
 */
export const createShopReview = async (reviewData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: review, error } = await supabase
      .from('shop_reviews')
      .insert({
        shop_id: reviewData.shop_id,
        customer_id: user.id,
        booking_id: reviewData.booking_id,
        rating: reviewData.rating,
        review_text: reviewData.review_text,
        barber_id: reviewData.barber_id || null,
        barber_rating: reviewData.barber_rating || null,
        services: reviewData.services
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating review:', error);
      return { success: false, error: error.message };
    }

    return { success: true, review };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// CURRENT SHOP MANAGEMENT
// ============================================

/**
 * Get current shop ID from storage
 * @returns {Promise<string|null>}
 */
export const getCurrentShopId = async () => {
  try {
    return await AsyncStorage.getItem('current_shop_id');
  } catch (error) {
    console.error('❌ Error getting current shop:', error);
    return null;
  }
};

/**
 * Set current shop ID
 * @param {string} shopId 
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
    console.error('❌ Error setting current shop:', error);
    return false;
  }
};

/**
 * Clear current shop (logout helper)
 */
export const clearCurrentShop = async () => {
  try {
    await AsyncStorage.removeItem('current_shop_id');
  } catch (error) {
    console.error('❌ Error clearing current shop:', error);
  }
};

/**
 * Delete shop (Admin only)
 * Deletes shop and all related data: staff, shop_services links, reviews, bookings
 * NOTE: Does NOT delete services from global catalog
 * @param {string} shopId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteShop = async (shopId) => {
  try {
    console.log('🗑️  Attempting to delete shop:', shopId);
    
    // 1. Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return { success: false, error: 'User not authenticated' };
    }

    console.log('👤 Current user:', user.id);

    // Check if user is admin of this shop
    const { data: staffData, error: staffError } = await supabase
      .from('shop_staff')
      .select('role')
      .eq('shop_id', shopId)
      .eq('user_id', user.id)
      .single();

    if (staffError) {
      console.error('❌ Error checking admin status:', staffError);
      return { success: false, error: 'Unable to verify admin status' };
    }

    if (!staffData || staffData.role !== 'admin') {
      console.error('❌ User is not admin. Role:', staffData?.role);
      return { success: false, error: 'Only shop admin can delete the shop' };
    }

    console.log('✅ User is admin of shop');

    // 2. Delete all related data (in order due to foreign key constraints)
    
    // Delete reviews (try both table names)
    console.log('🗑️  Deleting reviews...');
    const { error: reviewsError1 } = await supabase
      .from('reviews')
      .delete()
      .eq('shop_id', shopId);
    
    const { error: reviewsError2 } = await supabase
      .from('shop_reviews')
      .delete()
      .eq('shop_id', shopId);
    
    if (reviewsError1 && reviewsError2) {
      console.error('❌ Error deleting reviews:', reviewsError1 || reviewsError2);
    } else {
      console.log('✅ Reviews deleted');
    }

    // Delete bookings
    console.log('🗑️  Deleting bookings...');
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('shop_id', shopId);
    
    if (bookingsError) {
      console.error('❌ Error deleting bookings:', bookingsError);
    } else {
      console.log('✅ Bookings deleted');
    }

    // Delete shop_services (links between shop and services catalog)
    // NOTE: We don't delete from 'services' table as it's a global catalog
    console.log('🗑️  Deleting shop-service links...');
    const { error: shopServicesError } = await supabase
      .from('shop_services')
      .delete()
      .eq('shop_id', shopId);
    
    if (shopServicesError) {
      console.error('❌ Error deleting shop services:', shopServicesError);
    } else {
      console.log('✅ Shop-service links deleted');
    }

    // 3. Get shop images info before deleting (if using Supabase Storage)
    const { data: shopData } = await supabase
      .from('shops')
      .select('logo_url, cover_image_url')
      .eq('id', shopId)
      .single();

    if (shopData) {
      // Extract file paths from URLs and delete from storage
      // This is optional and depends on your storage setup
      // Example: await supabase.storage.from('shop-images').remove([filePath]);
    }

    // 4. Delete the shop BEFORE deleting staff (important for RLS policies!)
    // The shop DELETE policy checks if user is admin in shop_staff
    // So we must delete shop while user is still admin
    console.log('🗑️  Deleting shop record...');
    const { data: deleteResult, error: shopError, count } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopId)
      .select();

    console.log('Delete result:', deleteResult);
    console.log('Delete count:', count);

    if (shopError) {
      console.error('❌ Error deleting shop:', shopError);
      console.error('Shop delete error details:', JSON.stringify(shopError, null, 2));
      return { success: false, error: 'Failed to delete shop: ' + shopError.message };
    }

    if (!deleteResult || deleteResult.length === 0) {
      console.error('❌ Shop was not deleted - no rows affected');
      return { success: false, error: 'Shop record was not deleted. It may not exist or RLS policies are blocking deletion.' };
    }

    console.log('✅ Shop record deleted successfully:', deleteResult);

    // 5. NOW delete staff (after shop is deleted)
    // This way the cascade deletion or RLS policies won't block shop deletion
    console.log('🗑️  Deleting staff...');
    const { error: staffDeleteError } = await supabase
      .from('shop_staff')
      .delete()
      .eq('shop_id', shopId);
    
    if (staffDeleteError) {
      console.error('⚠️  Warning: Error deleting staff (shop already deleted):', staffDeleteError);
      // Don't fail here since shop is already deleted
    } else {
      console.log('✅ Staff deleted');
    }

    // 6. Clear from AsyncStorage if it was the current shop
    console.log('🗑️  Clearing AsyncStorage...');
    const currentShopId = await AsyncStorage.getItem('current_shop_id');
    if (currentShopId === shopId) {
      await AsyncStorage.removeItem('current_shop_id');
      console.log('✅ Removed from AsyncStorage');
    }

    console.log('✅✅✅ Shop deleted successfully!');
    return { success: true };

  } catch (error) {
    console.error('❌ Unexpected error deleting shop:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Toggle shop manual open/closed status (Admin only)
 * @param {string} shopId
 * @param {boolean} isClosed - true to close shop, false to open
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const toggleShopStatus = async (shopId, isClosed) => {
  try {
    console.log('🔄 Toggling shop status:', shopId, 'Closed:', isClosed);

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: staffData, error: staffError } = await supabase
      .from('shop_staff')
      .select('role')
      .eq('shop_id', shopId)
      .eq('user_id', user.id)
      .single();

    if (staffError || !staffData || staffData.role !== 'admin') {
      return { success: false, error: 'Only admin can toggle shop status' };
    }

    // Update shop status
    const { error: updateError } = await supabase
      .from('shops')
      .update({ is_manually_closed: isClosed })
      .eq('id', shopId);

    if (updateError) {
      console.error('❌ Error updating shop status:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ Shop status updated successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Error toggling shop status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if shop is currently open (MANUAL CONTROL ONLY)
 * @param {Object} shop - Shop object with is_manually_closed
 * @returns {boolean}
 */
export const isShopOpen = (shop) => {
  if (!shop) return false;
  
  // ONLY check manual override - ignore schedule completely
  // Admin controls shop status with toggle
  return !shop.is_manually_closed;
};

/**
 * Upload image to Supabase Storage
 * @param {string} uri - Local image URI
 * @param {string} bucket - Storage bucket name (e.g., 'service-icons')
 * @param {string} folder - Folder path (e.g., 'shop_123')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImage = async (uri, bucket = 'service-icons', folder = '') => {
  try {
    // Get file extension from URI
    const fileExt = uri.split('.').pop().toLowerCase();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Fetch the image as blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Convert blob to ArrayBuffer for upload
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('✅ Image uploaded:', publicUrl);
    return { success: true, url: publicUrl };

  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update shop details
 * @param {string} shopId - Shop ID
 * @param {Object} updateData - Shop data to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateShopDetails = async (shopId, updateData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Verify user is admin of the shop
    const { data: staffData, error: staffError } = await supabase
      .from('shop_staff')
      .select('role')
      .eq('shop_id', shopId)
      .eq('user_id', user.id)
      .single();

    if (staffError || !staffData || staffData.role !== 'admin') {
      return { success: false, error: 'Only shop admins can update shop details' };
    }

    // Update shop
    const { error: updateError } = await supabase
      .from('shops')
      .update(updateData)
      .eq('id', shopId);

    if (updateError) {
      console.error('❌ Error updating shop:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ Shop updated successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Error updating shop:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Upload shop image (logo or cover)
 * @param {string} shopId - Shop ID
 * @param {string} uri - Local image URI
 * @param {string} type - 'logo' or 'cover'
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadShopImage = async (shopId, uri, type = 'logo') => {
  try {
    const bucket = 'shop-images';
    const folder = `shop_${shopId}`;
    
    // Upload image
    const { success, url, error } = await uploadImage(uri, bucket, folder);
    
    if (!success) {
      return { success: false, error };
    }

    // Update shop record
    const fieldName = type === 'logo' ? 'logo_url' : 'cover_image_url';
    const { error: updateError } = await supabase
      .from('shops')
      .update({ [fieldName]: url })
      .eq('id', shopId);

    if (updateError) {
      console.error('❌ Error updating shop image URL:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Shop ${type} uploaded successfully`);
    return { success: true, url };

  } catch (error) {
    console.error('❌ Error uploading shop image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all shops that offer a specific service
 * @param {string} serviceId - Service ID
 * @returns {Promise<{success: boolean, shops?: Array, error?: string}>}
 */
export const getShopsByService = async (serviceId) => {
  try {
    console.log('🔍 Fetching shops offering service:', serviceId);

    const { data: shopServices, error } = await supabase
      .from('shop_services')
      .select(`
        shop_id,
        shops (
          id,
          name,
          description,
          address,
          city,
          phone,
          logo_url,
          cover_image_url,
          rating,
          total_reviews,
          is_verified,
          operating_days,
          opening_time,
          closing_time,
          is_manually_closed
        )
      `)
      .eq('service_id', serviceId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching shops by service:', error);
      return { success: false, error: error.message };
    }

    // Extract unique shops (in case service appears multiple times)
    const shopsMap = new Map();
    (shopServices || []).forEach(ss => {
      if (ss.shops && !shopsMap.has(ss.shops.id)) {
        shopsMap.set(ss.shops.id, ss.shops);
      }
    });

    const shops = Array.from(shopsMap.values());
    console.log(`✅ Found ${shops.length} shops offering this service`);
    return { success: true, shops };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// SHOP INVITATIONS
// ============================================

/**
 * Fetch pending invitations for current user
 * @returns {Promise<{success: boolean, invitations?: Array, error?: string}>}
 */
export const fetchPendingInvitations = async () => {
  try {
    console.log('📬 Fetching pending invitations...');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ No authenticated user');
      return { success: false, error: 'Not authenticated' };
    }

    // Get user profile to get email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error fetching profile:', profileError);
      return { success: false, error: profileError?.message || 'Profile not found' };
    }

    // Fetch pending invitations for this email
    const { data: invitations, error } = await supabase
      .from('shop_invitations')
      .select(`
        id,
        shop_id,
        invitee_email,
        role,
        status,
        message,
        created_at,
        expires_at,
        shops (
          id,
          name,
          address,
          city,
          logo_url,
          phone
        ),
        invited_by_profile:profiles!shop_invitations_invited_by_fkey (
          id,
          name,
          email
        )
      `)
      .eq('invitee_email', profile.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Found ${invitations?.length || 0} pending invitations`);
    return { success: true, invitations: invitations || [] };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Accept a shop invitation
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const acceptInvitation = async (invitationId) => {
  try {
    console.log('✅ Accepting invitation:', invitationId);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from('shop_invitations')
      .select('shop_id, role, invitee_email')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !invitation) {
      console.error('❌ Invitation not found:', fetchError);
      return { success: false, error: 'Invitation not found or already processed' };
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('shop_invitations')
      .update({ 
        status: 'accepted',
        responded_at: new Date().toISOString(),
        invitee_user_id: user.id
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('❌ Error updating invitation:', updateError);
      return { success: false, error: updateError.message };
    }

    // Add user to shop_staff
    const { error: staffError } = await supabase
      .from('shop_staff')
      .insert({
        shop_id: invitation.shop_id,
        user_id: user.id,
        role: invitation.role,
        is_active: true
      });

    if (staffError) {
      console.error('❌ Error adding to shop_staff:', staffError);
      // Rollback invitation status
      await supabase
        .from('shop_invitations')
        .update({ status: 'pending' })
        .eq('id', invitationId);
      return { success: false, error: staffError.message };
    }

    console.log('✅ Invitation accepted successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Decline a shop invitation
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const declineInvitation = async (invitationId) => {
  try {
    console.log('❌ Declining invitation:', invitationId);

    const { error } = await supabase
      .from('shop_invitations')
      .update({ 
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .eq('status', 'pending');

    if (error) {
      console.error('❌ Error declining invitation:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Invitation declined');
    return { success: true };

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// STAFF ASSIGNMENT TO SHOPS
// ============================================

/**
 * Get all shops that current user can manage (owner or manager role)
 * @returns {Promise<{success: boolean, shops?: Array, error?: string}>}
 */
export const getAvailableShopsForAssignment = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get shops where user is owner or manager
    const { data: shopStaff, error } = await supabase
      .from('shop_staff')
      .select(`
        shop_id,
        role,
        shops (
          id,
          name,
          description,
          address,
          city,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching manageable shops:', error);
      return { success: false, error: error.message };
    }

    // Extract shop data
    const shops = shopStaff
      .filter(s => s.shops)
      .map(s => ({
        ...s.shops,
        user_role: s.role
      }));

    return { success: true, shops };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Assign a staff member to a shop
 * @param {string} staffUserId - The user ID of the staff member to assign
 * @param {string} shopId - The shop ID to assign them to
 * @param {string} role - The role (barber, manager, admin)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const assignStaffToShop = async (staffUserId, shopId, role = 'barber') => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    console.log(`📌 Assigning staff ${staffUserId} to shop ${shopId} with role ${role}`);

    // Check if staff is already assigned to this shop
    const { data: existing, error: checkError } = await supabase
      .from('shop_staff')
      .select('id, role')
      .eq('shop_id', shopId)
      .eq('user_id', staffUserId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing assignment:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existing) {
      console.log('ℹ️ Staff already assigned to this shop, updating role...');

      // Update existing assignment
      const { error: updateError } = await supabase
        .from('shop_staff')
        .update({
          role,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ Error updating assignment:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log('✅ Staff assignment updated');
      return { success: true, message: 'Staff assignment updated successfully' };
    }

    // Create new assignment
    const { error: insertError } = await supabase
      .from('shop_staff')
      .insert({
        shop_id: shopId,
        user_id: staffUserId,
        role,
        invited_by: user.id,
        is_available: true,
        is_active: true
      });

    if (insertError) {
      console.error('❌ Error assigning staff to shop:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('✅ Staff assigned to shop successfully');
    return { success: true, message: 'Staff assigned to shop successfully' };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all shops a staff member is assigned to
 * @param {string} staffUserId - The user ID of the staff member
 * @returns {Promise<{success: boolean, shops?: Array, error?: string}>}
 */
export const getStaffAssignments = async (staffUserId) => {
  try {
    const { data, error } = await supabase
      .from('shop_staff')
      .select(`
        id,
        role,
        is_active,
        shops (
          id,
          name,
          description,
          address,
          city,
          logo_url
        )
      `)
      .eq('user_id', staffUserId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching staff assignments:', error);
      return { success: false, error: error.message };
    }

    const shops = data
      .filter(s => s.shops)
      .map(s => ({
        ...s.shops,
        user_role: s.role,
        assignment_id: s.id
      }));

    return { success: true, shops };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a staff member from a shop
 * @param {string} staffUserId - The user ID of the staff member
 * @param {string} shopId - The shop ID to remove them from
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const removeStaffFromShop = async (staffUserId, shopId) => {
  try {
    const { error } = await supabase
      .from('shop_staff')
      .delete()
      .eq('shop_id', shopId)
      .eq('user_id', staffUserId);

    if (error) {
      console.error('❌ Error removing staff from shop:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Staff removed from shop');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

// Re-export existing auth functions
export * from './auth';