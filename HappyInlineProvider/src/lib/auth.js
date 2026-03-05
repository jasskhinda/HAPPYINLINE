import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sign out
export const signOut = async () => {
  try {
    // Clear push token before signing out (while we still have the user session)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ push_token: null }).eq('id', user.id);
      }
    } catch (e) {
      console.log('Could not clear push token:', e.message);
    }

    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    await AsyncStorage.multiRemove(['user_id', 'user_session', 'current_shop_id']);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get current authenticated user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { user: null, profile: null };

    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!emailError && profileByEmail) {
        profile = profileByEmail;
      } else {
        return { user, profile: null };
      }
    }

    return { user, profile };
  } catch (error) {
    return { user: null, profile: null };
  }
};

// Check auth state
export const checkAuthState = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) return { isAuthenticated: false };

    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, phone, role, onboarding_completed, is_platform_admin')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      const { data: profileByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, role, onboarding_completed, is_platform_admin')
        .eq('email', session.user.email)
        .single();

      if (!emailError && profileByEmail) {
        profile = profileByEmail;
      } else {
        await supabase.auth.signOut();
        return { isAuthenticated: false, error: 'Profile not found' };
      }
    }

    return { isAuthenticated: true, user: session.user, profile };
  } catch (error) {
    await supabase.auth.signOut().catch(() => {});
    return { isAuthenticated: false, error: error.message };
  }
};

// Check onboarding status
export const hasCompletedOnboarding = async (userId = null) => {
  try {
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id;
    }
    if (!uid) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', uid)
      .single();

    return profile?.onboarding_completed === true;
  } catch (error) {
    return false;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return subscription;
};

// Update user profile
export const updateProfile = async (updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
