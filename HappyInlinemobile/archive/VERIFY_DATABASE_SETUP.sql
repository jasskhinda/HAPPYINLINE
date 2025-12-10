-- ============================================
-- VERIFY DATABASE SETUP
-- Run this in Supabase SQL Editor to check if fixes were applied
-- ============================================

-- 1. Check if booking_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- 2. Check current RLS policies on bookings table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY cmd, policyname;

-- 3. Check if there are any bookings in the database
SELECT 
  id,
  booking_id,
  customer_id,
  barber_id,
  status,
  appointment_date,
  appointment_time,
  created_at,
  services
FROM bookings
ORDER BY created_at DESC;

-- 4. Check profiles table for manager user
SELECT id, email, role, name
FROM profiles
WHERE role IN ('manager', 'admin', 'super_admin')
ORDER BY created_at;

-- 5. Test RLS policy for manager (run this while logged in as manager in Supabase dashboard)
-- This should return all bookings if RLS is working
SELECT COUNT(*) as total_bookings
FROM bookings;

-- 6. Check if trigger functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%booking%'
ORDER BY routine_name;
