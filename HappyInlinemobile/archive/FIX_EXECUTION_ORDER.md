# 🚀 Fix Execution Order - Complete Guide

## Problem Summary

1. ✅ **Bookings exist** - You have 2 bookings in database
2. ❌ **booking_id column missing** - Table structure incomplete
3. ❌ **Manager can't see bookings** - RLS policy uses ID matching

---

## Solution: Run 3 SQL Files in Order

### Step 1: Check Current Structure ✅

**File:** `CHECK_BOOKINGS_TABLE_STRUCTURE.sql`

**What it does:** Shows what columns currently exist in your bookings table

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `CHECK_BOOKINGS_TABLE_STRUCTURE.sql`
3. Paste and click **RUN**
4. Review the output - you'll see which columns are missing

**Expected output:**
```
column_name          | data_type
---------------------|----------
id                   | uuid
customer_id          | uuid
barber_id            | uuid
services             | jsonb
appointment_date     | date
appointment_time     | time
total_amount         | numeric
status               | text
is_confirmed_by_manager | boolean
customer_notes       | text
created_at           | timestamp
updated_at           | timestamp
```

Missing columns you need:
- booking_id
- confirmed_by
- confirmed_at
- completed_by
- completed_at
- barber_notes
- cancellation_reason

---

### Step 2: Add Missing Columns ⭐ CRITICAL

**File:** `ADD_MISSING_BOOKING_COLUMNS.sql`

**What it does:**
- Adds all missing columns to bookings table
- Generates booking_id for your existing 2 bookings (BK-20251005-XXXXXX format)
- Creates functions and triggers for auto-generation
- **DOES NOT delete your existing bookings** - they are preserved!

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Click **New Query**
3. Copy **entire content** from `ADD_MISSING_BOOKING_COLUMNS.sql`
4. Paste and click **RUN**
5. Wait for "Success" message

**Expected output:**
```
✅ SUCCESS! Missing columns added to bookings table
✅ Triggers and functions created
✅ Your existing 2 bookings are preserved
📋 Next step: Run FIX_MANAGER_RLS_BOOKINGS.sql
```

**Verification:**
The script automatically runs verification queries at the end showing:
- All columns with booking_id now present
- Your 2 bookings with generated booking_id values
- Triggers created (trigger_set_booking_id, trigger_booking_confirmation, etc.)

---

### Step 3: Fix Manager Access 🔐

**File:** `FIX_MANAGER_RLS_BOOKINGS.sql`

**What it does:**
- Updates RLS policies to use email-based lookup
- Allows managers/admins to see all bookings
- Fixes the ID mismatch issue

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Click **New Query**
3. Copy **entire content** from `FIX_MANAGER_RLS_BOOKINGS.sql`
4. Paste and click **RUN**
5. Wait for "Success. No rows returned"

**Expected output:**
```
Success. No rows returned
```

**Verification:**
The script automatically queries and shows the updated policies.

---

## Step 4: Test in Your App 📱

After running all 3 SQL scripts:

### 1. Restart Your App
- Close the app completely
- Reopen it

### 2. Log in as Manager

### 3. Check Console Logs

You should see:
```
📅 [HomeScreen] Fetching pending appointments for manager/admin...
👤 Current user: { id: 'xxx', email: 'manager@test.com', role: 'manager' }
✅ User authorized to view bookings
🔍 Querying bookings table...
📊 Query result: { hasError: false, dataCount: 2 }
✅ Bookings loaded: { pending: 2, confirmed: 0, completed: 0 }

📊 [HomeScreen] fetchAllBookingsForManagers result: {
  success: true,
  pendingCount: 2
}
✅ [HomeScreen] Pending appointments fetched: 2
📋 [HomeScreen] First pending appointment: { ... }

🔔 [HomeScreen] renderUrgentNotifications called: {
  userRole: 'manager',
  pendingAppointmentsCount: 2,
  isAuthorizedRole: true
}
✅ [HomeScreen] Showing urgent notifications: { urgentCount: X, totalPending: 2 }
```

### 4. Check HomeScreen

You should see:
- 🚨 **Urgent notification banner** (red if < 2 hours, orange if < 6 hours)
- ⏰ **"2 pending appointments waiting for approval"** summary
- Tapping takes you to BookingManagementScreen

### 5. Check BookingManagementScreen

You should see:
- **Pending tab:** Your 2 bookings
- Each booking shows:
  - Customer name
  - Barber name
  - Services
  - Date and time
  - **Booking ID:** BK-20251005-XXXXXX
  - **Confirm button**
  - **Cancel button**

---

## Quick Reference: 3 Files to Run

| Order | File | Purpose | Safe? |
|-------|------|---------|-------|
| 1 | `CHECK_BOOKINGS_TABLE_STRUCTURE.sql` | See what columns exist | ✅ Read-only |
| 2 | `ADD_MISSING_BOOKING_COLUMNS.sql` | Add missing columns + triggers | ✅ Preserves data |
| 3 | `FIX_MANAGER_RLS_BOOKINGS.sql` | Fix manager access policies | ✅ Only updates policies |

---

## Troubleshooting

### If Step 2 fails:

**Error: "column already exists"**
- Some columns already exist - safe to ignore
- Continue to Step 3

**Error: "constraint already exists"**
- Constraint already created - safe to ignore
- Continue to Step 3

### If Manager still can't see bookings after Step 3:

1. **Check manager's email in database:**
```sql
SELECT id, email, role FROM profiles WHERE role = 'manager';
```

2. **Check auth.uid() while logged in as manager:**
```sql
SELECT auth.uid();
```

3. **Manually test RLS policy:**
```sql
SELECT 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  ) as can_view;
```
Should return `true`.

4. **Check bookings query directly:**
```sql
SELECT 
  b.id,
  b.booking_id,
  b.status
FROM bookings b
LIMIT 5;
```
Should return 2 rows.

### If console shows "dataCount: 0":

This means the RLS policy is still blocking. Double-check:
- Step 3 was run successfully
- You're logged in as manager (not customer)
- Manager's role in database is 'manager', 'admin', or 'super_admin'

---

## After Fix: What Changes

### Before:
- ❌ Manager sees empty HomeScreen
- ❌ No urgent notifications
- ❌ BookingManagementScreen tabs are empty
- ❌ Console shows: "Query result: { dataCount: 0 }"

### After:
- ✅ Manager sees urgent notification banner
- ✅ Pending appointments count displayed
- ✅ BookingManagementScreen shows 2 bookings in Pending tab
- ✅ Console shows: "Query result: { dataCount: 2 }"
- ✅ Each booking displays booking_id (BK-20251005-XXXXXX)
- ✅ Confirm/Cancel buttons work
- ✅ Complete button works after confirmation

---

## Summary

**Run these 3 files in Supabase SQL Editor:**

1. ✅ `CHECK_BOOKINGS_TABLE_STRUCTURE.sql` - See current structure
2. ⭐ `ADD_MISSING_BOOKING_COLUMNS.sql` - Add missing columns
3. 🔐 `FIX_MANAGER_RLS_BOOKINGS.sql` - Fix manager access

**Then:**
- Restart app
- Log in as manager
- Check HomeScreen and BookingManagementScreen
- You should see both bookings!

**Total time:** ~2 minutes

Your existing 2 bookings will be preserved and enhanced with booking_id values!
