# Complete Testing Guide - Ready Now!

## ✅ What You Can Test Right Now (No Stripe Needed)

### Test 1: Business Registration with Pricing Plans

**Steps:**
1. Open app on your device
2. Tap "Get Started" → "Register Business"
3. **Step 1**: Enter email, name, business name, password
4. **Step 2**: Select category (e.g., "Beauty & Personal Care")
5. **Step 3**: Select business type (e.g., "Barber Shop")
6. **Step 4**: SELECT A PRICING PLAN:
   - Individual: $25/month
   - Team: $75/month (marked "MOST POPULAR")
   - Enterprise: $99/month
7. Review and create account
8. Sign in with your credentials
9. Complete shop creation

**Expected Result:**
- ✅ Can select any plan
- ✅ Plan selection is stored
- ✅ After shop creation, check database

**Verify in Database:**
```sql
SELECT
  name,
  subscription_plan,
  subscription_status,
  trial_ends_at
FROM shops
WHERE email = 'YOUR_EMAIL'
ORDER BY created_at DESC
LIMIT 1;
```

Should show:
- `subscription_plan`: 'solo', 'team', or 'enterprise' (whichever you picked)
- `subscription_status`: 'trial'
- `trial_ends_at`: 7 days from now

---

### Test 2: QR Code Generator for Shops

**Steps:**
1. Sign in as shop owner (e.g., app@theavonbarbershop.com)
2. Go to Manager Dashboard
3. Look for your approved shop card
4. **NEW**: You should see a "Get QR Code" button below the shop
5. Tap "Get QR Code"

**Expected Result:**
- ✅ Modal appears with QR code
- ✅ Shop name displayed on QR code
- ✅ "Save QR Code" button works
- ✅ "Share Link" button works
- ✅ Deep link shown: `happyinline://signup/shop/{shopId}`

**Test Actions:**
- Take screenshot of QR code
- Copy the deep link
- Share the QR (saves to photos)

---

### Test 3: Customer Signup via QR Code

**Get Your Shop Deep Link:**
```sql
SELECT
  id,
  name,
  CONCAT('happyinline://signup/shop/', id) as deep_link
FROM shops
WHERE name = 'Avon Barber Shop';
```

**Steps:**
1. Copy the deep_link from query above
2. **Option A**: Send link to test device and tap it
3. **Option B**: Create QR code online and scan it
   - Go to: https://www.qr-code-generator.com
   - Paste your deep link
   - Scan with phone camera

**Expected Result:**
- ✅ Opens "Create Your Account" screen
- ✅ Shows shop name prominently at top
- ✅ Shows shop city/state
- ✅ Form has: Name, Email, Phone, Password fields
- ✅ Info box says "Your account will be linked to [Shop Name]"

**Complete Signup:**
4. Fill in customer details
5. Create account
6. Sign in with customer credentials

---

### Test 4: Home Shop Lock (Most Important!)

**After signing in as the customer from Test 3:**

**Expected Behavior:**
- ✅ Home screen shows ONLY their locked shop
- ✅ No other shops visible
- ✅ "Browse by Category" section is HIDDEN
- ✅ Can tap on their shop to see details
- ✅ Can book appointments at their shop
- ✅ Cannot navigate to other shops

**Verify in Database:**
```sql
SELECT
  name,
  email,
  role,
  home_shop_id,
  signup_source,
  home_shop_locked_at
FROM profiles
WHERE email = 'CUSTOMER_EMAIL';
```

Should show:
- `role`: 'customer'
- `home_shop_id`: UUID of the shop
- `signup_source`: 'qr_code'
- `home_shop_locked_at`: timestamp

---

### Test 5: Unlocked Customer (Regular Signup)

**Compare with regular customer:**
1. Sign out
2. Register as customer normally (not via QR)
3. Sign in

**Expected Result:**
- ✅ Home screen shows ALL approved shops
- ✅ "Browse by Category" section IS visible
- ✅ Can browse and book at any shop

**Database Check:**
```sql
SELECT
  name,
  email,
  role,
  home_shop_id,
  signup_source
FROM profiles
WHERE email = 'REGULAR_CUSTOMER_EMAIL';
```

Should show:
- `home_shop_id`: NULL
- `signup_source`: 'direct'

---

## 📊 Database Checks

### Check All Shops Have Subscription Info
```sql
SELECT
  name,
  subscription_plan,
  subscription_status,
  trial_ends_at,
  CASE
    WHEN trial_ends_at > NOW() THEN 'Active Trial'
    WHEN trial_ends_at <= NOW() THEN 'Trial Expired'
    ELSE 'No Trial Set'
  END as trial_status
FROM shops
ORDER BY created_at DESC;
```

### Check Customer Lock Status
```sql
SELECT
  p.name as customer_name,
  p.email,
  p.role,
  p.signup_source,
  s.name as locked_to_shop,
  p.home_shop_locked_at
FROM profiles p
LEFT JOIN shops s ON p.home_shop_id = s.id
WHERE p.role = 'customer'
ORDER BY p.created_at DESC;
```

---

## 🐛 Common Issues & Fixes

### Issue 1: QR Code Button Not Showing
**Cause**: Shop status is not 'approved'
**Fix**:
```sql
UPDATE shops SET status = 'approved' WHERE id = 'YOUR_SHOP_ID';
```

### Issue 2: Categories Still Showing for Locked Customer
**Cause**: Cache issue or logged in wrong account
**Fix**:
- Sign out completely
- Close app
- Restart: `npx expo start --clear`
- Sign in as QR-locked customer

### Issue 3: Deep Link Not Working
**Cause**: App scheme not configured
**Fix**:
- Already fixed in `app.json` with `"scheme": "happyinline"`
- Restart Expo

### Issue 4: Customer Not Locked After QR Signup
**Check**:
```sql
-- Does customer have home_shop_id?
SELECT * FROM profiles WHERE email = 'CUSTOMER_EMAIL';
```
**Fix**: Update manually if needed
```sql
UPDATE profiles
SET
  home_shop_id = 'SHOP_UUID',
  signup_source = 'qr_code',
  home_shop_locked_at = NOW()
WHERE email = 'CUSTOMER_EMAIL';
```

---

## ✅ Success Criteria

You know everything works when:

1. ✅ New businesses can select pricing plans during registration
2. ✅ Shop owners see "Get QR Code" button on approved shops
3. ✅ QR codes can be generated, saved, and shared
4. ✅ Deep links open the QR signup screen
5. ✅ Customers who signup via QR are locked to that shop
6. ✅ Locked customers only see their home shop (no browsing)
7. ✅ Regular customers can browse all shops normally
8. ✅ Database correctly stores all subscription and lock data

---

## 🚀 Ready to Test!

Start the app:
```bash
npx expo start --clear
```

Scan QR code and follow Test 1-5 above!

Report any issues and I'll fix them immediately.
