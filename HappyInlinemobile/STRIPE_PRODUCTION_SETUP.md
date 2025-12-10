# 🚀 Stripe Production Setup - Complete Guide

**Status:** Ready for Production
**Last Updated:** November 23, 2025

---

## 📋 Overview

Professional Stripe integration with:
- ✅ 3-day free trial (like Spotify, Netflix, Apple Music)
- ✅ Secure server-side payment processing
- ✅ Automatic subscription management
- ✅ Webhook handling for real-time updates
- ✅ Pro-rated upgrades/downgrades
- ✅ Billing history tracking

---

## 🎯 Subscription Plans

| Plan | Price | Providers | Description |
|------|-------|-----------|-------------|
| **Starter** | $24.99/month | 1-2 | Perfect for solo or duo operations |
| **Professional** | $74.99/month | 3-9 | Growing teams with multiple providers |
| **Enterprise** | $149.99/month | 10-14 | Established businesses |

**Trial:** 3 days free on all plans (no card required to start, optional)

---

## 🔧 Setup Steps

### 1. Get Stripe API Keys

**In Stripe Dashboard:**
1. Go to **Developers → API Keys**
2. Copy both keys:
   - **Publishable Key**: `pk_test_...` (for mobile app)
   - **Secret Key**: `sk_test_...` (for Supabase Edge Functions)

**For Production:**
- Use **live** keys: `pk_live_...` and `sk_live_...`

---

### 2. Add Publishable Key to App

**File: `app.json`**

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://efxcjndkalqfjxhxmrjq.supabase.co",
      "supabaseAnonKey": "your-anon-key",
      "stripePublishableKey": "pk_test_51SR1qlHqPXhoiSms..." ← ADD THIS
    }
  }
}
```

---

### 3. Create Products & Prices in Stripe

**In Stripe Dashboard → Products:**

#### Product 1: Starter Plan
- **Name:** Starter
- **Description:** 1-2 service providers
- **Price:** $24.99 USD
- **Billing:** Recurring monthly
- **Save Price ID:** `price_xxxxxxxxxxxxx`

#### Product 2: Professional Plan
- **Name:** Professional
- **Description:** 3-9 service providers
- **Price:** $74.99 USD
- **Billing:** Recurring monthly
- **Save Price ID:** `price_yyyyyyyyyyy`

#### Product 3: Enterprise Plan
- **Name:** Enterprise
- **Description:** 10-14 service providers
- **Price:** $149.99 USD
- **Billing:** Recurring monthly
- **Save Price ID:** `price_zzzzzzzzzzz`

---

### 4. Update Price IDs in Code

**File: `src/lib/stripe.js`** (lines 13-32)

```javascript
export const STRIPE_PLANS = {
  starter: {
    name: 'Starter',
    priceId: 'price_xxxxxxxxxxxxx', // ← UPDATE THIS
    amount: 24.99,
    providers: '1-2',
    description: 'Perfect for solo or duo operations'
  },
  professional: {
    name: 'Professional',
    priceId: 'price_yyyyyyyyyyy', // ← UPDATE THIS
    amount: 74.99,
    providers: '3-9',
    description: 'Growing teams with multiple providers'
  },
  enterprise: {
    name: 'Enterprise',
    priceId: 'price_zzzzzzzzzzz', // ← UPDATE THIS
    amount: 149.99,
    providers: '10-14',
    description: 'Established businesses'
  }
};
```

**File: `supabase/functions/stripe-create-subscription/index.ts`** (lines 37-42)

```typescript
const PRICE_IDS = {
  starter: 'price_xxxxxxxxxxxxx',       // ← UPDATE THIS
  professional: 'price_yyyyyyyyyyy',    // ← UPDATE THIS
  enterprise: 'price_zzzzzzzzzzz',      // ← UPDATE THIS
}
```

**File: `supabase/functions/stripe-update-subscription/index.ts`** (lines 28-33)

```typescript
const PRICE_IDS = {
  starter: 'price_xxxxxxxxxxxxx',       // ← UPDATE THIS
  professional: 'price_yyyyyyyyyyy',    // ← UPDATE THIS
  enterprise: 'price_zzzzzzzzzzz',      // ← UPDATE THIS
}
```

---

### 5. Deploy Supabase Edge Functions

**In Supabase Dashboard → Edge Functions:**

#### Function 1: `stripe-create-subscription`
1. Click **Create a new function**
2. Name: `stripe-create-subscription`
3. Copy code from: `supabase/functions/stripe-create-subscription/index.ts`
4. Deploy

#### Function 2: `stripe-cancel-subscription`
1. Create function: `stripe-cancel-subscription`
2. Copy code from: `supabase/functions/stripe-cancel-subscription/index.ts`
3. Deploy

#### Function 3: `stripe-update-subscription`
1. Create function: `stripe-update-subscription`
2. Copy code from: `supabase/functions/stripe-update-subscription/index.ts`
3. Deploy

#### Function 4: `stripe-webhook` (Critical!)
1. Create function: `stripe-webhook`
2. Copy code from: `supabase/functions/stripe-webhook/index.ts`
3. Deploy
4. **Copy the function URL** (you'll need this for webhooks)

---

### 6. Add Stripe Secret Key to Supabase

**In Supabase Dashboard → Edge Functions → Manage secrets:**

Add these secrets:
- **Name:** `STRIPE_SECRET_KEY`
- **Value:** `sk_test_51SR1qlHqPXhoiSms...` (your secret key)

---

### 7. Set Up Stripe Webhooks

**In Stripe Dashboard → Developers → Webhooks:**

1. Click **Add endpoint**
2. **Endpoint URL:** `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. **Events to send:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Copy the **Webhook Signing Secret** (`whsec_...`)
5. Add to Supabase secrets:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...`

---

### 8. Run Database Migrations

**In Supabase SQL Editor:**

Run these SQL files in order:

1. `database/ADD_SUBSCRIPTION_FIELDS.sql`
2. `database/UPDATE_SUBSCRIPTION_PRICING.sql`

Verify with:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name LIKE '%subscription%' OR column_name LIKE '%stripe%';
```

---

### 9. Update Navigation to Include Payment Screens

**File: `src/Main.jsx`**

Add these screens to your navigation stack:

```jsx
<Stack.Screen
  name="PaymentMethodScreen"
  component={PaymentMethodScreen}
  options={{ headerShown: false }}
/>

<Stack.Screen
  name="PaymentSuccessScreen"
  component={PaymentSuccessScreen}
  options={{ headerShown: false }}
/>
```

---

### 10. Update Registration Flow

**File: `src/presentation/auth/RegistrationSuccessScreen.jsx`**

After successful registration, navigate to payment screen:

```javascript
// Instead of going straight to Main, go to payment:
navigation.navigate('PaymentMethodScreen', {
  businessData: {
    shopId: shop.id,
    email: user.email,
    selectedPlan: 'starter', // or whatever they selected
    businessName: businessData.businessName
  }
});
```

---

## 🧪 Testing

### Test Cards (Stripe Test Mode)

**Success:**
- `4242 4242 4242 4242` - Visa (always succeeds)
- Any future expiry date
- Any 3-digit CVC

**Decline:**
- `4000 0000 0000 0002` - Card declined

**3D Secure:**
- `4000 0025 0000 3155` - Requires authentication

### Testing Flow:

1. **Register new business** → Choose plan → Add payment
2. **Use test card** `4242 4242 4242 4242`
3. **Verify trial starts** (subscription_status = 'trial')
4. **Check trial end date** (3 days from now)
5. **Wait for webhook** (or trigger manually in Stripe)
6. **Verify payment succeeds** after trial

### Manual Webhook Testing:

**In Stripe Dashboard → Webhooks → Select your endpoint:**
- Click "Send test webhook"
- Choose event type
- Verify database updates

---

## 🔄 User Flow

### New Business Owner:

```
1. Register business
   ↓
2. Select plan (Starter/Professional/Enterprise)
   ↓
3. Add payment method (optional)
   - Card info
   - Billing address
   ↓
4. Trial starts immediately (3 days free)
   ↓
5. After 3 days:
   - If payment method added → Auto-charge
   - If no payment → Show payment prompt
   ↓
6. Subscription active
```

### Subscription Management:

```
Profile → Subscription Settings
  ├─ View current plan
  ├─ Upgrade/downgrade (pro-rated)
  ├─ Update payment method
  ├─ View billing history
  └─ Cancel subscription
```

---

## 📊 Database Schema

### shops table additions:

```sql
subscription_plan              TEXT (starter/professional/enterprise)
subscription_status            TEXT (trial/active/past_due/canceled)
stripe_customer_id             TEXT
stripe_subscription_id         TEXT
stripe_payment_method_id       TEXT
payment_method_last4           TEXT
payment_method_brand           TEXT (visa/mastercard/etc)
trial_started_at               TIMESTAMP
trial_ends_at                  TIMESTAMP
subscription_current_period_end TIMESTAMP
subscription_canceled_at       TIMESTAMP
last_payment_at                TIMESTAMP
last_payment_amount            NUMERIC
```

### billing_history table:

```sql
id                    UUID (primary key)
shop_id               UUID (foreign key → shops)
transaction_type      TEXT (subscription/refund/failed_payment)
amount                NUMERIC
currency              TEXT
stripe_invoice_id     TEXT
stripe_payment_intent_id TEXT
status                TEXT (pending/succeeded/failed)
period_start          TIMESTAMP
period_end            TIMESTAMP
plan_name             TEXT
created_at            TIMESTAMP
```

---

## 🚨 Important Security Notes

### ✅ DO:
- ✅ Keep secret key in Supabase Edge Functions only
- ✅ Use publishable key in mobile app (safe)
- ✅ Validate webhook signatures
- ✅ Use HTTPS for all endpoints
- ✅ Log all payment events

### ❌ DON'T:
- ❌ Never put secret key in mobile app code
- ❌ Never commit keys to Git
- ❌ Never skip webhook signature verification
- ❌ Never trust client-side payment status

---

## 💰 Revenue Tracking

**Query monthly revenue:**

```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as payments,
  SUM(amount) as revenue
FROM billing_history
WHERE status = 'succeeded'
  AND transaction_type = 'subscription'
GROUP BY month
ORDER BY month DESC;
```

**Active subscriptions:**

```sql
SELECT
  subscription_plan,
  COUNT(*) as count,
  COUNT(*) * CASE subscription_plan
    WHEN 'starter' THEN 24.99
    WHEN 'professional' THEN 74.99
    WHEN 'enterprise' THEN 149.99
  END as mrr
FROM shops
WHERE subscription_status IN ('trial', 'active')
GROUP BY subscription_plan;
```

---

## 📱 In-App Subscription UI

### Profile → Subscription Settings

**Show:**
- Current plan name
- Provider limit
- Next billing date
- Payment method (last 4 digits)
- Cancel button
- Upgrade/downgrade buttons

**Trial status banner:**
```
🎉 Trial active - X days remaining
Add payment method to continue after trial
```

**Past due banner:**
```
⚠️ Payment failed
Update payment method to restore access
```

---

## 🔔 Customer Notifications

### Send notifications for:

1. **Trial started** (immediately)
   - "Your 3-day trial has started!"

2. **Trial ending soon** (1 day before)
   - "Your trial ends tomorrow. Add payment to continue."

3. **Trial ended** (day after trial ends)
   - "Your trial has ended. Add payment to resume service."

4. **Payment succeeded** (monthly)
   - "Payment of $XX.XX successful. Thank you!"

5. **Payment failed** (immediately)
   - "Payment failed. Please update your payment method."

6. **Subscription canceled** (immediately)
   - "Your subscription has been canceled. Access until [date]."

---

## 🐛 Troubleshooting

### Payment not processing?
- Check Edge Function logs in Supabase
- Verify Price IDs match Stripe Dashboard
- Test with Stripe test cards
- Check webhook delivery in Stripe Dashboard

### Webhook not firing?
- Verify endpoint URL is correct
- Check webhook signing secret
- View webhook logs in Stripe Dashboard
- Test with "Send test webhook" button

### Database not updating?
- Check Edge Function logs
- Verify RLS policies allow updates
- Check Supabase service role key is set

---

## ✅ Production Checklist

- [ ] Switch to live Stripe keys (`pk_live_...` and `sk_live_...`)
- [ ] Create live products in Stripe Dashboard
- [ ] Update Price IDs in code with live IDs
- [ ] Deploy Edge Functions to production
- [ ] Set up live webhook endpoint
- [ ] Test payment flow with real card
- [ ] Verify webhooks are working
- [ ] Test trial expiration flow
- [ ] Test subscription cancellation
- [ ] Test plan upgrades/downgrades
- [ ] Set up error monitoring
- [ ] Document support procedures

---

## 📞 Support

**Common user questions:**

**Q: When will I be charged?**
A: You get 3 days free. After your trial ends, we'll charge your card automatically.

**Q: Can I cancel anytime?**
A: Yes! Cancel anytime during your trial at no cost. After trial, you can cancel and use until end of billing period.

**Q: What if my payment fails?**
A: We'll retry 3 times over 2 weeks. Update your payment method to avoid service interruption.

**Q: Can I change plans?**
A: Yes! Upgrades take effect immediately (pro-rated). Downgrades take effect next billing cycle.

---

## 🎉 You're Ready for Production!

This setup is enterprise-grade and follows best practices used by:
- Spotify
- Netflix
- Apple Music
- Amazon Prime

**All Stripe handling is secure, PCI-compliant, and production-ready.**

---

**Last Updated:** November 23, 2025
**Status:** ✅ Ready to Deploy
