import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =====================================================
// AUTH STATE FLAGS
// =====================================================

// Flag to suppress auth state changes during provider creation
// This prevents the app from reacting to temporary session switches
let _isCreatingProvider = false;

export const isCreatingProvider = () => _isCreatingProvider;

// =====================================================
// PASSWORDLESS AUTHENTICATION
// =====================================================

/**
 * Sign up with email (sends OTP for verification) - Passwordless
 * @param {string} email - User email address
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export const signUpWithEmail = async (email) => {
  try {
    console.log('📧 Signing up with email (passwordless):', email);

    // STEP 1: Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('⚠️ Email already registered');
      return { success: false, error: 'This email is already registered. Please login instead.' };
    }

    // STEP 2: Send OTP to email (creates account if doesn't exist)
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true, // Create account if doesn't exist
        data: {
          onboarding_completed: false,
        },
      },
    });

    if (error) {
      console.error('❌ OTP send failed:', error.message);
      
      // Check for "User already registered" error
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        return { success: false, error: 'This email is already registered. Please login instead.' };
      }
      
      return { success: false, error: error.message };
    }

    console.log('✅ OTP sent successfully to:', email);
    console.log('📧 Check your email for 6-digit code');

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign in with email (sends OTP) - Passwordless
 * @param {string} email - User email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signInWithEmail = async (email) => {
  try {
    console.log('📧 Sending OTP for login:', email);

    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true, // Allow creating auth account if profile exists
      },
    });

    if (error) {
      console.error('❌ OTP send failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ OTP sent successfully!');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify email OTP - Passwordless
 * @param {string} email - User email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, user?: object, profile?: object, error?: string}>}
 */
export const verifyEmailOTP = async (email, otp) => {
  try {
    console.log('🔐 Verifying OTP for email:', email);
    console.log('🔢 OTP code:', otp);

    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email',
    });

    if (error) {
      console.error('❌ OTP verification failed:', error.message);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.error('❌ No user data in response');
      return { success: false, error: 'No user data returned' };
    }

    console.log('✅ OTP verified successfully!');
    console.log('👤 User ID:', data.user.id);
    console.log('📧 User Email:', data.user.email);

    // Get user profile - Wait for trigger to complete profile linking
    console.log('📋 Fetching user profile (waiting for trigger to complete)...');
    const profile = await fetchLatestProfile(data.user.id, data.user.email);

    if (profile) {
      console.log('✅ Profile loaded');
      console.log('   Name:', profile.name);
      console.log('   Onboarding completed:', profile.onboarding_completed);
      console.log('   Platform admin:', profile.is_platform_admin || false);
    } else {
      console.log('⚠️ Profile not found (will be created during name input)');
    }

    console.log('🎉 Login successful!');

    return {
      success: true,
      user: data.user,
      session: data.session,
      profile: profile || null,
    };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch latest profile after auth (used after OTP verification)
 * @param {string} userId - User ID
 * @returns {Promise<object|null>}
 */
const fetchLatestProfile = async (userId, userEmail = null) => {
  try {
    // Wait longer for trigger to complete (increased to 2 seconds for safety)
    console.log('⏳ Waiting for database trigger to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Fetching profile for user ID:', userId);
    let profile = null;
    let error = null;
    
    // Try fetching by ID first
    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    profile = result.data;
    error = result.error;

    // If ID fetch failed and we have email, try fetching by email
    if (error && userEmail) {
      console.log('⚠️ ID fetch failed, trying by email:', userEmail);
      const emailResult = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single();
      
      profile = emailResult.data;
      error = emailResult.error;
    }

    if (error) {
      console.log('⚠️ Could not fetch profile:', error.message);
      console.log('⚠️ Error details:', error);
      return null;
    }

    if (!profile) {
      console.log('⚠️ Profile is null');
      return null;
    }

    console.log('✅ Profile fetched successfully:', {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      onboarding_completed: profile.onboarding_completed,
      is_platform_admin: profile.is_platform_admin || false
    });

    return profile;
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    return null;
  }
};

/**
 * Send OTP to email (for resend functionality)
 * @param {string} email - User email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmailOTP = async (email) => {
  try {
    console.log('📧 Sending OTP to email:', email);

    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, // Only allow existing users
      },
    });

    if (error) {
      console.error('❌ OTP send failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ OTP sent successfully!');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign out
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signOut = async () => {
  try {
    console.log('👋 Signing out...');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Sign out failed:', error.message);
      return { success: false, error: error.message };
    }
    
    // Clear AsyncStorage data (keep onboarding slides flag so user doesn't see slides again)
    console.log('🧹 Clearing user data from storage...');
    await AsyncStorage.multiRemove([
      'user_id', // Remove any cached user ID
      'user_session', // Remove any cached session data
    ]);
    
    console.log('✅ Signed out successfully');
    console.log('✅ Local data cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current authenticated user
 * @returns {Promise<{user: object|null, profile: object|null}>}
 */
export const getCurrentUser = async () => {
  try {
    console.log('🔍 getCurrentUser: Fetching auth user...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.log('❌ No auth user found');
      return { user: null, profile: null };
    }

    console.log('✅ Auth user found:', user.id);
    console.log('📧 Email:', user.email);

    // Get profile from database - Try by ID first
    console.log('📋 Fetching profile from database...');
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist by ID, try by EMAIL (trigger might have failed to update ID)
    if (profileError || !profile) {
      console.log('⚠️ Profile not found by ID:', user.id);
      console.log('🔄 Trying to fetch by email:', user.email);
      
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (!emailError && profileByEmail) {
        console.log('✅ Profile found by email!');
        console.log('⚠️ WARNING: Profile ID mismatch! Trigger did not update profile ID.');
        console.log('   Profile ID in DB:', profileByEmail.id);
        console.log('   Auth User ID:', user.id);
        profile = profileByEmail;
      } else {
        console.log('❌ Profile not found by email either');
        console.log('⚠️ Error:', emailError?.message || 'No profile exists');
        return { user, profile: null };
      }
    }

    console.log('✅ Profile found:');
    console.log('   ID:', profile.id);
    console.log('   Email:', profile.email);
    console.log('   Name:', profile.name);
    console.log('   Is Platform Admin:', profile.is_platform_admin || false);

    return { user, profile };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, profile: null };
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<{isAuthenticated: boolean, user?: object, profile?: object}>}
 */
export const checkAuthState = async () => {
  try {
    console.log('='.repeat(50));
    console.log('🔍 CHECKING AUTH STATE ON APP START');
    console.log('='.repeat(50));
    
    // Get the stored session from AsyncStorage
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('📦 Session check result:');
    console.log('   - Session exists:', !!session);
    console.log('   - Session error:', sessionError);
    console.log('   - User ID:', session?.user?.id);
    console.log('   - User email:', session?.user?.email);
    console.log('   - Session expires at:', session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A');
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return { isAuthenticated: false };
    }
    
    if (!session) {
      console.log('🔓 NO STORED SESSION FOUND');
      console.log('→ User needs to login');
      return { isAuthenticated: false };
    }

    console.log('✅ Session found in AsyncStorage');
    console.log('🔐 Now checking if user exists in Supabase database...');
    
    // Check if profile exists in database - Try by ID first
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, phone, onboarding_completed, is_platform_admin, exclusive_shop_id')
      .eq('id', session.user.id)
      .single();
    
    console.log('📋 Profile check result (by ID):');
    console.log('   - Profile exists:', !!profile);
    console.log('   - Profile error:', profileError?.message || 'None');
    console.log('   - Profile data:', profile);
    
    // If profile not found by ID, try by EMAIL (common issue with auth triggers)
    if (profileError || !profile) {
      console.log('⚠️ Profile not found by auth user ID, trying by email...');
      console.log('   Looking for email:', session.user.email);
      
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, onboarding_completed, is_platform_admin, exclusive_shop_id')
        .eq('email', session.user.email)
        .single();
      
      console.log('📋 Profile check result (by email):');
      console.log('   - Profile exists:', !!profileByEmail);
      console.log('   - Profile error:', emailError?.message || 'None');
      
      if (!emailError && profileByEmail) {
        console.log('✅ Profile found by email!');
        console.log('   Profile ID in DB:', profileByEmail.id);
        console.log('   Auth User ID:', session.user.id);
        if (profileByEmail.id !== session.user.id) {
          console.warn('⚠️ WARNING: ID mismatch detected (auth trigger may have failed)');
        }
        profile = profileByEmail;
      } else {
        console.error('❌ Profile not found by ID or email');
        console.warn('⚠️ USER SESSION EXISTS BUT PROFILE NOT FOUND IN DATABASE');
        console.warn('   This means user auth exists but was deleted from profiles table');
        console.log('🧹 Clearing invalid session...');
        
        // Clear the invalid session
        await supabase.auth.signOut();
        
        return { 
          isAuthenticated: false,
          error: 'User profile not found. Please login again.'
        };
      }
    }
    
    console.log('✅✅✅ USER AUTHENTICATED SUCCESSFULLY');
    console.log('   - User ID:', profile.id);
    console.log('   - Name:', profile.name);
    console.log('   - Email:', profile.email);
    console.log('   - Platform Admin:', profile.is_platform_admin || false);
    console.log('   - Onboarding complete:', profile.onboarding_completed);
    console.log('→ Navigating to MainScreen');
    console.log('='.repeat(50));
    
    return {
      isAuthenticated: true,
      user: session.user,
      profile,
    };
  } catch (error) {
    console.error('❌ CRITICAL ERROR in checkAuthState:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    
    // On error, clear session to prevent hanging
    await supabase.auth.signOut().catch(() => {});
    
    return { 
      isAuthenticated: false,
      error: 'Authentication check failed. Please login again.'
    };
  }
};

// =====================================================
// PROFILE FUNCTIONS
// =====================================================

/**
 * Create or update user profile
 * @param {string} name - User's name
 * @param {string} role - User's role (optional, defaults to 'customer')
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
export const setupUserProfile = async (name, role = 'customer') => {
  try {
    console.log('🔍 Getting current session...');
    
    // Get current session directly
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ No active session:', sessionError?.message);
      return { success: false, error: 'No authenticated user. Please login again.' };
    }

    const user = session.user;
    console.log('✅ User found:', user.id);
    console.log('📧 Email:', user.email);

    // First, check if profile already exists
    console.log('� Checking if profile exists...');
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    let data, error;

    if (existingProfile) {
      // Profile exists, update it
      console.log('📝 Profile exists, updating...');
      const result = await supabase
        .from('profiles')
        .update({
          name: name,
          role: role,
          onboarding_completed: true,
        })
        .eq('id', user.id)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // Profile doesn't exist, insert it
      console.log('💾 Creating new profile...');
      const result = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: name,
          role: role,
          onboarding_completed: true,
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Profile operation failed:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log('✅ Profile created/updated successfully!');
    return { success: true, profile: data };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};

/**
 * Update user profile
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
export const updateProfile = async (updates) => {
  try {
    const { user } = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, profile: data };
  } catch (error) {
    console.error('Unexpected error updating profile:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// ONBOARDING
// =====================================================

/**
 * Check if user has completed onboarding (profile setup)
 * @returns {Promise<boolean>}
 */
export const hasCompletedOnboarding = async (userId = null) => {
  try {
    // If userId is provided, use it directly (from session)
    // Otherwise, fetch current user (for backwards compatibility)
    let user;
    if (userId) {
      console.log('🔍 hasCompletedOnboarding: Using provided user ID:', userId);
      user = { id: userId };
    } else {
      console.log('🔍 hasCompletedOnboarding: Fetching current user...');
      const result = await getCurrentUser();
      user = result.user;
      if (!user) {
        console.log('⚠️ hasCompletedOnboarding: No user found');
        return false;
      }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, onboarding_completed')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.log('⚠️ Could not fetch onboarding status from DB:', error.message);
        return false;
      }
      
      // User has completed onboarding if they have BOTH:
      // 1. A name in the database (not empty)
      // 2. onboarding_completed flag set to true
      const hasName = data?.name && data.name.trim() !== '';
      const flagSet = data?.onboarding_completed === true;
      
      console.log('🔍 Onboarding check for user:', user.id);
      console.log('   Has name:', hasName, '(', data?.name, ')');
      console.log('   Flag set:', flagSet);
      console.log('   ✅ Result:', hasName || flagSet);
      
      // Return true if user has a name OR onboarding flag is set
      // This covers: admin-created users (have names) and completed customers
      return hasName || flagSet;
    } catch (dbError) {
      console.log('⚠️ DB query failed for onboarding status:', dbError);
      return false;
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Mark onboarding as completed
 * @returns {Promise<boolean>}
 */
export const markOnboardingComplete = async () => {
  try {
    // Mark slides as seen
    await AsyncStorage.setItem('has_seen_onboarding_slides', 'true');

    // Update database if user is authenticated
    const { user } = await getCurrentUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }

    return true;
  } catch (error) {
    console.error('Error marking onboarding complete:', error);
    return false;
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Setup auth state change listener
 * @param {Function} callback - Called when auth state changes
 * @returns {Object} subscription object with unsubscribe method
 */
/**
 * Refresh the current session if it's about to expire
 * @returns {Promise<{success: boolean, session?: object}>}
 */
export const refreshSession = async () => {
  try {
    console.log('🔄 Attempting to refresh session...');
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Session refresh failed:', error.message);
      return { success: false, error: error.message };
    }
    
    if (data?.session) {
      console.log('✅ Session refreshed successfully');
      return { success: true, session: data.session };
    }
    
    console.log('⚠️ No session to refresh');
    return { success: false, error: 'No session available' };
  } catch (error) {
    console.error('❌ Error refreshing session:', error);
    return { success: false, error: error.message };
  }
};

export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('🔄 Auth state changed:', event, '| creating provider:', _isCreatingProvider);

      // IMPORTANT: Skip all processing during provider creation
      // This prevents async profile fetches from blocking the creation flow
      if (_isCreatingProvider) {
        console.log('⏳ [AUTH.JS] Skipping auth listener - provider creation in progress');
        // Still call callback with minimal data so app doesn't hang waiting
        // but don't do expensive profile fetch
        callback(event, session, null);
        return;
      }

      // Ignore TOKEN_REFRESHED events - they don't change auth state
      // Token refresh happens automatically in background, no need to re-fetch profile
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed automatically (ignoring, no action needed)');
        return; // Don't call callback, don't fetch profile
      }

      // Handle signed out events
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        callback(event, null, null);
        return;
      }

      // Only fetch profile for meaningful auth changes
      // INITIAL_SESSION, SIGNED_IN, USER_UPDATED
      let profile = null;
      if (session?.user) {
        console.log(`📋 Fetching profile for event: ${event}`);
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        profile = data;
      }

      callback(event, session, profile);
    }
  );

  return subscription;
};

/**
 * Complete app reset - clears all cached data and logs out
 * @returns {Promise<void>}
 */
export const clearAllAppData = async () => {
  try {
    console.log('🧹 Clearing all app data...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all AsyncStorage keys
    await AsyncStorage.multiRemove([
      'has_seen_onboarding_slides',
      'has_seen_onboarding', // Legacy key for cleanup
    ]);
    
    console.log('✅ All app data cleared!');
    console.log('🔄 Please restart the app');
  } catch (error) {
    console.error('❌ Error clearing app data:', error);
  }
};

// =====================================================
// BARBERS & SERVICES
// =====================================================

/**
 * Fetch all barbers from database
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
export const fetchBarbers = async () => {
  try {
    // First, fetch all barbers
    const { data: barbers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'barber')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Then, fetch all services to map specialties
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*');

    if (servicesError) {
      console.warn('⚠️ Could not fetch services:', servicesError.message);
    }

    // Map barbers with their service names
    const barbersWithServices = (barbers || []).map(barber => {
      // Get service names from specialties array
      const serviceNames = [];
      if (barber.specialties && Array.isArray(barber.specialties) && services) {
        barber.specialties.forEach(specialtyId => {
          const service = services.find(s => s.id === specialtyId);
          if (service) {
            serviceNames.push(service.name);
          }
        });
      }

      return {
        ...barber,
        services: serviceNames.length > 0 ? serviceNames : ['No services yet'],
        // Ensure rating and total_reviews are numbers
        rating: barber.rating || 0,
        total_reviews: barber.total_reviews || 0
      };
    });

    console.log('✅ Fetched barbers:', barbersWithServices.length);
    console.log('📋 Barbers with services:', barbersWithServices.map(b => ({
      name: b.name,
      services: b.services,
      rating: b.rating,
      reviews: b.total_reviews
    })));

    return { success: true, data: barbersWithServices };
  } catch (error) {
    console.error('❌ Error fetching barbers:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Fetch all services from database
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
export const fetchServices = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) throw error;

    console.log('✅ Fetched services:', data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error fetching services:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Create a new service
 * @param {object} serviceData - Service details (name, description, icon_url, price, duration, provider_ids)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createService = async (serviceData) => {
  try {
    // Extract provider_ids from serviceData
    const { provider_ids, ...serviceFields } = serviceData;

    // Insert service
    const { data, error } = await supabase
      .from('services')
      .insert([serviceFields])
      .select()
      .single();

    if (error) throw error;

    // If provider_ids provided, create service_providers relationships
    if (provider_ids && provider_ids.length > 0) {
      const serviceProviderRecords = provider_ids.map(providerId => ({
        service_id: data.id,
        provider_id: providerId,
      }));

      const { error: providerError } = await supabase
        .from('service_providers')
        .insert(serviceProviderRecords);

      if (providerError) {
        console.error('⚠️ Error linking providers:', providerError.message);
        // Don't fail the entire operation, just log the error
      } else {
        console.log('✅ Service linked to', provider_ids.length, 'provider(s)');
      }
    }

    console.log('✅ Service created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating service:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Update an existing service
 * @param {string} serviceId - Service ID
 * @param {object} updates - Fields to update (including provider_ids)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const updateService = async (serviceId, updates) => {
  try {
    // Extract provider_ids from updates
    const { provider_ids, ...serviceFields } = updates;

    // Update service
    const { data, error } = await supabase
      .from('services')
      .update(serviceFields)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;

    // If provider_ids provided, update service_providers relationships
    if (provider_ids !== undefined) {
      // Delete existing provider relationships
      const { error: deleteError } = await supabase
        .from('service_providers')
        .delete()
        .eq('service_id', serviceId);

      if (deleteError) {
        console.error('⚠️ Error removing old providers:', deleteError.message);
      }

      // Insert new provider relationships
      if (provider_ids.length > 0) {
        const serviceProviderRecords = provider_ids.map(providerId => ({
          service_id: serviceId,
          provider_id: providerId,
        }));

        const { error: providerError } = await supabase
          .from('service_providers')
          .insert(serviceProviderRecords);

        if (providerError) {
          console.error('⚠️ Error linking providers:', providerError.message);
        } else {
          console.log('✅ Service linked to', provider_ids.length, 'provider(s)');
        }
      }
    }

    console.log('✅ Service updated:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating service:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a service
 * @param {string} serviceId - Service ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteService = async (serviceId) => {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) throw error;

    console.log('✅ Service deleted:', serviceId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting service:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Upload service icon to Supabase storage
 * @param {string} fileUri - Local file URI
 * @param {string} serviceId - Service ID for filename
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadServiceIcon = async (fileUri, serviceId) => {
  try {
    // Convert URI to blob
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Generate filename
    const fileExt = fileUri.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${serviceId}-${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error } = await supabase.storage
      .from('service-icons')
      .upload(fileName, blob, {
        contentType: `image/${fileExt}`,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('service-icons')
      .getPublicUrl(fileName);

    const publicUrl = urlData?.publicUrl || urlData;
    
    console.log('✅ Icon uploaded:', publicUrl);
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('❌ Error uploading icon:', error);
    console.error('❌ Error message:', error.message);
    return { success: false, error: error.message || 'Upload failed' };
  }
};

// =====================================================
// BARBER MANAGEMENT
// =====================================================

/**
 * Fetch all barbers with their details - ONLY from the current owner's shops
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
export const fetchAllBarbers = async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }

    // Get shops where the current user is owner/admin
    const { data: shopStaff, error: shopError } = await supabase
      .from('shop_staff')
      .select('shop_id')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner']);

    if (shopError) throw shopError;

    if (!shopStaff || shopStaff.length === 0) {
      console.log('📭 No shops found for this user');
      return { success: true, data: [] };
    }

    const shopIds = shopStaff.map(s => s.shop_id);

    // Get all barbers from these shops via shop_staff table
    const { data: barberStaff, error: barberError } = await supabase
      .from('shop_staff')
      .select(`
        id,
        shop_id,
        user_id,
        role,
        profiles:user_id (
          id,
          name,
          email,
          phone,
          profile_image,
          role
        )
      `)
      .in('shop_id', shopIds)
      .eq('role', 'barber')
      .eq('is_active', true);

    if (barberError) throw barberError;

    // Log raw staff data for debugging
    console.log('📊 Raw barber staff entries:', barberStaff?.length || 0);

    // Flatten the data and remove duplicates (if a barber is in multiple shops)
    const uniqueBarbers = new Map();
    barberStaff?.forEach(staff => {
      const profileName = staff.profiles ? staff.profiles.name : 'NULL (RLS blocked)';
      console.log('  → Staff entry:', staff.user_id, 'profile:', profileName);

      if (staff.profiles && !uniqueBarbers.has(staff.profiles.id)) {
        uniqueBarbers.set(staff.profiles.id, {
          ...staff.profiles,
          shop_staff_id: staff.id,
          shop_id: staff.shop_id
        });
      } else if (!staff.profiles) {
        // Profile join failed (likely RLS) - create minimal entry from shop_staff
        console.log('  ⚠️ No profile data for user_id:', staff.user_id, '- fetching separately...');
        // We'll handle this below
      }
    });

    // If we have staff entries with null profiles, try to fetch them separately
    const staffWithoutProfiles = barberStaff?.filter(s => !s.profiles) || [];
    if (staffWithoutProfiles.length > 0) {
      const missingUserIds = staffWithoutProfiles.map(s => s.user_id);
      console.log('📥 Fetching missing profiles for:', missingUserIds.length, 'users');

      const { data: missingProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, profile_image, role')
        .in('id', missingUserIds);

      if (!profileError && missingProfiles) {
        missingProfiles.forEach(profile => {
          if (!uniqueBarbers.has(profile.id)) {
            const staffEntry = staffWithoutProfiles.find(s => s.user_id === profile.id);
            uniqueBarbers.set(profile.id, {
              ...profile,
              shop_staff_id: staffEntry?.id,
              shop_id: staffEntry?.shop_id
            });
            console.log('  ✅ Added missing profile:', profile.name);
          }
        });
      } else if (profileError) {
        console.warn('  ⚠️ Could not fetch missing profiles:', profileError.message);
      }
    }

    const barbersArray = Array.from(uniqueBarbers.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );

    console.log('✅ Fetched barbers for owner shops:', barbersArray.length);
    if (barbersArray.length > 0) {
      console.log('   First barber:', barbersArray[0].name, barbersArray[0].email);
    }
    return { success: true, data: barbersArray };
  } catch (error) {
    console.error('❌ Error fetching barbers:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Check if the current owner can add more service providers based on their subscription license limits
 * @returns {Promise<{canAdd: boolean, currentCount: number, maxLicenses: number, planName: string, error?: string}>}
 */
export const checkLicenseAvailability = async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { canAdd: false, currentCount: 0, maxLicenses: 0, planName: 'none', error: 'User not authenticated' };
    }

    // Get owner's subscription info from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, max_licenses, license_count')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { canAdd: false, currentCount: 0, maxLicenses: 0, planName: 'none', error: 'Profile not found' };
    }

    const maxLicenses = profile.max_licenses || 0;
    const planName = profile.subscription_plan || 'none';

    // Get shops where the current user is owner/admin
    const { data: shopStaff, error: shopError } = await supabase
      .from('shop_staff')
      .select('shop_id')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner']);

    if (shopError) throw shopError;

    if (!shopStaff || shopStaff.length === 0) {
      return { canAdd: true, currentCount: 0, maxLicenses, planName };
    }

    const shopIds = shopStaff.map(s => s.shop_id);

    // Count current barbers/providers in owner's shops
    const { data: barberCount, error: countError } = await supabase
      .from('shop_staff')
      .select('user_id', { count: 'exact', head: true })
      .in('shop_id', shopIds)
      .eq('role', 'barber')
      .eq('is_active', true);

    if (countError) throw countError;

    // Get actual count
    const { count } = await supabase
      .from('shop_staff')
      .select('user_id', { count: 'exact' })
      .in('shop_id', shopIds)
      .eq('role', 'barber')
      .eq('is_active', true);

    const currentCount = count || 0;
    const canAdd = currentCount < maxLicenses;

    console.log(`📊 License check: ${currentCount}/${maxLicenses} used, canAdd: ${canAdd}`);

    // Also sync license_count in profile to keep it accurate
    if (profile.license_count !== currentCount) {
      await supabase
        .from('profiles')
        .update({ license_count: currentCount })
        .eq('id', user.id);
      console.log(`📊 Synced license_count in profile: ${currentCount}`);
    }

    return {
      canAdd,
      currentCount,
      maxLicenses,
      planName,
      remaining: maxLicenses - currentCount
    };
  } catch (error) {
    console.error('❌ Error checking license availability:', error.message);
    return { canAdd: false, currentCount: 0, maxLicenses: 0, planName: 'none', error: error.message };
  }
};

/**
 * Update license count in owner's profile
 * @param {string} ownerId - Owner's user ID
 * @param {number} delta - Change in count (+1 or -1)
 * @returns {Promise<boolean>}
 */
export const updateLicenseCount = async (ownerId, delta) => {
  try {
    // Get current license_count
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('license_count')
      .eq('id', ownerId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching license count:', fetchError.message);
      return false;
    }

    const currentCount = profile?.license_count || 0;
    const newCount = Math.max(0, currentCount + delta); // Never go below 0

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ license_count: newCount })
      .eq('id', ownerId);

    if (updateError) {
      console.error('❌ Error updating license count:', updateError.message);
      return false;
    }

    console.log(`📊 Updated license_count: ${currentCount} → ${newCount}`);
    return true;
  } catch (error) {
    console.error('❌ Error in updateLicenseCount:', error.message);
    return false;
  }
};

/**
 * Send notification email to newly added provider
 * Uses SendPulse via Supabase Edge Function
 * @param {object} params - Email parameters
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendProviderNotificationEmail = async ({
  providerEmail,
  providerName,
  businessName,
  inviterName,
  shopId
}) => {
  try {
    console.log('📧 Sending notification email to provider:', providerEmail);

    const { data, error } = await supabase.functions.invoke('send-provider-notification', {
      body: {
        providerEmail,
        providerName,
        businessName,
        inviterName,
        shopId
      }
    });

    if (error) {
      console.error('❌ Email notification error:', error);
      // Don't fail the whole operation if email fails
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.warn('⚠️ Email service error:', data.error);
      return { success: false, error: data.error };
    }

    console.log('✅ Provider notification email sent');
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending notification email:', error.message);
    // Don't fail the whole operation if email fails
    return { success: false, error: error.message };
  }
};

/**
 * Create a new barber profile - OPTIMIZED VERSION
 * Uses Supabase Auth signUp but with optimized flow
 * @param {object} barberData - Barber details
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createBarber = async (barberData, shopId = null) => {
  try {
    console.log('👤 Creating provider:', barberData.email);
    if (shopId) {
      console.log('🏪 Will auto-assign to shop:', shopId);
    }

    // Step 1: Check if a profile with this email already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, name, phone, role')
      .eq('email', barberData.email)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing profile:', checkError.message);
      return { success: false, error: checkError.message };
    }

    // Get current owner's ID and name for invited_by field
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const ownerId = currentUser?.id || null;

    // Get owner profile and shop info for email notification
    let inviterName = null;
    let businessName = null;
    if (ownerId) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('name, business_name')
        .eq('id', ownerId)
        .single();
      inviterName = ownerProfile?.name;
      businessName = ownerProfile?.business_name;
    }
    // If shopId provided, get the shop name
    if (shopId && !businessName) {
      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', shopId)
        .single();
      businessName = shop?.name;
    }

    if (existingProfile) {
      console.log('✅ User exists with email:', barberData.email);
      console.log('   Current role:', existingProfile.role);

      // Check if this user is ALREADY a provider at this shop
      if (shopId) {
        const { data: existingStaff, error: staffCheckError } = await supabase
          .from('shop_staff')
          .select('id, role, is_active')
          .eq('shop_id', shopId)
          .eq('user_id', existingProfile.id)
          .maybeSingle();

        if (!staffCheckError && existingStaff) {
          if (existingStaff.role === 'barber' && existingStaff.is_active) {
            console.log('⚠️ User is already a provider at this shop');
            return {
              success: false,
              error: `${barberData.email} is already a provider at this business.`
            };
          }
          // If they're staff but not active barber, we'll update them below
          console.log('📌 User exists in shop_staff but as:', existingStaff.role);
        }
      }

      // Update profile role to barber (may fail due to RLS, but that's OK)
      console.log('📝 Updating profile to barber role...');
      const { data: updatedProfiles, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'barber',
          name: barberData.name,
          phone: barberData.phone || existingProfile.phone,
          onboarding_completed: true,
        })
        .eq('id', existingProfile.id)
        .select();

      if (updateError) {
        console.warn('⚠️ Profile update blocked (RLS):', updateError.message);
        // Don't fail - we can still add them to shop_staff
      }

      const updatedProfile = updatedProfiles?.[0];
      if (!updatedProfile) {
        console.warn('⚠️ Profile update returned no data - RLS may have blocked it');
      } else {
        console.log('✅ Profile updated successfully');
      }

      // Auto-assign to shop if shopId provided
      if (shopId) {
        console.log('📌 Assigning existing user to shop...');
        // Use RPC function to bypass RLS
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('add_staff_to_shop', {
            p_shop_id: shopId,
            p_user_id: existingProfile.id,
            p_role: 'barber',
            p_invited_by: ownerId
          });

        if (rpcError) {
          console.error('⚠️ Shop assignment RPC error:', rpcError.message);
          // Fallback to direct upsert (may fail due to RLS)
          const { error: assignError } = await supabase
            .from('shop_staff')
            .upsert({
              shop_id: shopId,
              user_id: existingProfile.id,
              role: 'barber',
              invited_by: ownerId,
              is_available: true,
              is_active: true
            }, {
              onConflict: 'shop_id,user_id'
            });

          if (assignError) {
            console.error('❌ Shop assignment error:', assignError.message);
            return { success: false, error: `Failed to assign provider to shop: ${assignError.message}` };
          }
          console.log('✅ Assigned to shop via fallback');
        } else if (rpcResult?.success) {
          console.log('✅ Assigned to shop via RPC');
        } else {
          console.error('❌ RPC returned error:', rpcResult?.error);
          return { success: false, error: rpcResult?.error || 'Failed to assign provider to shop' };
        }
      }

      const finalProfile = updatedProfile || {
        ...existingProfile,
        role: 'barber',
        name: barberData.name
      };
      console.log('✅ Provider ready:', finalProfile.name);

      // Increment license count for the owner
      if (ownerId) {
        await updateLicenseCount(ownerId, 1);
      }

      // Send notification email to provider (don't wait, don't fail if email fails)
      sendProviderNotificationEmail({
        providerEmail: barberData.email,
        providerName: barberData.name,
        businessName,
        inviterName,
        shopId
      }).catch(err => console.warn('⚠️ Email notification failed:', err.message));

      return {
        success: true,
        data: finalProfile,
        message: `${barberData.name} has been added as a provider!`
      };
    }

    // User does not exist - create NEW provider via Auth
    console.log('👤 Creating new provider account via Auth...');

    // Set flag to suppress auth state changes during provider creation
    _isCreatingProvider = true;
    console.log('🚩 Provider creation flag SET to:', _isCreatingProvider);

    // Save current session FIRST - we'll need to restore it after signUp
    const { data: sessionData } = await supabase.auth.getSession();
    const ownerSession = sessionData?.session;
    const ownerAccessToken = ownerSession?.access_token;
    const ownerRefreshToken = ownerSession?.refresh_token;
    console.log('📦 Owner session saved:', ownerSession?.user?.email);

    // Generate a readable password (8 chars: letters + numbers)
    const generateReadablePassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let pwd = '';
      for (let i = 0; i < 8; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pwd;
    };
    const password = generateReadablePassword();
    console.log('🔐 Generated password for provider');

    // Create auth user - this will trigger profile creation
    // NOTE: signUp automatically signs in the new user, which triggers SIGNED_IN event
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: barberData.email,
      password: password,
      options: {
        data: {
          name: barberData.name,
          role: 'barber',
          phone: barberData.phone || null,
        },
      },
    });

    if (signUpError) {
      console.error('❌ Auth signup error:', signUpError.message);
      _isCreatingProvider = false; // Reset flag
      // Restore owner session on error
      if (ownerAccessToken && ownerRefreshToken) {
        await supabase.auth.setSession({
          access_token: ownerAccessToken,
          refresh_token: ownerRefreshToken
        });
      }
      return { success: false, error: signUpError.message };
    }

    if (!authData.user) {
      _isCreatingProvider = false; // Reset flag
      // Restore owner session on error
      if (ownerAccessToken && ownerRefreshToken) {
        await supabase.auth.setSession({
          access_token: ownerAccessToken,
          refresh_token: ownerRefreshToken
        });
      }
      return { success: false, error: 'Failed to create user account' };
    }

    const providerId = authData.user.id;
    console.log('✅ Auth account created:', providerId);

    // IMMEDIATELY restore owner session - this is critical!
    // Without this, the app will think the newly created provider is logged in
    if (ownerAccessToken && ownerRefreshToken) {
      console.log('🔄 Restoring owner session immediately...');
      const { error: restoreError } = await supabase.auth.setSession({
        access_token: ownerAccessToken,
        refresh_token: ownerRefreshToken
      });
      if (restoreError) {
        console.error('⚠️ Session restore error:', restoreError.message);
      } else {
        console.log('✅ Owner session restored');
      }
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 300));

    // Update profile with barber role
    // Note: We use .select() without .single() to handle edge cases gracefully
    const { data: updatedProfiles, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'barber',
        name: barberData.name,
        phone: barberData.phone || null,
        onboarding_completed: true,
      })
      .eq('id', providerId)
      .select();

    if (updateError) {
      console.warn('⚠️ Profile update warning:', updateError.message);
    }

    const updatedProfile = updatedProfiles?.[0];

    // Auto-assign to shop if shopId provided
    if (shopId) {
      console.log('📌 Assigning new provider to shop...');
      // Use RPC function to bypass RLS
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('add_staff_to_shop', {
          p_shop_id: shopId,
          p_user_id: providerId,
          p_role: 'barber',
          p_invited_by: ownerId
        });

      if (rpcError) {
        console.error('⚠️ Shop assignment RPC error:', rpcError.message);
        // Fallback to direct insert (may fail due to RLS)
        const { error: assignError } = await supabase
          .from('shop_staff')
          .insert({
            shop_id: shopId,
            user_id: providerId,
            role: 'barber',
            invited_by: ownerId,
            is_available: true,
            is_active: true
          });
        if (assignError) {
          console.error('⚠️ Fallback insert also failed:', assignError.message);
        } else {
          console.log('✅ Assigned to shop via fallback');
        }
      } else if (rpcResult?.success) {
        console.log('✅ Assigned to shop via RPC');
      } else {
        console.error('⚠️ RPC returned error:', rpcResult?.error);
      }
    }

    console.log('✅ Provider created successfully!');
    _isCreatingProvider = false; // Reset flag on success

    // Increment license count for the owner
    if (ownerId) {
      await updateLicenseCount(ownerId, 1);
    }

    // Send notification email to provider (don't wait, don't fail if email fails)
    sendProviderNotificationEmail({
      providerEmail: barberData.email,
      providerName: barberData.name,
      businessName,
      inviterName,
      shopId
    }).catch(err => console.warn('⚠️ Email notification failed:', err.message));

    return {
      success: true,
      message: `${barberData.name} has been added as a provider!`,
      generatedPassword: password,
      data: updatedProfile || { id: providerId, email: barberData.email, name: barberData.name }
    };

  } catch (error) {
    console.error('❌ Error creating provider:', error.message);
    _isCreatingProvider = false; // Reset flag on error
    return { success: false, error: error.message };
  }
};

/**
 * Update barber profile
 * @param {string} barberId - Barber user ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const updateBarber = async (barberId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', barberId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Barber updated:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating barber:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete barber (soft delete by changing role)
 * @param {string} barberId - Barber user ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteBarber = async (barberId) => {
  try {
    console.log('🗑️ Removing provider:', barberId);

    // Get current user to verify they have permission
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Current user:', user?.email);

    // Step 1: Get all shop_staff records for this user first
    const { data: existingStaff, error: fetchError } = await supabase
      .from('shop_staff')
      .select('id, shop_id, role')
      .eq('user_id', barberId);

    console.log('📋 Found shop_staff records:', existingStaff?.length || 0);
    if (existingStaff) {
      existingStaff.forEach(s => console.log('  - Record:', s.id, 'shop:', s.shop_id, 'role:', s.role));
    }

    // Step 2: Delete by ID for more reliable deletion (RLS might have issues with user_id filter)
    if (existingStaff && existingStaff.length > 0) {
      const barberRecords = existingStaff.filter(s => s.role === 'barber');
      console.log('🗑️ Deleting', barberRecords.length, 'barber records');

      for (const record of barberRecords) {
        const { error: delError, count } = await supabase
          .from('shop_staff')
          .delete()
          .eq('id', record.id);

        if (delError) {
          console.warn('⚠️ Error deleting shop_staff record', record.id, ':', delError.message);
        } else {
          console.log('✅ Deleted shop_staff record:', record.id);
        }
      }
    }

    // Step 3: Remove service assignments
    const { error: serviceError } = await supabase
      .from('service_providers')
      .delete()
      .eq('provider_id', barberId);

    if (serviceError) {
      console.warn('⚠️ Error removing service assignments:', serviceError.message);
    } else {
      console.log('✅ Removed service assignments');
    }

    // Step 4: Update profile role to customer
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', barberId);

    if (profileError) {
      console.warn('⚠️ Error updating profile role:', profileError.message);
    } else {
      console.log('✅ Profile role changed to customer');
    }

    // Step 5: Verify deletion
    const { data: checkStaff } = await supabase
      .from('shop_staff')
      .select('id')
      .eq('user_id', barberId)
      .eq('role', 'barber');

    if (checkStaff && checkStaff.length > 0) {
      console.error('❌ Provider still exists in shop_staff! RLS may be blocking delete.');
      return { success: false, error: 'Unable to remove provider. Please check permissions.' };
    }

    // Step 6: Decrement license count for the owner (current user)
    if (user?.id) {
      await updateLicenseCount(user.id, -1);
    }

    console.log('✅ Provider removed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting barber:', error.message);
    return { success: false, error: error.message };
  }
};

// =====================================================
// ADMIN MANAGEMENT (Super Admin Only)
// =====================================================

/**
 * Fetch all admins (Super Admin only)
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
export const fetchAllAdmins = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('is_super_admin', { ascending: false }) // Super admin first
      .order('name');

    if (error) throw error;

    console.log('✅ Fetched all admins:', data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error fetching admins:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Create new admin (Super Admin only)
 * @param {object} adminData - Admin details (email, name, phone)
 * @returns {Promise<{success: boolean, data?: object, error?: string, message?: string}>}
 */
export const createAdmin = async (adminData) => {
  try {
    console.log('🔍 Checking if user already exists:', adminData.email);
    
    // Check if user exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', adminData.email)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error checking existing profile:', checkError.message);
      return { success: false, error: checkError.message };
    }

    if (existingProfile) {
      console.log('✅ User exists, promoting to admin role');
      
      // Cannot promote super_admin
      if (existingProfile.is_super_admin) {
        return { 
          success: false, 
          error: 'Cannot modify super admin account' 
        };
      }
      
      // Update to admin role
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          name: adminData.name,
          phone: adminData.phone || existingProfile.phone,
          onboarding_completed: true,
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
        return { success: false, error: updateError.message };
      }

      console.log('✅ User promoted to admin:', updatedProfile);
      return { 
        success: true, 
        data: updatedProfile,
        message: `${adminData.name} has been promoted to admin!`
      };
    } else {
      console.log('� User does not exist, creating account directly...');
      
      // Create profile directly in database (no auth user yet)
      // User will create auth account when they login with OTP for the first time
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          email: adminData.email,
          name: adminData.name,
          role: 'admin',
          phone: adminData.phone || null,
          onboarding_completed: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating admin profile:', insertError.message);
        return { 
          success: false, 
          error: `Failed to create admin: ${insertError.message}` 
        };
      }

      console.log('Admin profile created successfully!');
      
      return { 
        success: true, 
        message: `Admin created for ${adminData.email}. They can login with OTP when ready.`,
        data: newProfile
      };
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Update admin profile (Super Admin only)
 * @param {string} adminId - Admin user ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const updateAdmin = async (adminId, updates) => {
  try {
    // Check if target is super_admin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', adminId)
      .single();

    if (targetProfile?.is_super_admin) {
      return { 
        success: false, 
        error: 'Cannot modify super admin account' 
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', adminId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Admin updated:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating admin:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete admin (Super Admin only) - Changes role to customer
 * @param {string} adminId - Admin user ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAdmin = async (adminId) => {
  try {
    // Check if target is super_admin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_super_admin, name')
      .eq('id', adminId)
      .single();

    if (targetProfile?.is_super_admin) {
      return { 
        success: false, 
        error: 'Cannot delete super admin account. The main admin is permanent.' 
      };
    }

    // Soft delete: change role to customer
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', adminId);

    if (error) throw error;

    console.log('✅ Admin removed (role changed to customer):', adminId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting admin:', error.message);
    return { success: false, error: error.message };
  }
};

// =====================================================
// PASSWORD & EMAIL MANAGEMENT
// =====================================================

/**
 * Change user password
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const changePassword = async (newPassword) => {
  try {
    console.log('🔐 Changing password...');
    
    if (newPassword.length < 6) {
      return { 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('❌ Password change failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✅ Password changed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Change user email (sends verification to new email)
 * @param {string} newEmail - New email address
 * @returns {Promise<{success: boolean, error?: string, message?: string}>}
 */
/**
 * Send OTP to new email for email change verification
 * Uses Edge Function to generate and store OTP, then sends email
 * @param {string} newEmail - New email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmailChangeOTP = async (newEmail) => {
  try {
    console.log('📧 Sending OTP for email change to:', newEmail);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return {
        success: false,
        error: 'Please enter a valid email address'
      };
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'No user logged in' };
    }

    // Call Edge Function to send OTP
    console.log('📧 Calling update-user-email Edge Function (send_otp)...');
    const { data, error } = await supabase.functions.invoke(
      'update-user-email',
      {
        body: {
          userId: user.id,
          newEmail: newEmail,
          action: 'send_otp'
        }
      }
    );

    if (error) {
      console.error('❌ Edge Function error:', error.message);
      return { success: false, error: 'Failed to send verification code. Please try again.' };
    }

    if (data?.error) {
      console.error('❌ Edge Function returned error:', data.error);
      return { success: false, error: data.error };
    }

    // For testing - log the OTP from debug response
    if (data?._debug_otp) {
      console.log('🔐 DEBUG OTP:', data._debug_otp);
    }

    console.log('✅ OTP sent to new email:', newEmail);
    return {
      success: true,
      message: data?.message || 'A verification code has been sent to your new email address.',
      // For testing only - remove in production
      _debug_otp: data?._debug_otp
    };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify OTP and complete email change
 * Uses Edge Function to verify OTP and update auth.users email
 * @param {string} newEmail - New email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyEmailChangeOTP = async (newEmail, otp) => {
  try {
    console.log('🔐 Verifying OTP for email change:', newEmail);

    // Get current user first
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'No user logged in' };
    }

    const currentUserId = user.id;

    // Call Edge Function to verify OTP and update email
    console.log('📧 Calling update-user-email Edge Function (verify_otp)...');
    const { data: updateData, error: updateError } = await supabase.functions.invoke(
      'update-user-email',
      {
        body: {
          userId: currentUserId,
          newEmail: newEmail,
          otp: otp,
          action: 'verify_otp'
        }
      }
    );

    if (updateError) {
      console.error('❌ Edge Function error:', updateError.message);
      return { success: false, error: 'Failed to verify code. Please try again.' };
    }

    if (updateData?.error) {
      console.error('❌ Edge Function returned error:', updateData.error);
      return { success: false, error: updateData.error };
    }

    console.log('✅ Email updated successfully');

    // Sign out the user so they can log in with new email
    await supabase.auth.signOut();

    return {
      success: true,
      message: 'Email changed successfully! Please log in with your new email.',
      requiresRelogin: true
    };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Change email (legacy - sends email link verification)
 * @deprecated Use sendEmailChangeOTP + verifyEmailChangeOTP instead
 */
export const changeEmail = async (newEmail) => {
  // Redirect to OTP-based flow
  return sendEmailChangeOTP(newEmail);
};

// =====================================================
// ACCOUNT DELETION
// =====================================================

/**
 * Delete user account permanently
 * This function:
 * 1. Cancels any active subscriptions
 * 2. Removes user from shop_staff
 * 3. Deletes user's profile
 * 4. Signs out the user
 * Note: The auth.users record will be deleted via Edge Function with service role
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAccount = async () => {
  try {
    console.log('🗑️ Starting account deletion process...');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'No user logged in' };
    }

    const userId = user.id;
    console.log('👤 Deleting account for user:', userId);

    // Check if user is a super admin (cannot be deleted)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin, role')
      .eq('id', userId)
      .single();

    if (profile?.is_platform_admin) {
      return {
        success: false,
        error: 'Super Admin account cannot be deleted for security reasons.'
      };
    }

    // Step 1: Cancel any active Stripe subscriptions
    if (profile?.role === 'owner') {
      console.log('📦 Checking for active subscriptions...');
      try {
        const { cancelSubscription } = await import('./stripe');
        await cancelSubscription(userId, 'Account deletion');
      } catch (subError) {
        console.warn('⚠️ Error cancelling subscription:', subError.message);
        // Continue with deletion even if subscription cancellation fails
      }
    }

    // Step 2: Remove user from all shop_staff records
    console.log('🏪 Removing from shop staff...');
    const { error: staffError } = await supabase
      .from('shop_staff')
      .delete()
      .eq('user_id', userId);

    if (staffError) {
      console.warn('⚠️ Error removing from shop_staff:', staffError.message);
    }

    // Step 3: Remove service provider assignments
    console.log('🔧 Removing service assignments...');
    const { error: serviceError } = await supabase
      .from('service_providers')
      .delete()
      .eq('provider_id', userId);

    if (serviceError) {
      console.warn('⚠️ Error removing service assignments:', serviceError.message);
    }

    // Step 4: Delete customer registrations
    console.log('📝 Removing customer registrations...');
    const { error: regError } = await supabase
      .from('customer_registrations')
      .delete()
      .eq('customer_id', userId);

    if (regError) {
      console.warn('⚠️ Error removing customer registrations:', regError.message);
    }

    // Step 5: Call Edge Function to delete auth user (requires service role)
    console.log('🔐 Calling Edge Function to delete auth user...');
    const { data: deleteData, error: deleteError } = await supabase.functions.invoke(
      'delete-user-account',
      {
        body: { userId: userId }
      }
    );

    console.log('📦 Edge Function response:', JSON.stringify(deleteData));
    console.log('📦 Edge Function error:', deleteError ? JSON.stringify(deleteError) : 'none');

    // Check for network/invocation errors
    if (deleteError) {
      console.error('❌ Edge Function invocation error:', deleteError.message);
      return {
        success: false,
        error: 'Failed to delete account. Please try again or contact support.'
      };
    }

    // Check for errors returned in the response body
    if (deleteData?.error) {
      console.error('❌ Edge Function returned error:', deleteData.error);
      return {
        success: false,
        error: deleteData.error
      };
    }

    // Verify success was explicitly returned
    if (!deleteData?.success) {
      console.error('❌ Edge Function did not confirm success');
      return {
        success: false,
        error: 'Account deletion could not be confirmed. Please try again.'
      };
    }

    console.log('✅ Edge Function confirmed deletion');

    // Edge function succeeded - auth user is deleted
    // Now clean up local state

    // Step 6: Clear local storage
    console.log('🧹 Clearing local storage...');
    await AsyncStorage.clear();

    // Step 7: Sign out (this may fail since user is deleted, but that's ok)
    console.log('🚪 Signing out...');
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.log('⚠️ Sign out after deletion (expected):', signOutError.message);
    }

    console.log('✅ Account deletion complete');
    return {
      success: true,
      message: 'Your account has been permanently deleted.'
    };
  } catch (error) {
    console.error('❌ Error deleting account:', error);
    return { success: false, error: error.message };
  }
};

// =====================================================
// REVIEWS FUNCTIONS
// =====================================================

/**
 * Fetch reviews for a specific barber
 * @param {string} barberId - Barber's user ID
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
export const fetchBarberReviews = async (barberId) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format reviews for UI
    const formattedReviews = (data || []).map(review => ({
      id: review.id,
      customerName: review.customer_name,
      rating: Number(review.rating),
      review: review.review_text,
      services: review.services || [],
      date: formatReviewDate(review.created_at),
      createdAt: review.created_at
    }));

    console.log('✅ Fetched reviews for barber:', formattedReviews.length);
    return { success: true, data: formattedReviews };
  } catch (error) {
    console.error('❌ Error fetching reviews:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Create a new review for a barber
 * @param {object} reviewData - Review data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createReview = async (reviewData) => {
  try {
    const { user, profile } = await getCurrentUser();
    
    if (!user || !profile) {
      return { success: false, error: 'You must be logged in to leave a review' };
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        barber_id: reviewData.barberId,
        customer_id: user.id,
        customer_name: profile.name,
        rating: reviewData.rating,
        review_text: reviewData.reviewText,
        services: reviewData.services || []
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Review created successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating review:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Update an existing review
 * @param {string} reviewId - Review ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const updateReview = async (reviewId, updates) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        rating: updates.rating,
        review_text: updates.reviewText,
        services: updates.services,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Review updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating review:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a review
 * @param {string} reviewId - Review ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteReview = async (reviewId) => {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) throw error;

    console.log('✅ Review deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting review:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Format review date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
const formatReviewDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
};

// =====================================================
// BOOKINGS / APPOINTMENTS
// =====================================================

/**
 * Create a new booking/appointment
 * @param {Object} bookingData - Booking details
 * @param {string} bookingData.barberId - Barber's profile ID
 * @param {Array} bookingData.services - Array of service objects [{id, name, price, description}]
 * @param {string} bookingData.appointmentDate - Date in 'YYYY-MM-DD' format
 * @param {string} bookingData.appointmentTime - Time in 'HH:MM' format
 * @param {number} bookingData.totalAmount - Total price
 * @param {string} bookingData.customerNotes - Optional notes from customer
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const createBooking = async (bookingData) => {
  try {
    console.log('📅 Creating booking:', bookingData);
    
    // Get current user
    const { user, profile } = await getCurrentUser();
    if (!user || !profile) {
      throw new Error('User not authenticated');
    }
    
    // Note: Role checks removed - handled by shop-based permissions in shopAuth.js
    // This function is deprecated and should use shop-based booking from shopAuth.js
    
    // Prepare booking data
    const booking = {
      customer_id: profile.id,
      barber_id: bookingData.barberId,
      services: bookingData.services, // JSONB array
      appointment_date: bookingData.appointmentDate,
      appointment_time: bookingData.appointmentTime,
      total_amount: bookingData.totalAmount,
      status: 'pending', // Will be 'confirmed' after admin confirms
      customer_notes: bookingData.customerNotes || null,
    };
    
    // Insert booking
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(id, name, email),
        barber:profiles!bookings_barber_id_fkey(id, name, email)
      `)
      .single();
    
    if (error) throw error;

    console.log('✅ Booking created successfully!');
    console.log('   - UUID (id):', data.id);
    console.log('   - Booking ID:', data.booking_id);
    console.log('   - Status:', data.status);
    console.log('   - Full data:', JSON.stringify(data, null, 2));

    // Send email notifications (non-blocking)
    if (data.id) {
      fetch('https://happyinline.com/api/booking/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: data.id }),
      })
        .then(res => res.json())
        .then(result => console.log('📧 Email notifications sent:', result))
        .catch(err => console.error('📧 Failed to send email notifications:', err));
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating booking:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch user's bookings (customer or barber view)
 * @param {string} type - 'upcoming' or 'past'
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
/**
 * Fetch user's bookings (upcoming or past)
 * - Customers: their own bookings
 * - Barbers: their assigned bookings in current shop
 * - Managers/Admins: all bookings from current shop
 * @param {string} type - 'upcoming' or 'past'
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const fetchUserBookings = async (type = 'upcoming') => {
  try {
    console.log(`📅 Fetching ${type} bookings...`);
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      return { success: false, error: 'Not authenticated' };
    }
    
    console.log('✅ Authenticated user ID:', user.id);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Import getCurrentShopId to check shop context
    const { getCurrentShopId } = require('./shopAuth');
    const currentShopId = await getCurrentShopId();
    
    console.log('🏪 Current shop context:', currentShopId || 'None');
    
    // Check if user has a role in the current shop
    let userRoleInShop = null;
    if (currentShopId) {
      const { data: staffData } = await supabase
        .from('shop_staff')
        .select('role')
        .eq('shop_id', currentShopId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      userRoleInShop = staffData?.role || null;
      console.log('👔 Role in current shop:', userRoleInShop || 'None (customer)');
    }
    
    // Build base query
    // Note: provider_id is the actual column in bookings table (not barber_id)
    let query = supabase
      .from('bookings')
      .select(`
        *,
        shop:shops!bookings_shop_id_fkey(id, name, address, phone, logo_url),
        customer:profiles!bookings_customer_id_fkey(id, name, email, phone),
        provider:profiles!bookings_provider_id_fkey(id, name, email, phone, profile_image)
      `);
    
    // Apply filters based on user role in current shop
    if (!userRoleInShop) {
      // NO ROLE IN ANY SHOP = CUSTOMER
      // Show only their own bookings as customer
      console.log('🛍️ Customer mode: Show only my bookings');
      query = query.eq('customer_id', user.id);
      
    } else if (userRoleInShop === 'barber') {
      // BARBER/PROVIDER ROLE = Show their assigned appointments in current shop
      console.log('💇 Provider mode: Show my assigned appointments in current shop');
      query = query
        .eq('provider_id', user.id)
        .eq('shop_id', currentShopId);
      
    } else if (userRoleInShop === 'admin') {
      // ADMIN ROLE = Show all bookings in current shop
      console.log('👔 Admin mode: Show all bookings in current shop');
      query = query.eq('shop_id', currentShopId);
    }
    
    // Filter by upcoming, past, or cancelled
    if (type === 'upcoming') {
      query = query
        .gte('appointment_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
    } else if (type === 'past') {
      query = query
        .or(`appointment_date.lt.${today},status.in.(completed,no_show)`)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });
    } else if (type === 'cancelled') {
      query = query
        .eq('status', 'cancelled')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });
    }
    
    console.log('🔍 Executing bookings query...');
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Query error:', error);
      throw error;
    }
    
    console.log(`✅ ${type} bookings loaded: ${data.length} bookings`);
    if (data.length > 0) {
      console.log('📋 Bookings summary:');
      data.forEach((booking, index) => {
        console.log(`   ${index + 1}. Booking ID: ${booking.id}, Shop: ${booking.shop?.name}, Date: ${booking.appointment_date}`);
      });
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error fetching bookings:', error.message);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Update booking (reschedule, cancel, etc.)
 * @param {string} bookingId - Booking ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const updateBooking = async (bookingId, updates) => {
  try {
    console.log('📝 Updating booking:', bookingId, updates);
    
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(id, name, email),
        barber:profiles!bookings_barber_id_fkey(id, name, email, profile_image)
      `)
      .single();
    
    if (error) throw error;
    
    console.log('✅ Booking updated successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating booking:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Cancel a booking
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Cancellation reason (optional, will be stored in customer_notes)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const cancelBooking = async (bookingId, reason = '') => {
  try {
    console.log('❌ Cancelling booking:', bookingId);
    
    // Update booking status to cancelled
    // Note: cancellation_reason column doesn't exist, so we'll use customer_notes or just set status
    const updateData = {
      status: 'cancelled',
    };
    
    // If reason is provided, append to customer_notes
    if (reason) {
      updateData.customer_notes = reason;
    }
    
    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Booking cancelled successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error cancelling booking:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Reschedule a booking
 * @param {string} bookingId - Booking ID
 * @param {string} newDate - New date in 'YYYY-MM-DD' format
 * @param {string} newTime - New time in 'HH:MM' format
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const rescheduleBooking = async (bookingId, newDate, newTime) => {
  try {
    console.log('🔄 Rescheduling booking:', bookingId);
    console.log('   New date:', newDate);
    console.log('   New time:', newTime);

    const { data, error } = await supabase
      .from('bookings')
      .update({
        appointment_date: newDate,
        appointment_time: newTime,
        status: 'confirmed', // Auto-confirm rescheduled bookings
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Booking rescheduled successfully');
    console.log('   Updated data:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error rescheduling booking:', error.message);
    console.error('   Full error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Confirm booking (manager/admin only)
 * @param {string} bookingId - Booking ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const confirmBooking = async (bookingId) => {
  try {
    console.log('✅ Confirming booking:', bookingId);
    
    // UI already restricts who can confirm (manager/admin)
    // No need for additional role check here
    
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Booking confirmed successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error confirming booking:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Mark booking as completed (manager/admin only)
 * @param {string} bookingId - Booking ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const completeBooking = async (bookingId) => {
  try {
    console.log('✅ Marking booking as completed:', bookingId);

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'completed'
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Booking marked as completed');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error completing booking:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Mark booking as no-show (manager/admin only)
 * @param {string} bookingId - Booking ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const markNoShow = async (bookingId) => {
  try {
    console.log('❌ Marking booking as no-show:', bookingId);
    
    const { user, profile } = await getCurrentUser();
    if (!['admin', 'super_admin'].includes(profile?.role)) {
      throw new Error('Only admins can mark no-shows');
    }
    
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'no_show',
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Booking marked as no-show');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error marking no-show:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch all bookings for managers/admins (grouped by status)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const fetchAllBookingsForManagers = async () => {
  try {
    console.log('📅 Fetching bookings for manager...');

    // Optimize: Only fetch recent bookings (last 90 days and future)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateFilter = ninetyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        appointment_date,
        appointment_time,
        services,
        total_amount,
        cancellation_reason,
        customer_notes,
        customer:profiles!bookings_customer_id_fkey(id, name),
        barber:profiles!bookings_provider_id_fkey(id, name)
      `)
      .gte('appointment_date', dateFilter)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(200);

    if (error) {
      console.error('❌ Error fetching bookings:', error.message);
      throw error;
    }

    console.log(`✅ Got ${data?.length || 0} bookings from database`);

    // Group bookings by status
    const groupedBookings = {
      pending: data.filter(b => b.status === 'pending'),
      confirmed: data.filter(b => b.status === 'confirmed'),
      completed: data.filter(b => b.status === 'completed'),
      rejected: data.filter(b => b.status === 'cancelled')
    };

    console.log(`✅ Grouped: ${groupedBookings.pending.length} pending, ${groupedBookings.confirmed.length} confirmed, ${groupedBookings.completed.length} completed, ${groupedBookings.rejected.length} rejected`);

    return { success: true, data: groupedBookings };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return {
      success: false,
      error: error.message,
      data: { pending: [], confirmed: [], completed: [], rejected: [] }
    };
  }
};

// =====================================================
// PASSWORD RESET
// =====================================================

/**
 * Send OTP for password reset
 * @param {string} email - User email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendPasswordResetOTP = async (email) => {
  try {
    console.log('🔐 Sending password reset OTP to:', email);

    const { data, error } = await supabase.functions.invoke('reset-password', {
      body: {
        email: email.toLowerCase().trim(),
        action: 'send_otp',
      },
    });

    if (error) {
      console.error('❌ Error sending password reset OTP:', error);
      return { success: false, error: error.message || 'Failed to send verification code' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to send verification code' };
    }

    console.log('✅ Password reset OTP sent successfully');
    return { success: true, _debug_otp: data._debug_otp };
  } catch (error) {
    console.error('❌ Unexpected error sending password reset OTP:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Verify OTP and reset password
 * @param {string} email - User email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyPasswordResetOTP = async (email, otp, newPassword) => {
  try {
    console.log('🔐 Verifying password reset OTP for:', email);

    const { data, error } = await supabase.functions.invoke('reset-password', {
      body: {
        email: email.toLowerCase().trim(),
        otp: otp.trim(),
        newPassword: newPassword,
        action: 'verify_otp',
      },
    });

    if (error) {
      console.error('❌ Error verifying password reset OTP:', error);
      return { success: false, error: error.message || 'Failed to verify code' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Failed to verify code' };
    }

    console.log('✅ Password reset successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error verifying password reset OTP:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};
