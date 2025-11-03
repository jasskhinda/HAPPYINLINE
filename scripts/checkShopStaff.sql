-- Check if Avon Barber Shop has admin or manager staff
-- Run this in Supabase SQL Editor

-- First, find the shop
SELECT
  id,
  name,
  created_by_user_id
FROM shops
WHERE name LIKE '%Avon%';

-- Then check shop_staff for this shop
SELECT
  ss.id,
  ss.shop_id,
  ss.user_id,
  ss.role,
  ss.is_active,
  p.name as staff_name,
  p.email as staff_email
FROM shop_staff ss
JOIN profiles p ON ss.user_id = p.id
WHERE ss.shop_id IN (
  SELECT id FROM shops WHERE name LIKE '%Avon%'
);

-- Check if there's an admin or manager
SELECT
  COUNT(*) as admin_manager_count,
  ss.role
FROM shop_staff ss
WHERE ss.shop_id IN (
  SELECT id FROM shops WHERE name LIKE '%Avon%'
)
AND ss.role IN ('admin', 'manager')
AND ss.is_active = true
GROUP BY ss.role;
