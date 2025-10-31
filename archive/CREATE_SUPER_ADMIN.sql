-- =====================================================
-- CREATE SUPER ADMIN ACCOUNT
-- =====================================================
-- This script creates a super admin account that:
-- - Has full access to all features
-- - Cannot be deleted (protected by triggers)
-- - Can manage all other users
-- =====================================================

-- STEP 1: Replace this email with YOUR email address
-- Then run this entire script in Supabase SQL Editor

-- Create Super Admin Profile
INSERT INTO profiles (
  email,
  name,
  role,
  is_super_admin,
  onboarding_completed,
  created_at
) VALUES (
  'YOUR_EMAIL@example.com',  -- 👈 CHANGE THIS TO YOUR EMAIL
  'Super Admin',              -- 👈 CHANGE THIS TO YOUR NAME
  'super_admin',
  true,
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  is_super_admin = true,
  onboarding_completed = true;

-- Verify the super admin was created
SELECT
  id,
  email,
  name,
  role,
  is_super_admin,
  onboarding_completed,
  created_at
FROM profiles
WHERE email = 'YOUR_EMAIL@example.com';  -- 👈 CHANGE THIS TO YOUR EMAIL

-- =====================================================
-- SUCCESS!
-- Now you can login to the app with your email:
-- 1. Open the app
-- 2. Enter: YOUR_EMAIL@example.com
-- 3. Check your email for the OTP code
-- 4. Enter the code
-- 5. You'll be logged in as Super Admin!
-- =====================================================
