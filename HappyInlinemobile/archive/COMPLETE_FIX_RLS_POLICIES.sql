-- ============================================
-- COMPLETE RLS FIX WITH BOTH USING AND WITH CHECK
-- This fixes "permission denied for table users" error
-- ============================================

-- IMPORTANT: RLS policies need BOTH clauses:
-- USING: Controls which rows can be selected/updated/deleted (read access)
-- WITH CHECK: Controls what values can be inserted/updated (write access)

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
-- Step 2: Create SELECT policies (read-only)
-- ============================================

-- Policy 1: Customers view own bookings
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

-- Policy 2: Barbers view assigned bookings
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
-- Step 4: Create UPDATE policies (BOTH USING AND WITH CHECK)
-- ============================================

-- Policy 1: Customers can update own pending bookings
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
)
WITH CHECK (
  barber_id IN (
    SELECT id FROM profiles 
    WHERE email = auth.email()
  )
);

-- Policy 3: Managers/Admins can update ANY booking
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

-- ============================================
-- Step 7: Test queries as manager
-- ============================================

-- Should return 2 bookings
SELECT COUNT(*) as total_bookings FROM bookings;

-- Should show the bookings
SELECT id, booking_id, status, customer_id, barber_id FROM bookings;

-- ============================================
-- Step 8: Test UPDATE as manager (simulate confirm action)
-- ============================================

-- Get the first booking ID to test
DO $$
DECLARE
  test_booking_id uuid;
BEGIN
  -- Get first pending booking
  SELECT id INTO test_booking_id FROM bookings WHERE status = 'pending' LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    RAISE NOTICE 'Testing UPDATE on booking: %', test_booking_id;
    
    -- Try to update status (this is what confirmBooking() does)
    -- This should work now without permission error
    UPDATE bookings 
    SET status = 'confirmed', updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ UPDATE successful! Booking confirmed.';
    
    -- Revert back to pending for testing
    UPDATE bookings 
    SET status = 'pending', updated_at = now()
    WHERE id = test_booking_id;
    
    RAISE NOTICE '✅ Reverted back to pending for app testing.';
  ELSE
    RAISE NOTICE '⚠️ No pending bookings found to test.';
  END IF;
END $$;

-- ============================================
-- EXPLANATION OF THE FIX:
-- ============================================
-- 
-- The key difference from the previous version:
-- 
-- ❌ BEFORE (Missing WITH CHECK on UPDATE):
-- CREATE POLICY "Managers and admins update all bookings"
-- ON bookings FOR UPDATE
-- USING (...);  -- Only had USING, no WITH CHECK
--
-- ✅ AFTER (Has both USING and WITH CHECK):
-- CREATE POLICY "Managers and admins update all bookings"
-- ON bookings FOR UPDATE
-- USING (...)      -- Controls WHICH rows can be updated
-- WITH CHECK (...); -- Controls WHAT values can be written
--
-- WITHOUT the WITH CHECK clause, PostgreSQL might still try to
-- validate the update against other constraints, which can trigger
-- the "permission denied for table users" error.
--
-- WITH CHECK ensures that the update is allowed based on the
-- manager's role, using auth.email() safely.
-- ============================================
