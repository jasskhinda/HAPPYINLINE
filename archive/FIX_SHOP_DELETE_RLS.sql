-- ===============================================
-- FIX SHOP DELETION RLS POLICIES
-- ===============================================
-- This script fixes RLS policies to allow shop admins to delete shops
-- and all related data (bookings, reviews, shop_services, staff)
-- ===============================================

-- STEP 1: Drop all existing DELETE policies
-- ===============================================

-- Shops
DROP POLICY IF EXISTS "shops_delete" ON shops;
DROP POLICY IF EXISTS "Shop admins can delete their shops" ON shops;
DROP POLICY IF EXISTS "Admin can delete shop" ON shops;
DROP POLICY IF EXISTS "Shop admin can delete shop" ON shops;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shops;

-- Shop Staff
DROP POLICY IF EXISTS "shop_staff_delete" ON shop_staff;
DROP POLICY IF EXISTS "Shop admins can delete staff" ON shop_staff;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shop_staff;

-- Shop Services
DROP POLICY IF EXISTS "shop_services_delete" ON shop_services;
DROP POLICY IF EXISTS "Shop admins can delete services" ON shop_services;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shop_services;

-- Bookings
DROP POLICY IF EXISTS "bookings_delete" ON bookings;
DROP POLICY IF EXISTS "Shop admins can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON bookings;

-- Reviews (shop_reviews table)
DROP POLICY IF EXISTS "reviews_delete" ON shop_reviews;
DROP POLICY IF EXISTS "Shop admins can delete reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Shop admins can delete shop reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shop_reviews;


-- STEP 2: Create new DELETE policies
-- ===============================================

-- 1. SHOPS - Allow admins to delete their own shops
CREATE POLICY "shops_delete_policy"
ON shops
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = shops.id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role = 'admin'
  )
);

-- 2. SHOP_STAFF - Allow admins to delete staff from their shops
CREATE POLICY "shop_staff_delete_policy"
ON shop_staff
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff ss
    WHERE ss.shop_id = shop_staff.shop_id
    AND ss.user_id = auth.uid()
    AND ss.role = 'admin'
  )
);

-- 3. SHOP_SERVICES - Allow admins to delete services from their shops
CREATE POLICY "shop_services_delete_policy"
ON shop_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = shop_services.shop_id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role = 'admin'
  )
);

-- 4. BOOKINGS - Allow admins to delete bookings from their shops
CREATE POLICY "bookings_delete_policy"
ON bookings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = bookings.shop_id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role = 'admin'
  )
);

-- 5. SHOP_REVIEWS - Allow admins to delete reviews for their shops
CREATE POLICY "shop_reviews_delete_policy"
ON shop_reviews
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = shop_reviews.shop_id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role = 'admin'
  )
);


-- STEP 3: Verify policies
-- ===============================================

-- Check all DELETE policies for shops table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'shops' AND cmd = 'DELETE';

-- Check all DELETE policies for related tables
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('shop_staff', 'shop_services', 'bookings', 'shop_reviews')
AND cmd = 'DELETE'
ORDER BY tablename;


-- ===============================================
-- TESTING QUERIES (Optional - Run after fixing)
-- ===============================================

-- Test 1: Check if current user is admin of any shop
-- SELECT shop_id, role FROM shop_staff WHERE user_id = auth.uid();

-- Test 2: Check shop ownership
-- SELECT s.id, s.name, ss.role 
-- FROM shops s
-- JOIN shop_staff ss ON ss.shop_id = s.id
-- WHERE ss.user_id = auth.uid() AND ss.role = 'admin';

-- ===============================================
-- COMPLETION MESSAGE
-- ===============================================
-- ✅ RLS DELETE policies have been fixed!
-- ✅ Shop admins can now delete their shops and all related data
-- ✅ All related tables (staff, services, bookings, shop_reviews) can be deleted by shop admins
