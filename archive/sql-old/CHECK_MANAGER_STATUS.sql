-- Check if user has a shop and is set as manager
-- Replace 'your-email@example.com' with your actual email

-- 1. Find your user ID
SELECT id, email, name
FROM profiles
WHERE email = 'your-email@example.com';

-- 2. Check if you have any shop_staff entries
SELECT
  ss.id,
  ss.shop_id,
  ss.user_id,
  ss.role,
  s.name as shop_name,
  s.status as shop_status
FROM shop_staff ss
JOIN shops s ON ss.shop_id = s.id
WHERE ss.user_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com')
ORDER BY ss.created_at DESC;

-- 3. If you created a shop but aren't in shop_staff, this is the problem!
-- Check shops created by you
SELECT
  id,
  name,
  status,
  created_at,
  email
FROM shops
WHERE email = 'your-email@example.com'
ORDER BY created_at DESC;

-- 4. FIX: If shop exists but you're not in shop_staff, add yourself as manager
-- REPLACE 'your-shop-id' and 'your-user-id' with actual values from queries above
/*
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES (
  'your-shop-id',
  'your-user-id',
  'manager'
);
*/

-- 5. Alternative: Check by looking at all shops and their staff
SELECT
  s.name as shop_name,
  s.email as shop_email,
  s.status,
  ss.role,
  p.email as staff_email,
  p.name as staff_name
FROM shops s
LEFT JOIN shop_staff ss ON s.id = ss.shop_id
LEFT JOIN profiles p ON ss.user_id = p.id
ORDER BY s.created_at DESC;
