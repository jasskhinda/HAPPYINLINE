/**
 * Supabase Edge Function: Delete User Account
 *
 * Permanently deletes a user account including:
 * - Deletes from auth.users table (using service role key)
 * - Deletes profile from profiles table
 * - Cleans up related data
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    console.log('🗑️ Delete account request for user:', userId)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Step 1: Check if user is a platform admin (cannot be deleted)
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('is_platform_admin, role, email')
      .eq('id', userId)
      .single()

    if (profileFetchError) {
      console.error('❌ Error fetching profile:', profileFetchError.message)
    }

    if (profile?.is_platform_admin) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete platform admin account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📧 Deleting account for:', profile?.email)

    // Step 2: Delete from shop_staff
    const { error: staffError } = await supabaseAdmin
      .from('shop_staff')
      .delete()
      .eq('user_id', userId)

    if (staffError) {
      console.warn('⚠️ Error deleting shop_staff:', staffError.message)
    } else {
      console.log('✅ Removed from shop_staff')
    }

    // Step 3: Delete service_providers
    const { error: serviceError } = await supabaseAdmin
      .from('service_providers')
      .delete()
      .eq('provider_id', userId)

    if (serviceError) {
      console.warn('⚠️ Error deleting service_providers:', serviceError.message)
    } else {
      console.log('✅ Removed service_providers')
    }

    // Step 4: Delete customer_registrations
    const { error: regError } = await supabaseAdmin
      .from('customer_registrations')
      .delete()
      .eq('customer_id', userId)

    if (regError) {
      console.warn('⚠️ Error deleting customer_registrations:', regError.message)
    } else {
      console.log('✅ Removed customer_registrations')
    }

    // Step 5: Delete bookings (optional - keep for records or delete)
    // Keeping bookings for business records, just nullify customer_id
    const { error: bookingError } = await supabaseAdmin
      .from('bookings')
      .update({ customer_id: null })
      .eq('customer_id', userId)

    if (bookingError) {
      console.warn('⚠️ Error updating bookings:', bookingError.message)
    } else {
      console.log('✅ Anonymized bookings')
    }

    // Step 6: Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('❌ Error deleting profile:', profileError.message)
    } else {
      console.log('✅ Deleted profile')
    }

    // Step 7: Delete from auth.users (this is the critical step)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('❌ Error deleting auth user:', authError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to delete auth user: ' + authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Account permanently deleted:', userId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account permanently deleted'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
