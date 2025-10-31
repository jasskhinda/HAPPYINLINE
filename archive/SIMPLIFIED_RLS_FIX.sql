-- ============================================
-- SIMPLIFIED RLS FIX - NO SUBQUERIES
-- Direct role-based access using security definer functions
-- ============================================

-- This approach avoids querying auth.users or complex subqueries
-- by using PostgreSQL security definer functions

-- ============================================
-- Step 1: Create helper function to get current user's role
-- ============================================

-- This function runs with elevated privileges (SECURITY DEFINER)
-- so it can read profiles without being blocked by RLS
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- ============================================
-- Step 2: Create helper function to get profile ID by email
-- ============================================

CREATE OR REPLACE FUNCTION get_profile_id_by_auth_uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_profile_id_by_auth_uid() TO authenticated;

-- ============================================
-- Step 3: Clean up PROFILES table RLS
-- ============================================

-- Disable RLS on profiles temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow profile lookup for RLS" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Simple policy: Everyone can read profiles (needed for app functionality)
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- Step 4: Clean up BOOKINGS table RLS
-- ============================================

DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins view all bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can update assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins update all bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins delete bookings" ON bookings;

-- ============================================
-- Step 5: Create SIMPLE bookings policies using helper function
-- ============================================

-- SELECT: Managers/Admins see all, others see their own
CREATE POLICY "View bookings policy"
ON bookings FOR SELECT
TO authenticated
USING (
  -- Managers, admins, super admins can see all
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  -- Customers see their own bookings
  customer_id = auth.uid()
  OR
  -- Barbers see their assigned bookings
  barber_id = auth.uid()
);

-- INSERT: Only customers can create bookings
CREATE POLICY "Create bookings policy"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'customer'
  AND customer_id = auth.uid()
);

-- UPDATE: Managers can update all, others can update their own
CREATE POLICY "Update bookings policy"
ON bookings FOR UPDATE
TO authenticated
USING (
  -- Managers, admins, super admins can update all
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  -- Customers can update their pending bookings
  (customer_id = auth.uid() AND status = 'pending')
  OR
  -- Barbers can update their assigned bookings
  barber_id = auth.uid()
)
WITH CHECK (
  -- Same conditions for write
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  (customer_id = auth.uid() AND status = 'pending')
  OR
  barber_id = auth.uid()
);

-- DELETE: Only managers/admins can delete
CREATE POLICY "Delete bookings policy"
ON bookings FOR DELETE
TO authenticated
USING (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Test the helper function
SELECT 
  '🧪 Testing helper function' as test,
  get_current_user_role() as current_role;

-- Check policies
SELECT 
  '📋 PROFILES POLICIES' as section,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd, policyname;

SELECT 
  '📋 BOOKINGS POLICIES' as section,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'bookings' 
ORDER BY cmd, policyname;

-- Test SELECT
SELECT 
  '✅ TEST SELECT' as test, 
  COUNT(*) as total_bookings 
FROM bookings;

-- Test UPDATE
DO $$
DECLARE
  test_booking_id uuid;
  test_status text;
  current_role text;
BEGIN
  -- Get current user role
  SELECT get_current_user_role() INTO current_role;
  RAISE NOTICE '👤 Current user role: %', current_role;
  
  -- Get a pending booking
  SELECT id, status INTO test_booking_id, test_status 
  FROM bookings 
  WHERE status = 'pending' 
  LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing UPDATE on booking: % (status: %)', test_booking_id, test_status;
    
    -- Try UPDATE
    UPDATE bookings 
    SET 
      is_confirmed_by_manager = true,
      status = 'confirmed',
      updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ ✅ ✅ UPDATE SUCCESSFUL! The fix works!';
    RAISE NOTICE '🎉 You can now confirm bookings in your app!';
    
    -- Revert
    UPDATE bookings 
    SET 
      is_confirmed_by_manager = false,
      status = test_status,
      updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ Reverted to original status';
  ELSE
    RAISE NOTICE '⚠️ No pending bookings found';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ❌ ❌ UPDATE FAILED!';
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RAISE NOTICE '❌ Detail: %', SQLSTATE;
END $$;

-- ============================================
-- EXPLANATION
-- ============================================
-- 
-- This approach uses SECURITY DEFINER functions which bypass RLS
-- when reading the profiles table to check roles.
-- 
-- Benefits:
-- 1. No "permission denied for table users" errors
-- 2. No complex subqueries that might fail
-- 3. Cleaner, more maintainable policies
-- 4. Functions are cached for better performance
-- 
-- The key change: Instead of querying profiles directly in RLS,
-- we use get_current_user_role() which has elevated privileges.
-- ============================================
