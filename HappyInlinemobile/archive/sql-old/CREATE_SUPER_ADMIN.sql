-- =====================================================
-- CREATE SUPER ADMIN ACCOUNT
-- =====================================================
-- This script creates a super admin account that:
-- - Has full access to all features
-- - Cannot be deleted (protected by triggers)
-- - Can manage all other users
-- =====================================================

-- STEP 1: First, let's check what columns exist in profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- STEP 2: If role column doesn't exist, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'customer';
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('customer', 'barber', 'manager', 'admin', 'super_admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- STEP 3: Create Super Admin Profile
-- NOTE: We need to generate a UUID for the id column
-- This creates a placeholder profile that will be linked when user logs in
INSERT INTO profiles (
  id,
  email,
  name,
  role,
  is_super_admin,
  onboarding_completed,
  created_at
) VALUES (
  gen_random_uuid(),       -- Generate a UUID for now
  'info@jasskhinda.com',  -- Super admin email
  'Jass Khinda',           -- Super admin name
  'super_admin',
  true,
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  is_super_admin = true,
  name = 'Jass Khinda',
  onboarding_completed = true;

-- STEP 4: Verify the super admin was created
SELECT
  id,
  email,
  name,
  role,
  is_super_admin,
  onboarding_completed,
  created_at
FROM profiles
WHERE email = 'info@jasskhinda.com';

-- =====================================================
-- SUCCESS!
-- Now you can login to the app with your email:
-- 1. Open the app
-- 2. Enter: info@jasskhinda.com
-- 3. Check your email for the OTP code
-- 4. Enter the code
-- 5. You'll be logged in as Super Admin!
-- =====================================================
