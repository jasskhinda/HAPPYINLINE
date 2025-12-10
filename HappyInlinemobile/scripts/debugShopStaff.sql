-- Debug: Check shop_staff table for Avon Barber Shop
-- Shop ID from error: 0dd5c721-187d-46eb-be84-5c733806c1e1

-- 1. Check the shop exists
SELECT
  id,
  name,
  email,
  created_by
FROM shops
WHERE id = '0dd5c721-187d-46eb-be84-5c733806c1e1';

-- 2. Check ALL shop_staff entries for this shop (ignore filters)
SELECT
  id,
  shop_id,
  user_id,
  role,
  is_active,
  is_available,
  hired_date,
  created_at
FROM shop_staff
WHERE shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1';

-- 3. Check with the exact same query the app uses
SELECT
  user_id,
  role,
  is_active
FROM shop_staff
WHERE shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
AND role IN ('admin', 'manager')
AND is_active = true
ORDER BY role ASC
LIMIT 1;

-- 4. Check if there's a staff entry but with is_active = false
SELECT
  user_id,
  role,
  is_active,
  'FOUND BUT INACTIVE!' as note
FROM shop_staff
WHERE shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
AND role IN ('admin', 'manager')
AND is_active = false;

-- 5. Join with profiles to see the full picture
SELECT
  ss.id,
  ss.shop_id,
  ss.user_id,
  ss.role,
  ss.is_active,
  p.name as user_name,
  p.email as user_email
FROM shop_staff ss
LEFT JOIN profiles p ON ss.user_id = p.id
WHERE ss.shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1';
