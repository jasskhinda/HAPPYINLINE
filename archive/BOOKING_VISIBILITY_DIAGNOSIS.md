# 🔍 Booking Visibility Diagnosis - Manager Cannot See Bookings

## Current Issue
- Customer creates booking successfully
- Manager cannot see bookings in HomeScreen
- Manager cannot see bookings in BookingManagementScreen
- Both screens show "No pending bookings"

## Root Cause Analysis

### Most Likely Issue: SQL Fixes Not Applied Yet

**CRITICAL: Did you run these SQL files in Supabase?**

1. ✅ **ADD_MISSING_BOOKING_COLUMNS.sql** - Adds booking_id column
2. ✅ **CLEAN_RLS_FIX.sql** - Fixes RLS policies

**If you haven't run these files, that's why bookings aren't visible!**

The RLS (Row Level Security) policies control who can see which data. Without running `CLEAN_RLS_FIX.sql`, the old broken policies are still active.

### Check if SQL Fixes Were Applied

Run this in Supabase SQL Editor:

```sql
-- Check RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'bookings';
```

**Expected Output (8 policies):**
- Customers can view own bookings
- Barbers can view own bookings
- Managers and admins view all bookings
- Customers can create bookings
- Customers can update own bookings
- Barbers can update own bookings
- Managers and admins can update all bookings
- Managers and admins can delete bookings

**If you see different policy names or only 3-4 policies, the fix wasn't applied!**

## Verification Steps

### Step 1: Run VERIFY_DATABASE_SETUP.sql
This file was just created. Run it in Supabase to check:
- If booking_id column exists
- If RLS policies are correct
- If bookings exist in database

### Step 2: Check Console Logs
When manager opens HomeScreen, you should see:
```
📅 [HomeScreen] Fetching pending appointments for manager/admin...
👤 Current user: { role: 'manager' }
✅ User authorized to view bookings
📊 Query result: { dataCount: X }
```

**If you see "permission denied" error → RLS policies not fixed**
**If you see "dataCount: 0" → No bookings in database**
**If you don't see these logs → Function not being called**

### Step 3: Test Customer Booking Creation
1. Log in as customer
2. Create a booking
3. Check console for:
   ```
   ✅ Booking created successfully!
      - Booking ID: BK-20251005-XXXXXX
      - Status: pending
   ```
4. If successful, booking exists in database

### Step 4: Test Manager Viewing
1. Log out from customer account
2. Log in as manager
3. Open HomeScreen
4. Enable "Manager" toggle switch
5. Check if urgent notification appears

## Quick Fix Instructions

### If SQL Fixes NOT Applied:

**Run these files in order in Supabase SQL Editor:**

1. **First:** `ADD_MISSING_BOOKING_COLUMNS.sql`
   - Copy entire file content
   - Paste in Supabase SQL Editor
   - Click "Run"
   - Wait for success message

2. **Second:** `CLEAN_RLS_FIX.sql`
   - Copy entire file content
   - Paste in Supabase SQL Editor
   - Click "Run"
   - Should see: "8 policies created"

3. **Restart your app completely**
   - Close app
   - Clear cache if possible
   - Reopen app

### If SQL Fixes Already Applied:

Check these potential issues:

**Issue 1: Manager toggle not enabled**
- Open HomeScreen
- Check if "Manager" toggle switch is ON
- Urgent notifications only show in Manager Mode

**Issue 2: Profile ID mismatch**
Run this in Supabase (logged in as manager):
```sql
SELECT auth.uid() as auth_id, 
       (SELECT id FROM profiles WHERE id = auth.uid()) as profile_id;
```
If `profile_id` is NULL, there's an ID mismatch.

**Issue 3: Bookings don't have correct status**
Run this in Supabase:
```sql
SELECT id, status, appointment_date FROM bookings;
```
Check if status is 'pending', 'confirmed', or 'completed'.

## Expected Behavior After Fixes

### Customer View:
✅ Can create bookings
✅ See "Booking created successfully" message
✅ Booking appears in "My Bookings" → "Upcoming" tab
✅ Status shows "Unconfirmed" (pending)

### Manager View (with Manager toggle ON):
✅ HomeScreen shows urgent notification banner
✅ "🚨 Urgent Appointment Request!" if booking is today/tomorrow
✅ "X pending appointments waiting for approval" summary
✅ Tapping notification opens BookingManagementScreen
✅ BookingManagementScreen "Pending" tab shows all pending bookings
✅ Can Confirm or Cancel bookings

### If NO Pending Bookings:
✅ HomeScreen shows nice welcome message
✅ No urgent notification banner
✅ BookingManagementScreen shows empty state with icon

## Code Logic Explanation

### HomeScreen.jsx - renderUrgentNotifications()

```javascript
// Only shows for manager/admin/super_admin roles
if (!['manager', 'admin', 'super_admin'].includes(userRole)) {
  return null; // Don't show to customers or barbers
}

// Only shows if there are pending appointments
if (pendingAppointments.length === 0) {
  return null; // Don't show if no pending bookings
}

// Shows urgent banner + pending summary
```

**This function requires:**
1. User role is manager/admin/super_admin ✅
2. Manager mode toggle is ON ✅
3. pendingAppointments array has items ❌ (This is the issue!)

### fetchPendingAppointments() Function

```javascript
const result = await fetchAllBookingsForManagers();

if (result.success) {
  const pending = result.data.pending || [];
  // Transform to urgency levels...
  setPendingAppointments(transformedAppointments);
}
```

**This function requires:**
1. RLS policies allow manager to SELECT from bookings table ❌ (Fix not applied?)
2. Bookings exist with status='pending' ✅ (Customer created booking)
3. Function is called when manager opens HomeScreen ✅

## Files to Check

1. **CLEAN_RLS_FIX.sql** - Contains correct RLS policies
2. **ADD_MISSING_BOOKING_COLUMNS.sql** - Adds missing columns
3. **VERIFY_DATABASE_SETUP.sql** - Diagnostic queries (just created)
4. **src/lib/auth.js** - Contains fetchAllBookingsForManagers() function
5. **src/presentation/main/bottomBar/home/HomeScreen.jsx** - Shows notifications

## Next Steps

1. ✅ **Run VERIFY_DATABASE_SETUP.sql** in Supabase
2. ✅ **Share the results** with me
3. ✅ **Check console logs** when opening HomeScreen as manager
4. ✅ **Share any error messages**

Then I can pinpoint the exact issue and provide the final fix!

## Common Errors and Solutions

### Error: "permission denied for table users"
**Cause:** Old broken RLS policies still active
**Solution:** Run CLEAN_RLS_FIX.sql

### Error: "column booking_id does not exist"
**Cause:** ADD_MISSING_BOOKING_COLUMNS.sql not run
**Solution:** Run ADD_MISSING_BOOKING_COLUMNS.sql first

### Error: "Only managers/admins can view all bookings"
**Cause:** User role is not manager/admin
**Solution:** Check profiles table, update role if needed

### No Error, Just Empty:
**Cause:** Bookings might have status other than 'pending', 'confirmed', 'completed'
**Solution:** Check bookings table status column

---

**🚨 IMPORTANT: Please run VERIFY_DATABASE_SETUP.sql and share the results!**
