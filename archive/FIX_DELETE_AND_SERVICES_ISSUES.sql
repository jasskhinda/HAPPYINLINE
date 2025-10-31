-- ============================================================================
-- DIAGNOSTIC & FIX SCRIPT FOR DELETE & SERVICES DISPLAY ISSUES
-- ============================================================================

-- Issue 1: Delete shop not working
-- Issue 2: Services not displaying after creation

-- ============================================================================
-- PART 1: DIAGNOSTIC QUERIES
-- ============================================================================

-- Check all services (to see if they were created)
SELECT 
  s.id,
  s.shop_id,
  sh.name as shop_name,
  s.name as service_name,
  s.price,
  s.duration,
  s.is_active
FROM services s
LEFT JOIN shops sh ON s.shop_id = sh.id
ORDER BY s.created_at DESC
LIMIT 20;

-- Check RLS policies on services table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'services';

-- Check RLS policies on shops table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'shops';

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables
WHERE tablename IN ('shops', 'services', 'shop_staff', 'bookings', 'reviews');

-- ============================================================================
-- PART 2: FIX SERVICES DISPLAY ISSUE
-- ============================================================================

-- The issue might be that services SELECT policy doesn't include service data properly
-- Let's check and recreate the services SELECT policy

-- Drop existing SELECT policy for services
DROP POLICY IF EXISTS "Users can view active services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Enable read access for all users" ON services;

-- Create comprehensive SELECT policy for services
-- Allow anyone (authenticated or not) to view active services
CREATE POLICY "Anyone can view active services"
ON services
FOR SELECT
TO public
USING (is_active = true);

-- Also allow shop staff to view all services (including inactive)
CREATE POLICY "Shop staff can view all shop services"
ON services
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = services.shop_id
    AND shop_staff.user_id = auth.uid()
  )
);

-- ============================================================================
-- PART 3: FIX DELETE SHOP ISSUE
-- ============================================================================

-- The delete might be failing due to RLS policies
-- Let's check and fix the DELETE policy for shops

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Admin can delete shop" ON shops;
DROP POLICY IF EXISTS "Shop admin can delete shop" ON shops;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shops;

-- Create proper DELETE policy for shops
CREATE POLICY "Shop admins can delete their shops"
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

-- Fix DELETE policies for related tables (needed for cascade delete)

-- Reviews DELETE policy (handle both table names)
DROP POLICY IF EXISTS "Shop admins can delete reviews" ON reviews;
DROP POLICY IF EXISTS "Shop admins can delete reviews" ON shop_reviews;

-- For 'reviews' table
CREATE POLICY "Shop admins can delete shop reviews"
ON reviews
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = reviews.shop_id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role = 'admin'
  )
);

-- For 'shop_reviews' table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_reviews') THEN
    EXECUTE '
      CREATE POLICY "Shop admins can delete shop reviews"
      ON shop_reviews
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM shop_staff
          WHERE shop_staff.shop_id = shop_reviews.shop_id
          AND shop_staff.user_id = auth.uid()
          AND shop_staff.role = ''admin''
        )
      );
    ';
  END IF;
END$$;

-- Bookings DELETE policy
DROP POLICY IF EXISTS "Shop admins can delete bookings" ON bookings;
CREATE POLICY "Shop admins can delete shop bookings"
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

-- Services DELETE policy
DROP POLICY IF EXISTS "Shop admins can delete services" ON services;
CREATE POLICY "Shop admins can delete shop services"
ON services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = services.shop_id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role = 'admin'
  )
);

-- Shop staff DELETE policy (user can delete themselves or admin can delete anyone)
DROP POLICY IF EXISTS "Manage shop staff" ON shop_staff;
DROP POLICY IF EXISTS "Shop admins can delete staff" ON shop_staff;
CREATE POLICY "Users can manage shop staff"
ON shop_staff
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR -- User can remove themselves
  EXISTS (
    SELECT 1 FROM shop_staff admin_check
    WHERE admin_check.shop_id = shop_staff.shop_id
    AND admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  )
);

-- ============================================================================
-- PART 4: VERIFICATION QUERIES
-- ============================================================================

-- After running the fixes, verify with these queries:

-- 1. Check services are readable
SELECT 
  COUNT(*) as total_services,
  COUNT(CASE WHEN is_active THEN 1 END) as active_services
FROM services;

-- 2. Check you can see services for your shop
SELECT 
  s.*,
  ss.role as your_role
FROM services s
INNER JOIN shop_staff ss ON s.shop_id = ss.shop_id
WHERE ss.user_id = auth.uid()
ORDER BY s.created_at DESC;

-- 3. Check shops you can delete (should show shops where you're admin)
SELECT 
  sh.id,
  sh.name,
  ss.role
FROM shops sh
INNER JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid()
AND ss.role = 'admin';

-- ============================================================================
-- PART 5: ALTERNATIVE FIX - DISABLE RLS TEMPORARILY (NOT RECOMMENDED FOR PRODUCTION)
-- ============================================================================

-- If policies are still causing issues, you can temporarily disable RLS
-- CAUTION: This makes tables publicly accessible - only for testing!

-- Disable RLS (for testing only)
-- ALTER TABLE services DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shops DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS after testing
-- ALTER TABLE services ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 6: CHECK FOR FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Check foreign key constraints that might block deletion
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (tc.table_name IN ('shops', 'services', 'bookings', 'reviews', 'shop_staff')
     OR ccu.table_name = 'shops');

-- ============================================================================
-- TROUBLESHOOTING STEPS
-- ============================================================================

/*
1. FOR SERVICES NOT SHOWING:
   a. Run diagnostic query to check if services exist in database
   b. Check if is_active = true for those services
   c. Run the services SELECT policy fixes
   d. Test by querying services table directly
   e. Check app console logs for error messages

2. FOR DELETE NOT WORKING:
   a. Check if you're actually an admin of the shop (query shop_staff)
   b. Run the DELETE policy fixes for all tables
   c. Check foreign key constraints
   d. Try deleting related records manually first (for testing)
   e. Check app console logs for specific error messages

3. COMMON ISSUES:
   - RLS policies preventing SELECT on services
   - RLS policies preventing DELETE on shops or related tables
   - Foreign key constraints not set to CASCADE
   - User not actually an admin of the shop
   - Session/auth issues (user not logged in properly)
*/

-- ============================================================================
-- QUICK TEST - Run this as a shop admin
-- ============================================================================

-- This should show your role
SELECT 
  sh.name as shop_name,
  ss.role as my_role
FROM shops sh
INNER JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid();

-- This should show services for your shops
SELECT 
  sh.name as shop_name,
  s.name as service_name,
  s.is_active
FROM services s
INNER JOIN shops sh ON s.shop_id = sh.id
INNER JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid();
