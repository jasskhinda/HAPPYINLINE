# 🚀 Stripe Quick Start - What You Need to Do

**Ready to go live with payments? Follow these steps.**

---

## ✅ Step-by-Step Checklist

### 1. Get Your Stripe Keys (5 minutes)

**Go to Stripe Dashboard:** https://dashboard.stripe.com

1. Click **Developers** → **API Keys**
2. Copy **two keys**:
   - Publishable key: `pk_test_...` (starts with pk_test)
   - Secret key: `sk_test_...` (starts with sk_test)

**For production, use live keys:**
- `pk_live_...`
- `sk_live_...`

---

### 2. Add Publishable Key to App (2 minutes)

**File:** `app.json` (line 35)

Replace this:
```json
"stripePublishableKey": "pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY"
```

With your actual key:
```json
"stripePublishableKey": "pk_test_51SR1qlHqPXhoiSms..."
```

---

### 3. Create Products in Stripe (10 minutes)

**In Stripe Dashboard → Products → Add product:**

#### Product 1: Starter
- **Name:** Starter
- **Description:** 1-2 service providers
- **Price:** $24.99
- **Recurring:** Monthly
- **Copy the Price ID:** `price_xxxxxxxxxxxxx`

#### Product 2: Professional
- **Name:** Professional
- **Description:** 3-9 service providers
- **Price:** $74.99
- **Recurring:** Monthly
- **Copy the Price ID:** `price_yyyyyyyyyyy`

#### Product 3: Enterprise
- **Name:** Enterprise
- **Description:** 10-14 service providers
- **Price:** $149.99
- **Recurring:** Monthly
- **Copy the Price ID:** `price_zzzzzzzzzzz`

---

### 4. Update Price IDs in Code (5 minutes)

**File:** `src/lib/stripe.js` (lines 13-32)

Replace the placeholder price IDs:
```javascript
starter: {
  priceId: 'price_xxxxxxxxxxxxx', // ← Paste your Starter price ID
},
professional: {
  priceId: 'price_yyyyyyyyyyy', // ← Paste your Professional price ID
},
enterprise: {
  priceId: 'price_zzzzzzzzzzz', // ← Paste your Enterprise price ID
}
```

---

### 5. Deploy Edge Functions to Supabase (15 minutes)

**In Supabase Dashboard → Edge Functions:**

Create 4 functions:

#### Function 1: stripe-create-subscription
- Copy code from: `supabase/functions/stripe-create-subscription/index.ts`
- Update Price IDs (lines 37-42)
- Deploy

#### Function 2: stripe-cancel-subscription
- Copy code from: `supabase/functions/stripe-cancel-subscription/index.ts`
- Deploy

#### Function 3: stripe-update-subscription
- Copy code from: `supabase/functions/stripe-update-subscription/index.ts`
- Update Price IDs (lines 28-33)
- Deploy

#### Function 4: stripe-webhook
- Copy code from: `supabase/functions/stripe-webhook/index.ts`
- Deploy
- **Copy the function URL** (you'll need it next)

---

### 6. Add Secret Key to Supabase (2 minutes)

**In Supabase → Edge Functions → Manage secrets:**

Add secret:
- **Name:** `STRIPE_SECRET_KEY`
- **Value:** `sk_test_51SR1qlHqPXhoiSms...` (your secret key)

---

### 7. Set Up Webhooks (5 minutes)

**In Stripe Dashboard → Developers → Webhooks → Add endpoint:**

1. **Endpoint URL:**
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
   ```

2. **Select events:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

3. **Copy Webhook Signing Secret:** `whsec_...`

4. **Add to Supabase secrets:**
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...`

---

### 8. Run Database Migrations (5 minutes)

**In Supabase SQL Editor:**

Run these files in order:

1. `database/ADD_SUBSCRIPTION_FIELDS.sql`
2. `database/UPDATE_SUBSCRIPTION_PRICING.sql`

Verify:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name LIKE '%stripe%';
```

Should see: `stripe_customer_id`, `stripe_subscription_id`, `stripe_payment_method_id`

---

### 9. Test the Payment Flow (10 minutes)

1. **Register a new business** in your app
2. **Choose a plan** (Starter/Professional/Enterprise)
3. **Add payment method** screen appears
4. **Use test card:** `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
5. **Click "Start 3-Day Free Trial"**
6. **Verify:**
   - Trial starts immediately
   - No charge today
   - Check Supabase: `subscription_status = 'trial'`
   - Check Stripe Dashboard: Customer and subscription created

---

## 🧪 Test Cards

| Card Number | Purpose |
|-------------|---------|
| `4242 4242 4242 4242` | Success (always works) |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires 3D Secure |

---

## ✅ Production Checklist

Before going live:

- [ ] Replace test keys with live keys in `app.json`
- [ ] Create live products in Stripe Dashboard
- [ ] Update Price IDs in code with live IDs
- [ ] Update Edge Functions with live Price IDs
- [ ] Set up live webhook endpoint
- [ ] Test one real payment ($0.50 minimum)
- [ ] Verify webhook fires
- [ ] Test subscription cancellation
- [ ] Document support procedures

---

## 🐛 Troubleshooting

**Payment not working?**
- Check Stripe Dashboard → Logs
- Check Supabase Edge Function logs
- Verify Price IDs match exactly
- Test with `4242 4242 4242 4242`

**Webhook not firing?**
- Check webhook URL is correct
- Verify webhook signing secret
- Test with "Send test webhook" in Stripe

**Database not updating?**
- Check Edge Function logs in Supabase
- Verify `STRIPE_SECRET_KEY` is set
- Check RLS policies allow updates

---

## 📞 Need Help?

See **STRIPE_PRODUCTION_SETUP.md** for detailed documentation.

**Common issues:**
- Forgot to update Price IDs → Check all 3 files
- Webhook secret not set → Add to Supabase secrets
- Wrong endpoint URL → Must include `/functions/v1/`

---

## 🎉 You're Done!

Once all checkboxes are complete, you're ready to accept real payments!

**Estimated setup time:** 1 hour
**Difficulty:** Intermediate
**Required:** Stripe account (free), Supabase project

---

**Last Updated:** November 23, 2025
**Status:** ✅ Complete Implementation
