/**
 * Supabase Edge Function: Upgrade Stripe Subscription
 *
 * This function handles plan upgrades with proration.
 * The secret key never touches the mobile app.
 *
 * Updated to support profile-based subscriptions (subscription belongs to owner, not shop)
 *
 * Deploy this to Supabase:
 * 1. Go to Supabase Dashboard → Edge Functions
 * 2. Create new function: "stripe-upgrade-subscription"
 * 3. Copy this code
 * 4. Add STRIPE_SECRET_KEY to function secrets
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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
    // Support both userId (new) and shopId (legacy) for metadata
    const { userId, shopId, subscriptionId, newPriceId, newPlanName } = await req.json()

    console.log('Upgrading subscription:', { userId, shopId, subscriptionId, newPlanName })

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'No subscription ID provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    if (!subscription || subscription.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Subscription not found or not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update subscription with new price (proration handled automatically)
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations', // Automatically calculates and charges difference
      metadata: {
        userId: userId || '', // New profile-based subscription owner
        shopId: shopId || '', // Legacy shop-based subscription (for backwards compatibility)
        planName: newPlanName,
        upgradedAt: new Date().toISOString(),
      },
    })

    console.log('✅ Subscription upgraded:', updatedSubscription.id)

    // Get upcoming invoice to show proration amount
    let prorationAmount = 0
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscriptionId,
      })
      prorationAmount = upcomingInvoice.amount_due / 100
    } catch (e) {
      console.log('Could not retrieve upcoming invoice:', e)
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: updatedSubscription.id,
        prorationAmount,
        newPlanName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error: any) {
    console.error('❌ Error upgrading subscription:', error)
    // Return 200 with error in body so Supabase client can parse it
    // (functions.invoke throws when receiving non-2xx status)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to upgrade subscription',
        code: error.code || 'unknown_error',
      }),
      {
        status: 200, // Use 200 so client can read error message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
