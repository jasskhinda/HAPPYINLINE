# 🚨 FIX: Shop Deletion Error - "Shop was not deleted - no rows affected"

## ❌ Error You're Seeing
```
ERROR  ❌ Shop was not deleted - no rows affected
```

## 🎯 Root Cause
The Supabase RLS (Row Level Security) policies are blocking the deletion. Even though you're an admin, the DELETE policy on the `shops` table isn't allowing the deletion to go through.

---

## ✅ SOLUTION: Run SQL Script to Fix Policies

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Complete Fix Script
Copy and paste the **entire contents** of the file:
```
COMPLETE_DELETE_FIX.sql
```

This script will:
- ✅ Drop all conflicting DELETE policies
- ✅ Create proper DELETE policies for shops and related tables
- ✅ Allow admins to delete shops they manage
- ✅ Allow cascade deletion of related data (staff, services, bookings, reviews)
- ✅ Verify the policies were created correctly

### Step 3: Click "Run" Button
Wait for the green success message.

### Step 4: Test Deletion
Go back to your app and try deleting the shop again. It should work now!

---

## 🔍 Why This Happens

### The Problem
RLS policies control who can INSERT, SELECT, UPDATE, and DELETE rows in your database. Your current policy might be:

```sql
-- This might not be working correctly
CREATE POLICY "Some delete policy"
ON shops FOR DELETE
USING (created_by = auth.uid()); -- ❌ This checks the wrong field
```

### The Fix
We need to check if the user is an admin in `shop_staff`:

```sql
-- This works correctly
CREATE POLICY "Shop admins can delete their shops"
ON shops FOR DELETE
USING (
  id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

---

## 📋 What the Script Does

### 1. Drops Old Policies
Removes any conflicting or broken DELETE policies from all tables:
- `shops`
- `services`
- `bookings`
- `reviews` / `shop_reviews`
- `shop_staff`

### 2. Creates Correct Policies
Creates new DELETE policies that:
- Check if user is admin in `shop_staff` table
- Allow admins to delete shops they manage
- Allow cascade deletion of related data
- Prevent non-admins from deleting shops

### 3. Verifies Setup
Runs queries to confirm:
- Policies were created successfully
- You can see which shops you can delete
- RLS is enabled on all tables

---

## 🧪 How to Test

After running the SQL script:

### Test 1: Verify You're Admin
Run this query in Supabase SQL Editor:
```sql
SELECT 
  sh.name as shop_name,
  ss.role as your_role
FROM shops sh
INNER JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid();
```

You should see your shops with `role = 'admin'`.

### Test 2: Check Delete Policies
Run this query:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE cmd = 'DELETE'
AND tablename IN ('shops', 'services', 'bookings', 'shop_staff');
```

You should see policies for all tables.

### Test 3: Try Deletion in App
1. Open your app
2. Go to a shop you manage
3. Click delete
4. Should work! ✅

---

## ⚠️ Still Not Working?

### Check 1: Are You Actually Admin?
Run this in SQL Editor (replace `YOUR_SHOP_ID`):
```sql
SELECT * FROM shop_staff 
WHERE shop_id = 'YOUR_SHOP_ID'
AND user_id = auth.uid();
```

If `role` is not `'admin'`, you can't delete the shop.

### Check 2: Update Your Role to Admin
If you're not admin, update it:
```sql
UPDATE shop_staff
SET role = 'admin'
WHERE shop_id = 'YOUR_SHOP_ID'
AND user_id = auth.uid();
```

### Check 3: Verify Policies Exist
```sql
SELECT * FROM pg_policies
WHERE tablename = 'shops' AND cmd = 'DELETE';
```

Should show the delete policy.

### Check 4: Try Manual Deletion
Test if you can delete manually in SQL Editor:
```sql
DELETE FROM shops WHERE id = 'YOUR_SHOP_ID';
```

If this fails, check the error message for more details.

---

## 🔐 What About Foreign Keys?

The script handles foreign key constraints by deleting in the correct order:

1. ✅ Reviews (no foreign keys point to these)
2. ✅ Bookings (references shop)
3. ✅ Services (references shop)
4. ✅ Shop Staff (references shop)
5. ✅ Shop (main record)

Your `deleteShop()` function in `shopAuth.js` already does this correctly!

---

## 🎉 After Running the Script

You should be able to:
- ✅ Delete shops where you're admin
- ✅ Delete all related data (staff, services, bookings, reviews)
- ✅ See proper success messages in console
- ✅ No more "no rows affected" error

---

## 🆘 Emergency Fix (TESTING ONLY)

If you need to delete a shop RIGHT NOW for testing and can't wait for policies:

### Temporary Disable RLS (DANGER!)
```sql
-- In Supabase SQL Editor:

-- 1. Disable RLS temporarily
ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_staff DISABLE ROW LEVEL SECURITY;

-- 2. Delete the shop manually
DELETE FROM shop_reviews WHERE shop_id = 'YOUR_SHOP_ID';
DELETE FROM bookings WHERE shop_id = 'YOUR_SHOP_ID';
DELETE FROM services WHERE shop_id = 'YOUR_SHOP_ID';
DELETE FROM shop_staff WHERE shop_id = 'YOUR_SHOP_ID';
DELETE FROM shops WHERE id = 'YOUR_SHOP_ID';

-- 3. IMPORTANT: Re-enable RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;
```

⚠️ **WARNING**: This makes your database publicly accessible during the disable period. Use ONLY for testing and re-enable immediately!

---

## 📝 Checklist

After running the complete fix:

- [ ] Ran `COMPLETE_DELETE_FIX.sql` in Supabase SQL Editor
- [ ] Saw success messages (green checkmarks in Supabase)
- [ ] Verified I'm admin of the shop (`SELECT * FROM shop_staff WHERE shop_id = '...' AND user_id = auth.uid()`)
- [ ] Checked DELETE policies exist (`SELECT * FROM pg_policies WHERE cmd = 'DELETE'`)
- [ ] Tested deletion in app - shop deleted successfully
- [ ] No more "no rows affected" error in console
- [ ] Shop and all related data removed from database

---

## 🎯 Summary

**Problem**: RLS policies blocking shop deletion  
**Solution**: Run `COMPLETE_DELETE_FIX.sql` to fix DELETE policies  
**Result**: Admins can delete shops and all related data  

Your code is correct - it's just a database permission issue! 🚀
