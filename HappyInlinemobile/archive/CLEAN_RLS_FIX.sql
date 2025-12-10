-- ============================================
-- CLEAN RLS FIX FOR BOOKINGS TABLE
-- ============================================
-- Run this in Supabase SQL Editor
-- Fixes customer booking access without breaking anything
-- ============================================

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins view all bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Managers and admins can delete bookings" ON bookings;

-- Step 2: Create SELECT policies (view bookings)
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (customer_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Barbers can view own bookings"
ON bookings FOR SELECT
USING (barber_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('manager', 'admin', 'super_admin')));

-- Step 3: Create INSERT policy (create bookings)
CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (customer_id = auth.uid() AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'customer'));

-- Step 4: Create UPDATE policies (modify bookings)
CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
USING (customer_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
WITH CHECK (customer_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Barbers can update own bookings"
ON bookings FOR UPDATE
USING (barber_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
WITH CHECK (barber_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Managers and admins can update all bookings"
ON bookings FOR UPDATE
USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('manager', 'admin', 'super_admin')))
WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('manager', 'admin', 'super_admin')));

-- Step 5: Create DELETE policy (remove bookings)
CREATE POLICY "Managers and admins can delete bookings"
ON bookings FOR DELETE
USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('manager', 'admin', 'super_admin')));

-- Verification
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY cmd, policyname;
