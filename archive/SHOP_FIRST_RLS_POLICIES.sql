-- ============================================
-- SHOP-FIRST RLS POLICIES
-- Row Level Security for shop-centric architecture
-- ============================================
-- 
-- Run AFTER: SHOP_FIRST_DATABASE_SCHEMA.sql
--
-- SECURITY MODEL:
-- - Customers: Can view all shops, create bookings, review shops
-- - Barbers: Can view assigned bookings in their shop
-- - Managers: Can manage shop bookings, staff, services
-- - Admins: Full control over their shop
-- - Platform Admins: Can view/manage all shops
-- ============================================

-- ============================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
    END LOOP;
END $$;

-- ============================================
-- STEP 3: HELPER FUNCTIONS FOR RLS
-- ============================================

-- Get current user's ID
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_platform_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is admin of a shop
CREATE OR REPLACE FUNCTION is_shop_admin(p_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shop_staff 
    WHERE shop_id = p_shop_id 
      AND user_id = auth.uid() 
      AND role = 'admin'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is manager or admin of a shop
CREATE OR REPLACE FUNCTION is_shop_manager_or_admin(p_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shop_staff 
    WHERE shop_id = p_shop_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'manager')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is staff of a shop
CREATE OR REPLACE FUNCTION is_shop_staff(p_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shop_staff 
    WHERE shop_id = p_shop_id 
      AND user_id = auth.uid() 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_shop_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_shop_manager_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_shop_staff(UUID) TO authenticated;

-- ============================================
-- STEP 4: PROFILES TABLE POLICIES
-- ============================================

-- Everyone can view all profiles (for displaying names, images)
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile (during signup)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Only platform admins can update is_platform_admin flag
-- (This is enforced in app logic, not RLS)

-- ============================================
-- STEP 5: SHOPS TABLE POLICIES
-- ============================================

-- Anyone (including anonymous) can view active shops
CREATE POLICY "shops_select_public"
ON shops FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Authenticated users can create shops
CREATE POLICY "shops_insert"
ON shops FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Shop admins and platform admins can update shops
CREATE POLICY "shops_update"
ON shops FOR UPDATE
TO authenticated
USING (
  is_shop_admin(id) OR is_platform_admin()
)
WITH CHECK (
  is_shop_admin(id) OR is_platform_admin()
);

-- Only platform admins can delete shops
CREATE POLICY "shops_delete"
ON shops FOR DELETE
TO authenticated
USING (is_platform_admin());

-- ============================================
-- STEP 6: SHOP_STAFF TABLE POLICIES
-- ============================================

-- Staff can view other staff in their shop
-- Customers can view staff to see barbers
CREATE POLICY "shop_staff_select"
ON shop_staff FOR SELECT
TO authenticated
USING (
  is_shop_staff(shop_id) OR 
  is_platform_admin() OR
  -- Allow anyone to view active barbers (for booking)
  (role = 'barber' AND is_active = true)
);

-- Shop admins and managers can add staff
-- SPECIAL CASE: Shop creator can add themselves as admin (shop.created_by)
CREATE POLICY "shop_staff_insert"
ON shop_staff FOR INSERT
TO authenticated
WITH CHECK (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin() OR
  -- Allow shop creator to add themselves as first admin
  (role = 'admin' AND user_id = auth.uid() AND 
   EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND created_by = auth.uid()))
);

-- Shop admins and managers can update staff
-- Staff can update their own profile data
CREATE POLICY "shop_staff_update"
ON shop_staff FOR UPDATE
TO authenticated
USING (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin() OR
  user_id = auth.uid()
)
WITH CHECK (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin() OR
  user_id = auth.uid()
);

-- Shop admins can remove staff
CREATE POLICY "shop_staff_delete"
ON shop_staff FOR DELETE
TO authenticated
USING (
  is_shop_admin(shop_id) OR 
  is_platform_admin() OR
  user_id = auth.uid() -- Users can remove themselves
);

-- ============================================
-- STEP 7: SERVICES TABLE POLICIES
-- ============================================

-- Anyone can view active services for any shop
CREATE POLICY "services_select"
ON services FOR SELECT
TO authenticated, anon
USING (
  is_active = true OR 
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
);

-- Shop admins and managers can create services
CREATE POLICY "services_insert"
ON services FOR INSERT
TO authenticated
WITH CHECK (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
);

-- Shop admins and managers can update services
CREATE POLICY "services_update"
ON services FOR UPDATE
TO authenticated
USING (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
)
WITH CHECK (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
);

-- Shop admins and managers can delete services
CREATE POLICY "services_delete"
ON services FOR DELETE
TO authenticated
USING (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
);

-- ============================================
-- STEP 8: BOOKINGS TABLE POLICIES
-- ============================================

-- Users can view their own bookings
-- Shop staff can view shop bookings based on role
CREATE POLICY "bookings_select"
ON bookings FOR SELECT
TO authenticated
USING (
  -- Customer can see their own bookings
  customer_id = auth.uid() OR
  
  -- Shop managers and admins can see all shop bookings
  is_shop_manager_or_admin(shop_id) OR
  
  -- Barbers can see only their assigned bookings
  (barber_id = auth.uid() AND is_shop_staff(shop_id)) OR
  
  -- Platform admins see all
  is_platform_admin()
);

-- Customers can create bookings
CREATE POLICY "bookings_insert"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid()
);

-- Users can update bookings based on role
CREATE POLICY "bookings_update"
ON bookings FOR UPDATE
TO authenticated
USING (
  -- Customers can update their pending bookings
  (customer_id = auth.uid() AND status = 'pending') OR
  
  -- Shop managers and admins can update any shop booking
  is_shop_manager_or_admin(shop_id) OR
  
  -- Barbers can update their assigned bookings (status, notes)
  (barber_id = auth.uid() AND is_shop_staff(shop_id)) OR
  
  -- Platform admins can update any booking
  is_platform_admin()
)
WITH CHECK (
  (customer_id = auth.uid() AND status = 'pending') OR
  is_shop_manager_or_admin(shop_id) OR
  (barber_id = auth.uid() AND is_shop_staff(shop_id)) OR
  is_platform_admin()
);

-- Only shop managers, admins, and platform admins can delete bookings
CREATE POLICY "bookings_delete"
ON bookings FOR DELETE
TO authenticated
USING (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
);

-- ============================================
-- STEP 9: SHOP_REVIEWS TABLE POLICIES
-- ============================================

-- Anyone can view reviews for active shops
CREATE POLICY "reviews_select"
ON shop_reviews FOR SELECT
TO authenticated, anon
USING (
  is_visible = true OR 
  customer_id = auth.uid() OR 
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
);

-- Customers can create reviews for their completed bookings
CREATE POLICY "reviews_insert"
ON shop_reviews FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = auth.uid() AND
  -- Verify they have a completed booking at this shop
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = booking_id 
      AND customer_id = auth.uid() 
      AND shop_id = shop_reviews.shop_id
      AND status = 'completed'
  )
);

-- Customers can update their own reviews
CREATE POLICY "reviews_update"
ON shop_reviews FOR UPDATE
TO authenticated
USING (
  customer_id = auth.uid() OR 
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
)
WITH CHECK (
  customer_id = auth.uid() OR 
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin()
);

-- Customers and shop admins can delete reviews
CREATE POLICY "reviews_delete"
ON shop_reviews FOR DELETE
TO authenticated
USING (
  customer_id = auth.uid() OR 
  is_shop_admin(shop_id) OR 
  is_platform_admin()
);

-- ============================================
-- STEP 10: VERIFICATION
-- ============================================

SELECT '✅ RLS policies created successfully!' as status;

-- Count policies by table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- List all policies
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT '🎉 Shop-first RLS complete!' as result;
SELECT '📝 Next: Update frontend auth functions' as next_step;

-- ============================================
-- TESTING QUERIES
-- ============================================

/*
-- Test as shop admin
SELECT * FROM shops; -- Should see all active shops
SELECT * FROM shop_staff WHERE shop_id = 'your-shop-id'; -- Should see staff
SELECT * FROM services WHERE shop_id = 'your-shop-id'; -- Should see services
SELECT * FROM bookings WHERE shop_id = 'your-shop-id'; -- Should see all shop bookings

-- Test as barber
SELECT * FROM bookings WHERE barber_id = auth.uid(); -- Should see only assigned bookings

-- Test as customer
SELECT * FROM shops; -- Should see all active shops
SELECT * FROM bookings WHERE customer_id = auth.uid(); -- Should see own bookings
*/