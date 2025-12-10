# 🔥 CRITICAL FIX: Manager Cannot See Bookings

## Problem Identified ✅

You have **2 bookings in the database** (visible in Supabase Table Editor), but when you log in as **manager/admin/super_admin**, you **cannot see any bookings** on:
- HomeScreen (urgent notifications section)
- BookingManagementScreen (all tabs are empty)

However, when you log in as the **customer who created the bookings**, you CAN see them in "My Bookings" screen.

---

## Root Cause 🎯

**Row Level Security (RLS) Policy Issue:**

The RLS policy for bookings table checks:
```sql
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()  ← THIS IS THE PROBLEM
  AND profiles.role IN ('manager', 'admin', 'super_admin')
)
```

### Why It Fails:

1. When you log in as manager, Supabase sets `auth.uid()` to your auth user UUID (from `auth.users` table)
2. The RLS policy tries to find a profile where `profiles.id = auth.uid()`
3. **If there's an ID mismatch** (profiles.id ≠ auth.uid()), the policy fails
4. RLS blocks the query, returning 0 results
5. Your app thinks there are no bookings

### This is the Same Issue We Fixed for Customers:

We already fixed `checkAuthState()` and `getCurrentUser()` functions to use **email-based fallback** instead of relying on ID match. We need to do the same for RLS policies.

---

## The Fix 🛠️

### Option 1: Update RLS Policies (RECOMMENDED) ⭐

Run the SQL file: **`FIX_MANAGER_RLS_BOOKINGS.sql`**

This updates all 3 manager/admin RLS policies to use email lookup instead of ID match:

```sql
-- New policy (uses email - more reliable)
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);
```

### Why This Works:

✅ Email is **always consistent** between `auth.users` and `profiles` tables  
✅ No dependency on ID matching  
✅ Same pattern used in `checkAuthState()` and `getCurrentUser()`  
✅ Works for all users (customers, barbers, managers, admins)

---

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**

### Step 2: Copy and Run the Fix

Open the file: **`FIX_MANAGER_RLS_BOOKINGS.sql`**

Copy the entire content and paste into Supabase SQL Editor.

Click **"Run"** button.

You should see:
```
Success. No rows returned
```

### Step 3: Verify Policies Updated

Run this query to check:
```sql
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'bookings'
AND policyname LIKE '%admin%'
ORDER BY policyname;
```

You should see 3 policies:
- `Managers and admins can delete bookings` (DELETE)
- `Managers and admins can update all bookings` (UPDATE)
- `Managers and admins view all bookings` (SELECT)

### Step 4: Test in Your App

1. **Restart your app** (close and reopen)
2. **Log in as manager** (or admin/super_admin)
3. Go to **HomeScreen**
4. You should now see:
   - 🚨 Urgent notification banner (if appointment is within 6 hours)
   - Pending appointment summary
5. Tap **"Booking Management"**
6. You should see your **2 bookings** in the appropriate tabs (Pending/Confirmed/Completed)

---

## Expected Console Logs (After Fix)

When you open the app as manager, you should see:

```
📅 [HomeScreen] Fetching pending appointments for manager/admin...
👤 Current user: { id: 'xxx', email: 'manager@test.com', role: 'manager' }
✅ User authorized to view bookings
🔍 Querying bookings table...
📊 Query result: { hasError: false, dataCount: 2 }
✅ Bookings loaded: { pending: 2, confirmed: 0, completed: 0 }

📊 [HomeScreen] fetchAllBookingsForManagers result: {
  success: true,
  pendingCount: 2,
  confirmedCount: 0,
  completedCount: 0
}
✅ [HomeScreen] Pending appointments fetched: 2
📋 [HomeScreen] First pending appointment: { ... }

🔔 [HomeScreen] renderUrgentNotifications called: {
  userRole: 'manager',
  pendingAppointmentsCount: 2,
  isAuthorizedRole: true
}
✅ [HomeScreen] Showing urgent notifications: {
  urgentCount: X,
  totalPending: 2
}
```

---

## What This Fix Updates

### 3 RLS Policies for Managers/Admins:

1. **SELECT (View Bookings):**
   - Allows managers to see all bookings
   - Used by `fetchAllBookingsForManagers()`
   - Powers HomeScreen notifications and BookingManagementScreen

2. **UPDATE (Modify Bookings):**
   - Allows managers to confirm, cancel, complete bookings
   - Used by `confirmBooking()`, `cancelBooking()`, `completeBooking()`
   - Powers the action buttons in BookingManagementScreen

3. **DELETE (Remove Bookings):**
   - Allows managers to permanently delete bookings
   - For cleanup of cancelled/no-show bookings

---

## Booking System Flow (Reminder)

### 1. Customer Creates Booking:
```javascript
createBooking(bookingData)
↓
INSERT into bookings table with status = 'pending'
↓
Database trigger generates booking_id (BK-20251007-XXXXXX)
↓
Customer sees: "Booking confirmed! ID: BK-20251007-XXXXXX"
```

### 2. Manager Sees Urgent Notification:
```javascript
Manager logs in → HomeScreen
↓
fetchPendingAppointments() calls fetchAllBookingsForManagers()
↓
RLS policy checks: Is user a manager? (by email)
↓
Query returns all bookings grouped by status
↓
HomeScreen shows urgent banner + pending summary
```

### 3. Manager Confirms Booking:
```javascript
Manager taps Confirm button
↓
confirmBooking(bookingId)
↓
UPDATE bookings SET 
  status = 'confirmed',
  is_confirmed_by_manager = true,
  confirmed_by = manager_id,
  confirmed_at = NOW()
↓
Customer sees "Confirmed" tag in My Bookings
```

### 4. Manager Completes Booking:
```javascript
Customer arrives at store
↓
Manager verifies booking ID: BK-20251007-XXXXXX
↓
Manager taps Complete button
↓
completeBooking(bookingId)
↓
UPDATE bookings SET 
  status = 'completed',
  completed_by = manager_id,
  completed_at = NOW()
↓
Customer can now rate the service
```

---

## Verification Checklist

After running the fix, verify these scenarios:

### ✅ Manager/Admin Can View Bookings:
- [ ] HomeScreen shows urgent notification banner (if pending bookings exist)
- [ ] HomeScreen shows pending appointment count
- [ ] Tapping banner navigates to BookingManagementScreen
- [ ] BookingManagementScreen shows all bookings in correct tabs
- [ ] Pending tab shows 2 bookings (based on your screenshot)

### ✅ Manager/Admin Can Confirm Bookings:
- [ ] Tap "Confirm" button on pending booking
- [ ] Confirmation alert appears
- [ ] After confirming, booking moves to "Confirmed" tab
- [ ] Customer sees "Confirmed" tag in their My Bookings

### ✅ Manager/Admin Can Complete Bookings:
- [ ] Tap "Complete" button on confirmed booking
- [ ] Completion alert appears
- [ ] After completing, booking moves to "Completed" tab
- [ ] Customer can now rate the service

### ✅ Manager/Admin Can Cancel Bookings:
- [ ] Tap "Cancel" button on any booking
- [ ] Cancellation alert appears
- [ ] Booking is marked as cancelled (removed from lists)
- [ ] Customer sees cancellation in their My Bookings

### ✅ Customer Can Still View Their Bookings:
- [ ] Log in as customer
- [ ] Navigate to My Bookings screen
- [ ] See upcoming/past bookings
- [ ] Can cancel or reschedule their own bookings

### ✅ Barber Cannot See Manager Features:
- [ ] Log in as barber
- [ ] HomeScreen does NOT show urgent notifications
- [ ] BookingManagementScreen is NOT accessible
- [ ] Barber only sees their own assigned bookings

---

## Alternative Fix (If Above Doesn't Work)

If the RLS policy fix doesn't work, the issue might be that your manager's `profiles.id` doesn't match their `auth.uid()` at all.

### Check ID Mismatch:

Run this query in Supabase SQL Editor:

```sql
SELECT 
  p.id as profile_id,
  p.email,
  p.role,
  au.id as auth_user_id,
  (p.id = au.id) as ids_match
FROM profiles p
LEFT JOIN auth.users au ON p.email = au.email
WHERE p.email = 'YOUR_MANAGER_EMAIL@example.com';
```

If `ids_match = false`, run this fix:

```sql
UPDATE profiles
SET id = (SELECT id FROM auth.users WHERE auth.users.email = profiles.email)
WHERE email = 'YOUR_MANAGER_EMAIL@example.com';
```

---

## Summary

**Problem:** RLS policy blocking managers from viewing bookings due to ID mismatch  
**Solution:** Update RLS policies to use email-based lookup (more reliable)  
**File to Run:** `FIX_MANAGER_RLS_BOOKINGS.sql`  
**Expected Result:** Managers can see and manage all bookings  

**After fix:**
- ✅ Managers see urgent notifications on HomeScreen
- ✅ Managers see all bookings in BookingManagementScreen
- ✅ Managers can confirm, cancel, complete bookings
- ✅ Customers still see their own bookings
- ✅ System works as designed

Run the SQL fix and test! Let me know if you see the bookings after restarting the app.
