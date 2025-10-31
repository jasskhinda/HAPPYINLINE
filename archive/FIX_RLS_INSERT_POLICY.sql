-- ============================================
-- FIX RLS POLICIES FOR ADMIN/MANAGER TO INSERT AND UPDATE PROFILES
-- ============================================
-- Problem: Admins can't insert/update profiles because RLS only allows
-- users to manage their own profile (auth.uid() = id)
-- Solution: Add policies allowing admins/managers to manage ANY profile
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow insert during signup" ON profiles;
DROP POLICY IF EXISTS "Admins and Managers can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins and Managers can update all profiles" ON profiles;

-- ============================================
-- INSERT POLICIES
-- ============================================

-- Policy 1: Allow users to insert their own profile during signup
CREATE POLICY "Allow insert during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 2: Allow admins and managers to insert ANY profile
-- This allows them to create profiles for barbers, managers, and admins
CREATE POLICY "Admins and Managers can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'super_admin')
    )
  );

-- ============================================
-- UPDATE POLICIES
-- ============================================

-- Policy 3: Allow admins and managers to update ANY profile
-- This allows them to edit barbers, managers, and other admins
CREATE POLICY "Admins and Managers can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'super_admin')
    )
  );
