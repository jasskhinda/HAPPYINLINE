-- Check if bookings table has any data
-- Run this in Supabase SQL Editor to verify bookings exist

-- 1. Count total bookings
SELECT COUNT(*) as total_bookings FROM bookings;

-- 2. Show all bookings with details
SELECT 
  b.id,
  b.booking_id,
  b.status,
  b.appointment_date,
  b.appointment_time,
  b.total_amount,
  b.is_confirmed_by_manager,
  b.customer_id,
  b.barber_id,
  b.services,
  b.created_at
FROM bookings b
ORDER BY b.created_at DESC;

-- 3. Show bookings with customer and barber names
SELECT 
  b.id,
  b.booking_id,
  b.status,
  b.appointment_date,
  b.appointment_time,
  c.name as customer_name,
  c.email as customer_email,
  bar.name as barber_name,
  b.services
FROM bookings b
LEFT JOIN profiles c ON b.customer_id = c.id
LEFT JOIN profiles bar ON b.barber_id = bar.id
ORDER BY b.created_at DESC;

-- 4. Check if there are any pending bookings specifically
SELECT COUNT(*) as pending_count 
FROM bookings 
WHERE status = 'pending';

-- 5. Show manager/admin users who should be able to see bookings
SELECT 
  id,
  name,
  email,
  role,
  is_super_admin
FROM profiles
WHERE role IN ('manager', 'admin', 'super_admin')
ORDER BY created_at;
