-- =====================================================
-- REMOVE SUPER ADMIN FROM SHOP STAFF
-- =====================================================
-- This script removes the super admin from being listed
-- as staff in any shop. Super admin should only oversee
-- shops, not be a member of them.
-- =====================================================

-- Step 1: Check current shop_staff entries for super admin
SELECT
  ss.id,
  ss.shop_id,
  s.name as shop_name,
  ss.user_id,
  p.email,
  p.name as user_name,
  ss.role,
  p.is_super_admin
FROM shop_staff ss
JOIN profiles p ON ss.user_id = p.id
JOIN shops s ON ss.shop_id = s.id
WHERE p.email = 'info@jasskhinda.com'
  AND p.is_super_admin = true;

-- Step 2: Remove super admin from all shop_staff entries
-- This will remove you as manager/admin/barber from all shops
DELETE FROM shop_staff
WHERE user_id IN (
  SELECT id
  FROM profiles
  WHERE email = 'info@jasskhinda.com'
    AND is_super_admin = true
);

-- Step 3: Verify removal
SELECT
  ss.id,
  ss.shop_id,
  s.name as shop_name,
  ss.user_id,
  p.email,
  p.name as user_name,
  ss.role
FROM shop_staff ss
JOIN profiles p ON ss.user_id = p.id
JOIN shops s ON ss.shop_id = s.id
WHERE p.email = 'info@jasskhinda.com';

-- =====================================================
-- RESULT:
-- You should see NO rows in the final query
-- This means you're no longer a staff member of any shop
-- You'll still be super admin and can VIEW all shops
-- =====================================================

-- =====================================================
-- EXPLANATION:
-- Super Admin should NOT be in shop_staff table
-- Super Admin oversees ALL shops from platform level
-- Shop owners/managers are in shop_staff table
-- =====================================================
