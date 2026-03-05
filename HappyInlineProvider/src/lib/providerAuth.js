import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sign up a new business owner with email/password
export const signUpBusinessOwner = async (email, password, name) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) return { success: false, error: authError.message };
    if (!authData.user) return { success: false, error: 'Registration failed' };

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Upsert profile with owner role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: 'owner',
        onboarding_completed: true,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) return { success: false, error: profileError.message };

    return { success: true, user: authData.user, session: authData.session, profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign in a provider/owner with email/password
// Verifies the user has owner/provider role or shop_staff membership
export const signInProvider = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) return { success: false, error: error.message };
    if (!data.user) return { success: false, error: 'Login failed' };

    // Verify user is owner/provider/super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'Profile not found. Please register first.' };
    }

    const isProviderRole = ['owner', 'provider', 'super_admin'].includes(profile.role);

    if (!isProviderRole) {
      // Check shop_staff table
      const { data: staffEntries } = await supabase
        .from('shop_staff')
        .select('id, role')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .limit(1);

      if (!staffEntries || staffEntries.length === 0) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'This account does not have business access. Please use the Happy InLine Customer app instead.'
        };
      }
    }

    return { success: true, user: data.user, session: data.session, profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get the provider's shop
export const getProviderShop = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check for owned shop first
    const { data: ownedShop } = await supabase
      .from('shops')
      .select('*')
      .eq('created_by', user.id)
      .limit(1)
      .maybeSingle();

    if (ownedShop) return { success: true, shop: ownedShop, role: 'owner' };

    // Check shop_staff for membership
    const { data: staffEntry } = await supabase
      .from('shop_staff')
      .select('role, shop_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (staffEntry) {
      const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('id', staffEntry.shop_id)
        .single();

      if (shop) return { success: true, shop, role: staffEntry.role };
    }

    return { success: false, error: 'No shop found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get today's booking stats for a shop
export const getTodayStats = async (shopId) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, status, total_amount')
      .eq('shop_id', shopId)
      .eq('appointment_date', today);

    if (error) return { success: false, error: error.message };

    const stats = {
      total: bookings?.length || 0,
      pending: bookings?.filter(b => b.status === 'pending').length || 0,
      confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
      completed: bookings?.filter(b => b.status === 'completed').length || 0,
      cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
      revenue: bookings
        ?.filter(b => ['confirmed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0,
    };

    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
