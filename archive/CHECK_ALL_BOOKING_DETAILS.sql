-- ============================================
-- CHECK ALL BOOKING DETAILS
-- Show everything to debug the issue
-- ============================================

-- Show ALL columns for both bookings
SELECT * FROM bookings ORDER BY created_at DESC;

-- Show specific columns clearly
SELECT 
  id,
  booking_id,
  status,
  customer_id,
  barber_id,
  appointment_date,
  appointment_time,
  created_at
FROM bookings
ORDER BY created_at DESC;

-- Check what status values exist
SELECT DISTINCT status FROM bookings;
