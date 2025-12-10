# 🧪 Complete Testing Guide - Booking Visibility Issue

## Before Testing - CRITICAL CHECKLIST

### ✅ Step 1: Verify SQL Fixes Were Applied

**You MUST run these SQL files first, or nothing will work!**

1. **Open Supabase Dashboard** → SQL Editor
2. **Run ADD_MISSING_BOOKING_COLUMNS.sql** (entire file)
   - Should see: "ALTER TABLE", "CREATE FUNCTION", "CREATE TRIGGER" success messages
3. **Run CLEAN_RLS_FIX.sql** (entire file)
   - Should see: "DROP POLICY" and "CREATE POLICY" success messages
4. **Run VERIFY_DATABASE_SETUP.sql** (entire file)
   - Check output for:
     - ✅ booking_id column exists (TEXT type)
     - ✅ 8 RLS policies listed
     - ✅ Trigger functions exist

**If you haven't done this, STOP and do it now!**

---

## Testing Plan

### Test 1: Customer Creates Booking

**Objective:** Verify customer can create booking and it's stored in database

**Steps:**
1. Log in as **customer** (bhavyanshpansotra@gmail.com)
2. Tap a barber profile
3. Select services
4. Choose date and time
5. Tap "Confirm Booking"

**Expected Console Logs:**
```
📅 Creating booking: {...}
✅ Booking created successfully!
   - UUID (id): [36-character UUID]
   - Booking ID: BK-20251005-XXXXXX
   - Status: pending
```

**Expected UI:**
- Success message appears
- Returns to home screen or My Bookings

**If Success:**
✅ Note the Booking ID (e.g., BK-20251005-001)
✅ Proceed to Test 2

**If Fails:**
❌ Check error message
❌ Check console logs
❌ Share error with me

---

### Test 2: Customer Views Own Booking

**Objective:** Verify customer can see their own booking

**Steps:**
1. Still logged in as **customer**
2. Navigate to "My Bookings" tab (bottom bar)
3. Check "Upcoming" tab

**Expected Console Logs:**
```
📅 Fetching upcoming bookings...
✅ Auth user found: [user ID]
✅ upcoming bookings loaded: 1
```

**Expected UI:**
- Booking card appears
- Shows booking ID: BK-20251005-XXXXXX
- Status: "Unconfirmed" (yellow badge)
- Shows barber name, services, date, time

**If Success:**
✅ Customer can see own booking
✅ Proceed to Test 3

**If Fails:**
❌ Error: "permission denied for table users"
   → RLS policies not fixed (run CLEAN_RLS_FIX.sql)
❌ Error: "column booking_id does not exist"
   → Missing columns (run ADD_MISSING_BOOKING_COLUMNS.sql)
❌ Empty list but no error
   → Check Supabase table editor (does booking exist?)

---

### Test 3: Manager Views Booking in HomeScreen

**Objective:** Verify manager can see urgent notification for pending booking

**Steps:**
1. **Log out** from customer account
2. **Log in as manager** (your manager account email)
3. Open **HomeScreen** (first tab)
4. **Enable "Manager" toggle** (top right)
   - Should switch from customer view to manager view

**Expected Console Logs:**
```
📅 [HomeScreen] Fetching pending appointments for manager/admin...
👤 Current user: { role: 'manager', email: '...' }
✅ User authorized to view bookings
🔍 Querying bookings table...
📊 Query result: { dataCount: 1 }
✅ Bookings loaded: { pending: 1, confirmed: 0, completed: 0 }
🔔 [HomeScreen] renderUrgentNotifications called: { pendingAppointmentsCount: 1 }
✅ [HomeScreen] Showing urgent notifications
```

**Expected UI (if booking is today/tomorrow):**
- 🚨 **Red urgent banner** appears
- Shows: "Urgent Appointment Request!"
- Shows: Customer name - Service name
- Shows: Requested time
- Shows: Booking ID

**Expected UI (if booking is not urgent but pending):**
- Small summary box appears
- Shows: "1 pending appointment waiting for approval"

**Expected UI (if NO bookings):**
- Green checkmark icon
- "All Caught Up! 🎉"
- "No pending appointments at the moment"

**If Success:**
✅ Manager can see notifications
✅ Proceed to Test 4

**If Fails:**
❌ No console logs at all
   → Manager toggle might not be ON
   → Check if userRole is 'manager'
❌ Console shows: "Access denied - User role: customer"
   → Profile role is wrong (update in Supabase)
❌ Console shows: "dataCount: 0"
   → RLS policy blocking access (run CLEAN_RLS_FIX.sql)
❌ Error: "permission denied for table users"
   → Old broken RLS policies active (run CLEAN_RLS_FIX.sql)

---

### Test 4: Manager Views Booking in BookingManagementScreen

**Objective:** Verify manager can see and manage bookings

**Steps:**
1. Still logged in as **manager** with Manager toggle ON
2. Tap "Booking Management" card (or tap urgent notification)
3. Check **"Pending" tab**

**Expected Console Logs:**
```
📊 Loading bookings for manager...
✅ Bookings loaded successfully
```

**Expected UI:**
- Booking card appears in Pending tab
- Shows: Customer name, phone number
- Shows: Barber name
- Shows: Services (comma-separated)
- Shows: Date and Time (formatted)
- Shows: Status badge "PENDING" (orange)
- Shows: Two buttons: "Confirm" (green) and "Cancel" (red)

**If Success:**
✅ Manager can see and manage bookings
✅ Try confirming the booking (Test 5)

**If Fails:**
❌ "No pending bookings" with empty icon
   → Check console logs
   → Check if fetchAllBookingsForManagers() was called
❌ Error: "Failed to load bookings: permission denied"
   → RLS policies broken (run CLEAN_RLS_FIX.sql)

---

### Test 5: Manager Confirms Booking

**Objective:** Verify manager can confirm booking and it updates status

**Steps:**
1. In BookingManagementScreen, **Pending tab**
2. Tap **"Confirm"** button on the booking
3. Confirm in the alert dialog

**Expected Console Logs:**
```
✅ Confirming booking: [UUID]
✅ Booking confirmed successfully
📊 Loading bookings for manager...
✅ Bookings loaded successfully
```

**Expected UI:**
- Success alert: "Booking confirmed successfully!"
- Booking disappears from Pending tab
- Booking appears in **Confirmed tab**
- Status badge changes to "CONFIRMED" (blue)
- Shows: "Complete" and "Cancel" buttons

**If Success:**
✅ Full flow working!
✅ Customer should see "Confirmed" status in My Bookings

**If Fails:**
❌ Error: "Failed to confirm booking"
   → Check error message
   → Might be RLS policy for UPDATE operation

---

## Troubleshooting Guide

### Issue: Manager sees "No pending appointments" but customer created booking

**Diagnosis Steps:**

1. **Check if booking exists in database:**
   ```sql
   SELECT id, booking_id, customer_id, barber_id, status, appointment_date
   FROM bookings
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - If empty → Booking creation failed
   - If exists → RLS policy issue

2. **Check RLS policies:**
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'bookings';
   ```
   - Should show 8 policies
   - If less → Run CLEAN_RLS_FIX.sql

3. **Test RLS as manager:**
   - Log in to Supabase Dashboard as manager user
   - Run: `SELECT COUNT(*) FROM bookings;`
   - Should return number of bookings
   - If "permission denied" → RLS broken

4. **Check manager profile:**
   ```sql
   SELECT id, email, role FROM profiles WHERE role IN ('manager', 'admin', 'super_admin');
   ```
   - Verify your manager account has correct role
   - If role is wrong → Update it:
     ```sql
     UPDATE profiles SET role = 'manager' WHERE email = 'YOUR_MANAGER_EMAIL';
     ```

5. **Check customer profile ID:**
   ```sql
   SELECT id FROM profiles WHERE email = 'bhavyanshpansotra@gmail.com';
   ```
   - Compare with customer_id in bookings table
   - Should match

---

### Issue: "column booking_id does not exist"

**Solution:**
```sql
-- Run this in Supabase SQL Editor
-- Copy entire content of ADD_MISSING_BOOKING_COLUMNS.sql
-- Paste and Run
```

---

### Issue: "permission denied for table users"

**Solution:**
```sql
-- Run this in Supabase SQL Editor
-- Copy entire content of CLEAN_RLS_FIX.sql
-- Paste and Run
```

---

### Issue: Booking created but no booking_id generated

**Diagnosis:**
```sql
-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'bookings';
```

**Solution:**
If trigger missing, run ADD_MISSING_BOOKING_COLUMNS.sql again.

---

## Console Log Reference

### Successful Flow Logs:

**Customer Creates Booking:**
```
📅 Creating booking: {...}
✅ Booking created successfully!
   - UUID (id): abc123...
   - Booking ID: BK-20251005-001
   - Status: pending
```

**Manager Views Bookings:**
```
📅 [HomeScreen] Fetching pending appointments for manager/admin...
👤 Current user: { role: 'manager' }
✅ User authorized to view bookings
📊 Query result: { dataCount: 1 }
✅ Bookings loaded: { pending: 1 }
🔔 renderUrgentNotifications: { pendingAppointmentsCount: 1 }
```

**Manager Confirms Booking:**
```
✅ Confirming booking: abc123...
✅ Booking confirmed successfully
```

---

## Report Back to Me

After running these tests, please share:

1. ✅ Which tests passed (1-5)
2. ❌ Which tests failed
3. 📋 Console logs (copy/paste or screenshot)
4. 📋 Any error messages
5. 📋 Results from VERIFY_DATABASE_SETUP.sql

This will help me identify the exact issue and provide the precise fix!

---

## Quick Command Reference

**Verify RLS Policies:**
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'bookings';
```

**Check Bookings:**
```sql
SELECT id, booking_id, status, appointment_date FROM bookings;
```

**Check Manager Profile:**
```sql
SELECT id, email, role FROM profiles WHERE role IN ('manager', 'admin', 'super_admin');
```

**Count Bookings (as manager):**
```sql
SELECT COUNT(*) FROM bookings;
```

**Check Triggers:**
```sql
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'bookings';
```
