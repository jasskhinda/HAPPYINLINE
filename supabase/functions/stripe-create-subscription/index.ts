/**
 * Supabase Edge Function: Create Stripe Subscription
 *
 * PRODUCTION-READY: Charges immediately with proper payment tracking.
 *
 * Flow:
 * 1. Attach payment method to customer
 * 2. Create subscription with automatic collection
 * 3. Payment is charged immediately (no client confirmation needed)
 * 4. Invoice and charge are properly linked for refunds
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { shopId, email, planName, paymentMethodId } = await req.json()

    console.log('Creating subscription for:', { shopId, email, planName })

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Price IDs mapping - Production
    const PRICE_IDS: Record<string, string> = {
      basic: 'price_1SYWWrHqPXhoiSmssg9CP2s1',
      starter: 'price_1SYWZXHqPXhoiSmss2BHz2gP',
      professional: 'price_1SYWa9HqPXhoiSmsTU04f8Fi',
      enterprise: 'price_1SYWayHqPXhoiSmsTa6L7OG0',
      unlimited: 'price_1SYWbjHqPXhoiSmsoBe7tEug',
    }

    const priceId = PRICE_IDS[planName]
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Create Customer
    const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email,
        'metadata[shopId]': shopId || '',
        'metadata[planName]': planName,
      }).toString(),
    })

    if (!customerResponse.ok) {
      const err = await customerResponse.json()
      console.error('Customer creation error:', err)
      return new Response(
        JSON.stringify({ error: err.error?.message || 'Failed to create customer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customer = await customerResponse.json()
    console.log('✅ Customer created:', customer.id)

    // Step 2: Attach payment method to customer
    const attachResponse = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentMethodId}/attach`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customer.id,
      }).toString(),
    })

    if (!attachResponse.ok) {
      const err = await attachResponse.json()
      console.error('Payment method attach error:', err)
      return new Response(
        JSON.stringify({ error: err.error?.message || 'Failed to attach payment method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Payment method attached')

    // Step 3: Set as default payment method
    const updateCustomerResponse = await fetch(`https://api.stripe.com/v1/customers/${customer.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'invoice_settings[default_payment_method]': paymentMethodId,
      }).toString(),
    })

    if (!updateCustomerResponse.ok) {
      console.error('Failed to set default payment method')
    }

    // Step 4: Create Subscription with automatic collection
    // collection_method=charge_automatically ensures immediate charge
    // payment_behavior=allow_incomplete with automatic collection = charges immediately
    const subscriptionResponse = await fetch('https://api.stripe.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customer.id,
        'items[0][price]': priceId,
        'default_payment_method': paymentMethodId,
        'collection_method': 'charge_automatically',
        'payment_settings[payment_method_types][0]': 'card',
        'payment_settings[save_default_payment_method]': 'on_subscription',
        'expand[0]': 'latest_invoice.payment_intent',
        'metadata[shopId]': shopId || '',
        'metadata[planName]': planName,
        'metadata[refundEligibleDays]': '7',
      }).toString(),
    })

    const subscriptionData = await subscriptionResponse.json()

    if (!subscriptionResponse.ok) {
      console.error('Subscription creation error:', subscriptionData)
      return new Response(
        JSON.stringify({ error: subscriptionData.error?.message || 'Failed to create subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Subscription created:', subscriptionData.id)
    console.log('Status:', subscriptionData.status)
    console.log('Invoice ID:', subscriptionData.latest_invoice?.id)
    console.log('Invoice status:', subscriptionData.latest_invoice?.status)

    const paymentIntent = subscriptionData.latest_invoice?.payment_intent
    console.log('Payment intent ID:', paymentIntent?.id)
    console.log('Payment intent status:', paymentIntent?.status)

    // Check if subscription is active (payment succeeded)
    if (subscriptionData.status !== 'active') {
      // If not active, payment might need confirmation
      if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'requires_confirmation') {
        // Return client secret for 3D Secure or additional auth
        return new Response(
          JSON.stringify({
            customerId: customer.id,
            subscriptionId: subscriptionData.id,
            clientSecret: paymentIntent.client_secret,
            requiresAction: true,
            status: subscriptionData.status,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Payment failed
      console.error('Payment failed:', paymentIntent?.last_payment_error)
      return new Response(
        JSON.stringify({
          error: paymentIntent?.last_payment_error?.message || 'Payment failed. Please try a different card.',
          code: paymentIntent?.last_payment_error?.code,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 5: Get payment method details for display
    const pmResponse = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentMethodId}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    })

    let paymentMethodLast4 = null
    let paymentMethodBrand = null

    if (pmResponse.ok) {
      const pm = await pmResponse.json()
      paymentMethodLast4 = pm.card?.last4
      paymentMethodBrand = pm.card?.brand
    }

    // Success - subscription is active and payment captured
    return new Response(
      JSON.stringify({
        success: true,
        customerId: customer.id,
        subscriptionId: subscriptionData.id,
        status: subscriptionData.status,
        invoiceId: subscriptionData.latest_invoice?.id,
        paymentIntentId: paymentIntent?.id,
        paymentMethodLast4,
        paymentMethodBrand,
        // clientSecret only needed if requires action (3D Secure)
        clientSecret: paymentIntent?.client_secret,
        requiresAction: false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
