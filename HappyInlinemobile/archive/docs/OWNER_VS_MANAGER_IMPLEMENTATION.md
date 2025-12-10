# Owner vs Manager Role Implementation - Complete Guide

## Overview
We've successfully implemented a distinction between **OWNERS** and **MANAGERS** in the Happy Inline app. This ensures that business owners who register have different capabilities than managers who are added by owners.

---

## What Changed?

### Platform Roles (profiles.role)
Before, everyone who registered a business got `role = 'manager'`. Now:

- **OWNERS** (`role = 'owner'`): Business owners who register via BusinessRegistration
- **MANAGERS** (`role = 'manager'`): Staff members added by owners via AddManagerModal
- **CUSTOMERS** (`role = 'customer'`): Regular app users
- **BARBERS** (`role = 'barber'`): Barber staff (rare - usually customers who become barbers)
- **SUPER_ADMIN** (`role = 'super_admin'`): Platform administrators

### Shop Roles (shop_staff.role)
Within a shop, everyone still has shop-specific roles:

- **admin**: Full shop management (both owners and managers can have this)
- **manager**: Limited shop management
- **barber**: Service provider

---

## Owner vs Manager Capabilities

### OWNERS (role = 'owner')
**Can do:**
- ✅ Register a new business account
- ✅ Create new shops
- ✅ See "Create Your Shop" button when they have no shop
- ✅ Add managers to their shop
- ✅ Add barbers to their shop
- ✅ Edit shop details
- ✅ Delete their shop
- ✅ View all shop bookings and analytics

**See when no shop:**
```
┌─────────────────────────────────┐
│  🏪  Create Your Shop           │
│                                  │
│  Ready to grow your business?   │
│  Set up your shop profile now.  │
│                                  │
│      [Create Shop] Button        │
└─────────────────────────────────┘
```

### MANAGERS (role = 'manager')
**Can do:**
- ✅ Login to the app
- ✅ Access shops they're assigned to
- ✅ Add barbers to the shop (if they have admin role)
- ✅ Edit shop details (if they have admin role)
- ✅ View all shop bookings and analytics
- ✅ Manage services

**Cannot do:**
- ❌ Create new shops
- ❌ Delete shops
- ❌ Register new business accounts
- ❌ Access shops they're not assigned to

**See when no shop:**
```
┌─────────────────────────────────┐
│  ⚠️  Account Not Active          │
│                                  │
│  Your manager account is not    │
│  linked to any shop yet.        │
│  Please contact the shop owner  │
│  who created your account.      │
│                                  │
│  ℹ️ Managers cannot create shops │
└─────────────────────────────────┘
```

---

## Files Changed

### 1. [src/presentation/auth/BusinessRegistration.jsx](src/presentation/auth/BusinessRegistration.jsx)
**Change**: Line ~110 - Changed role from 'manager' to 'owner'
```javascript
// Before
role: 'manager'

// After
role: 'owner'  // Business owners get 'owner' role
```

### 2. [src/presentation/main/bottomBar/home/HomeScreen.jsx](src/presentation/main/bottomBar/home/HomeScreen.jsx)
**Change**: Line ~145 - Added 'owner' to role detection
```javascript
// Before
const isOwnerOrManager = profile.role === 'manager' || profile.role === 'admin';

// After
const isOwnerOrManager = profile.role === 'owner' || profile.role === 'manager' || profile.role === 'admin';
```

### 3. [src/presentation/main/bottomBar/home/ManagerDashboard.jsx](src/presentation/main/bottomBar/home/ManagerDashboard.jsx)
**Changes**:
- Added `userRole` state to track platform-level role
- Fetch profile role in `fetchDashboardData()`
- Show different empty states based on role:
  - **Owners**: "Create Your Shop" with create button
  - **Managers**: "Account Not Active" message

```javascript
// Lines ~35-40
const [userRole, setUserRole] = useState(null); // 'owner' or 'manager'

// Lines ~80-90
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

const profileRole = profile?.role || 'customer';
setUserRole(profileRole);

// Lines ~200-250 (conditional rendering)
if (hasShop === false) {
  if (userRole === 'owner') {
    // Show "Create Your Shop" button
  } else {
    // Show "Account Not Active" message
  }
}
```

### 4. [src/presentation/auth/OTPVerificationScreen.jsx](src/presentation/auth/OTPVerificationScreen.jsx)
**Change**: Line ~105 - Added 'owner' to role label display
```javascript
const roleLabel = result.profile.role === 'admin' || result.profile.role === 'super_admin' ? 'Admin' :
                 result.profile.role === 'owner' ? 'Owner' :
                 result.profile.role === 'manager' ? 'Manager' :
                 result.profile.role === 'barber' ? 'Barber' : '';
```

### 5. [src/presentation/shop/ShopReviewSubmission.jsx](src/presentation/shop/ShopReviewSubmission.jsx)
**Change**: Line ~55 - Updated manager count logic
```javascript
// Before
const managersCount = staffRes.data?.filter(s => s.role === 'manager').length || 0;

// After
const managersCount = staffRes.data?.filter(s => s.role === 'manager' || s.role === 'admin').length || 0;
```

### 6. [src/presentation/main/bottomBar/home/ShopDetailsScreen.jsx](src/presentation/main/bottomBar/home/ShopDetailsScreen.jsx)
**Change**: Line ~89 - Added comment for clarity
```javascript
// Managers are those with 'admin' role in shop_staff (includes both owners and managers)
const managersData = staffData.filter(s => s.role === 'admin' || s.role === 'manager');
```

### 7. [src/presentation/main/bottomBar/home/StaffManagementScreen.jsx](src/presentation/main/bottomBar/home/StaffManagementScreen.jsx)
**Change**: Line ~51 - Added comment for clarity
```javascript
// Managers are those with 'admin' role in shop_staff (both owners and managers have this role)
const managersData = staffData.filter(s => s.role === 'admin' || s.role === 'manager');
```

### 8. [src/presentation/main/bottomBar/profile/ProfileScreen.jsx](src/presentation/main/bottomBar/profile/ProfileScreen.jsx)
**Already updated** - Handles 'owner' role for logout navigation
```javascript
if (profileRole === 'manager' || profileRole === 'admin' || profileRole === 'owner') {
  targetScreen = 'BusinessLoginScreen';
}
```

---

## SQL Scripts

### ⚠️ IMPORTANT: Database Constraint Fix Required!

Before updating any users to 'owner' role, you **MUST** fix the database constraint first.

**File**: [FIX_PROFILES_ROLE_CONSTRAINT.sql](FIX_PROFILES_ROLE_CONSTRAINT.sql)

The `profiles` table has a check constraint that only allows specific roles. We need to add 'owner' to the list:

```sql
-- Drop the old constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint that includes 'owner'
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('customer', 'barber', 'manager', 'owner', 'admin', 'super_admin'));
```

### For the Specific User
**File**: [UPDATE_SPECIFIC_USER_TO_OWNER.sql](UPDATE_SPECIFIC_USER_TO_OWNER.sql)

**⚠️ Run FIX_PROFILES_ROLE_CONSTRAINT.sql first!**

This updates `yomek19737@hh7f.com` to owner role:

```sql
-- Update the profile to 'owner' role
UPDATE profiles
SET role = 'owner',
    updated_at = NOW()
WHERE email = 'yomek19737@hh7f.com';
```

**OR** use the complete script from [QUICK_FIX_YOUR_ACCOUNT.md](QUICK_FIX_YOUR_ACCOUNT.md) which includes the constraint fix.

### For All Existing Business Owners
**File**: [UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql](UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql)

This updates ALL existing business owners from 'manager' to 'owner':

```sql
UPDATE profiles
SET role = 'owner'
WHERE role = 'manager'
  AND id IN (
    -- Get users who are shop owners (have a shop where they're admin)
    SELECT DISTINCT ss.user_id
    FROM shop_staff ss
    JOIN shops s ON s.id = ss.shop_id
    WHERE ss.role = 'admin'
      AND s.manager_id = ss.user_id
  );
```

---

## How to Update Your Database

### 🚀 Quick Start (Recommended)
**Use this guide**: [QUICK_FIX_YOUR_ACCOUNT.md](QUICK_FIX_YOUR_ACCOUNT.md)

This includes everything you need in one SQL script:
- ✅ Fixes the database constraint
- ✅ Updates your account to 'owner'
- ✅ Verifies the changes
- ✅ Step-by-step instructions

### Option 1: Update Just Your Account
1. Go to Supabase dashboard
2. Click "SQL Editor"
3. Copy ALL the SQL from [QUICK_FIX_YOUR_ACCOUNT.md](QUICK_FIX_YOUR_ACCOUNT.md)
4. Paste and click "Run"
5. Verify the results show `role = 'owner'`

### Option 2: Update All Existing Owners
1. Go to Supabase dashboard
2. Click "SQL Editor"
3. Open [UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql](UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql)
4. Copy and paste the SQL (includes constraint fix)
5. Click "Run"
6. Check the "Check the results" query to verify

---

## Testing Steps

### Test 1: New Business Registration
1. Register a new business account
2. Complete all registration steps
3. Login with the new account
4. **Expected**: See "Create Your Shop" button (NOT "Account Not Active")

**Database check**:
```sql
SELECT email, role
FROM profiles
WHERE email = 'your-new-email@test.com';
-- Should show: role = 'owner'
```

### Test 2: Existing Owner Account
1. Run UPDATE_SPECIFIC_USER_TO_OWNER.sql
2. Logout and login again
3. **Expected**: If you have shops, see Manager Dashboard
4. **Expected**: If you have NO shops, see "Create Your Shop" button

### Test 3: Create New Manager
1. Login as owner
2. Navigate to Staff Management
3. Click "Add Manager"
4. Fill in manager details
5. Create manager account
6. **Expected**: Manager created with role = 'manager'

**Database check**:
```sql
SELECT email, role
FROM profiles
WHERE email = 'new-manager@test.com';
-- Should show: role = 'manager'
```

### Test 4: Manager Login (No Shop)
1. Create a manager account via AddManagerModal
2. Remove them from shop_staff (for testing)
3. Login as that manager
4. **Expected**: See "Account Not Active" message (NOT "Create Your Shop")

### Test 5: Manager Login (With Shop)
1. Create a manager account
2. Keep them in shop_staff
3. Login as that manager
4. **Expected**: See Manager Dashboard with shop details

---

## Role Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Registration Paths                   │
└─────────────────────────────────────────────────────────────┘

Path 1: Business Owner Registration
┌─────────────────┐
│ WelcomeScreen   │
└────────┬────────┘
         │ Click "I'm a Business Owner"
         ▼
┌─────────────────────┐
│ BusinessLogin       │
│ (or Registration)   │
└──────────┬──────────┘
           │ Click "Register Your Business"
           ▼
┌──────────────────────┐
│ BusinessRegistration │
│ (3 steps)            │
└──────────┬───────────┘
           │ Complete registration
           │ role = 'owner' ✅
           ▼
┌────────────────────────┐
│ RegistrationSuccess    │
│ "Sign In to Continue"  │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ BusinessLogin          │
│ Enter email/password   │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐     ┌─────────────────┐
│ HomeScreen             │────>│ ManagerDashboard│
│ (checks role = owner)  │     │ (hasShop check) │
└────────────────────────┘     └────────┬────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       │                                  │
                 hasShop = true                    hasShop = false
                       │                                  │
                       ▼                                  ▼
           ┌────────────────────┐          ┌──────────────────────┐
           │ Show Shop Details  │          │ "Create Your Shop"   │
           │ Dashboard          │          │ [Create Shop Button] │
           └────────────────────┘          └──────────────────────┘


Path 2: Manager Account (Created by Owner)
┌──────────────────────┐
│ Owner in Dashboard   │
└──────────┬───────────┘
           │ Staff Management → Add Manager
           ▼
┌──────────────────────┐
│ AddManagerModal      │
│ (Create New tab)     │
└──────────┬───────────┘
           │ Enter email, name, password
           │ Create account
           │ role = 'manager' ✅
           │ shop_staff.role = 'admin'
           ▼
┌────────────────────────┐
│ Manager account ready  │
│ Email sent (optional)  │
└────────────────────────┘

Manager Login:
┌────────────────────────┐
│ BusinessLogin          │
│ (manager credentials)  │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐     ┌─────────────────┐
│ HomeScreen             │────>│ ManagerDashboard│
│ (checks role=manager)  │     │ (hasShop check) │
└────────────────────────┘     └────────┬────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       │                                  │
                 hasShop = true                    hasShop = false
                       │                                  │
                       ▼                                  ▼
           ┌────────────────────┐          ┌──────────────────────┐
           │ Show Shop Details  │          │ "Account Not Active" │
           │ Dashboard          │          │ Contact shop owner   │
           └────────────────────┘          └──────────────────────┘
```

---

## Common Questions

### Q: What if I already have shops with role='manager'?
**A**: Run [UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql](UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql) to update all business owners to 'owner' role.

### Q: Will my existing shops still work?
**A**: Yes! Shop ownership is determined by `shops.manager_id` and `shop_staff.role = 'admin'`. The profile role is just for UI logic.

### Q: Can managers create shops now?
**A**: No. Only users with `role = 'owner'` can create shops. Managers with no shop see "Account Not Active".

### Q: What happens to managers already added to shops?
**A**: They continue working normally. They still have `role = 'admin'` in shop_staff and can manage the shop.

### Q: Can I change a manager to an owner?
**A**: Yes, but manually via SQL. It's not recommended. Instead, have them register a new business account.

### Q: What about barbers?
**A**: Barbers are added as `role = 'barber'` in shop_staff. Their profile role is usually 'customer' (since they're regular users who work at shops).

---

## Summary of Changes

✅ **Business registration** now creates `role = 'owner'` instead of `role = 'manager'`
✅ **HomeScreen** detects 'owner' role and shows Manager Dashboard
✅ **ManagerDashboard** shows different empty states for owners vs managers
✅ **Owners** can create shops when they have none
✅ **Managers** see "Account Not Active" when they have no shop
✅ **All files** updated to handle 'owner' role correctly
✅ **SQL scripts** ready to update existing users
✅ **OTP verification** shows "Owner" label for owners

---

## Next Steps

1. **Update your database** - Run UPDATE_SPECIFIC_USER_TO_OWNER.sql for your account
2. **Test the flow**:
   - Logout and login as owner
   - Verify you see "Create Your Shop" if no shops
   - Create a manager account
   - Login as manager (no shop) → Should see "Account Not Active"
3. **Deploy changes** - The code changes are already in place
4. **Monitor** - Check that new registrations get 'owner' role

---

## Files Reference

All changes are in:
- [src/presentation/auth/BusinessRegistration.jsx](src/presentation/auth/BusinessRegistration.jsx)
- [src/presentation/main/bottomBar/home/HomeScreen.jsx](src/presentation/main/bottomBar/home/HomeScreen.jsx)
- [src/presentation/main/bottomBar/home/ManagerDashboard.jsx](src/presentation/main/bottomBar/home/ManagerDashboard.jsx)
- [src/presentation/auth/OTPVerificationScreen.jsx](src/presentation/auth/OTPVerificationScreen.jsx)
- [src/presentation/shop/ShopReviewSubmission.jsx](src/presentation/shop/ShopReviewSubmission.jsx)
- [src/presentation/main/bottomBar/home/ShopDetailsScreen.jsx](src/presentation/main/bottomBar/home/ShopDetailsScreen.jsx)
- [src/presentation/main/bottomBar/home/StaffManagementScreen.jsx](src/presentation/main/bottomBar/home/StaffManagementScreen.jsx)
- [UPDATE_SPECIFIC_USER_TO_OWNER.sql](UPDATE_SPECIFIC_USER_TO_OWNER.sql) ← **Run this for your account**
- [UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql](UPDATE_EXISTING_OWNERS_TO_OWNER_ROLE.sql)

**Status**: ✅ **COMPLETE AND READY FOR TESTING**
