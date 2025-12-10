# Quick Testing Guide - Booking System

## 🧪 Testing the Complete Booking Flow

### Prerequisites
- Shop with operating hours configured
- At least one barber in the shop
- Services added to shop
- Customer account (not staff)
- Manager/Admin account

---

## Test 1: Customer Books Appointment ✅

### Steps:
1. **Login as Customer** (not admin/manager/barber)
2. **Browse shops** → Find a shop
3. **Open ShopDetailsScreen** → Click on shop
4. **Select services** → Choose 1-2 services from Services tab
5. **Click "Book Now"** button at bottom

### Expected Result:
- ✅ Opens **BookingConfirmationScreen**
- ✅ Shows booking ID preview (e.g., BK-20251019-A7F3E9)
- ✅ Shows shop details
- ✅ Shows selected services with prices and total
- ✅ Shows barber selection (with "Any Available" option)
- ✅ Shows date picker
- ✅ Shows time picker
- ✅ Shows operating hours info

6. **Select barber** → Choose "Any Available" or specific barber
7. **Select date** → Tomorrow
8. **Select time** → Within shop hours (e.g., 10:00 AM)
9. **Click "Confirm Booking"**

### Expected Result:
- ✅ Success alert appears
- ✅ Shows booking ID: "BK-20251019-XXXXXX"
- ✅ Message: "Wait for manager confirmation"
- ✅ Option to "View My Bookings" or "OK"

---

## Test 2: View Booking as Customer ✅

### Steps:
1. **Navigate to MyBookingScreen** (bottom tab)
2. **Check "Upcoming" tab**

### Expected Result:
- ✅ Booking appears in list
- ✅ **Booking ID displayed** at top: "💳 Booking ID: BK-20251019-XXXXXX"
- ✅ **Copy button** next to booking ID
- ✅ **Status badge**: "Unconfirmed ⚠️" (yellow)
- ✅ Date and time displayed
- ✅ Services listed
- ✅ Total price shown
- ✅ **Reschedule button** visible
- ✅ **Cancel button** visible

3. **Click Copy button** next to Booking ID

### Expected Result:
- ✅ Alert: "Copied! Booking ID copied to clipboard"

---

## Test 3: Staff Member Tries to Book (Should Fail) ❌

### Steps:
1. **Login as Admin/Manager/Barber**
2. **Browse shop** (their own shop)
3. **Select services**
4. **Click "Book Now"**

### Expected Result:
- ❌ Alert appears: "Staff Member"
- ❌ Message: "You are a shop staff member and cannot book appointments at your own shop."
- ❌ Does NOT navigate to booking screen
- ✅ Staff member stays on ShopDetailsScreen

---

## Test 4: Manager Views Pending Booking ✅

### Steps:
1. **Login as Manager/Admin**
2. **Navigate to HomeScreen**
3. **Click "Booking Management"** button
4. **Check "Pending" tab**

### Expected Result:
- ✅ Booking appears in list
- ✅ **Booking ID badge** at top with dashed border: "BK-20251019-XXXXXX"
- ✅ Customer name displayed
- ✅ Barber name displayed (or "Any Available")
- ✅ Services listed
- ✅ Date and time displayed
- ✅ Total amount shown
- ✅ **Status**: "PENDING" (orange badge)
- ✅ **Confirm button** (green)
- ✅ **Cancel button** (red)

---

## Test 5: Manager Confirms Booking (with ID Verification) ✅

### Steps:
1. **Click "Confirm" button** on pending booking
2. **Modal opens**

### Expected in Modal:
- ✅ Green checkmark icon
- ✅ Title: "Confirm Booking"
- ✅ Customer name shown
- ✅ **Booking ID displayed** prominently
- ✅ Input field: "Type booking ID to confirm:"
- ✅ Hint: "Customer should show you this ID at the shop"

3. **Type wrong booking ID** (e.g., "BK-12345-WRONG")
4. **Click "Confirm"**

### Expected Result:
- ❌ Alert: "Invalid Booking ID"
- ❌ Message: "The booking ID you entered does not match"
- ❌ Modal stays open

5. **Type correct booking ID** (copy from display)
6. **Click "Confirm"**

### Expected Result:
- ✅ Modal closes
- ✅ Success alert: "✅ Success - Booking confirmed successfully!"
- ✅ Booking moves from "Pending" to "Confirmed" tab
- ✅ Booking list refreshes

---

## Test 6: Customer Sees Confirmed Status ✅

### Steps:
1. **Login as Customer** (same one who booked)
2. **Open MyBookingScreen**
3. **Pull to refresh** (swipe down)
4. **Check booking**

### Expected Result:
- ✅ Booking ID still visible: "BK-20251019-XXXXXX"
- ✅ **Status changed**: "Confirmed ✅" (green badge)
- ✅ All other details remain same
- ✅ Still can **Reschedule**
- ✅ Still can **Cancel**

---

## Test 7: Manager Cancels Booking (with Reason) ❌

### Steps:
1. **Login as Manager**
2. **Open BookingManagementScreen**
3. **Go to "Confirmed" tab**
4. **Click "Cancel"** on a booking
5. **Modal opens**

### Expected in Modal:
- ✅ Red X icon
- ✅ Title: "Cancel Booking"
- ✅ Customer name shown
- ✅ Booking ID displayed
- ✅ **Textarea**: "Cancellation Reason: *"
- ✅ Hint: "Customer will be notified with this reason"

6. **Click "Cancel Booking"** WITHOUT typing reason

### Expected Result:
- ❌ Alert: "Reason Required"
- ❌ Message: "Please provide a reason for cancellation"
- ❌ Modal stays open

7. **Type reason**: "Emergency - shop closed for repairs"
8. **Click "Cancel Booking"**

### Expected Result:
- ✅ Modal closes
- ✅ Success alert: "✅ Success - Booking cancelled successfully!"
- ✅ Booking disappears from "Confirmed" tab
- ✅ Booking list refreshes

---

## Test 8: Customer Sees Cancellation Reason ✅

### Steps:
1. **Login as Customer**
2. **Open MyBookingScreen**
3. **Go to "Pass" tab** (past bookings)
4. **Find the cancelled booking**

### Expected Result:
- ✅ Booking appears in Pass tab
- ✅ Booking ID: "BK-20251019-XXXXXX"
- ✅ **Status**: "Cancelled ❌" (red badge)
- ✅ **Cancellation reason box appears**:
  ```
  ┌─────────────────────────────────────┐
  │ ⚠️ Cancellation Reason:              │
  │                                     │
  │ Emergency - shop closed for repairs │
  └─────────────────────────────────────┘
  ```
- ✅ Red left border on reason box
- ✅ Light red background
- ✅ Clear, readable text

---

## Test 9: Validate Operating Hours ❌

### Steps:
1. **Login as Customer**
2. **Navigate to BookingConfirmationScreen**
3. **Select tomorrow as date**
4. **Select time BEFORE opening** (e.g., if shop opens at 9 AM, select 8 AM)
5. **Click "Confirm Booking"**

### Expected Result:
- ❌ Alert: "Outside Operating Hours"
- ❌ Message: "The shop is not operating on this day/time"
- ❌ Booking NOT created

6. **Select time AFTER closing** (e.g., if shop closes at 6 PM, select 7 PM)
7. **Click "Confirm Booking"**

### Expected Result:
- ❌ Alert: "Outside Operating Hours"
- ❌ Booking NOT created

---

## Test 10: Validate Past Date ❌

### Steps:
1. **Login as Customer**
2. **Navigate to BookingConfirmationScreen**
3. **Try to select yesterday** (should be grayed out in picker)
4. **If somehow selected, click "Confirm Booking"**

### Expected Result:
- ❌ Alert: "Invalid Date"
- ❌ Message: "Please select a date in the future"
- ❌ Booking NOT created

---

## Test 11: Complete Booking ✅

### Steps:
1. **Login as Manager**
2. **Open BookingManagementScreen**
3. **Go to "Confirmed" tab**
4. **Click "Complete"** on a booking

### Expected Result:
- ✅ Booking moves to "Completed" tab
- ✅ Status: "COMPLETED" (green badge)
- ✅ No action buttons (read-only)
- ✅ Shows "Service Completed" with checkmark

---

## Test 12: Customer Rates Completed Booking ✅

### Steps:
1. **Login as Customer**
2. **Open MyBookingScreen**
3. **Go to "Pass" tab**
4. **Find completed booking**

### Expected Result:
- ✅ Status: "Completed ✅" (blue badge)
- ✅ **"Rate the Service" button** visible (red)
- ✅ Click button → Opens RateServiceScreen

---

## ✅ Success Criteria

All tests should pass with:
- ✅ No crashes
- ✅ No errors in console
- ✅ All buttons functional
- ✅ All validations working
- ✅ Status updates correctly
- ✅ Booking ID always visible
- ✅ Cancellation reasons display
- ✅ Staff booking blocked
- ✅ Manager ID verification works
- ✅ Reason required for cancellation

---

## 🐛 Common Issues & Solutions

### Issue 1: "Booking ID not showing"
**Solution**: Check database - ensure trigger is active:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_set_booking_id';
```

### Issue 2: "Can't confirm booking"
**Solution**: Check booking_id field in database - might be NULL
```sql
SELECT id, booking_id FROM bookings WHERE booking_id IS NULL;
```

### Issue 3: "Operating hours not validating"
**Solution**: Check shop.operating_days format (should be JSON array)
```sql
SELECT name, operating_days FROM shops;
```

### Issue 4: "Staff can book"
**Solution**: Check userRole in ShopDetailsScreen - ensure getUserRoleInShop works

### Issue 5: "Modal not appearing"
**Solution**: Check imports - ensure Modal, TextInput imported from react-native

---

## 📊 Expected Database State After Tests

```sql
-- Should have bookings with different statuses
SELECT 
  booking_id,
  status,
  is_confirmed_by_manager,
  cancellation_reason
FROM bookings
ORDER BY created_at DESC;
```

Expected results:
- Some with status = 'pending'
- Some with status = 'confirmed'
- Some with status = 'completed'
- Some with status = 'cancelled' (with cancellation_reason)

---

## 🎯 Final Checklist

- [ ] Customer can book appointment
- [ ] Booking ID generated automatically
- [ ] Booking shows in MyBookingScreen
- [ ] Status shows as "Unconfirmed"
- [ ] Manager sees in Pending tab
- [ ] Manager can confirm with ID verification
- [ ] Wrong ID is rejected
- [ ] Correct ID confirms booking
- [ ] Status updates to "Confirmed"
- [ ] Manager can cancel with reason
- [ ] Cancellation reason required
- [ ] Customer sees cancellation reason
- [ ] Staff members cannot book
- [ ] Staff blocking alert works
- [ ] Operating hours validated
- [ ] Past dates blocked
- [ ] Booking ID copyable
- [ ] All tabs work (Pending/Confirmed/Completed)
- [ ] Pull to refresh works
- [ ] Manager can complete booking
- [ ] Customer can rate completed booking

---

## 🚀 Ready for Production

If all tests pass, the booking system is **ready for production use**! 🎉
