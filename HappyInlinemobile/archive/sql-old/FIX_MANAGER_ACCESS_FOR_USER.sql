-- =====================================================
-- FIX MANAGER ACCESS FOR yomek19737@hh7f.com
-- =====================================================

-- STEP 1: Check your user profile
SELECT
  id as user_id,
  email,
  name,
  role,
  created_at
FROM profiles
WHERE email = 'yomek19737@hh7f.com';

-- Expected result: You should see your user ID, email, and role


-- STEP 2: Check if you have any shops
SELECT
  id as shop_id,
  name as shop_name,
  status,
  email as shop_email,
  created_at
FROM shops
WHERE email = 'yomek19737@hh7f.com'
OR id IN (
  SELECT shop_id FROM shop_staff
  WHERE user_id = (SELECT id FROM profiles WHERE email = 'yomek19737@hh7f.com')
)
ORDER BY created_at DESC;

-- Expected result: You should see "Test shop" or any other shop you created


-- STEP 3: Check if you're in shop_staff table
SELECT
  ss.id,
  ss.shop_id,
  ss.user_id,
  ss.role,
  s.name as shop_name,
  s.status as shop_status
FROM shop_staff ss
JOIN shops s ON ss.shop_id = s.id
WHERE ss.user_id = (SELECT id FROM profiles WHERE email = 'yomek19737@hh7f.com')
ORDER BY ss.created_at DESC;

-- Expected result: You should see entries with role = 'manager' or 'admin'
-- If EMPTY → This is the problem!


-- =====================================================
-- FIX: Add yourself as manager to your shop
-- =====================================================

-- STEP 4: If shop exists but you're not in shop_staff, run this:
INSERT INTO shop_staff (shop_id, user_id, role)
SELECT
  s.id as shop_id,
  p.id as user_id,
  'manager' as role
FROM shops s
CROSS JOIN profiles p
WHERE s.email = 'yomek19737@hh7f.com'
  AND p.email = 'yomek19737@hh7f.com'
  AND NOT EXISTS (
    SELECT 1 FROM shop_staff ss
    WHERE ss.shop_id = s.id
    AND ss.user_id = p.id
  );

-- This will add you as manager to all shops owned by your email


-- STEP 5: Verify the fix worked
SELECT
  ss.role,
  s.name as shop_name,
  s.status,
  p.email,
  p.name as your_name
FROM shop_staff ss
JOIN shops s ON ss.shop_id = s.id
JOIN profiles p ON ss.user_id = p.id
WHERE p.email = 'yomek19737@hh7f.com';

-- Expected result: Should show you as 'manager' for your shop


-- =====================================================
-- ALTERNATIVE: If you have a specific shop ID
-- =====================================================

-- If you know your shop ID, use this instead:
/*
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES (
  'your-shop-id-here',
  (SELECT id FROM profiles WHERE email = 'yomek19737@hh7f.com'),
  'manager'
)
ON CONFLICT (shop_id, user_id) DO UPDATE
SET role = 'manager';
*/


-- =====================================================
-- DEBUG: Show all shops and their managers
-- =====================================================

SELECT
  s.id as shop_id,
  s.name as shop_name,
  s.status,
  s.email as shop_email,
  ss.role as staff_role,
  p.email as staff_email,
  p.name as staff_name
FROM shops s
LEFT JOIN shop_staff ss ON s.id = ss.shop_id
LEFT JOIN profiles p ON ss.user_id = p.id
WHERE s.email = 'yomek19737@hh7f.com'
   OR p.email = 'yomek19737@hh7f.com'
ORDER BY s.created_at DESC, ss.role;

-- This shows all relationships between your email and shops
