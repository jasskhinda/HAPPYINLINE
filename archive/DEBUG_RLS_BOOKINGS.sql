-- ============================================
-- DEBUG: Why Manager Can't See Bookings
-- ============================================

-- 1. Check if bookings exist
SELECT 
  id,
  booking_id,
  customer_id,
  barber_id,
  status,
  appointment_date,
  appointment_time,
  created_at
FROM bookings
ORDER BY created_at DESC;

-- 2. Check manager's profile and role
SELECT 
  id,
  name,
  email,
  role,
  is_super_admin
FROM profiles
WHERE role IN ('manager', 'admin', 'super_admin');

-- 3. CRITICAL: Check what auth.uid() returns when manager is logged in
-- Run this query while logged in as manager in Supabase SQL Editor
SELECT auth.uid() as current_user_id;

-- 4. Check if the RLS policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 5. Test the RLS SELECT policy logic manually
-- Replace 'YOUR_MANAGER_UUID' with actual manager's UUID from profiles table
SELECT 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() -- This should match manager's UUID
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  ) as can_manager_view_bookings;

-- 6. IMPORTANT: Check if profiles table has the manager's auth.uid()
-- The issue might be that manager's profiles.id doesn't match auth.uid()
SELECT 
  p.id as profile_id,
  p.email,
  p.role,
  au.id as auth_user_id
FROM profiles p
LEFT JOIN auth.users au ON p.email = au.email
WHERE p.role IN ('manager', 'admin', 'super_admin');

-- 7. If the above shows mismatch, this is the fix:
-- Update profiles.id to match auth.users.id
-- UNCOMMENT AND RUN THIS IF THERE'S A MISMATCH:

/*
UPDATE profiles
SET id = (SELECT id FROM auth.users WHERE auth.users.email = profiles.email)
WHERE email = 'YOUR_MANAGER_EMAIL@example.com'
AND role IN ('manager', 'admin', 'super_admin');
*/

-- 8. After fixing, verify the manager can see bookings:
-- This simulates what fetchAllBookingsForManagers() does
SELECT 
  b.*,
  c.name as customer_name,
  c.email as customer_email,
  bar.name as barber_name
FROM bookings b
LEFT JOIN profiles c ON b.customer_id = c.id
LEFT JOIN profiles bar ON b.barber_id = bar.id
ORDER BY b.created_at DESC;

-- ============================================
-- EXPLANATION
-- ============================================

/*
WHY MANAGERS CAN'T SEE BOOKINGS:

The RLS policy uses auth.uid() which returns the UUID from auth.users table.
The policy checks if this UUID exists in profiles table with role 'manager'.

PROBLEM: 
If profiles.id (manager's profile ID) doesn't match auth.uid() (manager's auth ID),
the RLS policy fails and blocks access.

SOLUTION:
1. Run query #6 above to check if there's a mismatch
2. If mismatch exists, update profiles.id to match auth.users.id
3. This ensures auth.uid() = profiles.id for the manager

AFTER FIX:
When manager logs in:
- auth.uid() returns their auth UUID
- RLS policy finds their profile in profiles table with matching UUID
- Policy allows SELECT access to all bookings
- fetchAllBookingsForManagers() returns data successfully
*/

-- ============================================
-- ALTERNATIVE FIX: Update RLS Policy
-- ============================================

/*
If you don't want to update profiles.id, you can modify the RLS policy
to check by email instead of id:
*/

-- Drop existing policy
-- DROP POLICY IF EXISTS "Managers and admins view all bookings" ON bookings;

-- Create new policy that checks by email
/*
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);
*/
