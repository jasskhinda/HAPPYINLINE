-- ============================================
-- FIX MANAGER ID MISMATCH - craftworld207@gmail.com
-- ============================================

-- Problem:
-- Auth User ID: 95db3733-8436-4930-b7b6-52b64026f985
-- Profile ID:    aac0b13e-e6dc-4d8c-9509-d07e1f49140c
-- They don't match → RLS blocks access!

-- Solution: Update profile ID to match auth ID

-- Step 1: Verify current state
SELECT 
  id as profile_id,
  email,
  name,
  role
FROM profiles
WHERE email = 'craftworld207@gmail.com';

-- Step 2: Update profile ID to match auth.uid()
UPDATE profiles
SET id = '95db3733-8436-4930-b7b6-52b64026f985'
WHERE email = 'craftworld207@gmail.com';

-- Step 3: Verify the fix
SELECT 
  id as profile_id,
  email,
  name,
  role
FROM profiles
WHERE email = 'craftworld207@gmail.com';

-- Step 4: Test if bookings are now visible
-- (Run this while logged in as manager in Supabase)
SELECT COUNT(*) as total_bookings FROM bookings;

-- Should return 2!

-- Step 5: Show the bookings
SELECT 
  booking_id,
  status,
  appointment_date,
  appointment_time
FROM bookings
ORDER BY created_at DESC;
