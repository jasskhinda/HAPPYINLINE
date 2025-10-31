# 🔧 Troubleshooting Guide - Delete & Services Display Issues

## 📋 Overview

Two issues identified:
1. **Delete Shop** - Not deleting from shops table
2. **Services Display** - Services not showing after creation

---

## 🛠️ FIXES APPLIED

### 1. Enhanced Console Logging

Added comprehensive logging to help diagnose issues:

#### In `getShopServices()`:
- ✅ Logs shop ID being queried
- ✅ Logs number of services found
- ✅ Logs service details (id, name, active status)
- ✅ Logs detailed error information

#### In `deleteShop()`:
- ✅ Logs each step of deletion process
- ✅ Logs user authentication status
- ✅ Logs admin verification
- ✅ Logs each table deletion (reviews, bookings, services, staff)
- ✅ Logs final shop deletion
- ✅ Logs detailed error information with JSON

### 2. Created Diagnostic SQL Script

**File:** `FIX_DELETE_AND_SERVICES_ISSUES.sql`

This script includes:
- Diagnostic queries to check current state
- RLS policy fixes for services SELECT
- RLS policy fixes for shops DELETE
- RLS policy fixes for all related tables
- Verification queries
- Troubleshooting steps

---

## 🔍 DIAGNOSTIC STEPS

### Step 1: Check Console Logs

After trying to view services or delete shop, check console for:

**For Services Issue:**
```
🔍 Fetching services for shop: <shop-id>
✅ Found X services for shop <shop-id>
```

If you see:
```
❌ Error fetching services: ...
```
Then there's an RLS policy issue.

**For Delete Issue:**
```
🗑️  Attempting to delete shop: <shop-id>
👤 Current user: <user-id>
✅ User is admin of shop
🗑️  Deleting reviews...
✅ Reviews deleted
🗑️  Deleting bookings...
✅ Bookings deleted
🗑️  Deleting services...
✅ Services deleted
🗑️  Deleting staff...
✅ Staff deleted
🗑️  Deleting shop record...
✅ Shop record deleted
✅✅✅ Shop deleted successfully!
```

If any step shows ❌, that's where the issue is.

---

## 🩺 DIAGNOSIS

### Issue 1: Services Not Displaying

**Possible Causes:**

1. **RLS Policy Blocking SELECT**
   - Services table has Row Level Security enabled
   - No policy allows public/authenticated users to SELECT
   - **Solution:** Run the RLS policy fixes in `FIX_DELETE_AND_SERVICES_ISSUES.sql`

2. **Services Have is_active = false**
   - Query filters for `is_active = true`
   - Services might be created with `is_active = false`
   - **Check:**
     ```sql
     SELECT id, name, is_active FROM services WHERE shop_id = 'YOUR_SHOP_ID';
     ```

3. **Wrong shop_id**
   - Services created with different shop_id
   - **Check:**
     ```sql
     SELECT * FROM services ORDER BY created_at DESC LIMIT 10;
     ```

4. **Services Not Created**
   - Error during service creation
   - Check console logs during shop creation
   - Look for: `❌ Error creating service:`

### Issue 2: Shop Not Deleting

**Possible Causes:**

1. **RLS Policy Blocking DELETE**
   - Shops table DELETE policy requires admin role
   - Policy might not be checking correctly
   - **Solution:** Run the RLS policy fixes in `FIX_DELETE_AND_SERVICES_ISSUES.sql`

2. **Not Actually Admin**
   - User might not have admin role in shop_staff
   - **Check:**
     ```sql
     SELECT role FROM shop_staff 
     WHERE shop_id = 'YOUR_SHOP_ID' 
     AND user_id = auth.uid();
     ```

3. **Foreign Key Constraints**
   - Related tables blocking deletion
   - **Check console logs** for which table is failing
   - Delete order should be: reviews → bookings → services → staff → shop

4. **Related Tables RLS Blocking DELETE**
   - Even if you're admin, RLS on related tables might block deletion
   - **Solution:** Fix RLS policies for all tables

---

## 🔧 SOLUTIONS

### Solution 1: Run SQL Fixes (RECOMMENDED)

1. Open Supabase Dashboard → SQL Editor
2. Open file: `FIX_DELETE_AND_SERVICES_ISSUES.sql`
3. Copy the contents
4. Paste into SQL Editor
5. **Run PART 2** (Services Display Fix)
6. **Run PART 3** (Delete Shop Fix)
7. Test the app again

### Solution 2: Check Services in Database

Run this query in Supabase SQL Editor:

```sql
-- Replace YOUR_SHOP_ID with actual shop ID
SELECT 
  id,
  name,
  description,
  price,
  duration,
  is_active,
  created_at
FROM services
WHERE shop_id = 'YOUR_SHOP_ID'
ORDER BY created_at DESC;
```

**What to look for:**
- Are services there? → If NO: Service creation failed
- is_active = true? → If NO: Update to true or fix createShopService
- shop_id correct? → If NO: Wrong shop_id used during creation

### Solution 3: Check Admin Status

Run this query:

```sql
SELECT 
  sh.id as shop_id,
  sh.name as shop_name,
  ss.role as your_role
FROM shops sh
INNER JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid();
```

**What to look for:**
- Your shop listed? → If NO: Not added to shop_staff
- Role = 'admin'? → If NO: You're not admin (can't delete)

### Solution 4: Manual Verification

1. **Test Service Creation:**
   - Create shop with services
   - Check console: `✅ Added service: <name>`
   - Check database with SQL query
   - If not in database → service creation failing

2. **Test Service Retrieval:**
   - Open shop details
   - Check console: `🔍 Fetching services for shop:`
   - Check console: `✅ Found X services`
   - If found but not showing → UI rendering issue
   - If not found → RLS policy issue

3. **Test Delete:**
   - Try to delete shop
   - Watch console logs for each step
   - Note which step shows ❌
   - That's the failing table

---

## 📝 CHECKLIST

### For Services Display Issue:

- [ ] Check console logs when opening shop details
- [ ] Run diagnostic SQL to see if services exist
- [ ] Verify is_active = true for services
- [ ] Run RLS policy fixes for services table
- [ ] Test querying services directly in Supabase
- [ ] Restart app and test again

### For Delete Shop Issue:

- [ ] Check console logs when deleting shop
- [ ] Verify you're admin of the shop
- [ ] Run RLS policy fixes for all tables
- [ ] Check if any related records are blocking
- [ ] Test deleting related records manually
- [ ] Restart app and test again

---

## 🚀 EXPECTED BEHAVIOR AFTER FIXES

### Services Display:
1. Create shop with services
2. Console shows: `✅ Added service: <name>`
3. Open shop details
4. Console shows: `🔍 Fetching services for shop: <id>`
5. Console shows: `✅ Found X services`
6. Services appear in UI with names, prices, durations

### Delete Shop:
1. Click delete icon on shop
2. Confirm deletion
3. Console shows step-by-step deletion:
   - ✅ User is admin
   - ✅ Reviews deleted
   - ✅ Bookings deleted
   - ✅ Services deleted
   - ✅ Staff deleted
   - ✅ Shop record deleted
   - ✅✅✅ Shop deleted successfully!
4. Shop disappears from list
5. Navigate back to home

---

## 🐛 COMMON ERRORS & FIXES

### Error: "new row violates row-level security policy"

**Cause:** RLS policy blocks INSERT/SELECT/DELETE
**Fix:** Run RLS policy fixes in SQL script

### Error: "null value in column 'duration'"

**Cause:** Service missing duration field
**Fix:** Already fixed in BUG_FIXES_CREATE_SHOP.md

### Error: "duplicate key value violates unique constraint"

**Cause:** Trying to add same user twice to shop_staff
**Fix:** Already fixed in BUG_FIXES_CREATE_SHOP.md

### Error: "update or delete on table violates foreign key constraint"

**Cause:** Related records exist in another table
**Fix:** Delete in correct order (reviews → bookings → services → staff → shop)

---

## 📞 NEXT STEPS

1. **Run the SQL script** `FIX_DELETE_AND_SERVICES_ISSUES.sql` in Supabase
2. **Restart the app** to clear any cached data
3. **Test service display:**
   - Create new shop with services
   - Open shop details
   - Verify services appear
4. **Test shop deletion:**
   - Try to delete a shop
   - Watch console logs
   - Verify shop is removed from database
5. **Report results:**
   - If still not working, share console logs
   - Share SQL query results
   - Share specific error messages

---

## 📊 VERIFICATION QUERIES

After fixes, run these to verify everything works:

```sql
-- 1. Check your shops and role
SELECT 
  sh.name,
  ss.role
FROM shops sh
JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid();

-- 2. Check services for your shops
SELECT 
  sh.name as shop_name,
  s.name as service_name,
  s.is_active,
  s.price,
  s.duration
FROM services s
JOIN shops sh ON s.shop_id = sh.id
JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid()
ORDER BY sh.name, s.name;

-- 3. Check RLS policies are in place
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('shops', 'services', 'shop_staff')
ORDER BY tablename, policyname;
```

---

## ✅ SUCCESS CRITERIA

You'll know everything is fixed when:
1. ✅ Services appear immediately after shop creation
2. ✅ Services display in shop details view
3. ✅ Shop deletes successfully with no errors
4. ✅ All console logs show ✅ for each step
5. ✅ Shop disappears from database after deletion
6. ✅ No RLS policy errors in console

---

## 🆘 IF ISSUES PERSIST

If problems continue after running all fixes:

1. **Export Console Logs**
   - Copy all logs from service creation
   - Copy all logs from shop deletion attempt
   
2. **Export Database State**
   - Run diagnostic queries
   - Export results
   
3. **Check RLS Policies**
   - Run policy verification queries
   - Share results

4. **Provide Details:**
   - Which step fails? (specific error from console)
   - What does database show? (query results)
   - What RLS policies exist? (policy query results)

With this information, we can pinpoint the exact issue!
