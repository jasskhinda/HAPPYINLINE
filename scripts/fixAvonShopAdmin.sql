-- Fix: Add admin to Avon Barber Shop
-- This script will add the shop creator/owner as admin if missing
-- Shop email: app@theavonbarbershop.com
-- Run this in Supabase SQL Editor

-- Step 1: Check the current situation
SELECT
  s.id as shop_id,
  s.name as shop_name,
  s.email as shop_email,
  s.created_by,
  p.name as creator_name,
  p.email as creator_email
FROM shops s
LEFT JOIN profiles p ON s.created_by = p.id
WHERE s.email = 'app@theavonbarbershop.com' OR s.name LIKE '%Avon%';

-- Step 2: Check if admin already exists
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
  SELECT id FROM shops
  WHERE email = 'app@theavonbarbershop.com' OR name LIKE '%Avon%'
)
AND ss.role IN ('admin', 'manager');

-- If the query above returns empty, you need to add an admin!

-- Step 3: Add the creator as admin (if not already added)
-- This will insert the shop creator as admin
INSERT INTO shop_staff (shop_id, user_id, role, is_active)
SELECT
  s.id as shop_id,
  s.created_by as user_id,
  'admin' as role,
  true as is_active
FROM shops s
WHERE (s.email = 'app@theavonbarbershop.com' OR s.name LIKE '%Avon%')
AND s.created_by IS NOT NULL
-- Only insert if not already exists
AND NOT EXISTS (
  SELECT 1 FROM shop_staff ss
  WHERE ss.shop_id = s.id
  AND ss.user_id = s.created_by
  AND ss.role IN ('admin', 'manager')
)
RETURNING *;

-- Step 4: Verify the fix worked
SELECT
  s.name as shop_name,
  s.email as shop_email,
  p.name as admin_name,
  p.email as admin_email,
  ss.role,
  ss.is_active,
  '✅ Admin exists! Message Shop should work now.' as status
FROM shops s
JOIN shop_staff ss ON s.id = ss.shop_id
JOIN profiles p ON ss.user_id = p.id
WHERE (s.email = 'app@theavonbarbershop.com' OR s.name LIKE '%Avon%')
AND ss.role IN ('admin', 'manager');

-- If this returns a row, you're good to go!
-- If empty, the shop might not have a created_by set
