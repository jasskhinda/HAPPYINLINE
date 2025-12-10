# 🧪 Test Manager Login Flow

## Current Issue
- Manager logs in → Shows "Guest" username ❌
- Manager toggle switch not visible ❌

## Expected After Fix
- Manager logs in → Shows "Bhavyansh" username ✅
- Manager toggle switch appears ✅
- Goes directly to MainScreen (no name input) ✅

---

## Step 1: Run Updated SQL

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy entire content from `SIMPLE_GUARANTEED_FIX.sql`
3. Paste and click **"Run"**
4. Should see:
   ```
   ✅ SIMPLE FIX APPLIED!
   ```

---

## Step 2: Verify Database

Run this query in SQL Editor:

```sql
SELECT id, email, name, role, is_active
FROM profiles 
WHERE email = 'bhavyansh2018@gmail.com';
```

**Expected Result:**
| id | email | name | role | is_active |
|----|-------|------|------|-----------|
| uuid-xxx | bhavyansh2018@gmail.com | Bhavyansh | manager | true |

**If name is NULL:**
```sql
UPDATE profiles 
SET name = 'Bhavyansh', role = 'manager'
WHERE email = 'bhavyansh2018@gmail.com';
```

---

## Step 3: Delete Existing Auth (Optional)

To test fresh login flow, delete the auth account:

```sql
-- Delete auth user (if exists)
DELETE FROM auth.users WHERE email = 'bhavyansh2018@gmail.com';
```

**NOTE:** Profile in `profiles` table will remain (with name="Bhavyansh", role="manager")

---

## Step 4: Test Login in App

1. **Open app** and **logout** (if logged in)
2. **Go to login screen**
3. **Enter email:** `bhavyansh2018@gmail.com`
4. **Check email for OTP**
5. **Enter OTP**

---

## Step 5: Check Console Logs

You should see:

```javascript
// In verifyEmailOTP (auth.js)
🔍 Fetching profile for user: uuid-xxx
📧 Using email for fallback: bhavyansh2018@gmail.com
✅ Profile found:
   Name: Bhavyansh
   Role: manager
   Email: bhavyansh2018@gmail.com

// In OTPVerificationScreen.jsx
✅ Name exists: Bhavyansh
✅ User exists in database: true
→ Navigating to MainScreen

// In Onboarding.jsx
⚡ Auth check: User is authenticated
✅ User has name: Bhavyansh
→ Navigating to MainScreen (skip onboarding)

// In HomeScreen.jsx
🏠 HomeScreen: Fetching user profile...
✅ Got current user:
   ID: uuid-xxx
   Email: bhavyansh2018@gmail.com
   Name: Bhavyansh
   Role: manager
✅ Setting state:
   Role: manager
   Name: Bhavyansh
```

---

## Step 6: Verify UI

### Top Section:
```
┌─────────────────────────────┐
│ 👋 Hi Bhavyansh             │ ← Should show name, not "Guest"
│                              │
│ 🔄 [Manager Toggle]          │ ← Should be visible
│ (or Admin Toggle if admin)  │
└─────────────────────────────┘
```

### Manager Toggle:
- If `role = 'manager'` → Shows "Manager" toggle ✅
- If `role = 'admin'` or `role = 'super_admin'` → Shows "Admin" toggle ✅
- If `role = 'barber'` → No toggle (barber view) ✅
- If `role = 'customer'` → No toggle (customer view) ✅

---

## Debugging

### If Still Shows "Guest":

1. **Check database:**
   ```sql
   SELECT id, email, name, role FROM profiles 
   WHERE email = 'bhavyansh2018@gmail.com';
   ```

2. **If name is NULL in database:**
   - Trigger didn't preserve data
   - Check trigger logs in Supabase Dashboard → Logs
   - Update manually: 
     ```sql
     UPDATE profiles SET name = 'Bhavyansh' 
     WHERE email = 'bhavyansh2018@gmail.com';
     ```

3. **If name exists but still shows Guest:**
   - Profile fetch failed
   - Check console logs for errors
   - Add more logging in `getCurrentUser()` in auth.js

### If Toggle Not Showing:

1. **Check role in database:**
   ```sql
   SELECT role FROM profiles 
   WHERE email = 'bhavyansh2018@gmail.com';
   ```

2. **Check console log:**
   ```javascript
   console.log('Profile role:', profile.role); // Should be 'manager'
   ```

3. **Check HomeScreen state:**
   - Add: `console.log('UserRole state:', userRole);`
   - Should log: `UserRole state: manager`

### If Goes to Name Input Screen:

1. **Check hasCompletedOnboarding:**
   ```javascript
   // In OTPVerificationScreen.jsx
   console.log('Profile name:', result.profile?.name);
   console.log('User exists:', userExistsInDatabase);
   ```

2. **Should see:**
   ```
   Profile name: "Bhavyansh"
   User exists: true
   ```

3. **If name is undefined:**
   - fetchLatestProfile failed
   - Check 2-second wait completed
   - Check email fallback worked

---

## Success Criteria

✅ Login with OTP → No name input screen
✅ Username shows "Bhavyansh" not "Guest"  
✅ Manager toggle switch visible
✅ Console logs show correct name and role
✅ Can switch to manager mode
✅ Manager dashboard accessible

---

## Summary

**The Fix:**
- Trigger now uses `UPDATE` instead of `DELETE + INSERT`
- Preserves ALL profile data (name, role, phone, bio, etc.)
- Only changes the ID to link with auth account

**Expected Flow:**
```
Admin creates profile → User logs in → Trigger links profile → Data preserved → Direct to MainScreen ✅
```

**Test Now!** 🚀
