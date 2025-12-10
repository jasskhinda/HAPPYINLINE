# Role Structure Guide - Happy Inline

## Two-Level Role System

Happy Inline uses a **two-level role system** for maximum flexibility:

### **Level 1: Platform Role** (`profiles.role`)
Controls which dashboard the user sees globally:

| Role | Dashboard | Purpose |
|------|-----------|---------|
| `super_admin` | Super Admin Dashboard | Platform owner - manages ALL shops |
| `manager` | Manager Dashboard | Shop owner/manager - manages their shop(s) |
| `barber` | Barber Dashboard* | Works at shop(s) - limited features |
| `customer` | Customer View | Books appointments |

*Note: Barber dashboard can be simplified manager view or separate

---

### **Level 2: Shop-Specific Role** (`shop_staff.role`)
Controls permissions WITHIN a specific shop:

| Role | Permissions | Use Case |
|------|-------------|----------|
| `admin` | Full control of THIS shop | Shop owner, co-owner |
| `manager` | Manage bookings, services, staff | Shop manager, assistant manager |
| `barber` | View own schedule, mark appointments complete | Barber/stylist |

---

## Common Scenarios

### Scenario 1: Shop Owner Registers
**Registration:**
- Creates account with `profiles.role = 'manager'`
- Creates shop
- Automatically added to `shop_staff` with `role = 'admin'`

**Result:**
- Sees Manager Dashboard (from profile role)
- Has full control of their shop (from shop_staff role)

---

### Scenario 2: Owner Adds Co-Manager
**Owner wants to add someone to help manage their shop:**

**Option A: Invite Existing User**
```sql
-- User already has account, just add to shop_staff
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES ('shop-id', 'user-id', 'admin');
```

**Option B: Create New User**
```sql
-- 1. Create account
INSERT INTO profiles (id, email, name, phone, role)
VALUES (uuid, 'email', 'name', 'phone', 'manager');

-- 2. Add to shop_staff
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES ('shop-id', 'user-id', 'admin');
```

**Result:**
- They see Manager Dashboard
- They can ONLY manage shops they're added to (via shop_staff)
- If added as `admin`, they have same permissions as owner

---

### Scenario 3: Owner Adds Barber
**Owner wants to add a barber who just works there:**

```sql
-- 1. Create account with barber role
INSERT INTO profiles (id, email, name, phone, role)
VALUES (uuid, 'email', 'name', 'phone', 'barber');

-- 2. Add to shop_staff as barber
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES ('shop-id', 'user-id', 'barber');
```

**Result:**
- They see Barber Dashboard (limited view)
- Can see their own schedule for this shop
- Can mark their appointments complete
- Cannot manage shop settings, add services, etc.

---

### Scenario 4: Manager Works at Multiple Shops
**Someone manages Shop A and works as barber at Shop B:**

```sql
-- Shop A: Admin
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES ('shop-a-id', 'user-id', 'admin');

-- Shop B: Barber
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES ('shop-b-id', 'user-id', 'barber');
```

**Result:**
- Their `profiles.role = 'manager'` → Sees Manager Dashboard
- Dashboard shows both shops with different permissions:
  - Shop A: Full control (admin)
  - Shop B: Limited (barber)

---

## Recommended Implementation

### For "Add Manager" Feature:

**User Flow:**
1. Owner clicks "Add Manager"
2. Enters: Email, Name, Phone, (optional) Password
3. System checks if email exists:
   - **If exists**: Add to `shop_staff` with `role = 'admin'`
   - **If new**: Create account + Add to `shop_staff`

**Code Logic:**
```javascript
async function addManagerToShop(shopId, email, name, phone, password) {
  // 1. Check if user exists
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    // User exists, just add to shop_staff
    await addToShopStaff(shopId, existingUser.id, 'admin');
    return { success: true, message: 'Manager added to shop' };
  } else {
    // Create new user
    const newUser = await createUser({
      email,
      password,
      metadata: {
        name,
        phone,
        role: 'manager'  // Profile role
      }
    });

    // Add to shop_staff
    await addToShopStaff(shopId, newUser.id, 'admin');

    return { success: true, message: 'New manager account created and added' };
  }
}
```

**Database:**
```sql
-- Profile (platform level)
INSERT INTO profiles (id, email, name, phone, role)
VALUES (uuid, email, name, phone, 'manager');

-- Shop staff (shop level)
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES (shop_id, user_id, 'admin');
```

---

## Permission Matrix

| Action | Super Admin | Shop Admin | Shop Manager | Barber | Customer |
|--------|-------------|------------|--------------|--------|----------|
| View all shops | ✅ | ❌ | ❌ | ❌ | ✅ (approved only) |
| Create shop | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit own shop | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add/remove services | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add/remove staff | ✅ | ✅ | ✅ | ❌ | ❌ |
| View bookings | ✅ | ✅ (own shop) | ✅ (own shop) | ✅ (own only) | ✅ (own only) |
| Manage bookings | ✅ | ✅ (own shop) | ✅ (own shop) | ✅ (own only) | ❌ |
| Approve shops | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change shop hours | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Best Practices

### 1. Shop Owner = Admin Role
When owner creates shop, always use `role = 'admin'` in shop_staff, not `manager`

### 2. Co-Managers = Admin Role
When owner adds co-manager, use `role = 'admin'` for same permissions

### 3. Assistant Managers = Manager Role
If you want limited managers (can't delete shop, can't remove owner), use `role = 'manager'`

### 4. Barbers = Barber Role
Workers who just cut hair should be `role = 'barber'`

### 5. Profile Role Should Match Primary Function
- Shop owners: `profiles.role = 'manager'`
- Barbers: `profiles.role = 'barber'`
- Customers: `profiles.role = 'customer'`

---

## Summary

**For your "Add Manager" feature:**
- ✅ Create account with `profiles.role = 'manager'`
- ✅ Add to `shop_staff` with `role = 'admin'`
- ✅ They'll see Manager Dashboard
- ✅ They'll only see/manage shops they're added to
- ✅ They'll have full control of those shops (same as owner)

**They CANNOT:**
- ❌ See other shops (unless added to them)
- ❌ Create new shops (they're not owner)
- ❌ Approve/reject shops (they're not super admin)
- ❌ Access super admin features
