-- ============================================
-- DEBUG RLS - Test if Manager Can See Bookings
-- ============================================

-- Test 1: Check your manager profile
SELECT id, email, role, name
FROM profiles
WHERE role IN ('manager', 'admin', 'super_admin');

-- Test 2: Get current auth user (run this while logged in as manager in Supabase)
SELECT auth.uid() as my_auth_id;

-- Test 3: Check if your auth.uid() matches a manager profile
SELECT 
  auth.uid() as current_auth_uid,
  (SELECT id FROM profiles WHERE id = auth.uid()) as my_profile_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as my_role;

-- Test 4: Try to select bookings (this tests RLS policy)
-- Run this while logged in as manager in Supabase Dashboard
SELECT COUNT(*) as total_bookings FROM bookings;

-- Test 5: Show the actual bookings if RLS allows
SELECT 
  id,
  booking_id,
  status,
  customer_id,
  barber_id,
  appointment_date,
  appointment_time
FROM bookings
ORDER BY created_at DESC;

-- Test 6: Check if the RLS policy is correctly checking role
SELECT 
  auth.uid() as my_uid,
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin', 'super_admin')
  ) as should_have_access;
