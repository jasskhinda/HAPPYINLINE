-- Fix the profiles table role constraint to include 'owner'
-- This is required before we can update users to role='owner'

-- Step 1: Check current constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND contype = 'c'
  AND conname LIKE '%role%';

-- Step 2: Drop the old constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 3: Add new constraint that includes 'owner'
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('customer', 'barber', 'manager', 'owner', 'admin', 'super_admin'));

-- Step 4: Verify the new constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND contype = 'c'
  AND conname LIKE '%role%';

-- Step 5: Now update your account to 'owner' role
UPDATE profiles
SET role = 'owner',
    updated_at = NOW()
WHERE email = 'yomek19737@hh7f.com';

-- Step 6: Verify the update worked
SELECT id, email, name, role, updated_at
FROM profiles
WHERE email = 'yomek19737@hh7f.com';

-- Success! Your account is now role='owner'
