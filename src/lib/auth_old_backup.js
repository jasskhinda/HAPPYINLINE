import { supabase } from './supabase';
import Asyn    console.log('✅ OTP sent successfully to:', email);
    console.log('📧 Check your email for 6-digit code');

    return {
      success: true,
      user: data.user,
      session: data.session,
    };m '@react-native-async-storage/async-storage';

// =====================================================
// AUTHENTICATION FUNCTIONS
// =====================================================

/**
 * Sign up with email and password (sends OTP for verification)
 * @param {string} email - User email address
 * @param {string} password - User password (min 6 characters)
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export const signUpWithEmail = async (email, password) => {
  try {
    console.log('📧 Signing up with email:', email);

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
    console.log('� Check your email for 6-digit code');

    // STEP 3: Store the password temporarily for after OTP verification
    // (We'll need to set it after they verify)
    await AsyncStorage.setItem(`pending_password_${email}`, password);

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
 * Sign in with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user?: object, profile?: object, error?: string}>}
 */
export const signInWithEmail = async (email, password) => {
  try {
    console.log('🔐 Signing in with email:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'No user data returned' };
    }

    console.log('✅ Login successful!');
    console.log('👤 User ID:', data.user.id);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.warn('⚠️ Profile fetch failed:', profileError.message);
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      profile: profile,
    };
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP to email for passwordless login
 * @param {string} email - User email address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmailOTP = async (email) => {
  try {
    console.log('� Sending OTP to email:', email);

    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, // Only allow existing users to login with OTP
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
 * Verify email OTP
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
      console.error('❌ Full error:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.error('❌ No user data in response');
      return { success: false, error: 'No user data returned' };
    }

    console.log('✅ Supabase verification successful');
    console.log('📦 Response data:', JSON.stringify(data, null, 2));

    console.log('✅ OTP verified successfully!');
    console.log('👤 User ID:', data.user.id);

    // Check if there's a pending password (from signup)
    const pendingPassword = await AsyncStorage.getItem(`pending_password_${email}`);
    
    if (pendingPassword) {
      console.log('🔐 Setting password for new user...');
      
      try {
        // Set the password for the user
        const { error: passwordError } = await supabase.auth.updateUser({
          password: pendingPassword,
        });
        
        if (passwordError) {
          console.error('❌ Password set failed:', passwordError.message);
          console.error('❌ Full password error:', JSON.stringify(passwordError));
        } else {
          console.log('✅ Password set successfully!');
        }
      } catch (pwError) {
        console.error('❌ Password update exception:', pwError);
      }
      
      // Clean up
      console.log('🧹 Cleaning up pending password...');
      await AsyncStorage.removeItem(`pending_password_${email}`);
      console.log('✅ Cleanup complete');
    } else {
      console.log('ℹ️ No pending password found (existing user login)');
    }

    // Get user profile (might not exist yet for new signups)
    console.log('📋 Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.log('⚠️ Profile not found (will be created later):', profileError.message);
      console.log('ℹ️ This is normal for new signups');
    } else {
      console.log('✅ Profile loaded:', JSON.stringify(profile));
    }

    console.log('🎉 verifyEmailOTP completed successfully!');
    console.log('📤 Returning success=true, user, session, profile');

    const returnData = {
      success: true,
      user: data.user,
      session: data.session,
      profile: profile || null,
    };

    console.log('✅ FINAL RETURN:', JSON.stringify(returnData, null, 2));
    
    return returnData;
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
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, profile: null };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { user, profile };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, profile: null };
  }
};

/**
 * Check authentication state
 * @returns {Promise<{isAuthenticated: boolean, user?: object, profile?: object}>}
 */
export const checkAuthState = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { isAuthenticated: false };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      isAuthenticated: true,
      user: session.user,
      profile: profile,
    };
  } catch (error) {
    console.error('Error checking auth state:', error);
    return { isAuthenticated: false };
  }
};

/**
 * Sign out current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    // Clear onboarding flag
    await AsyncStorage.removeItem('onboarding_completed');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update user profile
 * @param {object} updates - Profile fields to update
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
      return { success: false, error: error.message };
    }

    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create or update user profile with name
 * @param {string} name - User's name
 * @param {string} role - User's role (optional, defaults to 'customer')
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
export const setupUserProfile = async (name, role = 'customer') => {
  try {
    console.log('🔍 Getting current user...');
    
    // Get current session directly
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ No active session:', sessionError?.message);
      return { success: false, error: 'No authenticated user. Please login again.' };
    }

    const user = session.user;
    console.log('✅ User found:', user.id);
    console.log('📧 Email:', user.email);

    console.log('💾 Upserting profile...');
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        name: name,
        role: role,
        onboarding_completed: true,
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// =====================================================
// ONBOARDING FUNCTIONS
// =====================================================

const ONBOARDING_KEY = 'onboarding_completed';

/**
 * Check if user has completed onboarding
 * @returns {Promise<boolean>}
 */
export const hasCompletedOnboarding = async () => {
  try {
    // First check AsyncStorage (for first-time app users)
    const localValue = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (localValue === 'true') {
      return true;
    }

    // Check if user is authenticated and has completed onboarding in database
    const { profile } = await getCurrentUser();
    if (profile && profile.onboarding_completed) {
      // Sync with local storage
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      return true;
    }

    return false;
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
    // Save to AsyncStorage
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

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

/**
 * Reset onboarding status (for testing)
 * @returns {Promise<boolean>}
 */
export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    
    const { user } = await getCurrentUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('id', user.id);
    }

    return true;
  } catch (error) {
    console.error('Error resetting onboarding:', error);
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
 * Validate password strength
 * @param {string} password 
 * @returns {{valid: boolean, message?: string}}
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

/**
 * Setup auth state change listener
 * @param {Function} callback - Called when auth state changes
 * @returns {Object} subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      let profile = null;
      if (session?.user) {
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
 * Use this when you delete users from Supabase dashboard
 * @returns {Promise<void>}
 */
export const clearAllAppData = async () => {
  try {
    console.log('🧹 Clearing all app data...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all AsyncStorage keys
    await AsyncStorage.multiRemove([
      ONBOARDING_KEY,
      'has_seen_onboarding',
      // Clear any pending password keys
    ]);
    
    // Get all keys and remove any that start with 'pending_password_'
    const allKeys = await AsyncStorage.getAllKeys();
    const passwordKeys = allKeys.filter(key => key.startsWith('pending_password_'));
    if (passwordKeys.length > 0) {
      await AsyncStorage.multiRemove(passwordKeys);
    }
    
    console.log('✅ All app data cleared!');
    console.log('🔄 Please restart the app');
  } catch (error) {
    console.error('❌ Error clearing app data:', error);
  }
};
