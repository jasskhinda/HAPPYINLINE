/**
 * Supabase Edge Function: Cancel Stripe Subscription
 *
 * Updated to use profile-based subscriptions (subscription belongs to owner, not shop)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Support both userId (new) and shopId (legacy) for backwards compatibility
    const { userId, shopId } = await req.json()

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    let stripeSubscriptionId: string | null = null

    // Try userId first (new profile-based subscriptions)
    if (userId) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single()

      if (!profileError && profile?.stripe_subscription_id) {
        stripeSubscriptionId = profile.stripe_subscription_id
      }
    }

    // Fallback to shopId (legacy shop-based subscriptions)
    if (!stripeSubscriptionId && shopId) {
      const { data: shop, error: shopError } = await supabaseClient
        .from('shops')
        .select('stripe_subscription_id')
        .eq('id', shopId)
        .single()

      if (!shopError && shop?.stripe_subscription_id) {
        stripeSubscriptionId = shop.stripe_subscription_id
      }
    }

    if (!stripeSubscriptionId) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cancel subscription at period end (let them use until end of billing cycle)
    const subscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    )

    console.log('✅ Subscription canceled:', subscription.id)

    return new Response(
      JSON.stringify({
        success: true,
        cancelAt: subscription.cancel_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error canceling subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
