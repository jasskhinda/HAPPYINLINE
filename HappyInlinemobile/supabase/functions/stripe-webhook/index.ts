/**
 * Supabase Edge Function: Stripe Webhook Handler
 *
 * Handles Stripe webhook events:
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 *
 * This keeps your database in sync with Stripe automatically.
 * Subscriptions are stored on PROFILES (owner-based), not shops.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    console.log('⚠️ Missing signature or webhook secret')
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log('📥 Webhook received:', event.type)

    switch (event.type) {
      // Subscription updated (plan change, status change, etc)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      // Subscription deleted/canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      // Payment succeeded (recurring charge)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      // Payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    )
  }
})

/**
 * Handle subscription updates from Stripe
 * Updates profile subscription status based on Stripe status
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('📝 Handling subscription update:', subscription.id, 'Status:', subscription.status)

  // Map Stripe status to our status
  let status = 'active'
  if (subscription.status === 'past_due') status = 'past_due'
  if (subscription.status === 'canceled') status = 'cancelled'
  if (subscription.status === 'unpaid') status = 'unpaid'
  if (subscription.status === 'paused') status = 'paused'

  // Find profile by stripe_subscription_id
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (findError || !profile) {
    console.log('⚠️ Profile not found for subscription:', subscription.id)
    return
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: status,
      next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error('❌ Error updating profile:', updateError)
  } else {
    console.log('✅ Profile subscription updated:', profile.id, 'Status:', status)
  }
}

/**
 * Handle subscription deletion/cancellation from Stripe
 * This happens when subscription is fully canceled (not just set to cancel at period end)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🗑️ Handling subscription deletion:', subscription.id)

  // Find profile by stripe_subscription_id
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (findError || !profile) {
    console.log('⚠️ Profile not found for deleted subscription:', subscription.id)
    return
  }

  // Update profile - subscription is fully ended
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_end_date: new Date().toISOString(),
      // Don't clear stripe IDs - keep for reference
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error('❌ Error updating profile for deletion:', updateError)
  } else {
    console.log('✅ Profile subscription marked as cancelled:', profile.id)
  }
}

/**
 * Handle successful recurring payment
 * This fires when monthly charge succeeds
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Skip if not a subscription invoice
  if (!invoice.subscription) {
    console.log('ℹ️ Non-subscription invoice, skipping')
    return
  }

  console.log('💰 Handling payment succeeded for subscription:', invoice.subscription)

  // Find profile by stripe_subscription_id
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, subscription_plan')
    .eq('stripe_subscription_id', invoice.subscription as string)
    .single()

  if (findError || !profile) {
    console.log('⚠️ Profile not found for invoice subscription:', invoice.subscription)
    return
  }

  // Calculate next billing date (30 days from now)
  const nextBillingDate = new Date()
  nextBillingDate.setDate(nextBillingDate.getDate() + 30)

  // Update profile - ensure active status and update next billing date
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      next_billing_date: nextBillingDate.toISOString(),
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error('❌ Error updating profile after payment:', updateError)
  } else {
    console.log('✅ Payment recorded, profile updated:', profile.id)
  }

  // Record in payment history (optional - don't fail if table doesn't exist)
  try {
    await supabase
      .from('payment_history')
      .insert({
        owner_id: profile.id,
        amount: (invoice.amount_paid / 100),
        status: 'succeeded',
        payment_type: 'subscription_renewal',
        plan_name: profile.subscription_plan,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent as string,
        description: 'Monthly subscription renewal',
      })
    console.log('✅ Payment history recorded')
  } catch (e) {
    console.log('ℹ️ Payment history table not available, skipping')
  }
}

/**
 * Handle failed payment
 * This fires when monthly charge fails - user needs to update payment method
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    console.log('ℹ️ Non-subscription invoice failure, skipping')
    return
  }

  console.log('❌ Handling payment failed for subscription:', invoice.subscription)

  // Find profile by stripe_subscription_id
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, subscription_plan')
    .eq('stripe_subscription_id', invoice.subscription as string)
    .single()

  if (findError || !profile) {
    console.log('⚠️ Profile not found for failed payment:', invoice.subscription)
    return
  }

  // Update profile status to past_due
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error('❌ Error updating profile for failed payment:', updateError)
  } else {
    console.log('⚠️ Profile marked as past_due:', profile.id)
  }

  // Record failed payment in history (optional)
  try {
    await supabase
      .from('payment_history')
      .insert({
        owner_id: profile.id,
        amount: (invoice.amount_due / 100),
        status: 'failed',
        payment_type: 'subscription_renewal',
        plan_name: profile.subscription_plan,
        stripe_invoice_id: invoice.id,
        description: 'Payment failed - ' + (invoice.last_finalization_error?.message || 'Card declined'),
      })
  } catch (e) {
    console.log('ℹ️ Payment history table not available, skipping')
  }
}
