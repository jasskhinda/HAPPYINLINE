# 🔍 COMPREHENSIVE DEBUGGING - Booking Visibility Issue

## Current Status

✅ **Database has 2 bookings** with status = `'pending'`
✅ **RLS policies are correct** (8 policies created)
✅ **Trigger functions exist**
✅ **booking_id column exists** with values

**But bookings still not visible to manager!**

---

## 🎯 Next Steps to Debug

### Step 1: Test RLS Access in Supabase Dashboard

**CRITICAL: Do this test logged in as your MANAGER account in Supabase!**

1. Open Supabase Dashboard
2. **Make sure you're authenticated as the manager user** (not as service role)
3. Go to SQL Editor
4. Run `DEBUG_MANAGER_ACCESS.sql` (just created)

**Expected Results:**

```sql
-- Test 1: Should show your manager profile
SELECT id, email, role FROM profiles WHERE role = 'manager';
-- Result: Shows your manager user

-- Test 3: Should show YOUR auth.uid() matches a manager profile
SELECT auth.uid(), (SELECT role FROM profiles WHERE id = auth.uid());
-- Result: Shows your UUID and role = 'manager'

-- Test 4: Should count bookings (tests RLS)
SELECT COUNT(*) FROM bookings;
-- Result: 2 (if RLS allows access)
-- OR: Error "permission denied" (if RLS blocks access)

-- Test 5: Should show bookings
SELECT * FROM bookings;
-- Result: Shows 2 bookings (if RLS allows)
-- OR: Empty (if RLS blocks)
```

**Share the results with me!**

---

### Step 2: Test in App with Enhanced Logging

I just added comprehensive logging. Now:

1. **Close your app completely**
2. **Restart the app**
3. **Log in as manager**
4. **Open BookingManagementScreen**
5. **Check the console logs**

**You should see:**

```
📊 [BookingManagementScreen] Loading bookings for manager...
📅 Fetching all bookings for manager dashboard...
👤 Current user: { id: 'UUID', email: 'manager@email.com', role: 'manager' }
✅ User authorized to view bookings
🔍 Querying bookings table...
📊 Query result: { 
  hasError: false, 
  dataCount: 2, 
  rawData: [2 booking objects] 
}
📋 Found bookings in database: 2
   Booking 1: { booking_id: 'BK-20251005-621B44', status: 'pending', ... }
   Booking 2: { booking_id: 'BK-20251005-41EF9D', status: 'pending', ... }
✅ Bookings grouped by status: { pending: 2, confirmed: 0, completed: 0, other: 0 }
📊 [BookingManagementScreen] Result: { 
  success: true, 
  pendingCount: 2 
}
✅ [BookingManagementScreen] Bookings set to state: { pending: 2 }
```

**If you see different logs, share them with me!**

---

### Step 3: Common Issues and Solutions

#### Issue A: RLS Blocking Access

**Symptom:** Console shows error `"permission denied for table bookings"`

**Cause:** Manager's auth.uid() doesn't match a profile with role='manager'

**Fix:**
```sql
-- Check if auth.uid() matches profile
SELECT auth.uid(), (SELECT id FROM profiles WHERE id = auth.uid());

-- If no match, find your manager profile
SELECT id, email FROM profiles WHERE email = 'YOUR_MANAGER_EMAIL';

-- Update Supabase auth user to match profile id (if needed)
```

---

#### Issue B: Query Returns 0 Bookings

**Symptom:** Console shows `dataCount: 0` but Supabase Table Editor shows 2 bookings

**Cause:** RLS policy filtering out bookings

**Fix:** Run this in Supabase (as manager):
```sql
-- Test if you can see bookings
SELECT * FROM bookings;

-- If empty, check if your role is correct
SELECT id, role FROM profiles WHERE id = auth.uid();
```

---

#### Issue C: Bookings Fetched But Not Displayed

**Symptom:** Console shows `pendingCount: 2` but UI shows empty

**Cause:** React state not updating or rendering issue

**Fix:** Check console for:
```
✅ [BookingManagementScreen] Bookings set to state: { pending: 2 }
```

If you see this but UI is empty, it's a React rendering issue.

---

### Step 4: Verify Manager Profile

Run this query in Supabase:

```sql
-- Find all manager/admin users
SELECT id, email, role, name, created_at
FROM profiles
WHERE role IN ('manager', 'admin', 'super_admin')
ORDER BY created_at;

-- Check if YOUR email is in the list
-- Note the 'id' value
```

**Then check if you're logging in with that exact email!**

---

## 🔍 Most Likely Issue

Based on experience, the problem is usually:

1. **Manager's email in app ≠ Manager's email in profiles table**
2. **Profile exists but role is 'customer' instead of 'manager'**
3. **Auth user ID doesn't match profile ID**

---

## 📋 What to Share With Me

Please provide:

1. **Result of DEBUG_MANAGER_ACCESS.sql** (run while logged in as manager in Supabase)
2. **Console logs** when opening BookingManagementScreen in app
3. **Screenshot** showing:
   - Your manager email in the app (visible in HomeScreen header)
   - Your manager profile in Supabase (profiles table filtered by your email)

This will pinpoint the EXACT issue! 🎯

---

## 🚀 Quick Test

**Easiest way to test if RLS is the issue:**

1. Go to Supabase Dashboard
2. Open Bookings table
3. **Temporarily disable RLS** (just for testing):
   ```sql
   ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
   ```
4. Restart app and check if bookings appear
5. **Re-enable RLS immediately**:
   ```sql
   ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
   ```

**If bookings appear with RLS disabled:**
- Problem is definitely RLS policy or profile mismatch

**If bookings still don't appear:**
- Problem is in the app code or Supabase query

---

**Let's solve this together! Share the console logs and SQL results.** 🔍
