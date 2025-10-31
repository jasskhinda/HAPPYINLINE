-- ============================================
-- CORRECT FIX - Update RLS Policy to Check Correctly
-- ============================================

-- The problem: Current RLS policy compares auth.uid() with profiles.id
-- But they should be different! Profile ID is separate from auth ID.

-- The real question RLS should answer:
-- "Does the logged-in user (auth.uid()) have a profile with manager role?"

-- Drop old incorrect policy
DROP POLICY IF EXISTS "Managers and admins view all bookings" ON bookings;

-- Create correct policy that checks if auth.uid() has a manager profile
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role IN ('manager', 'admin', 'super_admin')
  )
);

-- Verify the policy
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY cmd, policyname;
