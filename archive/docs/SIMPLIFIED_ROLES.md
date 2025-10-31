# 🎯 Simplified Role Structure (Squire/Booksy Model)

## Platform Roles

### 1. **Super Admin** (You - Platform Owner)
**Email:** info@jasskhinda.com

**What they do:**
- ✅ Review and approve new shop registrations
- ✅ Suspend/delete shops
- ✅ View all shops, bookings, users across platform
- ✅ Message shop managers
- ✅ Handle disputes
- ✅ Platform analytics

---

### 2. **Shop Manager** (Shop Owner)
**How they join:** Self-register on the platform

**What they do:**
- ✅ Register their shop (fills out all details)
- ✅ Manage shop settings (hours, photos, info)
- ✅ Add/remove barbers (staff)
- ✅ Create/edit services and pricing
- ✅ View all shop bookings
- ✅ Confirm/cancel bookings
- ✅ View shop revenue and analytics
- ✅ Respond to customer messages
- ✅ Respond to reviews

**Registration Flow:**
```
1. Sign up with email (OTP verification)
2. Click "Register My Business"
3. Fill shop details (name, address, photos, hours)
4. Submit for approval
5. Status: "Pending Approval"
6. Wait for super admin approval
7. Once approved → Shop goes live
8. Start adding staff and services
9. Accept bookings
```

---

### 3. **Barber** (Staff Member)
**How they join:** Added by shop manager

**What they do:**
- ✅ View their own appointment schedule
- ✅ See customer details for appointments
- ✅ Mark appointments as complete
- ✅ Update their profile and bio
- ✅ Set availability/time off
- ✅ View their reviews

**How they're added:**
```
1. Shop manager goes to "Staff Management"
2. Enters barber's email and name
3. Assigns services the barber can perform
4. Barber can login with email OTP
5. Barber sees their schedule
```

---

### 4. **Customer**
**How they join:** Self-register

**What they do:**
- ✅ Browse shops (nearby, top-rated, search)
- ✅ View shop details and reviews
- ✅ Book appointments
- ✅ View/cancel/reschedule bookings
- ✅ Leave reviews after appointments
- ✅ Message shops
- ✅ Save favorite shops/barbers

---

## Database Structure

### Profiles Table
```sql
profiles:
├── id (UUID)
├── email
├── name
├── role ('customer', 'super_admin') -- No more shop-level admin!
├── is_super_admin (boolean)
├── profile_picture_url
└── created_at
```

### Shop Staff Table (Links Users to Shops)
```sql
shop_staff:
├── shop_id (which shop)
├── user_id (which user)
├── role ('manager', 'barber') -- Only 2 roles!
├── is_active (can deactivate)
└── created_at
```

**Rules:**
- Super admin is NEVER in shop_staff (they oversee platform, not manage shops)
- One user can be "manager" of Shop A and "barber" at Shop B
- Managers have full control over their shop
- Barbers only see their schedule

---

## Messaging System

### Super Admin → Shop Manager
```
Use case: Super admin needs to contact shop about policy violation

Flow:
1. Super admin views shop details
2. Clicks "Message Manager"
3. Sends message through in-app messaging
4. Shop manager receives notification
5. Manager can reply
```

### Customer → Shop
```
Use case: Customer has questions before booking

Flow:
1. Customer viewing shop details
2. Clicks "Message Shop"
3. Sends message
4. Shop manager receives it
5. Manager replies
```

### Shop → Customer
```
Use case: Booking confirmation, reminders

Flow:
1. Automated: Booking confirmed
2. Automated: Reminder 24h before
3. Manual: Manager can message customer about their booking
```

---

## What Changed from Old Structure

### ❌ REMOVED:
- Shop-level "admin" role (confusing and unnecessary)
- Super admin being in shop_staff table
- Multiple admin levels per shop

### ✅ KEPT/SIMPLIFIED:
- **Manager** - one role to manage entire shop (was "admin")
- **Barber** - staff who work there
- **Super Admin** - platform oversight only
- **Customer** - books appointments

---

## Next Implementation Steps

1. **Remove "admin" role from shop_staff** - only keep "manager" and "barber"
2. **Add messaging system:**
   - Create `messages` table
   - Create `conversations` table
   - Add ChatScreen navigation for super admin
3. **Update all UI:**
   - Change "Admin" labels to "Manager"
   - Update role checks in code
4. **Shop approval workflow:**
   - Add status field to shops
   - Pending approval screen for super admin

---

## How This Matches Squire/Booksy

✅ **Squire:**
- Shop owners register themselves
- One "owner" manages everything
- Staff (barbers) added by owner
- Platform admins oversee all shops

✅ **Booksy:**
- Self-service shop registration
- Shop "admin" (we call manager) runs the shop
- Staff work there
- Platform support team handles issues

✅ **Your App:**
- Shop managers register shops
- Managers manage everything
- Barbers work there
- Super admin oversees platform

**Perfect match!** ✨
