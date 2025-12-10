-- ============================================
-- CHECK: What columns exist in bookings table?
-- ============================================

-- 1. List ALL columns in bookings table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 2. Show first few bookings with whatever columns exist
SELECT * FROM bookings LIMIT 5;

-- 3. Count total bookings
SELECT COUNT(*) as total_bookings FROM bookings;

-- 4. Check if trigger functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%booking%'
ORDER BY routine_name;

-- 5. Check if triggers exist on bookings table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'bookings';
