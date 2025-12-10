-- Update existing business owners from 'manager' to 'owner' role
-- Run this to fix existing accounts

-- STEP 1: Fix the constraint first (required!)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('customer', 'barber', 'manager', 'owner', 'admin', 'super_admin'));

-- STEP 2: Update profiles table
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

-- OR if you want to update a specific user:
-- UPDATE profiles
-- SET role = 'owner'
-- WHERE email = 'your-owner-email@example.com';

-- Check the results
SELECT id, email, name, role
FROM profiles
WHERE role IN ('owner', 'manager')
ORDER BY role, created_at;
