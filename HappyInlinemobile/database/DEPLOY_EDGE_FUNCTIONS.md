# Deploy Edge Functions to Supabase

The subscription cancellation and refund features require these Edge Functions to be deployed to your Supabase project.

## Required Edge Functions

1. `stripe-cancel-subscription` - Cancels subscription at end of billing period
2. `stripe-process-refund` - Processes refund and cancels immediately
3. `stripe-create-subscription` - Creates new subscriptions
4. `stripe-upgrade-subscription` - Upgrades existing subscriptions

## Deployment Steps

### Option 1: Supabase CLI (Recommended)

1. Install Supabase CLI if not already installed:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
cd "/Volumes/C/HAPPY INLINE"
supabase link --project-ref efxcjndkalqfjxhxmrjq
```

4. Set the Stripe secret key:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_your_actual_stripe_secret_key
```

5. Deploy all functions:
```bash
supabase functions deploy stripe-cancel-subscription
supabase functions deploy stripe-process-refund
supabase functions deploy stripe-create-subscription
supabase functions deploy stripe-upgrade-subscription
```

### Option 2: Supabase Dashboard (Manual)

1. Go to https://supabase.com/dashboard/project/efxcjndkalqfjxhxmrjq/functions

2. For each function:
   - Click "Create a new function"
   - Name it exactly as shown (e.g., `stripe-cancel-subscription`)
   - Copy the code from the corresponding file in `supabase/functions/`
   - Click "Deploy"

3. Add the Stripe secret:
   - Go to Project Settings → Edge Functions → Secrets
   - Add: `STRIPE_SECRET_KEY` = your Stripe secret key (starts with `sk_live_` or `sk_test_`)

## After Deployment

Run this SQL in Supabase SQL Editor to fix RLS policies:

```sql
-- Fix INSERT policies for payment tables
DROP POLICY IF EXISTS "Users can insert own payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can insert own subscription events" ON subscription_events;

CREATE POLICY "Users can insert own payment history"
  ON payment_history FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can insert own subscription events"
  ON subscription_events FOR INSERT
  WITH CHECK (owner_id = auth.uid());
```

## Verify Deployment

After deploying, you can test by:
1. Opening the app
2. Going to Profile → Cancel Subscription
3. The cancellation should work without Edge Function errors

## Troubleshooting

**Error: "Edge Function returned a non-2xx status code"**
- The function is not deployed OR
- STRIPE_SECRET_KEY is not set in function secrets

**Error: "Subscription not found"**
- The user doesn't have a Stripe subscription ID in their profile
- Check profiles table for `stripe_subscription_id` column

**Error: RLS policy violation**
- Run the RLS fix SQL above in Supabase SQL Editor
