# Stripe Setup for Mobile-Only App with Supabase

## Architecture

```
Mobile App (React Native)
    ↓ (uses publishable key)
Stripe API (create payment method)
    ↓
Supabase Edge Function (uses secret key)
    ↓
Stripe API (create subscription)
    ↓
Supabase Database (save subscription data)
```

## Step 1: Store Publishable Key in App

**File: `app.json`**
```json
"extra": {
  "supabaseUrl": "https://efxcjndkalqfjxhxmrjq.supabase.co",
  "supabaseAnonKey": "...",
  "stripePublishableKey": "pk_test_..." // ← ADD THIS
}
```

This is SAFE because publishable keys are designed to be public.

## Step 2: Create Supabase Edge Function for Server-Side Stripe

**Why?** Secret keys must NEVER be in mobile app code.

**Solution:** Use Supabase Edge Functions (serverless functions) to handle:
- Creating Stripe Customers
- Creating Subscriptions
- Handling Webhooks
- Processing Payments

### Create Edge Function:

```bash
# In Supabase Dashboard:
# 1. Go to Edge Functions
# 2. Create new function: "stripe-create-subscription"
# 3. Add STRIPE_SECRET_KEY as environment variable
```

**Function Code (Deno/TypeScript):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const { shopId, email, priceId } = await req.json()

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email: email,
    metadata: { shopId }
  })

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    trial_period_days: 7,
  })

  return new Response(JSON.stringify({
    customerId: customer.id,
    subscriptionId: subscription.id
  }))
})
```

## Step 3: Store Secret Key in Supabase

**In Supabase Dashboard:**
1. Go to **Edge Functions**
2. Click **Manage secrets**
3. Add secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_51SR1qlHqPXhoiSms...`

## Step 4: Create Stripe Products & Prices

**In Stripe Dashboard:**

1. **Create Products:**
   - Individual Plan
   - Team Plan
   - Enterprise Plan

2. **Create Prices:**
   - Individual: $25/month → Get Price ID: `price_xxx`
   - Team: $75/month → Get Price ID: `price_yyy`
   - Enterprise: $99/month → Get Price ID: `price_zzz`

3. **Add Price IDs to your app:**
```javascript
const STRIPE_PRICES = {
  solo: 'price_xxx',      // $25/month
  team: 'price_yyy',      // $75/month
  enterprise: 'price_zzz' // $99/month
}
```

## Step 5: Payment Flow

### When Trial Ends:

**Mobile App → Supabase Edge Function:**
```javascript
// In your app
const { data } = await supabase.functions.invoke('stripe-create-subscription', {
  body: {
    shopId: shop.id,
    email: shop.email,
    priceId: STRIPE_PRICES[shop.subscription_plan]
  }
})

// Save to database
await supabase
  .from('shops')
  .update({
    stripe_customer_id: data.customerId,
    stripe_subscription_id: data.subscriptionId,
    subscription_status: 'active'
  })
  .eq('id', shopId)
```

## Security ✅

- ✅ Publishable key in mobile app (safe, designed for this)
- ✅ Secret key in Supabase Edge Functions (secure, server-side only)
- ✅ No API keys exposed in mobile app code
- ✅ All sensitive operations happen on server

## What You Need from Client:

1. **Publishable Key**: `pk_test_...` (goes in app.json)
2. **Secret Key**: `sk_test_...` ✅ Already have
3. **Create Products in Stripe Dashboard** (or I can provide script)

## Files to Create:

I'll create:
1. ✅ Supabase Edge Function for Stripe
2. ✅ Stripe service in app (uses publishable key)
3. ✅ Payment screen for when trial ends

Want me to create these now?
