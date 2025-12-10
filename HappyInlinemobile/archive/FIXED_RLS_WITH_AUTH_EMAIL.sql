-- ============================================
-- CORRECTED EMAIL-BASED RLS FIX
-- Uses auth.email() instead of querying auth.users
-- ============================================

-- This fixes the "permission denied for table users" error
-- by using Supabase's built-in auth.email() function

-- ============================================
-- Step 1: Drop all existing policies
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
-- Step 2: Create new SELECT policies (using auth.email())
-- ============================================

-- Policy 1: Customers view own bookings (by customer_id)
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

-- Policy 2: Barbers view assigned bookings (by barber_id)
CREATE POLICY "Barbers can view own bookings"
ON bookings FOR SELECT
USING (
  barber_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

-- Policy 3: Managers/Admins/Super Admin view ALL bookings
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email()
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- Step 3: Create INSERT policy
-- ============================================

-- Only customers can create bookings
CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
    AND role = 'customer'
  )
);

-- ============================================
-- Step 4: Create UPDATE policies
-- ============================================

-- Policy 1: Customers can update own bookings (before confirmed)
CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
USING (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
  AND status = 'pending'
);

-- Policy 2: Barbers can update assigned bookings
CREATE POLICY "Barbers can update assigned bookings"
ON bookings FOR UPDATE
USING (
  barber_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

-- Policy 3: Managers/Admins can update any booking
CREATE POLICY "Managers and admins update all bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = auth.email()
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- Step 5: Create DELETE policy
-- ============================================

-- Only Managers/Admins can delete bookings
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
-- Step 6: Verify policies were created
-- ============================================

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'bookings' 
ORDER BY cmd, policyname;

-- ============================================
-- Step 7: Test query as manager
-- ============================================

-- This should return 2 bookings now (without permission error)
SELECT COUNT(*) as total_bookings FROM bookings;

-- ============================================
-- EXPLANATION:
-- ============================================
-- 
-- ✅ auth.email() - Built-in Supabase function that returns the email 
--    of the currently authenticated user. This is SAFE to use in RLS
--    and doesn't require querying the auth.users table.
--
-- ❌ (SELECT email FROM auth.users WHERE id = auth.uid()) - This tries
--    to query auth.users table directly, which client code cannot do.
--    This was causing "permission denied for table users" error.
--
-- The rest of the logic remains the same:
-- - Uses email to find matching profile
-- - Checks role to determine access level
-- - Supports multiple managers/admins with unique profile IDs
-- ============================================
