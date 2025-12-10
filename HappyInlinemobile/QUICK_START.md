# Quick Start Guide - Testing the Complete System

## Step 1: Run Database Migration ⚠️ REQUIRED FIRST

Open Supabase SQL Editor and run:
```
/Volumes/C/HAPPY INLINE/database/COMPLETE_HOME_SHOP_LOCK_MIGRATION.sql
```

This adds:
- Subscription fields to shops
- Home shop lock fields to profiles
- Billing history table
- Helper functions

## Step 2: Start the App

```bash
cd "/Volumes/C/HAPPY INLINE"
npx expo start --clear
```

## Step 3: Test Business Registration Flow

1. **Scan QR code** on your phone
2. Tap "Get Started" → "Register Business"
3. Enter business email, name, and password
4. **Select business category** (e.g., "Beauty & Personal Care")
5. **Select business type** (e.g., "Barber Shop")
6. **Choose pricing plan**:
   - Individual: $25/mo (1-3 staff)
   - Team: $75/mo (3-7 staff)
   - Enterprise: $99/mo (unlimited)
7. Review and create account
8. Sign in and complete shop setup

✅ **Expected**: Shop created with selected plan + 7-day trial

## Step 4: Generate QR Code for Customer Signups

1. Sign in as shop owner
2. Go to Manager Dashboard
3. Find your approved shop
4. Tap **"Get QR Code"** button
5. Save or share the QR code

✅ **Expected**: QR modal appears with shop-specific signup link

## Step 5: Test Customer Signup via QR

### Option A: Use Deep Link
1. Copy the shop link: `happyinline://signup/shop/{SHOP_ID}`
2. Replace `{SHOP_ID}` with actual shop ID
3. Open link on your test device

### Option B: Scan QR Code
1. Use another device or test account
2. Scan the QR code
3. Should open signup screen

### Complete Signup:
1. See shop name and location displayed
2. Enter name, email, phone, password
3. Create account
4. Sign in

✅ **Expected**: Customer sees ONLY that shop, no browse categories

## Step 6: Verify Home Shop Lock

1. Sign in as the customer from Step 5
2. **Home screen should show ONLY their shop**
3. **Browse categories should be HIDDEN**
4. Try booking - should work perfectly
5. Cannot navigate to other shops

✅ **Expected**: Customer is locked to their home shop

## Step 7: Check Database

```sql
-- Verify shop has subscription plan
SELECT
  name,
  subscription_plan,
  subscription_status,
  trial_ends_at
FROM shops
WHERE name = 'YOUR_SHOP_NAME';

-- Verify customer is locked
SELECT
  name,
  email,
  role,
  home_shop_id,
  signup_source
FROM profiles
WHERE email = 'CUSTOMER_EMAIL';
```

✅ **Expected**:
- Shop has plan and trial date
- Customer has home_shop_id set

---

## Troubleshooting

### QR Code doesn't work
- Make sure deep linking is configured: check `app.json` has `"scheme": "happyinline"`
- Restart Expo: `npx expo start --clear`

### Customer not locked
- Run migration script first
- Check profiles table has `home_shop_id` column
- Verify QRShopSignup.jsx line 125 sets home_shop_id

### Categories still showing for locked customers
- Check HomeScreen.jsx line 379: `{!isLockedCustomer && ...}`
- Verify isLockedCustomer state is being set

### Plan not saving on registration
- Check BusinessRegistration.jsx line 104: `selected_plan` in user metadata
- Check CreateShopScreen.jsx line 382: retrieves from metadata

---

## What's Ready to Ship

✅ Complete subscription billing system
✅ QR-based customer acquisition
✅ Home Shop Lock (no competitor visibility)
✅ 7-day free trial
✅ Three pricing tiers
✅ Deep linking support
✅ Database schema

## What's Next

🔜 **Stripe Integration** (waiting for API keys from client)
🔜 **Payment collection** when trial ends
🔜 **Plan upgrade/downgrade**
🔜 **Staff limit enforcement**

---

**You're good to test! Everything is implemented and ready to go.**
