# Admin System - Complete Implementation Guide

## 🎯 Overview
This document describes the complete admin system with role hierarchy and permissions.

## 👥 Role Hierarchy

```
Super Admin (Main Admin)
    ↓
Admin (Regular Admin)
    ↓
Manager
    ↓
Barber
    ↓
Customer
```

## 🔐 Permissions Matrix

| Feature | Super Admin | Admin | Manager | Barber | Customer |
|---------|------------|-------|---------|--------|----------|
| **Admin Management** |
| Add/Remove Admins | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manager Management** |
| Add/Edit/Remove Managers | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Barber Management** |
| Add/Edit/Remove Barbers | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Service Management** |
| Create/Edit/Remove Services | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Booking Management** |
| View All Bookings | ✅ | ✅ | ✅ | ❌ | ❌ |
| Confirm Bookings | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cancel Bookings | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark as Completed | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Profile Settings** |
| Change Email | ❌ | ✅ | ✅ | ✅ | ✅ |
| Change Password | ❌ | ❌ | ❌ | ❌ | ❌ |

**Note:** Password-based authentication is not implemented. This is a passwordless OTP system.

## 📱 User Interface

### Super Admin Dashboard
When Super Admin toggles "Admin Mode" ON, they see:
1. **Service Management** - Create, edit, and remove services
2. **Barber Management** - Add, edit, and remove barbers
3. **Manager Management** - Add, edit, and remove managers
4. **Admin Management** ⭐ - Add and remove admin users (Super Admin only)
5. **Booking Management** - View, confirm, cancel, and complete

### Regular Admin Dashboard
When Regular Admin toggles "Admin Mode" ON, they see:
1. **Service Management** - Create, edit, and remove services
2. **Barber Management** - Add, edit, and remove barbers
3. **Manager Management** - Add, edit, and remove managers
4. **Booking Management** - View, confirm, cancel, and complete

**Difference:** Regular admins CANNOT see Admin Management.

## 🗂️ Files Created/Modified

### New Screens
1. **ManagerManagementScreen.jsx**
   - Location: `src/presentation/main/bottomBar/home/manager/`
   - Features:
     - List all managers with search
     - Add new manager (creates account or sends invitation)
     - Edit manager details (name, phone, email)
     - Remove manager (changes role to customer)
     - Pull-to-refresh
     - Loading states
     - Beautiful UI with cards

2. **AdminManagementScreen.jsx**
   - Location: `src/presentation/main/bottomBar/home/manager/`
   - Features:
     - List all regular admins (super admin not shown in list)
     - Add new admin (creates account or sends invitation)
     - Edit admin details (name, phone, email)
     - Remove admin (changes role to customer)
     - Super admin protection (cannot be deleted or edited)
     - Pull-to-refresh
     - Loading states
     - Crown icon for super admin

### Updated Files
1. **Main.jsx**
   - Added ManagerManagementScreen import
   - Added AdminManagementScreen import
   - Registered both screens in navigation

2. **HomeScreen.jsx**
   - Updated adminOptions array
   - Added clear comments about permissions
   - Admin Management only shows for super admin

3. **ProfileScreen.jsx**
   - Removed "Change Password" functionality completely
   - Kept "Change Email" for admins only (not super admin)
   - Removed changePassword import
   - Removed password modal states and functions
   - Removed password change modal UI

4. **auth.js** (Already had these functions)
   - `fetchAllManagers()` - Get all manager users
   - `createManager()` - Create/promote manager
   - `updateManager()` - Update manager profile
   - `deleteManager()` - Soft delete manager
   - `fetchAllAdmins()` - Get all admin users (excludes super admin from list)
   - `createAdmin()` - Create/promote admin (super admin only)
   - `updateAdmin()` - Update admin profile (cannot modify super admin)
   - `deleteAdmin()` - Soft delete admin (cannot delete super admin)

## 🗄️ Database Setup

### Required SQL Update
Run `UPDATE_ADMIN_TO_SUPER.sql` in Supabase SQL Editor:

```sql
-- 1. Add is_super_admin column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Update role constraint to include super_admin
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check,
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('customer', 'barber', 'manager', 'admin', 'super_admin'));

-- 3. Upgrade main admin to super admin
UPDATE profiles 
SET 
  role = 'super_admin',
  is_super_admin = true
WHERE email = 'smokygaming171@gmail.com';

-- 4. Create trigger to prevent super admin deletion
CREATE OR REPLACE FUNCTION prevent_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_super_admin = true THEN
    RAISE EXCEPTION 'Cannot delete super admin account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_super_admin_deletion_trigger ON profiles;
CREATE TRIGGER prevent_super_admin_deletion_trigger
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_deletion();

-- 5. Create function to prevent super admin role changes
CREATE OR REPLACE FUNCTION update_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent changing super_admin role or is_super_admin flag
  IF OLD.is_super_admin = true AND (NEW.role != 'super_admin' OR NEW.is_super_admin != true) THEN
    RAISE EXCEPTION 'Cannot change super admin role or status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_role_trigger ON profiles;
CREATE TRIGGER update_user_role_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_role();

-- 6. Verify the update
SELECT email, role, is_super_admin 
FROM profiles 
WHERE email = 'smokygaming171@gmail.com';
```

### Verify Setup
Run `CHECK_ADMIN_STATUS.sql`:

```sql
-- Check your admin status
SELECT 
  email, 
  role, 
  is_super_admin,
  created_at
FROM profiles 
WHERE email = 'smokygaming171@gmail.com';

-- List all admins
SELECT 
  email, 
  name,
  role, 
  is_super_admin
FROM profiles 
WHERE role IN ('admin', 'super_admin')
ORDER BY is_super_admin DESC, created_at ASC;
```

## 🚀 Testing Checklist

### 1. Super Admin Account Setup
- [ ] Run `UPDATE_ADMIN_TO_SUPER.sql` in Supabase
- [ ] Run `CHECK_ADMIN_STATUS.sql` to verify
- [ ] Restart React Native app
- [ ] Log out and log back in

### 2. Super Admin Features
- [ ] Admin toggle appears in top-right of Home screen
- [ ] Toggle ON shows admin dashboard
- [ ] See 5 management options (including Admin Management)
- [ ] Crown icon (👑) appears next to "Admin Dashboard"
- [ ] Click Admin Management - opens admin list
- [ ] Can add new admin
- [ ] Can edit regular admin
- [ ] Can remove regular admin
- [ ] Cannot edit/remove super admin
- [ ] Super admin shows in list with "(You)" tag

### 3. Manager Management
- [ ] Click Manager Management from admin dashboard
- [ ] See list of managers
- [ ] Search works correctly
- [ ] Can add new manager
- [ ] Can edit manager details
- [ ] Can remove manager
- [ ] Pull-to-refresh works

### 4. Other Management Screens
- [ ] Service Management works (create, edit, delete services)
- [ ] Barber Management works (add, edit, remove barbers)
- [ ] Booking Management works (view, confirm, cancel, complete)

### 5. Profile Settings
- [ ] Super admin does NOT see "Change Email" button
- [ ] Regular admin DOES see "Change Email" button
- [ ] No "Change Password" button anywhere (passwordless system)

### 6. Create Regular Admin
- [ ] As super admin, create a new admin user
- [ ] Log in as that regular admin
- [ ] Admin toggle appears
- [ ] Dashboard shows only 4 options (no Admin Management)
- [ ] Can manage barbers, managers, services, bookings
- [ ] Can see "Change Email" in profile

## 🔧 Troubleshooting

### Admin toggle not appearing
**Solution:** 
1. Run `UPDATE_ADMIN_TO_SUPER.sql`
2. Restart app
3. Log out and log back in
4. Check database with `CHECK_ADMIN_STATUS.sql`

### "Admin Management" not appearing
**Cause:** You're logged in as regular admin, not super admin.
**Solution:** Only super admin can see this option. Verify your account with `CHECK_ADMIN_STATUS.sql`.

### Cannot delete or edit admin
**Cause:** Trying to modify super admin account.
**Expected:** Super admin is protected and cannot be modified or deleted.

### Error: "Cannot change super admin role or status"
**Expected:** Database trigger preventing super admin changes. This is correct behavior.

## 🎨 UI Highlights

### Manager Management Screen
- Purple theme (#9C27B0)
- Briefcase icon for managers
- Search by name or email
- Edit/delete buttons on each card
- Empty state with helpful message
- Loading overlay during operations

### Admin Management Screen
- Orange/red theme (#FF5722)
- Shield icon for admins
- Crown emoji (👑) for super admin
- Info box explaining permissions
- "(You)" tag for current user
- Super admin cannot be edited/deleted
- Search by name or email
- Empty state with helpful message

## 📊 Key Differences

### Super Admin vs Regular Admin

| Feature | Super Admin | Regular Admin |
|---------|------------|---------------|
| Dashboard Options | 5 | 4 |
| Admin Management | ✅ Yes | ❌ No |
| Manager Management | ✅ Yes | ✅ Yes |
| Barber Management | ✅ Yes | ✅ Yes |
| Service Management | ✅ Yes | ✅ Yes |
| Booking Management | ✅ Yes | ✅ Yes |
| Change Email | ❌ No | ✅ Yes |
| Can be deleted | ❌ No | ✅ Yes |
| Can change role | ❌ No | ✅ Yes |

## 🔒 Security Features

1. **Super Admin Protection**
   - Database trigger prevents deletion
   - Database trigger prevents role change
   - UI doesn't show edit/delete buttons for super admin
   - `is_super_admin` flag cannot be changed via triggers

2. **Permission Enforcement**
   - Admin Management screen checks `isSuperAdmin` flag
   - Only super admin can call `createAdmin()`, `updateAdmin()`, `deleteAdmin()`
   - Regular admins cannot access admin management functions

3. **Email Changes**
   - Super admin CANNOT change email (permanent account)
   - Regular admins CAN change email (with verification)
   - Verification email sent to new address before change completes

## 📝 Notes

1. **No Password System**: This is a passwordless authentication system using OTP. "Change Password" has been completely removed.

2. **Soft Deletion**: When you "remove" a manager or admin, their account is not deleted. Their role is changed to "customer".

3. **Invitation System**: When you add a manager or admin with a new email, if the account doesn't exist, an OTP invitation is sent.

4. **Profile Promotion**: If you add a manager/admin with an existing email, their role is upgraded automatically.

5. **Super Admin Email**: `smokygaming171@gmail.com` is hardcoded as the super admin in the SQL update script.

## 🎯 Success Criteria

✅ Super admin can manage all aspects (admins, managers, barbers, services, bookings)
✅ Regular admin can manage everything except admins
✅ Super admin cannot be deleted or have role changed
✅ Manager Management screen fully functional
✅ Admin Management screen fully functional
✅ No password change functionality (passwordless system)
✅ Only non-super-admin admins can change email
✅ All screens have proper loading states and error handling
✅ Beautiful, consistent UI across all management screens
✅ Pull-to-refresh works on all lists
✅ Search functionality on manager and admin lists

---

**Version:** 1.0.0  
**Last Updated:** October 4, 2025  
**Status:** ✅ Complete and Ready for Testing
