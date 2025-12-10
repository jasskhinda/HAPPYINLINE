# 🧪 Booking Management - Testing Guide

## Prerequisites
1. Have a manager account created in the database
2. Have at least one barber profile
3. Have at least one customer with a booking

---

## 🔐 Step 1: Verify Manager Access

### Create Test Manager (if needed):
```sql
-- In Supabase SQL Editor
UPDATE profiles 
SET role = 'manager' 
WHERE email = 'your-test-email@email.com';
```

### Login as Manager:
1. Open the app
2. Login with manager credentials
3. Should see manager dashboard

---

## 📋 Step 2: Test Booking Creation

### Create Test Bookings (via app or SQL):

**Via SQL (Quick way to add test data):**
```sql
-- Insert a pending booking
INSERT INTO bookings (
  id,
  customer_id,
  barber_id,
  appointment_date,
  appointment_time,
  status,
  services,
  total_price
) VALUES (
  'BK-20240115-TEST01',
  (SELECT id FROM profiles WHERE role = 'customer' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'barber' LIMIT 1),
  CURRENT_DATE + INTERVAL '2 days',
  '10:00:00',
  'pending',
  '[{"name": "Haircut", "price": 25, "duration": 30}]'::jsonb,
  25.00
);

-- Insert a confirmed booking
INSERT INTO bookings (
  id,
  customer_id,
  barber_id,
  appointment_date,
  appointment_time,
  status,
  services,
  total_price
) VALUES (
  'BK-20240115-TEST02',
  (SELECT id FROM profiles WHERE role = 'customer' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'barber' LIMIT 1),
  CURRENT_DATE + INTERVAL '3 days',
  '14:00:00',
  'confirmed',
  '[{"name": "Beard Trim", "price": 15, "duration": 20}]'::jsonb,
  15.00
);

-- Insert a completed booking
INSERT INTO bookings (
  id,
  customer_id,
  barber_id,
  appointment_date,
  appointment_time,
  status,
  services,
  total_price
) VALUES (
  'BK-20240115-TEST03',
  (SELECT id FROM profiles WHERE role = 'customer' LIMIT 1),
  (SELECT id FROM profiles WHERE role = 'barber' LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day',
  '16:00:00',
  'completed',
  '[{"name": "Full Service", "price": 40, "duration": 60}]'::jsonb,
  40.00
);
```

---

## ✅ Step 3: Test Booking Management Screen

### 3.1 Open Booking Management
1. Navigate to manager dashboard
2. Tap "Booking Management" (or navigate to screen)
3. **Expected:** 
   - Should show loading indicator
   - Then display three tabs: Pending, Confirmed, Completed

### 3.2 Verify Data Display
**Pending Tab:**
- ✅ Should show booking BK-20240115-TEST01
- ✅ Customer name displayed correctly
- ✅ Customer phone displayed correctly
- ✅ Barber name displayed correctly
- ✅ Service: "Haircut"
- ✅ Date formatted: "Jan 17, 2024" (or similar)
- ✅ Time formatted: "10:00 AM"
- ✅ Status badge shows "PENDING" in orange
- ✅ Two buttons: "Confirm" and "Cancel"

**Confirmed Tab:**
- ✅ Should show booking BK-20240115-TEST02
- ✅ All details displayed correctly
- ✅ Status badge shows "CONFIRMED" in blue
- ✅ Two buttons: "Complete" and "Cancel"

**Completed Tab:**
- ✅ Should show booking BK-20240115-TEST03
- ✅ All details displayed correctly
- ✅ Status badge shows "COMPLETED" in green
- ✅ Shows "Service Completed" text with checkmark icon
- ✅ No action buttons

---

## 🎬 Step 4: Test Actions

### 4.1 Test Confirm Action
1. Go to **Pending Tab**
2. Tap **"Confirm"** button on a booking
3. **Expected:**
   - Alert: "Confirm appointment for [Customer] with [Barber]?"
   - Two options: "Cancel" and "Confirm"
4. Tap **"Confirm"**
5. **Expected:**
   - Loading/processing
   - Success alert: "Booking confirmed successfully!"
   - Booking disappears from Pending tab
   - Booking appears in Confirmed tab
6. **Verify in database:**
   ```sql
   SELECT id, status FROM bookings WHERE id = 'BK-20240115-TEST01';
   -- Should show status = 'confirmed'
   ```

### 4.2 Test Complete Action
1. Go to **Confirmed Tab**
2. Tap **"Complete"** button on a booking
3. **Expected:**
   - Alert: "Mark [Customer]'s appointment as completed?"
   - Two options: "No" and "Complete"
4. Tap **"Complete"**
5. **Expected:**
   - Loading/processing
   - Success alert: "Booking marked as completed!"
   - Booking disappears from Confirmed tab
   - Booking appears in Completed tab
6. **Verify in database:**
   ```sql
   SELECT id, status FROM bookings WHERE id = 'BK-20240115-TEST02';
   -- Should show status = 'completed'
   ```

### 4.3 Test Cancel Action (Pending)
1. Go to **Pending Tab**
2. Tap **"Cancel"** button on a booking
3. **Expected:**
   - Alert: "Are you sure you want to cancel [Customer]'s appointment?"
   - Two options: "No" and "Cancel Booking" (red)
4. Tap **"Cancel Booking"**
5. **Expected:**
   - Loading/processing
   - Success alert: "Booking cancelled successfully!"
   - Booking disappears from Pending tab
6. **Verify in database:**
   ```sql
   SELECT id, status, cancellation_reason FROM bookings 
   WHERE id = 'BK-20240115-TEST01';
   -- Should show status = 'cancelled'
   -- Should show cancellation_reason = 'Cancelled by manager'
   ```

### 4.4 Test Cancel Action (Confirmed)
1. Go to **Confirmed Tab**
2. Tap **"Cancel"** button on a booking
3. Same flow as 4.3
4. **Expected:**
   - Booking disappears from Confirmed tab
   - Status changed to 'cancelled' in database

---

## 🔄 Step 5: Test Pull-to-Refresh

### 5.1 Test Refresh on Pending Tab
1. Go to **Pending Tab**
2. Pull down from top of list
3. **Expected:**
   - Refresh spinner appears
   - Data reloads from Supabase
   - Spinner disappears
   - Latest data displayed

### 5.2 Test Refresh on Other Tabs
- Repeat same steps for Confirmed and Completed tabs
- All tabs should refresh independently

### 5.3 Test Auto-Refresh After Action
1. Confirm a booking
2. **Expected:**
   - After success alert, data auto-refreshes
   - All tabs updated with latest data
   - Changes reflected immediately

---

## 📱 Step 6: Test Edge Cases

### 6.1 Empty States
1. **Clear all pending bookings:**
   ```sql
   UPDATE bookings SET status = 'confirmed' WHERE status = 'pending';
   ```
2. Refresh Pending tab
3. **Expected:**
   - Calendar icon displayed
   - "No pending bookings" text shown

2. **Clear all confirmed bookings:**
   ```sql
   UPDATE bookings SET status = 'completed' WHERE status = 'confirmed';
   ```
3. Refresh Confirmed tab
4. **Expected:**
   - Checkmark icon displayed
   - "No confirmed bookings" text shown

### 6.2 Multiple Services
1. **Create booking with multiple services:**
   ```sql
   INSERT INTO bookings (
     id,
     customer_id,
     barber_id,
     appointment_date,
     appointment_time,
     status,
     services,
     total_price
   ) VALUES (
     'BK-20240115-MULTI',
     (SELECT id FROM profiles WHERE role = 'customer' LIMIT 1),
     (SELECT id FROM profiles WHERE role = 'barber' LIMIT 1),
     CURRENT_DATE + INTERVAL '1 day',
     '11:00:00',
     'pending',
     '[
       {"name": "Haircut", "price": 25, "duration": 30},
       {"name": "Beard Trim", "price": 15, "duration": 20},
       {"name": "Hair Coloring", "price": 50, "duration": 60}
     ]'::jsonb,
     90.00
   );
   ```
2. Refresh bookings
3. **Expected:**
   - Service field shows: "Haircut, Beard Trim, Hair Coloring"

### 6.3 Missing Customer/Barber Data
1. **Test with null customer name:**
   ```sql
   UPDATE profiles SET name = NULL WHERE role = 'customer' LIMIT 1;
   ```
2. Refresh bookings
3. **Expected:**
   - Shows "Unknown Customer" instead of null
   - App doesn't crash

4. **Restore data:**
   ```sql
   UPDATE profiles SET name = 'Test Customer' WHERE role = 'customer' LIMIT 1;
   ```

### 6.4 Date/Time Edge Cases
1. **Past appointment:**
   ```sql
   INSERT INTO bookings (
     id,
     customer_id,
     barber_id,
     appointment_date,
     appointment_time,
     status,
     services,
     total_price
   ) VALUES (
     'BK-20240115-PAST',
     (SELECT id FROM profiles WHERE role = 'customer' LIMIT 1),
     (SELECT id FROM profiles WHERE role = 'barber' LIMIT 1),
     CURRENT_DATE - INTERVAL '5 days',
     '09:00:00',
     'pending',
     '[{"name": "Haircut", "price": 25, "duration": 30}]'::jsonb,
     25.00
   );
   ```
2. **Expected:** Date still formats correctly (e.g., "Jan 10, 2024")

3. **Future appointment (far):**
   ```sql
   INSERT INTO bookings (
     id,
     customer_id,
     barber_id,
     appointment_date,
     appointment_time,
     status,
     services,
     total_price
   ) VALUES (
     'BK-20240115-FUTURE',
     (SELECT id FROM profiles WHERE role = 'customer' LIMIT 1),
     (SELECT id FROM profiles WHERE role = 'barber' LIMIT 1),
     CURRENT_DATE + INTERVAL '30 days',
     '15:30:00',
     'pending',
     '[{"name": "Haircut", "price": 25, "duration": 30}]'::jsonb,
     25.00
   );
   ```
4. **Expected:** Date formats correctly, time shows "3:30 PM"

---

## ❌ Step 7: Test Error Handling

### 7.1 Test Non-Manager Access
1. **Login as customer or barber (not manager)**
2. Try to access Booking Management screen
3. **Expected:**
   - Error alert: "Only managers can view all bookings"
   - Or redirected/blocked from accessing

### 7.2 Test Network Error
1. Turn off WiFi/mobile data
2. Try to confirm a booking
3. **Expected:**
   - Error alert displayed
   - Booking status unchanged
   - Can retry after restoring connection

### 7.3 Test Invalid Booking ID
1. In code, temporarily pass invalid ID to `confirmBooking('INVALID-ID')`
2. **Expected:**
   - Error alert: "Failed to confirm booking: [error message]"
   - No crash

---

## 🎯 Success Criteria

### All tests should:
- ✅ Load bookings without errors
- ✅ Display data in correct tabs
- ✅ Format dates/times correctly
- ✅ Show customer/barber details
- ✅ Allow confirming pending bookings
- ✅ Allow completing confirmed bookings
- ✅ Allow cancelling bookings
- ✅ Move bookings between tabs correctly
- ✅ Update database after actions
- ✅ Refresh data via pull-to-refresh
- ✅ Auto-refresh after actions
- ✅ Show loading indicators
- ✅ Show empty states when no bookings
- ✅ Handle multiple services
- ✅ Handle edge cases gracefully
- ✅ Show error alerts on failures
- ✅ Maintain security (manager-only access)

---

## 🐛 Troubleshooting

### Issue: "No bookings showing"
**Solutions:**
1. Check if user is logged in as manager
2. Verify bookings exist in database:
   ```sql
   SELECT * FROM bookings;
   ```
3. Check console logs for errors
4. Verify RLS policies allow manager to read bookings

### Issue: "Error confirming booking"
**Solutions:**
1. Check if booking exists:
   ```sql
   SELECT * FROM bookings WHERE id = 'BK-...';
   ```
2. Verify booking status is 'pending'
3. Check RLS policies allow manager to update bookings
4. Check console logs for specific error

### Issue: "Customer/Barber name not showing"
**Solutions:**
1. Verify profiles exist:
   ```sql
   SELECT id, name, role FROM profiles;
   ```
2. Check if profiles table has name field populated
3. Verify JOIN in fetchAllBookingsForManagers() function

### Issue: "Services not displaying"
**Solutions:**
1. Check services field in database:
   ```sql
   SELECT id, services FROM bookings;
   ```
2. Verify services is valid JSONB array
3. Each service should have 'name' field

### Issue: "Date/Time formatting wrong"
**Solutions:**
1. Check appointment_date and appointment_time fields
2. Verify format: date = 'YYYY-MM-DD', time = 'HH:MM:SS'
3. Check device timezone settings

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________
Device: ___________

[ ] Step 1: Manager Access - PASS/FAIL
[ ] Step 2: Booking Creation - PASS/FAIL
[ ] Step 3: Data Display - PASS/FAIL
[ ] Step 4.1: Confirm Action - PASS/FAIL
[ ] Step 4.2: Complete Action - PASS/FAIL
[ ] Step 4.3: Cancel (Pending) - PASS/FAIL
[ ] Step 4.4: Cancel (Confirmed) - PASS/FAIL
[ ] Step 5: Pull-to-Refresh - PASS/FAIL
[ ] Step 6: Edge Cases - PASS/FAIL
[ ] Step 7: Error Handling - PASS/FAIL

Notes:
_________________________________
_________________________________
```

---

## ✅ Final Checklist

- [ ] Manager can login successfully
- [ ] BookingManagementScreen loads without errors
- [ ] All three tabs display correctly
- [ ] Bookings show in correct tabs based on status
- [ ] Customer/barber names display
- [ ] Services display (single and multiple)
- [ ] Dates formatted correctly
- [ ] Times formatted correctly (AM/PM)
- [ ] Confirm button works (pending → confirmed)
- [ ] Complete button works (confirmed → completed)
- [ ] Cancel button works (any tab → cancelled)
- [ ] Pull-to-refresh works on all tabs
- [ ] Auto-refresh after actions
- [ ] Loading indicators show
- [ ] Empty states show when no bookings
- [ ] Error handling works
- [ ] Manager-only access enforced
- [ ] Database updates correctly after actions

---

**Test Status: Ready for Testing! 🚀**

Run through all tests and report any issues found.
