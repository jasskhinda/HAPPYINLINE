-- =====================================================
-- CREATE REGULAR ADMIN ACCOUNT
-- =====================================================
-- This script creates a regular admin account that:
-- - Has admin access to manage shops, users, bookings
-- - Can be deleted by super admin
-- - Cannot modify super admin
-- =====================================================

-- STEP 1: Replace the email and name below
-- Then run this entire script in Supabase SQL Editor

-- Create Regular Admin Profile
INSERT INTO profiles (
  email,
  name,
  role,
  is_super_admin,
  onboarding_completed,
  created_at
) VALUES (
  'ADMIN_EMAIL@example.com',  -- 👈 CHANGE THIS TO ADMIN EMAIL
  'Admin Name',               -- 👈 CHANGE THIS TO ADMIN NAME
  'admin',
  false,  -- Regular admin (not super admin)
  true,
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  is_super_admin = false,
  onboarding_completed = true;

-- Verify the admin was created
SELECT
  id,
  email,
  name,
  role,
  is_super_admin,
  onboarding_completed,
  created_at
FROM profiles
WHERE email = 'ADMIN_EMAIL@example.com';  -- 👈 CHANGE THIS TO ADMIN EMAIL

-- =====================================================
-- SUCCESS!
-- This admin can now login with their email
-- =====================================================
