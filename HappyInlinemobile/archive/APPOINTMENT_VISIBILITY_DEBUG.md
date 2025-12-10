# Appointment Visibility Debugging Guide

## Problem
Manager/Admin cannot see any appointments on HomeScreen or BookingManagementScreen.

## Root Causes (Possible)
1. **No bookings in database** - Most likely cause
2. **Database query error** - Less likely but possible
3. **Role authorization issue** - Less likely but possible
4. **Data not being fetched** - Less likely but possible

---

## Diagnostic Logs Added

I've added comprehensive logging to help identify the issue:

### 1. **In `auth.js` - `fetchAllBookingsForManagers()` function:**
- Logs current user role
- Logs authorization check
- Logs Supabase query results
- Logs data count and structure

### 2. **In `HomeScreen.jsx` - `fetchPendingAppointments()` function:**
- Logs when function is called
- Logs result structure from backend
- Logs pending/confirmed/completed counts
- Logs first appointment details (if any)

### 3. **In `HomeScreen.jsx` - `renderUrgentNotifications()` function:**
- Logs user role
- Logs pending appointments count
- Logs authorization status
- Logs notification visibility

---

## How to Debug

### Step 1: Check Database for Bookings

Run the SQL queries in `CHECK_BOOKINGS.sql` in your Supabase SQL Editor:

```sql
-- 1. Count total bookings
SELECT COUNT(*) as total_bookings FROM bookings;

-- 2. Show all bookings with customer/barber names
SELECT 
  b.id,
  b.booking_id,
  b.status,
  b.appointment_date,
  b.appointment_time,
  c.name as customer_name,
  bar.name as barber_name,
  b.services
FROM bookings b
LEFT JOIN profiles c ON b.customer_id = c.id
LEFT JOIN profiles bar ON b.barber_id = bar.id
ORDER BY b.created_at DESC;

-- 3. Check pending bookings specifically
SELECT COUNT(*) as pending_count 
FROM bookings 
WHERE status = 'pending';
```

**Expected Results:**
- If `total_bookings = 0` → **No bookings in database** (most likely issue)
- If bookings exist → Check the logs in Step 2

---

### Step 2: Check Console Logs

**Open the app as a Manager** and check the terminal/console for these logs:

#### **On HomeScreen Load:**

```
📅 [HomeScreen] Fetching pending appointments for manager/admin...
👤 Current user: { id: '...', email: '...', role: 'manager' }
✅ User authorized to view bookings
🔍 Querying bookings table...
📊 Query result: { hasError: false, errorMessage: undefined, dataCount: X }
```

**What to look for:**
- ✅ Role is 'manager', 'admin', or 'super_admin'
- ✅ User authorized message appears
- ✅ `dataCount` shows number of bookings (should be > 0)
- ❌ If `dataCount = 0` → No bookings in database

#### **If Error Occurs:**

```
❌ Supabase query error: [error details]
❌ Access denied - User role: [role]
```

**What to do:**
- Check if your manager account role is correctly set in database
- Verify Row Level Security (RLS) policies allow managers to read bookings

---

### Step 3: Check Notification Rendering

After fetching, you should see:

```
🔔 [HomeScreen] renderUrgentNotifications called: {
  userRole: 'manager',
  pendingAppointmentsCount: X,
  isAuthorizedRole: true
}
✅ [HomeScreen] Showing urgent notifications: { urgentCount: X, totalPending: X }
```

**If you see:**
```
⚠️ [HomeScreen] Not showing notifications - no pending appointments
```
→ This means data was fetched but no pending appointments exist

---

## Most Likely Scenario: No Bookings in Database

If there are no bookings in the database, you need to **create a test booking as a customer**.

### How to Create a Test Booking:

1. **Log out** from manager account
2. **Log in as a customer** (or sign up as new customer)
3. Go to **HomeScreen** → Find a barber
4. Tap on a barber → **BarberInfoScreen**
5. Select services, pick date/time
6. Tap **"Confirm Booking"**
7. You should see: ✅ Booking created with ID: BK-YYYYMMDD-XXXXXX

### After Creating Booking:

1. **Log out** from customer account
2. **Log in as manager** again
3. You should now see:
   - 🚨 Urgent notification banner on **HomeScreen** (if appointment is soon)
   - Pending appointment summary
   - Full booking details in **BookingManagementScreen**

---

## Verification Checklist

### ✅ HomeScreen (Manager/Admin View)

**When manager mode is OFF (toggle disabled):**
- Should show regular customer view (barbers, services)
- **Should still show urgent notifications banner** at top
- Banner only appears if pending appointments exist

**When manager mode is ON (toggle enabled):**
- Should show "Manager Dashboard" title
- Should show urgent notifications banner
- Should show 3 cards: Service Management, Barber Management, Booking Management

### ✅ BookingManagementScreen (Manager/Admin Only)

**Access:**
- Only accessible to users with role: 'manager', 'admin', 'super_admin'
- Navigable from HomeScreen manager mode or directly

**Expected View:**
- 3 tabs: Pending | Confirmed | Completed
- Each tab shows bookings in that status
- **Pending tab:** Confirm button + Cancel button
- **Confirmed tab:** Complete button + Cancel button
- **Completed tab:** Shows completion info (no actions)

**If tabs are empty:**
- Check console logs for query errors
- Verify bookings exist in database
- Verify user role is correct

---

## Who Can See Appointments?

### ✅ **Manager** (role = 'manager')
- Can see urgent notifications on HomeScreen
- Can access BookingManagementScreen
- Can confirm, cancel, complete bookings

### ✅ **Admin** (role = 'admin')
- Same permissions as manager
- Plus additional admin controls (user management)

### ✅ **Super Admin** (role = 'super_admin' OR is_super_admin = true)
- Same permissions as admin
- Plus can manage other admins

### ❌ **Customer** (role = 'customer')
- Cannot see urgent notifications
- Cannot access BookingManagementScreen
- Can only see their own bookings (My Bookings tab)

### ❌ **Barber** (role = 'barber')
- Cannot see urgent notifications
- Cannot access BookingManagementScreen
- Can only see bookings assigned to them

---

## Next Steps

1. **Run the SQL queries** in `CHECK_BOOKINGS.sql` to check if bookings exist
2. **Check the console logs** when opening the app as manager
3. **If no bookings exist:** Create a test booking as customer (follow steps above)
4. **If bookings exist but not visible:** Share the console logs with me

---

## Expected Console Output (When Working)

```
🏠 HomeScreen: Fetching user profile...
👤 User: { id: 'xxx', email: 'manager@test.com' }
📋 Profile: { name: 'Manager Name', role: 'manager' }
   Profile role: manager
   
📅 [HomeScreen] Fetching pending appointments for manager/admin...
👤 Current user: { id: 'xxx', email: 'manager@test.com', role: 'manager' }
✅ User authorized to view bookings
🔍 Querying bookings table...
📊 Query result: { hasError: false, dataCount: 5 }
✅ Bookings loaded: { pending: 3, confirmed: 1, completed: 1 }

📊 [HomeScreen] fetchAllBookingsForManagers result: {
  success: true,
  pendingCount: 3,
  confirmedCount: 1,
  completedCount: 1
}
✅ [HomeScreen] Pending appointments fetched: 3
📋 [HomeScreen] First pending appointment: {
  id: 'xxx',
  customer: { name: 'John Doe' },
  barber: { name: 'Barber Name' }
}

🔔 [HomeScreen] renderUrgentNotifications called: {
  userRole: 'manager',
  pendingAppointmentsCount: 3,
  isAuthorizedRole: true
}
✅ [HomeScreen] Showing urgent notifications: {
  urgentCount: 1,
  totalPending: 3
}
```

---

## Summary

The enhanced logging will tell you **exactly** where the issue is:
- ✅ User role is correct
- ✅ Query executes without errors
- ✅ Data is fetched from Supabase
- ❌ No bookings in database → Create test booking
- ❌ Query error → Check RLS policies
- ❌ Role issue → Update manager role in database

**Most likely:** You need to create a test booking as a customer first!
