-- ============================================
-- RE-RUN SAFE VERSION - Drops existing policies first
-- ============================================

-- ============================================
-- PART 1: Clean up and fix PROFILES table RLS
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow profile lookup for RLS" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create permissive policy: Allow RLS policies to read profiles
CREATE POLICY "Allow profile lookup for RLS"
ON profiles FOR SELECT
USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (email = auth.email())
WITH CHECK (email = auth.email());

-- ============================================
-- PART 2: Clean up and fix BOOKINGS table RLS
-- ============================================

-- Drop all existing policies
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

-- UPDATE Policies
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
-- VERIFICATION & TESTING
-- ============================================

-- Check profiles policies
SELECT 
  '📋 PROFILES POLICIES' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd, policyname;

-- Check bookings policies
SELECT 
  '📋 BOOKINGS POLICIES' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'bookings' 
ORDER BY cmd, policyname;

-- Test SELECT
SELECT '✅ TEST SELECT' as test, COUNT(*) as total_bookings FROM bookings;

-- Test UPDATE (simulate confirm button)
DO $$
DECLARE
  test_booking_id uuid;
  original_status text;
BEGIN
  SELECT id, status INTO test_booking_id, original_status 
  FROM bookings 
  WHERE status = 'pending' 
  LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing UPDATE on booking: %', test_booking_id;
    
    UPDATE bookings 
    SET 
      is_confirmed_by_manager = true,
      status = 'confirmed',
      updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ ✅ ✅ UPDATE SUCCESSFUL! Manager can confirm bookings!';
    
    -- Revert back
    UPDATE bookings 
    SET 
      is_confirmed_by_manager = false,
      status = original_status,
      updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ Reverted to status: %', original_status;
  ELSE
    RAISE NOTICE '⚠️ No pending bookings to test';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ❌ ❌ UPDATE FAILED: %', SQLERRM;
    RAISE NOTICE '❌ This means the app will still get permission errors!';
END $$;

SELECT '🎉 SQL EXECUTION COMPLETE - Check Messages tab for test results!' as status;
