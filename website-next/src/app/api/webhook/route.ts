import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { PLANS } from '@/lib/stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Create Supabase admin client for webhook handling
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Use any type to avoid Stripe SDK version conflicts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventData = event.data.object as any

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = eventData.metadata?.user_id
        const planId = eventData.metadata?.plan_id

        if (userId && planId) {
          const plan = PLANS[planId as keyof typeof PLANS]

          // Calculate dates
          const now = new Date()
          const nextBillingDate = new Date(now)
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
          const refundEligibleUntil = new Date(now)
          refundEligibleUntil.setDate(refundEligibleUntil.getDate() + 7)

          // Update user profile with subscription data
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_plan: planId,
              subscription_status: 'active',
              subscription_start_date: now.toISOString(),
              next_billing_date: nextBillingDate.toISOString(),
              refund_eligible_until: refundEligibleUntil.toISOString(),
              monthly_amount: plan.price,
              max_licenses: plan.maxLicenses,
              stripe_subscription_id: eventData.subscription as string,
            })
            .eq('id', userId)

          // Record payment
          await supabaseAdmin.from('payment_history').insert({
            owner_id: userId,
            amount: plan.price,
            status: 'succeeded',
            payment_type: 'subscription',
            plan_name: plan.name,
            stripe_payment_intent_id: eventData.payment_intent as string,
            description: `${plan.name} subscription`,
          })

          // Record subscription event
          await supabaseAdmin.from('subscription_events').insert({
            owner_id: userId,
            event_type: 'created',
            to_plan: planId,
            amount: plan.price,
            stripe_event_id: event.id,
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const userId = eventData.metadata?.user_id

        if (userId) {
          const status = eventData.status === 'active' ? 'active' : 'cancelled'
          const periodEnd = eventData.current_period_end
          const nextBillingDate = periodEnd
            ? new Date(periodEnd * 1000)
            : null

          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: status,
              next_billing_date: nextBillingDate?.toISOString(),
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const userId = eventData.metadata?.user_id

        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'cancelled',
              subscription_end_date: new Date().toISOString(),
            })
            .eq('id', userId)

          // Record subscription event
          await supabaseAdmin.from('subscription_events').insert({
            owner_id: userId,
            event_type: 'cancelled',
            stripe_event_id: event.id,
          })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const subscription = eventData.subscription as string

        if (subscription && eventData.billing_reason === 'subscription_cycle') {
          // Get user by subscription ID
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, subscription_plan')
            .eq('stripe_subscription_id', subscription)
            .single()

          if (profile) {
            const plan = profile.subscription_plan
              ? PLANS[profile.subscription_plan as keyof typeof PLANS]
              : null

            // Record recurring payment
            await supabaseAdmin.from('payment_history').insert({
              owner_id: profile.id,
              amount: (eventData.amount_paid || 0) / 100,
              status: 'succeeded',
              payment_type: 'subscription',
              plan_name: plan?.name || 'Subscription',
              stripe_invoice_id: eventData.id,
              receipt_url: eventData.hosted_invoice_url,
              description: `Monthly subscription renewal`,
            })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const subscription = eventData.subscription as string

        if (subscription) {
          // Get user by subscription ID
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_subscription_id', subscription)
            .single()

          if (profile) {
            // Record failed payment
            await supabaseAdmin.from('payment_history').insert({
              owner_id: profile.id,
              amount: (eventData.amount_due || 0) / 100,
              status: 'failed',
              payment_type: 'subscription',
              plan_name: 'Subscription',
              stripe_invoice_id: eventData.id,
              description: 'Payment failed',
            })
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
