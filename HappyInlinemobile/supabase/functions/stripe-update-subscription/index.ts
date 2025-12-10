/**
 * Supabase Edge Function: Update Stripe Subscription (Upgrade/Downgrade)
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
    const { shopId, newPlan } = await req.json()

    // Price IDs mapping
    const PRICE_IDS = {
      starter: 'price_starter',
      professional: 'price_professional',
      enterprise: 'price_enterprise',
    }

    const newPriceId = PRICE_IDS[newPlan as keyof typeof PRICE_IDS]

    if (!newPriceId) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get shop's subscription ID
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('stripe_subscription_id')
      .eq('id', shopId)
      .single()

    if (shopError || !shop?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(shop.stripe_subscription_id)

    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(
      shop.stripe_subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Pro-rate the charge/credit
      }
    )

    console.log('✅ Subscription updated:', updatedSubscription.id)

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: updatedSubscription.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error updating subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
