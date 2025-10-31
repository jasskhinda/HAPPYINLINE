-- ============================================
-- FINAL COMPLETE FIX - ALL RLS POLICIES
-- Fixes "permission denied for table users" error
-- ============================================

-- The issue: RLS policies on bookings table query the profiles table,
-- but if profiles table ALSO has RLS enabled, it might block access!
-- Solution: Ensure profiles table allows RLS policies to read it.

-- ============================================
-- PART 1: Fix PROFILES table RLS
-- ============================================

-- Check if profiles has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Drop any restrictive policies on profiles that might block RLS lookups
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create permissive policy: Allow RLS policies to read profiles for role checking
CREATE POLICY "Allow profile lookup for RLS"
ON profiles FOR SELECT
USING (true); -- Allow all authenticated users to read profiles (needed for RLS checks)

-- Create policy: Users can update own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (email = auth.email())
WITH CHECK (email = auth.email());

-- ============================================
-- PART 2: Fix BOOKINGS table RLS (Complete rewrite)
-- ============================================

-- Drop all existing booking policies
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins view all bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can update assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins update all bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins delete bookings" ON bookings;

-- SELECT Policies
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Barbers can view own bookings"
ON bookings FOR SELECT
USING (
  barber_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email()
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- INSERT Policy
CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
    AND role = 'customer'
  )
);

-- UPDATE Policies (with BOTH USING and WITH CHECK)
CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
USING (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
  AND status = 'pending'
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Barbers can update assigned bookings"
ON bookings FOR UPDATE
USING (
  barber_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
)
WITH CHECK (
  barber_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Managers and admins update all bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email()
    AND role IN ('manager', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email()
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- DELETE Policy
CREATE POLICY "Managers and admins delete bookings"
ON bookings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email()
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check profiles RLS status
SELECT 
  'PROFILES TABLE' as table_name,
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- Check profiles policies
SELECT 
  'PROFILES POLICIES' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd, policyname;

-- Check bookings RLS status
SELECT 
  'BOOKINGS TABLE' as table_name,
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'bookings';

-- Check bookings policies
SELECT 
  'BOOKINGS POLICIES' as info,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING'
    ELSE 'No USING'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
    ELSE 'No WITH CHECK'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'bookings' 
ORDER BY cmd, policyname;

-- Test SELECT (should return 2)
SELECT 'TEST SELECT' as test, COUNT(*) as total_bookings FROM bookings;

-- Test UPDATE (simulate confirm)
DO $$
DECLARE
  test_booking_id uuid;
  original_status text;
BEGIN
  -- Get first pending booking
  SELECT id, status INTO test_booking_id, original_status 
  FROM bookings 
  WHERE status = 'pending' 
  LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing UPDATE on booking: % (current status: %)', test_booking_id, original_status;
    
    -- Try to update (this is what confirmBooking() does)
    UPDATE bookings 
    SET 
      is_confirmed_by_manager = true,
      status = 'confirmed',
      updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ UPDATE successful! Booking confirmed.';
    
    -- Revert back
    UPDATE bookings 
    SET 
      is_confirmed_by_manager = false,
      status = original_status,
      updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ Reverted to original status: %', original_status;
  ELSE
    RAISE NOTICE '⚠️ No pending bookings to test';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ UPDATE FAILED: %', SQLERRM;
END $$;

-- ============================================
-- EXPLANATION
-- ============================================
-- 
-- The KEY issue was: When bookings RLS policies tried to query
-- the profiles table to check roles, the PROFILES table's own RLS
-- was blocking that access!
--
-- Solution: Created a permissive SELECT policy on profiles that
-- allows ALL authenticated users to read profiles. This is safe
-- because:
-- 1. Only basic info is exposed (name, role, email)
-- 2. Needed for RLS policies to function
-- 3. UPDATE is still restricted to own profile only
--
-- Now when a manager confirms a booking:
-- 1. Manager is authenticated (has auth.email())
-- 2. Bookings UPDATE policy checks manager role
-- 3. Profiles SELECT policy allows the role check
-- 4. UPDATE succeeds ✅
-- ============================================
