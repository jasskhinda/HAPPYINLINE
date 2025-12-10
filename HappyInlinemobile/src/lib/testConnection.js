import { supabase } from './supabase';

/**
 * Test Supabase connection
 * Call this function to verify your Supabase connection is working
 */
export const testSupabaseConnection = async () => {
  try {
    // Try to get the current session (will work even with no user logged in)
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('Invalid API key')) {
      console.error('❌ Supabase connection FAILED: Invalid API key');
      return false;
    }
    
    console.log('✅ Supabase connection SUCCESSFUL!');
    console.log('📊 Session status:', session ? 'User logged in' : 'No user logged in (this is normal)');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection FAILED:', error.message);
    return false;
  }
};

/**
 * Get Supabase configuration (for debugging)
 */
export const getSupabaseConfig = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Supabase URL:', supabase.supabaseUrl);
    console.log('Connection status:', error ? 'Error' : 'Connected');
    return { success: !error };
  } catch (error) {
    console.error('Config check failed:', error);
    return { success: false };
  }
};
