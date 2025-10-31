-- ============================================================================
-- COMPLETE FIX FOR SHOP DELETION ISSUE
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- This fixes the RLS policies that are blocking shop deletion

-- ============================================================================
-- STEP 1: CHECK CURRENT POLICIES
-- ============================================================================

-- See what policies exist (for reference)
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('shops', 'services', 'bookings', 'reviews', 'shop_reviews', 'shop_staff')
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 2: DROP EXISTING DELETE POLICIES
-- ============================================================================

-- Drop all existing DELETE policies to start fresh
DROP POLICY IF EXISTS "Shop admins can delete their shops" ON shops;
DROP POLICY IF EXISTS "Admin can delete shop" ON shops;
DROP POLICY IF EXISTS "Shop admin can delete shop" ON shops;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shops;

DROP POLICY IF EXISTS "Shop admins can delete shop services" ON services;
DROP POLICY IF EXISTS "Shop admins can delete services" ON services;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON services;

DROP POLICY IF EXISTS "Shop admins can delete shop bookings" ON bookings;
DROP POLICY IF EXISTS "Shop admins can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON bookings;

DROP POLICY IF EXISTS "Shop admins can delete shop reviews" ON reviews;
DROP POLICY IF EXISTS "Shop admins can delete reviews" ON reviews;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON reviews;

DROP POLICY IF EXISTS "Shop admins can delete shop reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Shop admins can delete reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shop_reviews;

DROP POLICY IF EXISTS "Users can manage shop staff" ON shop_staff;
DROP POLICY IF EXISTS "Shop admins can delete staff" ON shop_staff;
DROP POLICY IF EXISTS "Manage shop staff" ON shop_staff;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shop_staff;

-- ============================================================================
-- STEP 3: CREATE PROPER DELETE POLICIES
-- ============================================================================

-- SHOPS: Allow admins to delete their shops
CREATE POLICY "Shop admins can delete their shops"
ON shops
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- SERVICES: Allow admins to delete shop services
CREATE POLICY "Shop admins can delete shop services"
ON services
FOR DELETE
TO authenticated
USING (
  shop_id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- BOOKINGS: Allow admins to delete shop bookings
CREATE POLICY "Shop admins can delete shop bookings"
ON bookings
FOR DELETE
TO authenticated
USING (
  shop_id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- REVIEWS: Allow admins to delete shop reviews (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    EXECUTE '
      CREATE POLICY "Shop admins can delete shop reviews"
      ON reviews
      FOR DELETE
      TO authenticated
      USING (
        shop_id IN (
          SELECT shop_id FROM shop_staff
          WHERE user_id = auth.uid()
          AND role = ''admin''
        )
      );
    ';
  END IF;
END$$;

-- SHOP_REVIEWS: Allow admins to delete shop reviews (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_reviews') THEN
    EXECUTE '
      CREATE POLICY "Shop admins can delete shop reviews"
      ON shop_reviews
      FOR DELETE
      TO authenticated
      USING (
        shop_id IN (
          SELECT shop_id FROM shop_staff
          WHERE user_id = auth.uid()
          AND role = ''admin''
        )
      );
    ';
  END IF;
END$$;

-- SHOP_STAFF: Allow admins to delete staff members
CREATE POLICY "Shop admins can delete shop staff"
ON shop_staff
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR -- Users can remove themselves
  shop_id IN (
    SELECT shop_id FROM shop_staff admin_check
    WHERE admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  )
);

-- ============================================================================
-- STEP 4: ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

-- Enable for review tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    EXECUTE 'ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_reviews') THEN
    EXECUTE 'ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;';
  END IF;
END$$;

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Check that policies were created successfully
SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename IN ('shops', 'services', 'bookings', 'reviews', 'shop_reviews', 'shop_staff')
AND cmd = 'DELETE'
ORDER BY tablename;

-- Check which shops you can delete (should show shops where you're admin)
SELECT 
  sh.id,
  sh.name,
  ss.role as your_role
FROM shops sh
INNER JOIN shop_staff ss ON sh.id = ss.shop_id
WHERE ss.user_id = auth.uid()
AND ss.role = 'admin';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'DELETE policies have been fixed! You should now be able to delete shops where you are admin.' as status;

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

/*
If you STILL can't delete after running this script:

1. Verify you're actually an admin:
   SELECT * FROM shop_staff 
   WHERE user_id = auth.uid() 
   AND shop_id = 'YOUR_SHOP_ID';

2. Check if there are foreign key constraints blocking deletion:
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     rc.delete_rule
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
   JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
   AND ccu.table_name = 'shops';

3. Temporarily disable RLS to test (TESTING ONLY - NOT FOR PRODUCTION):
   ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
   -- Try deletion
   -- Then re-enable:
   ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

4. Check for any triggers that might be blocking:
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE event_object_table IN ('shops', 'services', 'bookings', 'reviews', 'shop_reviews', 'shop_staff');
*/
