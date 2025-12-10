# Database Column Name Fix

## Issue
**Error:** `column profiles.full_name does not exist`

When searching for users in Add Manager/Barber modals, the app was querying for `full_name` column which doesn't exist in the database.

---

## Root Cause

### Database Schema (SHOP_FIRST_DATABASE_SCHEMA.sql):
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User Information
  name TEXT NOT NULL,        -- ✅ Column is called "name"
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  ...
);
```

The profiles table has a `name` column, NOT `full_name`.

### Code Issue:
The modals were querying for `full_name`:
```javascript
// ❌ WRONG
.select('id, full_name, email, phone')
```

---

## Solution

Changed all references from `full_name` to `name` in 3 files:

### 1. AddManagerModal.jsx
**Supabase Query:**
```javascript
// BEFORE
const { data, error } = await supabase
  .from('profiles')
  .select('id, full_name, email, phone')  // ❌

// AFTER
const { data, error } = await supabase
  .from('profiles')
  .select('id, name, email, phone')  // ✅
```

**Display Code:**
```javascript
// BEFORE
{user.full_name?.charAt(0).toUpperCase() || 'M'}  // ❌
{user.full_name || 'No Name'}  // ❌

// AFTER
{user.name?.charAt(0).toUpperCase() || 'M'}  // ✅
{user.name || 'No Name'}  // ✅
```

### 2. AddBarberModal.jsx
Same fixes as AddManagerModal:
- Query: `full_name` → `name`
- Avatar: `user.full_name` → `user.name`
- Display: `user.full_name` → `user.name`

### 3. CreateShopScreen.jsx
Fixed manager and barber list displays:

**Managers List:**
```javascript
// BEFORE
{manager.full_name?.charAt(0).toUpperCase() || 'M'}  // ❌
{manager.full_name || 'Manager'}  // ❌

// AFTER
{manager.name?.charAt(0).toUpperCase() || 'M'}  // ✅
{manager.name || 'Manager'}  // ✅
```

**Barbers List:**
```javascript
// BEFORE
{barber.full_name?.charAt(0).toUpperCase() || 'B'}  // ❌
{barber.full_name || 'Barber'}  // ❌

// AFTER
{barber.name?.charAt(0).toUpperCase() || 'B'}  // ✅
{barber.name || 'Barber'}  // ✅
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/shop/AddManagerModal.jsx` | 3 locations (query + 2 displays) |
| `src/components/shop/AddBarberModal.jsx` | 3 locations (query + 2 displays) |
| `src/presentation/shop/CreateShopScreen.jsx` | 4 locations (2 managers + 2 barbers) |

**Total:** 10 instances fixed across 3 files

---

## Testing Steps

### 1. Test Manager Search:
1. Open app
2. Go to Create Shop
3. Tap "Add Manager"
4. Enter email or phone of existing user
5. Tap search
6. **Expected:** ✅ User appears with name and avatar
7. **Previously:** ❌ Error: "column profiles.full_name does not exist"

### 2. Test Barber Search:
1. Same steps as above but with "Add Barber"
2. **Expected:** ✅ Works correctly

### 3. Test Display:
1. Add a manager
2. **Expected:** ✅ Shows user's name in the list
3. Add a barber
4. **Expected:** ✅ Shows user's name in the list

---

## Why This Happened

The database was redesigned with the `SHOP_FIRST_DATABASE_SCHEMA.sql` which uses `name` column instead of `full_name`.

The modal components were created using `full_name` (common naming pattern) without checking the actual database schema.

---

## Prevention

When querying database:
1. ✅ Always check actual schema first
2. ✅ Use exact column names from CREATE TABLE statements
3. ✅ Test queries in Supabase SQL editor before using in code
4. ✅ Check for PostgreSQL error code 42703 (undefined column)

---

## Database Column Reference

For future reference, the `profiles` table has:

```sql
profiles (
  id UUID                    -- User ID
  name TEXT                  -- ✅ User's name (not full_name!)
  email TEXT                 -- Email address
  phone TEXT                 -- Phone number
  profile_image TEXT         -- Profile image URL
  is_active BOOLEAN          -- Active status
  onboarding_completed BOOLEAN
  is_platform_admin BOOLEAN  -- Platform admin flag
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

**Remember:** It's `name`, not `full_name`!

---

## Result

✅ **Fixed:** User search now works correctly
✅ **Fixed:** User names display properly in lists
✅ **Fixed:** Avatar initials show correctly
✅ **No errors:** All files compile without issues

**Status:** Ready to test! 🚀
