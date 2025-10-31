# MyBooking Filter Debug Guide - Comprehensive Investigation 🔍

## Current Status
**Issue:** Still seeing another shop's bookings instead of own shop bookings

## Critical Discovery
After reviewing the database schema in `SHOP_FIRST_DATABASE_SCHEMA.sql`, I found:

```sql
CREATE TABLE shop_staff (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  user_id UUID REFERENCES profiles(id),  -- ❗ References PROFILES, not auth.users
  role TEXT,
  is_active BOOLEAN
);
```

**Important:** `shop_staff.user_id` references `profiles(id)`, NOT `auth.users(id)`

## Current Fix Applied

### Changed Query Back to profile.id
```javascript
const { data: staffData } = await supabase
  .from('shop_staff')
  .select('shop_id, role, is_active')
  .eq('user_id', profile.id)  // ✅ Correct - matches profiles(id)
  .eq('is_active', true);
```

### Added Comprehensive Debug Logging
The function now logs:
1. Auth User ID vs Profile ID
2. User's role
3. Shop staff query details
4. Retrieved shop IDs
5. Final bookings count
6. Summary of each booking (ID, shop, date)

## How to Debug

### Step 1: Open DevTools Console
1. Open your app
2. Navigate to MyBookingScreen
3. Open React Native Debugger or Metro bundler console
4. Look for the debug output

### Step 2: Check the Console Output

You should see output like this:

```
📅 Fetching upcoming bookings...
👤 Current user details:
   Auth User ID: abc-123-def-456
   Profile ID: xyz-789-ghi-012
   Profile Role: admin
   Profile Email: user@example.com
   Is Platform Admin: false

👔 Manager/Admin mode: Fetching user shops...
   Querying shop_staff with profile.id: xyz-789-ghi-012

🏪 Staff data retrieved: [
  {
    "shop_id": "shop-uuid-123",
    "role": "admin",
    "is_active": true
  }
]

✅ User manages these shops: ["shop-uuid-123"]
   Filtering bookings where shop_id IN: ["shop-uuid-123"]

🔍 Executing bookings query...

✅ upcoming bookings loaded: 2 bookings
📋 Bookings summary:
   1. Booking ID: BK-12345, Shop: My Barber Shop, Date: 2025-10-25
   2. Booking ID: BK-67890, Shop: My Barber Shop, Date: 2025-10-26
```

### Step 3: Analyze the Output

**Check Point 1: Profile ID**
```
Profile ID: xyz-789-ghi-012
```
- Copy this ID
- We'll use it to verify database records

**Check Point 2: Profile Role**
```
Profile Role: admin
```
- Should be 'admin', 'manager', 'barber', or 'customer'
- If wrong role, that's the issue

**Check Point 3: Staff Data**
```
🏪 Staff data retrieved: [...]
```
- Should show YOUR shop IDs
- If empty → User not in shop_staff table
- If shows wrong shops → Data issue in shop_staff table

**Check Point 4: Shop IDs Filter**
```
✅ User manages these shops: ["shop-uuid-123"]
```
- These should be YOUR shop UUIDs
- If wrong → Database has incorrect data

**Check Point 5: Bookings Summary**
```
📋 Bookings summary:
   1. Booking ID: BK-12345, Shop: My Barber Shop, Date: 2025-10-25
```
- Check each booking's shop name
- If wrong shops appear → Query filter not working

## Database Verification

### Query 1: Check Your Profile ID
```sql
SELECT id, email, name, role 
FROM profiles 
WHERE email = 'your-email@example.com';
```

Expected Result:
```
id: xyz-789-ghi-012
email: your-email@example.com
name: Your Name
role: admin (or manager)
```

### Query 2: Check shop_staff Table
```sql
SELECT * 
FROM shop_staff 
WHERE user_id = 'xyz-789-ghi-012'  -- Use YOUR profile ID from Query 1
AND is_active = true;
```

Expected Result:
```
id: staff-uuid
shop_id: shop-uuid-123  -- YOUR shop ID
user_id: xyz-789-ghi-012  -- YOUR profile ID
role: admin
is_active: true
```

**If this returns empty or wrong shop:**
- ❌ You're not in the shop_staff table for your shop
- ❌ Or user_id doesn't match your profile ID
- **This is the root cause**

### Query 3: Verify Shop Ownership
```sql
SELECT s.id, s.name, ss.user_id, ss.role
FROM shops s
JOIN shop_staff ss ON ss.shop_id = s.id
WHERE ss.user_id = 'xyz-789-ghi-012'  -- Use YOUR profile ID
AND ss.is_active = true;
```

Expected Result:
```
shop.id: shop-uuid-123
shop.name: My Barber Shop
user_id: xyz-789-ghi-012
role: admin
```

### Query 4: Check Bookings for Your Shop
```sql
SELECT 
  b.booking_id,
  b.shop_id,
  s.name as shop_name,
  b.appointment_date,
  b.status
FROM bookings b
JOIN shops s ON s.id = b.shop_id
WHERE b.shop_id = 'shop-uuid-123'  -- Use YOUR shop ID from Query 2
ORDER BY b.appointment_date DESC;
```

This shows ALL bookings for your shop.

### Query 5: Check Bookings for Other Shop
```sql
SELECT 
  b.booking_id,
  b.shop_id,
  s.name as shop_name,
  b.appointment_date,
  b.status
FROM bookings b
JOIN shops s ON s.id = b.shop_id
WHERE b.shop_id = 'other-shop-uuid'  -- The OTHER shop's UUID
ORDER BY b.appointment_date DESC;
```

This shows the bookings you're INCORRECTLY seeing.

## Common Issues & Solutions

### Issue 1: shop_staff Record Missing
**Symptom:** 
```
🏪 Staff data retrieved: []
⚠️ Manager/admin has no shops assigned
```

**Cause:** User not added to shop_staff table

**Solution:**
```sql
-- Add yourself to shop_staff
INSERT INTO shop_staff (shop_id, user_id, role, is_active)
VALUES (
  'your-shop-uuid',
  'your-profile-id',
  'admin',
  true
);
```

### Issue 2: Wrong user_id in shop_staff
**Symptom:** Staff data returns but shows wrong shops

**Cause:** shop_staff.user_id doesn't match your profile.id

**Solution:**
```sql
-- Check what user_id is in shop_staff
SELECT * FROM shop_staff WHERE shop_id = 'your-shop-uuid';

-- Update if needed
UPDATE shop_staff 
SET user_id = 'your-profile-id'
WHERE shop_id = 'your-shop-uuid' 
AND user_id = 'wrong-id';
```

### Issue 3: Multiple Profile IDs
**Symptom:** Auth user ID and Profile ID are different

**Possible Cause:** Database migration or manual profile creation issue

**Check:**
```sql
-- Find profiles with same email
SELECT * FROM profiles WHERE email = 'your-email@example.com';

-- Find auth user
SELECT * FROM auth.users WHERE email = 'your-email@example.com';
```

**Solution:**
Ensure shop_staff uses the profile ID that matches the current profile record.

### Issue 4: Role Not Set Correctly
**Symptom:** 
```
Profile Role: customer
```

**Cause:** User's role in profiles table is 'customer' not 'admin'/'manager'

**Solution:**
```sql
-- Update user role
UPDATE profiles 
SET role = 'admin'  -- or 'manager'
WHERE id = 'your-profile-id';
```

### Issue 5: Query Returns All Bookings
**Symptom:** Seeing bookings from multiple shops you don't manage

**Possible Causes:**
1. No filter applied (role not detected)
2. shop_staff query returned wrong shops
3. Platform admin flag is true

**Check:**
```sql
-- Check if you're platform admin
SELECT is_platform_admin FROM profiles WHERE id = 'your-profile-id';

-- Should return false unless you ARE platform admin
```

## Testing Scenarios

### Scenario 1: Single Shop Manager
**Setup:**
- User manages Shop A only
- Shop A has 3 bookings
- Shop B has 2 bookings

**Expected Console Output:**
```
✅ User manages these shops: ["shop-a-uuid"]
✅ upcoming bookings loaded: 3 bookings
📋 Bookings summary:
   1. Booking ID: BK-001, Shop: Shop A, Date: 2025-10-25
   2. Booking ID: BK-002, Shop: Shop A, Date: 2025-10-26
   3. Booking ID: BK-003, Shop: Shop A, Date: 2025-10-27
```

**Should NOT see:** Shop B's bookings

### Scenario 2: Multi-Shop Manager
**Setup:**
- User manages Shop A and Shop C
- Shop A has 2 bookings
- Shop B has 1 booking
- Shop C has 1 booking

**Expected Console Output:**
```
✅ User manages these shops: ["shop-a-uuid", "shop-c-uuid"]
✅ upcoming bookings loaded: 3 bookings
📋 Bookings summary:
   1. Booking ID: BK-001, Shop: Shop A, Date: 2025-10-25
   2. Booking ID: BK-002, Shop: Shop A, Date: 2025-10-26
   3. Booking ID: BK-004, Shop: Shop C, Date: 2025-10-27
```

**Should NOT see:** Shop B's booking

## Quick Fixes

### Fix 1: Force Customer Mode (Temporary)
If you want to see your own customer bookings temporarily:

```javascript
// In MyBookingScreen.jsx
const [userRole, setUserRole] = useState('customer');  // Force customer
```

### Fix 2: Check Database Console
Run this in Supabase SQL Editor:

```sql
-- Show everything about your account
WITH user_info AS (
  SELECT id, email, name, role, is_platform_admin
  FROM profiles
  WHERE email = 'your-email@example.com'
)
SELECT 
  'Profile' as type,
  ui.*
FROM user_info ui

UNION ALL

SELECT 
  'Shops' as type,
  s.id,
  s.name,
  ss.role,
  ss.is_active,
  NULL
FROM user_info ui
JOIN shop_staff ss ON ss.user_id = ui.id
JOIN shops s ON s.id = ss.shop_id

UNION ALL

SELECT 
  'Bookings' as type,
  b.booking_id,
  sh.name,
  b.status,
  b.appointment_date,
  NULL
FROM user_info ui
JOIN shop_staff ss ON ss.user_id = ui.id
JOIN bookings b ON b.shop_id = ss.shop_id
JOIN shops sh ON sh.id = b.shop_id
ORDER BY type, appointment_date DESC;
```

This shows:
1. Your profile info
2. All shops you manage
3. All bookings from those shops

## Next Steps

1. **Reload app and open MyBookingScreen**
2. **Copy console output** - share it with me
3. **Run database queries** - verify data integrity
4. **Check role** - ensure you're admin/manager
5. **Verify shop_staff** - ensure correct user_id

Once you share the console output, I can pinpoint the exact issue!

## Expected Solution

Based on the comprehensive logging, we should see:
- ✅ Which ID is being used (auth vs profile)
- ✅ What role the user has
- ✅ What shops shop_staff returns
- ✅ What bookings are being fetched

This will reveal:
- Database data issue (wrong/missing shop_staff record)
- ID mismatch (profile.id not matching shop_staff.user_id)
- Role issue (user not detected as admin/manager)
- Query issue (filter not being applied)

---

**Updated:** October 20, 2025
**Status:** Comprehensive debugging added
**Action Required:** Check console output and share results
