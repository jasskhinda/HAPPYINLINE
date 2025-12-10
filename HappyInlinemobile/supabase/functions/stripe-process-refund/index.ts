/**
 * Supabase Edge Function: Process Stripe Refund
 *
 * Uses native fetch API to avoid Deno/Stripe SDK compatibility issues.
 * Handles multiple ways to find the payment to refund.
 *
 * Deploy this to Supabase Dashboard → Edge Functions
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
    const { userId, shopId, subscriptionId, amount, reason } = await req.json()

    console.log('Processing refund:', { userId, shopId, subscriptionId, amount, reason })

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'No subscription ID provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not found')
      return new Response(
        JSON.stringify({ error: 'Stripe key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get subscription with expanded invoice and payment_intent
    const subResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}?expand[]=latest_invoice.payment_intent&expand[]=latest_invoice.charge`,
      {
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (!subResponse.ok) {
      const err = await subResponse.json()
      console.error('Subscription fetch error:', err)
      return new Response(
        JSON.stringify({ error: err.error?.message || 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const subscription = await subResponse.json()
    console.log('Subscription status:', subscription.status)
    console.log('Latest invoice:', subscription.latest_invoice?.id)

    // Try multiple ways to find a refundable payment
    let paymentIntentId = null
    let chargeId = null

    // Method 1: Direct payment_intent on invoice (expanded)
    if (subscription.latest_invoice?.payment_intent) {
      if (typeof subscription.latest_invoice.payment_intent === 'object') {
        paymentIntentId = subscription.latest_invoice.payment_intent.id
      } else {
        paymentIntentId = subscription.latest_invoice.payment_intent
      }
      console.log('Found payment_intent on invoice:', paymentIntentId)
    }

    // Method 2: Charge on invoice (expanded)
    if (!paymentIntentId && subscription.latest_invoice?.charge) {
      if (typeof subscription.latest_invoice.charge === 'object') {
        chargeId = subscription.latest_invoice.charge.id
      } else {
        chargeId = subscription.latest_invoice.charge
      }
      console.log('Found charge on invoice:', chargeId)
    }

    // Method 3: Look up the invoice directly to get charge
    if (!paymentIntentId && !chargeId && subscription.latest_invoice?.id) {
      console.log('Looking up invoice directly:', subscription.latest_invoice.id)
      const invoiceResponse = await fetch(
        `https://api.stripe.com/v1/invoices/${subscription.latest_invoice.id}`,
        {
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
          },
        }
      )

      if (invoiceResponse.ok) {
        const invoice = await invoiceResponse.json()
        console.log('Invoice details:', { charge: invoice.charge, payment_intent: invoice.payment_intent })
        paymentIntentId = invoice.payment_intent
        chargeId = invoice.charge
      }
    }

    // Method 4: List charges for the customer
    if (!paymentIntentId && !chargeId && subscription.customer) {
      console.log('Looking up customer charges for:', subscription.customer)
      const chargesResponse = await fetch(
        `https://api.stripe.com/v1/charges?customer=${subscription.customer}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
          },
        }
      )

      if (chargesResponse.ok) {
        const chargesData = await chargesResponse.json()
        if (chargesData.data && chargesData.data.length > 0) {
          // Get the most recent successful charge
          const recentCharge = chargesData.data.find((c: any) => c.status === 'succeeded' && !c.refunded)
          if (recentCharge) {
            chargeId = recentCharge.id
            paymentIntentId = recentCharge.payment_intent
            console.log('Found recent charge:', chargeId, 'payment_intent:', paymentIntentId)
          }
        }
      }
    }

    // Method 5: List payment intents for the customer
    if (!paymentIntentId && !chargeId && subscription.customer) {
      console.log('Looking up customer payment intents for:', subscription.customer)
      const piResponse = await fetch(
        `https://api.stripe.com/v1/payment_intents?customer=${subscription.customer}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
          },
        }
      )

      if (piResponse.ok) {
        const piData = await piResponse.json()
        console.log('Payment intents found:', piData.data?.length)
        if (piData.data && piData.data.length > 0) {
          // Get the most recent succeeded payment intent
          const recentPI = piData.data.find((pi: any) => pi.status === 'succeeded')
          if (recentPI) {
            paymentIntentId = recentPI.id
            chargeId = recentPI.latest_charge
            console.log('Found recent payment intent:', paymentIntentId, 'charge:', chargeId)
          }
        }
      }
    }

    if (!paymentIntentId && !chargeId) {
      console.error('No payment found to refund. Invoice:', subscription.latest_invoice?.id)
      return new Response(
        JSON.stringify({ error: 'No payment found to refund. The subscription may not have been charged yet.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Refunding with:', { paymentIntentId, chargeId })

    // Create refund - prefer payment_intent, fall back to charge
    const refundBody = new URLSearchParams({
      reason: 'requested_by_customer',
      'metadata[userId]': userId || '',
      'metadata[shopId]': shopId || '',
      'metadata[refundReason]': reason || 'Customer requested within 7-day window',
    })

    if (paymentIntentId) {
      refundBody.append('payment_intent', paymentIntentId)
    } else if (chargeId) {
      refundBody.append('charge', chargeId)
    }

    const refundResponse = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: refundBody.toString(),
    })

    if (!refundResponse.ok) {
      const err = await refundResponse.json()
      console.error('Refund error:', err)
      return new Response(
        JSON.stringify({ error: err.error?.message || 'Failed to process refund' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const refund = await refundResponse.json()
    console.log('✅ Refund processed:', refund.id, 'Amount:', refund.amount)

    // Cancel subscription using fetch API
    const cancelResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (cancelResponse.ok) {
      console.log('✅ Subscription canceled after refund')
    } else {
      console.error('Failed to cancel subscription:', await cancelResponse.text())
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundAmount: refund.amount / 100,
        status: refund.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error processing refund:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process refund' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
