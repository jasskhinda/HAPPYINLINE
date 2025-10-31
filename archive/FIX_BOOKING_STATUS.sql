-- ============================================
-- FIX BOOKING STATUS IF NULL OR INVALID
-- ============================================

-- First, check current status values
SELECT 
  id,
  booking_id,
  status,
  CASE 
    WHEN status IS NULL THEN 'NULL'
    WHEN status = '' THEN 'EMPTY STRING'
    ELSE status
  END as status_display
FROM bookings
ORDER BY created_at DESC;

-- Check if status column allows NULL
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'status';

-- Fix any NULL or empty status values to 'pending'
UPDATE bookings
SET status = 'pending'
WHERE status IS NULL OR status = '';

-- Verify the fix
SELECT 
  booking_id,
  status,
  appointment_date,
  appointment_time
FROM bookings
ORDER BY created_at DESC;
