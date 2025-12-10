# BOOKING SYSTEM - Complete Implementation

## 📋 Overview
Complete booking/appointment system allowing customers to book appointments with barbers, managers to confirm bookings, and tracking of upcoming and past appointments.

---

## 🗂️ Database Setup

### Run SQL Script
Execute in Supabase SQL Editor:
```bash
CREATE_BOOKINGS_TABLE.sql
```

### Table Structure: `bookings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (internal use) |
| `booking_id` | TEXT | **Unique human-readable ID** (e.g., BK-20251004-A7F3E9) |
| `customer_id` | UUID | References profiles(id) |
| `barber_id` | UUID | References profiles(id) |
| `services` | JSONB | Array of service objects |
| `appointment_date` | DATE | Date of appointment |
| `appointment_time` | TIME | Time slot |
| `total_amount` | DECIMAL | Total price |
| `status` | TEXT | pending/confirmed/completed/cancelled/no_show |
| `is_confirmed_by_manager` | BOOLEAN | Manager confirmation flag |
| `confirmed_by` | UUID | Manager who confirmed |
| `confirmed_at` | TIMESTAMP | When confirmed |
| `completed_by` | UUID | Manager who marked complete |
| `completed_at` | TIMESTAMP | When completed |
| `customer_notes` | TEXT | Customer's special requests |
| `barber_notes` | TEXT | Barber's notes |
| `cancellation_reason` | TEXT | Why cancelled |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Auto-updated |

### 💳 Booking ID System

**Format:** `BK-YYYYMMDD-XXXXXX`

**Example:** `BK-20251004-A7F3E9`

**Components:**
- `BK` - Booking prefix
- `YYYYMMDD` - Date of booking creation (e.g., 20251004 = Oct 4, 2025)
- `XXXXXX` - 6 random alphanumeric characters (uppercase)

**Features:**
- ✅ Auto-generated on booking creation
- ✅ Guaranteed unique (database constraint)
- ✅ Human-readable and easy to communicate
- ✅ Customer shows this at store visit (like McDonald's order ID)
- ✅ Manager searches by this ID to find appointment

### Services JSON Structure
```json
[
  {
    "id": "uuid",
    "name": "Haircut",
    "price": 15,
    "description": "Professional haircut"
  },
  {
    "id": "uuid",
    "name": "Shave",
    "price": 10,
    "description": "Clean shave"
  }
]
```

---

## 📊 Booking Status Flow

```
1. pending (default)
   ↓ Manager confirms
2. confirmed
   ↓ Service completed
3. completed (customer can rate)

Alternative paths:
- cancelled (customer/manager cancels)
- no_show (customer didn't attend)
```

### Status Tags in UI

#### **Upcoming Tab**
- `pending` → Tag: "**Unconfirmed**" (⚠️ orange)
- `confirmed` → Tag: "**Confirmed**" (✅ green)
- Show: Reschedule + Cancel buttons

#### **Past Tab**
- `completed` → Tag: "**Completed**" + Show "**Rate Service**" button
- `cancelled` → Tag: "**Cancelled**" + No rate button
- `no_show` → Tag: "**Passed**" + No rate button
- No reschedule/cancel buttons

---

## 💻 Backend Functions (auth.js)

### 1. **createBooking(bookingData)**
```javascript
const result = await createBooking({
  barberId: 'uuid',
  services: [{id, name, price, description}, ...],
  appointmentDate: '2025-10-15', // YYYY-MM-DD
  appointmentTime: '14:30', // HH:MM
  totalAmount: 25.00,
  customerNotes: 'Please be gentle'
});

// Response includes booking_id
if (result.success) {
  console.log('Booking ID:', result.data.booking_id);
  // Example: "BK-20251004-A7F3E9"
}
```
**Returns:** `{success: boolean, data: booking, error?: string}`

**Auto-sets:**
- `booking_id` - Unique human-readable ID (e.g., BK-20251004-A7F3E9)
- `customer_id` from current user
- `status: 'pending'`
- `is_confirmed_by_manager: false`

---

### 2. **fetchUserBookings(type)**
```javascript
const result = await fetchUserBookings('upcoming');
// or
const result = await fetchUserBookings('past');
```

**Returns:** Array of bookings with:
- Full customer details (name, email, phone)
- Full barber details (name, email, phone, profile_image, rating)
- All booking fields

**Filtering Logic:**
- **Upcoming:** `appointment_date >= today AND status IN ('pending', 'confirmed')`
- **Past:** `appointment_date < today OR status IN ('completed', 'cancelled', 'no_show')`

**User Role Filtering:**
- Customer: Only their bookings
- Barber: Only bookings with them
- Manager/Admin: All bookings

---

### 3. **updateBooking(bookingId, updates)**
```javascript
await updateBooking('booking-uuid', {
  appointment_date: '2025-10-20',
  appointment_time: '15:00'
});
```

---

### 4. **cancelBooking(bookingId, reason)**
```javascript
await cancelBooking('booking-uuid', 'Changed my mind');
```
**Updates:** `status = 'cancelled'`, sets `cancellation_reason`

---

### 5. **rescheduleBooking(bookingId, newDate, newTime)**
```javascript
await rescheduleBooking('booking-uuid', '2025-10-20', '15:00');
```
**Auto-resets:**
- `status = 'pending'`
- `is_confirmed_by_manager = false`
- Clears confirmation data

---

### 6. **confirmBooking(bookingId)** (Manager/Admin only)
```javascript
await confirmBooking('booking-uuid');
```
**Updates:**
- `is_confirmed_by_manager = true`
- `status = 'confirmed'`
- `confirmed_by = current_manager_id`
- `confirmed_at = NOW()`

---

### 7. **completeBooking(bookingId)** (Manager/Admin only)
```javascript
await completeBooking('booking-uuid');
```
**Updates:**
- `status = 'completed'`
- `completed_by = current_manager_id`
- `completed_at = NOW()`

---

### 8. **markNoShow(bookingId)** (Manager/Admin only)
```javascript
await markNoShow('booking-uuid');
```
**Updates:** `status = 'no_show'`

---

## 🎨 Frontend Implementation

### **BarberInfoScreen.jsx** - Updated

#### Import
```javascript
import { createBooking } from '../../../../lib/auth';
```

#### handleConfirmBooking (Updated)
```javascript
const handleConfirmBooking = async () => {
  // 1. Validate date/time selected
  if (!selectedDate || !selectedTime) {
    Alert.alert('Incomplete Selection', 'Please select both date and time.');
    return;
  }

  // 2. Prepare service objects for JSONB
  const selectedServiceDetails = services
    .filter(service => selectedServices.includes(service.id))
    .map(service => ({
      id: service.id,
      name: service.name,
      price: service.price,
      description: service.description || ''
    }));

  // 3. Format date and time
  const appointmentDate = selectedDate.date.toISOString().split('T')[0]; // YYYY-MM-DD
  const appointmentTime = selectedTime.value; // HH:MM

  // 4. Create booking data
  const bookingData = {
    barberId: barberData.id,
    services: selectedServiceDetails,
    appointmentDate: appointmentDate,
    appointmentTime: appointmentTime,
    totalAmount: calculateTotalPrice(),
    customerNotes: '', // Can add input field for notes
  };

  // 5. Call API
  const result = await createBooking(bookingData);

  // 6. Close modal
  setShowBookingModal(false);

  // 7. Show result with Booking ID
  if (result.success) {
    const bookingId = result.data?.booking_id || 'N/A';
    
    Alert.alert(
      'Booking Confirmed! 🎉',
      `Your appointment with ${barberData.name} has been scheduled for ${selectedDate.fullDate} at ${selectedTime.displayTime}.\n\n💳 Booking ID: ${bookingId}\n\nTotal: $${calculateTotalPrice()}\n\nStatus: Waiting for manager confirmation\n\nShow your Booking ID at the store!`,
      [
        { 
          text: 'View My Bookings', 
          onPress: () => navigation.navigate('MyBookingScreen'),
        },
        { text: 'OK' }
      ]
    );

    console.log('✅ Booking created with ID:', bookingId);

    // Reset selections
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedTime(null);
  } else {
    Alert.alert('Booking Failed', result.error);
  }
};
```

**Changes:**
- ✅ Calls `createBooking()` API
- ✅ Stores booking in database
- ✅ **Displays unique Booking ID in success message**
- ✅ **Reminds customer to show ID at store**
- ✅ Navigates to MyBookingScreen after success
- ✅ Resets form after booking
- ✅ Shows proper error handling

---

## 🎫 Booking ID Usage Flow

### Customer Experience
```
1. Book Appointment
   ↓
2. Receive Booking ID: "BK-20251004-A7F3E9"
   ↓
3. Save/Screenshot for reference
   ↓
4. On appointment day → Show ID at store
   ↓
5. Manager verifies and marks complete
```

### Manager Experience
```
1. Customer arrives and shows: "BK-20251004-A7F3E9"
   ↓
2. Search booking by ID in system
   ↓
3. Verify customer name and services
   ↓
4. Provide service
   ↓
5. Mark booking as "Completed"
   ↓
6. Customer can now rate the service
```

### UI Display Examples

#### **Success Alert (After Booking)**
```
🎉 Booking Confirmed!

Your appointment with John Doe has been scheduled for 
Friday, October 15, 2025 at 2:30 PM.

💳 Booking ID: BK-20251004-A7F3E9

Total: $25.00

Status: Waiting for manager confirmation

Show your Booking ID at the store!

[View My Bookings] [OK]
```

#### **Upcoming Bookings Card**
```
╔══════════════════════════════════╗
║ 💳 BK-20251004-A7F3E9    ✅ Confirmed  ║
╠══════════════════════════════════╣
║ Barber: John Doe                 ║
║ Date: Oct 15, 2025               ║
║ Time: 2:30 PM                    ║
║ Services: Haircut, Shave         ║
║ Total: $25.00                    ║
╠══════════════════════════════════╣
║ [Reschedule]     [Cancel]        ║
╚══════════════════════════════════╝
```

#### **Manager Search Interface**
```
╔══════════════════════════════════╗
║ 🔍 Search Booking                ║
╠══════════════════════════════════╣
║ Enter Booking ID:                ║
║ [BK-20251004-A7F3E9    ] [Search]║
╠══════════════════════════════════╣
║ ✅ Found: Customer Name          ║
║    Services: Haircut, Shave      ║
║    Time: 2:30 PM Today           ║
║                                  ║
║ [Mark as Completed] [No Show]    ║
╚══════════════════════════════════╝
```

---

## 📱 MyBookingScreen Integration

### Current Structure
```
MyBookingScreen.jsx
├── UpcomingTabScreen.jsx (needs update)
└── PassTabScreen.jsx (needs update)
```

### Next Steps for Tab Screens

#### **UpcomingTabScreen.jsx**
```javascript
import { fetchUserBookings, cancelBooking, rescheduleBooking } from '../../../../lib/auth';

useEffect(() => {
  const loadBookings = async () => {
    const result = await fetchUserBookings('upcoming');
    if (result.success) {
      setBookings(result.data);
    }
  };
  loadBookings();
}, []);

// Show tag based on is_confirmed_by_manager
<View style={styles.statusTag}>
  {booking.is_confirmed_by_manager ? (
    <Text style={styles.confirmedTag}>Confirmed ✅</Text>
  ) : (
    <Text style={styles.unconfirmedTag}>Unconfirmed ⚠️</Text>
  )}
</View>

// Reschedule button
<TouchableOpacity onPress={() => handleReschedule(booking.id)}>
  <Text>Reschedule</Text>
</TouchableOpacity>

// Cancel button
<TouchableOpacity onPress={() => handleCancel(booking.id)}>
  <Text>Cancel</Text>
</TouchableOpacity>
```

#### **PassTabScreen.jsx**
```javascript
import { fetchUserBookings } from '../../../../lib/auth';

useEffect(() => {
  const loadBookings = async () => {
    const result = await fetchUserBookings('past');
    if (result.success) {
      setBookings(result.data);
    }
  };
  loadBookings();
}, []);

// Show tag based on status
{booking.status === 'completed' && (
  <>
    <Text style={styles.completedTag}>Completed ✅</Text>
    <TouchableOpacity onPress={() => handleRateService(booking)}>
      <Text>Rate Service</Text>
    </TouchableOpacity>
  </>
)}

{booking.status === 'cancelled' && (
  <Text style={styles.cancelledTag}>Cancelled ❌</Text>
)}

{booking.status === 'no_show' && (
  <Text style={styles.passedTag}>Passed</Text>
)}
```

---

## 🔒 Security (RLS Policies)

### Read Access
- ✅ Customers: See their own bookings only
- ✅ Barbers: See bookings with them
- ✅ Managers/Admins: See all bookings

### Create Access
- ✅ Customers only (role check)

### Update Access
- ✅ Customers: Their own bookings (reschedule, cancel)
- ✅ Barbers: Their bookings (add notes)
- ✅ Managers/Admins: All bookings (confirm, complete, cancel)

### Delete Access
- ✅ Managers/Admins only

---

## 🧪 Testing Checklist

### Create Booking
- [ ] Run `CREATE_BOOKINGS_TABLE.sql` in Supabase
- [ ] Login as customer
- [ ] Select barber → Select services
- [ ] Choose date and time
- [ ] Click "Confirm Booking"
- [ ] Should see success alert **with Booking ID**
- [ ] Format should be: `BK-YYYYMMDD-XXXXXX`
- [ ] Check bookings table in Supabase
- [ ] Verify `booking_id` column populated

### Verify Booking ID
- [ ] Check database: `SELECT id, booking_id FROM bookings ORDER BY created_at DESC LIMIT 5;`
- [ ] Booking ID should be unique
- [ ] Format: BK-20251004-A7F3E9
- [ ] Try searching by booking_id: `SELECT * FROM bookings WHERE booking_id = 'BK-20251004-A7F3E9';`

### View Bookings
- [ ] Navigate to "My Bookings" tab
- [ ] Should see booking in "Upcoming" tab
- [ ] Status tag should show "Unconfirmed"
- [ ] Booking details correct (barber, services, date, time, price)

### Manager Confirm
- [ ] Login as manager/admin
- [ ] Go to Booking Management
- [ ] Confirm the booking
- [ ] Customer should see "Confirmed" tag

### Reschedule
- [ ] Click "Reschedule" on booking
- [ ] Select new date/time
- [ ] Booking should update
- [ ] Status should reset to "Unconfirmed"

### Cancel
- [ ] Click "Cancel" on booking
- [ ] Confirm cancellation
- [ ] Booking should move to Past tab
- [ ] Tag should show "Cancelled"

### Complete Booking
- [ ] Manager marks booking as "Completed"
- [ ] Booking moves to Past tab
- [ ] Tag shows "Completed"
- [ ] "Rate Service" button appears

---

## 📦 Files Created/Modified

### Created
- ✅ `CREATE_BOOKINGS_TABLE.sql` - Database schema
- ✅ `BOOKING_SYSTEM_COMPLETE.md` - This documentation

### Modified
- ✅ `src/lib/auth.js`
  - Added: `createBooking()`
  - Added: `fetchUserBookings()`
  - Added: `updateBooking()`
  - Added: `cancelBooking()`
  - Added: `rescheduleBooking()`
  - Added: `confirmBooking()`
  - Added: `completeBooking()`
  - Added: `markNoShow()`

- ✅ `src/presentation/main/bottomBar/home/BarberInfoScreen.jsx`
  - Updated: Import `createBooking`
  - Updated: `handleConfirmBooking()` - Now creates real booking
  - Updated: Alert messages with navigation
  - Updated: Form reset after booking

### To Be Modified (Next)
- ⏳ `src/presentation/main/bottomBar/bookings/tabScreens/UpcomingTabScreen.jsx`
- ⏳ `src/presentation/main/bottomBar/bookings/tabScreens/PassTabScreen.jsx`

---

## 🎯 Next Implementation Steps

1. **Update UpcomingTabScreen**
   - Replace mock data with `fetchUserBookings('upcoming')`
   - Add reschedule functionality
   - Add cancel functionality
   - Show proper status tags

2. **Update PassTabScreen**
   - Replace mock data with `fetchUserBookings('past')`
   - Show status-based tags
   - Conditionally show "Rate Service" button
   - Handle rating navigation

3. **Add Reschedule Modal**
   - Reuse calendar and time selection from BarberInfoScreen
   - Call `rescheduleBooking()` API
   - Refresh bookings list

4. **Add Cancel Confirmation**
   - Show Alert with reason input
   - Call `cancelBooking()` API
   - Move booking to Past tab

5. **Add Rating Flow**
   - Navigate to RateServiceScreen
   - Pass booking details
   - Use existing `createReview()` function
   - Link booking_id to review

---

## 📊 Database Queries Examples

### Get Customer's Upcoming Bookings
```sql
SELECT 
  b.*,
  bp.name as barber_name,
  bp.profile_image,
  bp.rating as barber_rating
FROM bookings b
JOIN profiles bp ON bp.id = b.barber_id
WHERE b.customer_id = 'CUSTOMER_UUID'
AND b.appointment_date >= CURRENT_DATE
AND b.status IN ('pending', 'confirmed')
ORDER BY b.appointment_date ASC;
```

### Get Barber's Appointments for Today
```sql
SELECT 
  b.*,
  cp.name as customer_name,
  cp.phone as customer_phone
FROM bookings b
JOIN profiles cp ON cp.id = b.customer_id
WHERE b.barber_id = 'BARBER_UUID'
AND b.appointment_date = CURRENT_DATE
AND b.status IN ('pending', 'confirmed')
ORDER BY b.appointment_time ASC;
```

### Manager View: Pending Confirmations
```sql
SELECT 
  b.*,
  cp.name as customer_name,
  bp.name as barber_name
FROM bookings b
JOIN profiles cp ON cp.id = b.customer_id
JOIN profiles bp ON bp.id = b.barber_id
WHERE b.is_confirmed_by_manager = FALSE
AND b.status = 'pending'
ORDER BY b.created_at DESC;
```

---

## 🚨 Important Notes

### Time Zones
- All times stored in database timezone
- Display times should be converted to user's local timezone
- Consider using libraries like `date-fns` or `moment-timezone`

### Booking Conflicts
- No automatic conflict detection yet
- Barber can have multiple bookings at same time
- **TODO:** Add conflict checking in createBooking()

### Notifications
- No push notifications yet
- **TODO:** Add email/SMS notifications for:
  * Booking confirmation
  * Manager approval
  * Upcoming appointment reminders

### Payment
- No payment integration yet
- `total_amount` stored for reference
- **TODO:** Integrate payment gateway (Stripe, PayPal)

---

**Status**: ✅ Database + API Complete, UI Integration In Progress
**Next**: Update UpcomingTabScreen and PassTabScreen with real data
