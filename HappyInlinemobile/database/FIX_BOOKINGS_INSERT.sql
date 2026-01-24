-- =====================================================
-- FIX BOOKINGS INSERT POLICY
-- =====================================================
-- Allow customers to create bookings
-- =====================================================

-- Check existing policies
SELECT 'Current bookings policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings';

-- Drop existing insert policy if any
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;

-- Create INSERT policy - customers can create their own bookings
CREATE POLICY "bookings_insert_customer"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Verify
SELECT 'New bookings policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings';

SELECT 'Bookings INSERT policy added!' AS result;
