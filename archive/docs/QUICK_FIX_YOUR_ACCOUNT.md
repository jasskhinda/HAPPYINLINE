# Quick Fix: Update Your Account to Owner Role

## Problem
Your account (`yomek19737@hh7f.com`) currently has `role = 'manager'`, but it should have `role = 'owner'` so you can:
- See "Create Your Shop" button when you have no shops
- Create new shops
- Access all owner features

## Solution (3 minutes)

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### Step 2: Run This SQL (All at Once)
Copy and paste **ALL of this** into the SQL editor and click **RUN**:

```sql
-- Fix the profiles table role constraint to include 'owner'
-- This is required before we can update users to role='owner'

-- Drop the old constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint that includes 'owner'
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('customer', 'barber', 'manager', 'owner', 'admin', 'super_admin'));

-- Update your account to 'owner' role
UPDATE profiles
SET role = 'owner',
    updated_at = NOW()
WHERE email = 'yomek19737@hh7f.com';

-- Verify the update worked
SELECT id, email, name, role, updated_at
FROM profiles
WHERE email = 'yomek19737@hh7f.com';
```

### Step 3: Check Results
You should see:
- ✅ **Success** messages
- ✅ Final query shows your account with `role = 'owner'`

### Step 4: Test in the App
1. **Logout** from the app completely
2. **Login** again with your credentials
3. **Expected result**:
   - If you have shops → See Manager Dashboard with your shops
   - If you have NO shops → See "Create Your Shop" button (NOT "Account Not Active")

---

## What Did This Do?

### Database Constraint Update
The database had a constraint that only allowed these roles:
- ❌ Old: `['customer', 'barber', 'manager', 'admin', 'super_admin']`
- ✅ New: `['customer', 'barber', 'manager', 'owner', 'admin', 'super_admin']`

We added **'owner'** to the allowed list.

### Your Account Update
Changed your account from `role = 'manager'` to `role = 'owner'`.

---

## That's It!

Your account is now an **OWNER** account and you can:
- ✅ Create new shops
- ✅ Add managers to your shops
- ✅ See the proper dashboard UI
- ✅ Access all business owner features

All **NEW business registrations** will automatically get `role = 'owner'` from now on.

---

## If You See Issues

### Issue: Still see "Account Not Active"
**Solution**:
1. Make sure you logged out and logged back in
2. Check the SQL result shows `role = 'owner'`
3. Clear app cache: Close app completely and reopen

### Issue: SQL Error "constraint violation"
**Solution**: You've already seen this! That's why we run the constraint fix first. Make sure you run ALL the SQL in one go.

### Issue: SQL says "0 rows affected" on UPDATE
**Solution**:
1. Check the email is correct: `yomek19737@hh7f.com`
2. Run this to find your account:
```sql
SELECT email, role FROM profiles WHERE email LIKE '%yomek%';
```
3. Update the SQL with the correct email

---

**Need Help?** Let me know if you see any errors!
