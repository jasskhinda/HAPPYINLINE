# Bookings Database Structure & Flow

## What We Store in Database

### Bookings Table Structure:

```javascript
{
  // Unique Identifiers
  id: "c47954bc-f99c-4f22-bbd7-3ae0b3c01c86",  // UUID (system)
  booking_id: "BK-20251007-A7F3E9",             // Human-readable ID (customer shows at store)
  
  // References
  customer_id: "6f2ac885-f6fc-4961-b827-daf409...",  // UUID of customer
  barber_id: "7e4bf470-d369-44db-8dab-df620...",     // UUID of barber
  
  // Booking Details
  services: [                                    // JSONB array
    {
      id: "service-uuid",
      name: "Haircut",
      price: 15,
      description: "Professional haircut"
    },
    {
      id: "service-uuid-2",
      name: "Shave",
      price: 10,
      description: "Clean shave"
    }
  ],
  appointment_date: "2025-10-07",               // DATE format
  appointment_time: "14:30:00",                 // TIME format (24-hour)
  total_amount: 25.00,                          // DECIMAL(10,2)
  
  // Status Management
  status: "pending",                            // 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  is_confirmed_by_manager: false,               // Boolean
  confirmed_by: null,                           // UUID of manager who confirmed (nullable)
  confirmed_at: null,                           // Timestamp (nullable)
  completed_by: null,                           // UUID of manager who completed (nullable)
  completed_at: null,                           // Timestamp (nullable)
  
  // Notes
  customer_notes: "Please use scissors, not clippers",  // TEXT (nullable)
  barber_notes: null,                           // TEXT (nullable)
  cancellation_reason: null,                    // TEXT (nullable)
  
  // Timestamps
  created_at: "2025-10-05T10:30:00.000Z",
  updated_at: "2025-10-05T10:30:00.000Z"
}
```

---

## How Managers/Admins See ALL Bookings

### Current Problem:

```
Customer logs in → Can see their bookings ✅
Manager logs in → Cannot see any bookings ❌
```

### Why This Happens:

```sql
-- Current RLS Policy (BROKEN)
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()  ← ID MISMATCH!
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);
```

When manager logs in:
1. Supabase sets `auth.uid()` = `"abc123..."` (from auth.users table)
2. Manager's profile has `id` = `"xyz789..."` (different UUID)
3. RLS policy checks: `"xyz789..." = "abc123..."` → FALSE ❌
4. Query blocked, returns 0 bookings

### Fixed RLS Policy:

```sql
-- Fixed RLS Policy (WORKS)
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )  ← EMAIL LOOKUP (RELIABLE)
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);
```

When manager logs in:
1. Supabase sets `auth.uid()` = `"abc123..."`
2. Policy finds email from auth.users: `"manager@test.com"`
3. Policy finds profile by email: `profiles.email = "manager@test.com"`
4. Policy checks role: `profiles.role = "manager"` → TRUE ✅
5. Query allowed, returns ALL bookings

---

## How BookingManagementScreen Works

### Query Flow:

```javascript
// 1. User opens BookingManagementScreen
BookingManagementScreen.jsx
↓
useEffect(() => { loadBookings() })
↓

// 2. Call backend function
loadBookings()
↓
const result = await fetchAllBookingsForManagers()
↓

// 3. Backend checks authorization
auth.js: fetchAllBookingsForManagers()
↓
const { user, profile } = await getCurrentUser()
if (!['manager', 'admin', 'super_admin'].includes(profile.role)) {
  throw new Error('Only managers/admins can view all bookings')
}
↓

// 4. Query Supabase with JOINs
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    customer:profiles!bookings_customer_id_fkey(id, name, email, phone),
    barber:profiles!bookings_barber_id_fkey(id, name, email, phone, profile_image)
  `)
  .order('appointment_date', { ascending: true })
  .order('appointment_time', { ascending: true })
↓

// 5. RLS Policy Runs (on Supabase server)
// Checks if current user (auth.uid()) is a manager/admin
// If YES → Returns all bookings
// If NO → Returns empty array
↓

// 6. Group bookings by status
{
  pending: [booking1, booking2],      // status = 'pending'
  confirmed: [booking3],              // status = 'confirmed'
  completed: [booking4, booking5]     // status = 'completed'
}
↓

// 7. Return to UI
setBookings(result.data)
↓

// 8. Display in tabs
Pending Tab → Shows booking1, booking2
Confirmed Tab → Shows booking3
Completed Tab → Shows booking4, booking5
```

---

## HomeScreen Urgent Notifications

### Query Flow:

```javascript
// 1. Manager logs in → HomeScreen loads
HomeScreen.jsx
↓
useEffect(() => { fetchData() })
↓

// 2. Detect user role
const { profile } = await getCurrentUser()
if (profile.role === 'manager') {
  await fetchPendingAppointments()
}
↓

// 3. Fetch all bookings
const result = await fetchAllBookingsForManagers()
↓

// 4. Extract ONLY pending bookings
const pending = result.data.pending || []
↓

// 5. Calculate urgency for each booking
pending.map(booking => {
  const appointmentDateTime = new Date(
    `${booking.appointment_date}T${booking.appointment_time}`
  )
  const now = new Date()
  const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60)
  
  let urgency = 'low'
  if (hoursUntil < 2) urgency = 'high'       // RED BANNER 🚨
  else if (hoursUntil < 6) urgency = 'medium' // ORANGE BANNER ⚠️
  
  return { ...booking, urgency, hoursUntil }
})
↓

// 6. Sort by urgency
urgentAppointments.sort((a, b) => a.hoursUntil - b.hoursUntil)
↓

// 7. Show UI
if (urgentAppointments.length > 0) {
  // Show RED BANNER with first urgent appointment
  🚨 Urgent Appointment Request!
  John Doe - Haircut
  2:30 PM Today
  ID: BK-20251007-A7F3E9
}

// Show pending summary
⏰ 2 pending appointments waiting for approval
```

---

## Manager Actions

### 1. Confirm Booking:

```javascript
// Manager taps "Confirm" button
handleConfirmBooking(booking)
↓
Alert.alert('Confirm appointment for John Doe?')
↓
const result = await confirmBooking(booking.id)
↓

// Backend function
confirmBooking(bookingId)
↓
await supabase
  .from('bookings')
  .update({
    status: 'confirmed',
    is_confirmed_by_manager: true,
    confirmed_by: profile.id,        // Manager's UUID
    confirmed_at: new Date()
  })
  .eq('id', bookingId)
↓

// Database trigger auto-updates updated_at
↓

// Refresh UI
await loadBookings()
↓

// Booking moves from "Pending" tab to "Confirmed" tab
```

### 2. Complete Booking:

```javascript
// Customer shows booking ID at store: BK-20251007-A7F3E9
// Manager verifies customer identity
// Manager taps "Complete" button
handleCompleteBooking(booking)
↓
Alert.alert('Mark John Doe's appointment as completed?')
↓
const result = await completeBooking(booking.id)
↓

// Backend function
completeBooking(bookingId)
↓
await supabase
  .from('bookings')
  .update({
    status: 'completed',
    completed_by: profile.id,        // Manager's UUID
    completed_at: new Date()
  })
  .eq('id', bookingId)
↓

// Booking moves to "Completed" tab
// Customer can now rate the service
```

### 3. Cancel Booking:

```javascript
// Manager taps "Cancel" button
handleCancelBooking(booking)
↓
Alert.alert('Cancel John Doe's appointment?')
↓
const result = await cancelBooking(booking.id, 'Cancelled by manager')
↓

// Backend function
cancelBooking(bookingId, reason)
↓
await supabase
  .from('bookings')
  .update({
    status: 'cancelled',
    cancellation_reason: reason
  })
  .eq('id', bookingId)
↓

// Booking removed from UI (status = 'cancelled' not shown in tabs)
```

---

## Who Can See What?

### Customer (role = 'customer'):
```javascript
// Can see:
- ✅ Their own bookings only (customer_id = auth.uid())
- ✅ Upcoming bookings (appointment_date >= today)
- ✅ Past bookings (appointment_date < today OR status = 'completed')
- ✅ Can reschedule their own bookings
- ✅ Can cancel their own bookings
- ✅ Can rate completed bookings

// Cannot see:
- ❌ Other customers' bookings
- ❌ All pending bookings (manager view)
- ❌ Urgent notifications
- ❌ Booking Management screen
```

**RLS Policy:**
```sql
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = customer_id);
```

### Barber (role = 'barber'):
```javascript
// Can see:
- ✅ Their own assigned bookings (barber_id = auth.uid())
- ✅ Can add barber notes
- ✅ Can view customer details for their bookings

// Cannot see:
- ❌ Other barbers' bookings
- ❌ All pending bookings (manager view)
- ❌ Urgent notifications
- ❌ Booking Management screen
- ❌ Cannot confirm/complete bookings (only managers)
```

**RLS Policy:**
```sql
CREATE POLICY "Barbers can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = barber_id);
```

### Manager/Admin/Super Admin:
```javascript
// Can see:
- ✅ ALL bookings (every customer, every barber)
- ✅ Urgent notifications on HomeScreen
- ✅ Booking Management screen with 3 tabs
- ✅ Can confirm bookings
- ✅ Can complete bookings
- ✅ Can cancel bookings
- ✅ Can delete bookings
- ✅ Can add manager notes

// Special access:
- ✅ View customer contact info (phone, email)
- ✅ View barber assignments
- ✅ Track confirmation/completion history
```

**RLS Policy (FIXED):**
```sql
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

---

## Data Flow Summary

### Customer Creates Booking:
```
Customer selects barber + services + date/time
↓
createBooking({ barberId, services, date, time, amount })
↓
INSERT into bookings (status = 'pending', is_confirmed_by_manager = false)
↓
Database trigger generates booking_id = "BK-20251007-A7F3E9"
↓
Customer sees: "Booking confirmed! ID: BK-20251007-A7F3E9"
```

### Manager Sees and Confirms:
```
Manager logs in
↓
HomeScreen calls fetchPendingAppointments()
↓
RLS policy checks: Is user a manager? (by email) → YES ✅
↓
Query returns all pending bookings
↓
HomeScreen shows: 🚨 Urgent notification + Pending summary
↓
Manager taps "Booking Management"
↓
BookingManagementScreen shows all bookings in tabs
↓
Manager taps "Confirm" on pending booking
↓
UPDATE bookings SET status = 'confirmed', is_confirmed_by_manager = true
↓
Booking moves to "Confirmed" tab
```

### Customer Shows Up at Store:
```
Customer arrives at barbershop
↓
Customer shows booking ID: "BK-20251007-A7F3E9"
↓
Manager searches by booking ID
↓
Manager verifies customer identity
↓
Barber completes service
↓
Manager taps "Complete" button
↓
UPDATE bookings SET status = 'completed', completed_at = NOW()
↓
Customer receives notification: "Rate your experience!"
```

---

## The Fix (Recap)

**Run this SQL file:** `FIX_MANAGER_RLS_BOOKINGS.sql`

**What it does:**
- Updates 3 RLS policies for managers/admins
- Changes from ID matching to email matching
- Makes manager access work reliably

**After fix:**
- ✅ Managers can see all 2 bookings in your database
- ✅ Urgent notifications appear on HomeScreen
- ✅ BookingManagementScreen shows all bookings
- ✅ Managers can confirm, complete, cancel bookings
- ✅ System works as designed

**Test it:**
1. Run the SQL fix in Supabase
2. Restart your app
3. Log in as manager
4. Check HomeScreen for urgent notifications
5. Open BookingManagementScreen
6. You should see your 2 bookings!
