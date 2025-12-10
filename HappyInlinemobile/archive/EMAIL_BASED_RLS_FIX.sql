-- ============================================
-- FINAL FIX - Email-Based RLS (Proper Solution)
-- ============================================
-- This handles the case where profiles.id ≠ auth.users.id
-- Links by email instead
-- Supports: Multiple managers, Multiple admins, ONE super_admin
-- ============================================

-- Drop ALL existing booking policies
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins view all bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins can delete bookings" ON bookings;

-- ============================================
-- SELECT POLICIES (View bookings)
-- ============================================

-- Customers: Can view their own bookings (match by profile.id)
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM profiles WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Barbers: Can view bookings assigned to them (match by profile.id)
CREATE POLICY "Barbers can view own bookings"
ON bookings FOR SELECT
USING (
  barber_id IN (
    SELECT id FROM profiles WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Managers/Admins/Super Admin: Can view ALL bookings
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- INSERT POLICY (Create bookings)
-- ============================================

CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM profiles 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role = 'customer'
  )
);

-- ============================================
-- UPDATE POLICIES (Modify bookings)
-- ============================================

-- Customers: Can update own bookings
CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
USING (
  customer_id IN (
    SELECT id FROM profiles WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM profiles WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Barbers: Can update assigned bookings
CREATE POLICY "Barbers can update own bookings"
ON bookings FOR UPDATE
USING (
  barber_id IN (
    SELECT id FROM profiles WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  barber_id IN (
    SELECT id FROM profiles WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Managers/Admins/Super Admin: Can update ALL bookings
CREATE POLICY "Managers and admins can update all bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role IN ('manager', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- DELETE POLICY (Remove bookings)
-- ============================================

-- Only Managers/Admins/Super Admin can delete bookings
CREATE POLICY "Managers and admins can delete bookings"
ON bookings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check all policies created
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'bookings' 
ORDER BY cmd, policyname;

-- Test if manager can see bookings (run while logged in as manager)
SELECT COUNT(*) as total_bookings FROM bookings;

-- Should return 2!
