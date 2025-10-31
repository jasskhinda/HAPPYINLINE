# ✅ Role-Based Staff Management System - Complete Implementation

## Overview

Implemented a comprehensive role-based UI system with staff management capabilities. The system handles permissions entirely in the UI layer without requiring RLS policies on Supabase.

---

## Role-Based Permissions Matrix

### Admin (Can Do Everything):
- ✅ Add managers
- ✅ Add barbers
- ✅ Remove managers
- ✅ Remove barbers
- ✅ Change staff roles (manager ↔ barber)
- ✅ View all staff sections
- ✅ Access staff management screen
- ✅ Delete shop
- ✅ Toggle shop open/closed

### Manager (Limited Permissions):
- ❌ Cannot add managers
- ✅ Add barbers
- ❌ Cannot remove managers
- ✅ Remove barbers
- ❌ Cannot change roles
- ✅ View all staff sections
- ✅ Access barber management screen only
- ❌ Cannot delete shop
- ✅ Toggle shop open/closed

### Barber (View Only):
- ❌ No management capabilities
- ✅ View staff (read-only)
- ❌ No manage buttons visible
- ❌ Cannot add/remove/edit staff
- ❌ Cannot delete shop
- ❌ Cannot toggle shop status

### Customer (Public View):
- ✅ View barbers for booking
- ❌ Cannot see managers
- ❌ No management features
- ❌ No admin controls

---

## Changes Implemented

### 1. ✅ Updated ShopDetailsScreen

#### Changed Icons:
```javascript
// BEFORE: Plus icon for add
<Ionicons name="add-circle" size={24} color="#007AFF" />

// AFTER: Settings icon for manage
<Ionicons name="settings-outline" size={24} color="#007AFF" />
```

#### Managers Section - Admin Only:
```javascript
{userRole && userRole === 'admin' && (
  <TouchableOpacity 
    style={styles.manageIconButton}
    onPress={() => navigation.navigate('StaffManagementScreen', { 
      shopId, 
      section: 'managers' 
    })}
  >
    <Ionicons name="settings-outline" size={24} color="#007AFF" />
  </TouchableOpacity>
)}
```

#### Barbers Section - Admin & Manager:
```javascript
{userRole && ['admin', 'manager'].includes(userRole) && (
  <TouchableOpacity 
    style={styles.manageIconButton}
    onPress={() => navigation.navigate('StaffManagementScreen', { 
      shopId, 
      section: 'barbers' 
    })}
  >
    <Ionicons name="settings-outline" size={24} color="#007AFF" />
  </TouchableOpacity>
)}
```

---

### 2. ✅ Created StaffManagementScreen

**File:** `src/presentation/main/bottomBar/home/StaffManagementScreen.jsx`

#### Features:

**A. Role-Based UI Controls:**
```javascript
// Permission checks in UI
const canRemove = userRole === 'admin' || 
  (userRole === 'manager' && staffMember.role === 'barber');
  
const canChangeRole = userRole === 'admin';
```

**B. Add Staff Functionality:**
- Search by email
- Add as manager (admin only) or barber (admin/manager)
- Validates permissions before adding
- Shows success/error messages

**C. Remove Staff Functionality:**
- Admin: Can remove anyone except other admins
- Manager: Can only remove barbers
- Confirmation dialog before removal

**D. Change Role Functionality:**
- Admin only feature
- Can change: Manager → Barber or Barber → Manager
- Cannot change admin roles
- Confirmation dialog before changing

**E. Permission Info Banner:**
```javascript
<View style={styles.infoBanner}>
  <Text>
    {userRole === 'admin'
      ? 'You can add, remove, and change roles for all staff'
      : 'You can add and remove barbers only'}
  </Text>
</View>
```

---

## UI Flow

### For Admin:

1. **View Shop Details**
   - Sees settings icon on both Managers and Barbers sections
   
2. **Click Managers Settings Icon**
   - Opens StaffManagementScreen for managers
   - Can add manager by email
   - Can remove any manager
   - Can change manager to barber
   
3. **Click Barbers Settings Icon**
   - Opens StaffManagementScreen for barbers
   - Can add barber by email
   - Can remove any barber
   - Can change barber to manager

### For Manager:

1. **View Shop Details**
   - Sees settings icon on Barbers section only
   - NO icon on Managers section
   
2. **Click Barbers Settings Icon**
   - Opens StaffManagementScreen for barbers
   - Can add barber by email
   - Can remove barbers
   - CANNOT change roles
   
3. **Try to Access Managers**
   - No settings icon visible
   - Cannot manage managers

### For Barber/Customer:

1. **View Shop Details**
   - NO settings icons visible
   - Can only view staff (read-only)
   - No management capabilities

---

## Code Examples

### Add Staff (with permission check):
```javascript
const handleAddStaff = async () => {
  // Permission check
  if (userRole === 'manager' && addRole !== 'barber') {
    Alert.alert('Permission Denied', 'Managers can only add barbers');
    return;
  }
  
  // Find user by email
  const { data: userData } = await supabase
    .from('profiles')
    .select('id, email, name')
    .eq('email', addEmail.toLowerCase().trim())
    .single();
    
  // Insert into shop_staff
  await supabase
    .from('shop_staff')
    .insert({
      shop_id: shopId,
      user_id: userData.id,
      role: addRole,
      is_active: true,
    });
};
```

### Remove Staff (with permission check):
```javascript
const handleRemoveStaff = (staffMember) => {
  // Permission check
  if (userRole === 'manager' && staffMember.role !== 'barber') {
    Alert.alert('Permission Denied', 'Managers can only remove barbers');
    return;
  }
  
  // Confirmation dialog
  Alert.alert('Remove Staff Member', `Remove ${staffMember.user?.name}?`, [
    { text: 'Cancel' },
    {
      text: 'Remove',
      onPress: async () => {
        await supabase
          .from('shop_staff')
          .delete()
          .eq('id', staffMember.id);
      },
    },
  ]);
};
```

### Change Role (admin only):
```javascript
const handleChangeRole = (staffMember, newRole) => {
  // Admin-only check
  if (userRole !== 'admin') {
    Alert.alert('Permission Denied', 'Only admins can change staff roles');
    return;
  }
  
  // Update role
  await supabase
    .from('shop_staff')
    .update({ role: newRole })
    .eq('id', staffMember.id);
};
```

---

## Visual Design

### Staff Card Layout:
```
┌──────────────────────────────────────────┐
│  [👤]  John Doe                  [⇄] [🗑] │
│        john@email.com                     │
│        [MANAGER]                          │
└──────────────────────────────────────────┘

Icons:
- ⇄ = Change Role (Admin only)
- 🗑 = Remove Staff
```

### Role Badges:
- **ADMIN**: Green (`#4CAF50`)
- **MANAGER**: Blue (`#007AFF`)
- **BARBER**: Orange (`#FF6B35`)

### Add Staff Modal:
```
┌──────────────────────────────────┐
│  Add Manager/Barber         [X]  │
├──────────────────────────────────┤
│  Email Address                   │
│  ┌────────────────────────────┐ │
│  │ Enter user's email         │ │
│  └────────────────────────────┘ │
│                                  │
│  [Cancel]    [Add]               │
└──────────────────────────────────┘
```

---

## Testing Checklist

### Test as Admin:
- [ ] See settings icon on Managers section
- [ ] See settings icon on Barbers section
- [ ] Can access manager management
- [ ] Can add manager by email
- [ ] Can remove managers
- [ ] Can change manager to barber
- [ ] Can access barber management
- [ ] Can add barber by email
- [ ] Can remove barbers
- [ ] Can change barber to manager
- [ ] See all action buttons (change role + remove)

### Test as Manager:
- [ ] NO settings icon on Managers section
- [ ] See settings icon on Barbers section
- [ ] Cannot access manager management
- [ ] Can access barber management
- [ ] Can add barber by email
- [ ] Cannot add manager (permission denied)
- [ ] Can remove barbers
- [ ] Cannot remove managers (no access)
- [ ] Cannot change roles (button hidden)

### Test as Barber:
- [ ] NO settings icon on any section
- [ ] Cannot access management screens
- [ ] View staff in read-only mode
- [ ] No action buttons visible

### Test as Customer:
- [ ] NO settings icon on any section
- [ ] Can view barbers for booking
- [ ] Cannot see managers section
- [ ] No management features

---

## Database Operations

All operations use direct Supabase client (no RLS needed):

### Add Staff:
```sql
INSERT INTO shop_staff (shop_id, user_id, role, is_active)
VALUES (?, ?, ?, true);
```

### Remove Staff:
```sql
DELETE FROM shop_staff
WHERE id = ?;
```

### Change Role:
```sql
UPDATE shop_staff
SET role = ?
WHERE id = ?;
```

### Find User by Email:
```sql
SELECT id, email, name FROM profiles
WHERE email = ?;
```

---

## Security Notes

### UI-Level Security (Current Implementation):
✅ **Pros:**
- Fast implementation
- No database migrations needed
- Easy to modify permissions
- Clear visual feedback
- Better UX (immediate feedback)

⚠️ **Cons:**
- Relies on client-side checks
- API calls not protected
- Could be bypassed by tech-savvy users

### Recommendation for Production:
Add server-side validation:
```javascript
// In Supabase Edge Function or API route
if (userRole === 'manager' && targetRole !== 'barber') {
  return { error: 'Permission denied' };
}
```

---

## Files Modified/Created

### Modified:
1. **ShopDetailsScreen.jsx**
   - Changed plus icons to settings icons
   - Updated permission checks for visibility
   - Added navigation to StaffManagementScreen

### Created:
2. **StaffManagementScreen.jsx**
   - Complete staff management interface
   - Add/remove/change role functionality
   - Role-based UI controls
   - Permission checks on all actions

---

## Summary of Role Capabilities

| Feature | Admin | Manager | Barber | Customer |
|---------|-------|---------|--------|----------|
| View Managers | ✅ | ✅ | ✅ | ❌ |
| View Barbers | ✅ | ✅ | ✅ | ✅ |
| Add Manager | ✅ | ❌ | ❌ | ❌ |
| Add Barber | ✅ | ✅ | ❌ | ❌ |
| Remove Manager | ✅ | ❌ | ❌ | ❌ |
| Remove Barber | ✅ | ✅ | ❌ | ❌ |
| Change Roles | ✅ | ❌ | ❌ | ❌ |
| Delete Shop | ✅ | ❌ | ❌ | ❌ |
| Toggle Shop Status | ✅ | ✅ | ❌ | ❌ |
| Manage Services | ✅ | ✅ | ❌ | ❌ |

---

## All Done! ✅

The role-based staff management system is now complete:

1. ✅ Settings icons replace plus icons
2. ✅ Admin can manage everything
3. ✅ Manager can only manage barbers
4. ✅ Barbers/customers see limited UI
5. ✅ All permissions handled in UI
6. ✅ No RLS policies needed
7. ✅ Clear visual feedback
8. ✅ Professional staff management screen

Test the app with different user roles to verify the permissions! 🎉
