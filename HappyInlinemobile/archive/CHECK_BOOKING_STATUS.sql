-- ============================================
-- CHECK BOOKING STATUS AND DETAILS
-- ============================================

-- Show all booking details including status
SELECT 
  booking_id,
  status,
  appointment_date,
  appointment_time,
  customer_id,
  barber_id,
  is_confirmed_by_manager,
  services,
  created_at
FROM bookings
ORDER BY created_at DESC;

-- Count by status
SELECT status, COUNT(*) as count
FROM bookings
GROUP BY status;
