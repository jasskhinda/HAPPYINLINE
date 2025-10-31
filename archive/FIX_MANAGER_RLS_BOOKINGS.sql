-- ============================================
-- FIX: Manager/Admin Can't See Bookings
-- ============================================
-- This fixes the RLS policy to use email lookup instead of ID match
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the existing RLS SELECT policy for managers
DROP POLICY IF EXISTS "Managers and admins view all bookings" ON bookings;

-- Step 2: Create new RLS SELECT policy that uses email lookup
-- This is more reliable than ID matching
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);

-- Step 3: Drop and recreate UPDATE policy for managers (same fix)
DROP POLICY IF EXISTS "Managers and admins can update all bookings" ON bookings;

CREATE POLICY "Managers and admins can update all bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);

-- Step 4: Drop and recreate DELETE policy for managers (same fix)
DROP POLICY IF EXISTS "Managers and admins can delete bookings" ON bookings;

CREATE POLICY "Managers and admins can delete bookings"
ON bookings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if new policies are created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'bookings'
AND policyname LIKE '%admin%'
ORDER BY policyname;

-- ============================================
-- WHY THIS FIXES THE ISSUE
-- ============================================

/*
PROBLEM:
- RLS policies were checking: auth.uid() = profiles.id
- But for some users (including managers), these IDs don't match
- This happens when profiles are created before auth signup

SOLUTION:
- New policies check: auth.uid() → get email → find profile by email
- Email is consistent across auth.users and profiles tables
- More reliable than direct ID matching

AFTER RUNNING THIS:
1. Log in as manager
2. Navigate to HomeScreen or BookingManagementScreen
3. You should now see all 2 bookings
4. Urgent notifications will appear on HomeScreen
5. All tabs in BookingManagementScreen will show bookings
*/
