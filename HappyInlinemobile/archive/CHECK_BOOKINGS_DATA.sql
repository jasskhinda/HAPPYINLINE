-- ============================================
-- CHECK BOOKINGS DATA
-- Run this to see if bookings exist
-- ============================================

-- 1. Count total bookings
SELECT COUNT(*) as total_bookings FROM bookings;

-- 2. Show all bookings with details
SELECT 
  id,
  booking_id,
  customer_id,
  barber_id,
  status,
  appointment_date,
  appointment_time,
  services,
  created_at,
  is_confirmed_by_manager
FROM bookings
ORDER BY created_at DESC;

-- 3. Count bookings by status
SELECT status, COUNT(*) as count
FROM bookings
GROUP BY status
ORDER BY status;

-- 4. Check if booking_id column exists and has values
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' 
  AND column_name = 'booking_id';

-- 5. Check profiles for manager/admin users
SELECT id, email, role, name
FROM profiles
WHERE role IN ('manager', 'admin', 'super_admin')
ORDER BY created_at;
