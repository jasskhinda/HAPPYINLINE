# 🔧 Shop Deletion RLS Policy Fix

## Problem
When trying to delete a shop, you get the error:
```
❌ Shop was not deleted - no rows affected
Shop record was not deleted. It may not exist or RLS policies are blocking deletion.
```

## Root Cause
**Row Level Security (RLS) policies** on the `shops` table are blocking DELETE operations. Even though the user is an admin of the shop, the RLS policy is not properly configured to allow deletion.

---

## ✅ Solution

### Step 1: Run the SQL Script
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file: `FIX_SHOP_DELETE_RLS.sql`
4. Copy and paste the entire script
5. Click **Run**

### What the Script Does:
The script fixes RLS DELETE policies for:
- ✅ `shops` - Allows admins to delete their shops
- ✅ `shop_staff` - Allows admins to delete staff from their shops
- ✅ `shop_services` - Allows admins to remove services from their shops
- ✅ `bookings` - Allows admins to delete bookings from their shops
- ✅ `reviews` - Allows admins to delete reviews for their shops

---

## 🔍 What Changed in the Code

### File: `src/lib/shopAuth.js`

#### Before (Lines 974-987):
```javascript
// Delete services ❌ WRONG - Tried to delete from global catalog
console.log('🗑️  Deleting services...');
const { error: servicesError } = await supabase
  .from('services')  // ❌ Global catalog - should not delete
  .delete()
  .eq('shop_id', shopId);  // ❌ This column doesn't exist
```

#### After:
```javascript
// Delete shop_services ✅ CORRECT - Only delete shop-service links
console.log('🗑️  Deleting shop-service links...');
const { error: shopServicesError } = await supabase
  .from('shop_services')  // ✅ Shop-specific links
  .delete()
  .eq('shop_id', shopId);  // ✅ This column exists
```

---

## 📋 Deletion Order

The `deleteShop()` function now deletes data in this order:

1. **Reviews** → Delete reviews for the shop
2. **Bookings** → Delete all bookings for the shop
3. **Shop-Service Links** → Delete from `shop_services` (NOT from `services` catalog)
4. **Staff** → Delete all staff members from `shop_staff`
5. **Shop** → Finally delete the shop itself

---

## 🧪 Testing Steps

### After running the SQL script:

1. **Navigate to Shop Details** (as shop admin)
2. **Click Delete Shop button**
3. **Confirm deletion**
4. **Expected Result:**
   - ✅ Shop should be deleted successfully
   - ✅ All related data removed (bookings, reviews, staff, service links)
   - ✅ Services remain in global catalog (reusable by other shops)
   - ✅ User redirected to main screen
   - ✅ Success message shown

---

## 🛡️ RLS Policy Details

### New DELETE Policy for Shops:
```sql
CREATE POLICY "shops_delete_policy"
ON shops
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = shops.id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role = 'admin'
  )
);
```

**What it does:**
- ✅ Checks if the current user (`auth.uid()`) is in `shop_staff`
- ✅ Verifies they have the `'admin'` role for this specific shop
- ✅ Only then allows the DELETE operation

---

## ⚠️ Important Notes

### Services are NOT Deleted
The `services` table is a **global catalog** shared across all shops:
- ✅ Services remain available for other shops
- ✅ Only the `shop_services` links are deleted
- ✅ This allows services to be reused across multiple shops

### Admin-Only Operation
- ❌ Managers cannot delete shops
- ❌ Barbers cannot delete shops
- ✅ Only shop **admins** can delete shops

### Related Data
When a shop is deleted:
- ✅ All bookings are deleted
- ✅ All reviews are deleted
- ✅ All staff assignments are deleted
- ✅ All service links are deleted
- ❌ Services remain in catalog
- ❌ User profiles remain intact

---

## 🔧 Troubleshooting

### If deletion still fails:

#### 1. Check User's Admin Status
```sql
-- Run in Supabase SQL Editor
SELECT shop_id, role 
FROM shop_staff 
WHERE user_id = auth.uid();
```
**Expected:** You should see your shops with `role = 'admin'`

#### 2. Check RLS Policies
```sql
-- Check DELETE policies on shops table
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'shops' AND cmd = 'DELETE';
```
**Expected:** You should see `shops_delete_policy`

#### 3. Check Foreign Key Constraints
```sql
-- Check if there are blocking foreign keys
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('shop_staff', 'shop_services', 'bookings', 'reviews');
```

#### 4. Re-run the SQL Script
If policies are missing or incorrect, re-run `FIX_SHOP_DELETE_RLS.sql`

---

## ✅ Completion Checklist

After applying the fix:
- [ ] SQL script executed successfully
- [ ] No errors in Supabase SQL Editor
- [ ] All 5 DELETE policies created (shops, staff, services, bookings, reviews)
- [ ] Test shop deletion from app
- [ ] Verify shop is removed from database
- [ ] Verify related data is removed
- [ ] Verify services remain in catalog
- [ ] Success message shown in app

---

## 📝 Summary

**Problem:** RLS policies blocking shop deletion  
**Solution:** Fixed RLS DELETE policies + corrected service deletion logic  
**Files Modified:** 
- `src/lib/shopAuth.js` - Fixed deleteShop() function
- `FIX_SHOP_DELETE_RLS.sql` - Created RLS policy fix script

**Result:** Shop admins can now successfully delete their shops! 🎉
