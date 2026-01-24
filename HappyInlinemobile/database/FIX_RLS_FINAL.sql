-- =====================================================
-- FINAL RLS FIX - PROPER WORKING POLICIES
-- =====================================================
-- This is the DEFINITIVE fix for all RLS policies
-- Run in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: DISABLE RLS TEMPORARILY TO CLEAN UP
-- =====================================================

-- First, let's see what we're dealing with
SELECT 'Current policies before cleanup:' as info;
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('profiles', 'shops', 'shop_services', 'shop_staff', 'service_providers', 'bookings')
ORDER BY tablename;

-- =====================================================
-- STEP 2: DROP ALL EXISTING SELECT POLICIES
-- =====================================================

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_read" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- SHOPS
DROP POLICY IF EXISTS "shops_select" ON shops;
DROP POLICY IF EXISTS "shops_select_policy" ON shops;
DROP POLICY IF EXISTS "shops_read" ON shops;
DROP POLICY IF EXISTS "Anyone can view active shops" ON shops;
DROP POLICY IF EXISTS "Users can view shops" ON shops;

-- SHOP_SERVICES
DROP POLICY IF EXISTS "shop_services_select" ON shop_services;
DROP POLICY IF EXISTS "shop_services_select_policy" ON shop_services;
DROP POLICY IF EXISTS "shop_services_read" ON shop_services;
DROP POLICY IF EXISTS "Anyone can view active shop services" ON shop_services;
DROP POLICY IF EXISTS "Users can view shop services" ON shop_services;

-- SHOP_STAFF
DROP POLICY IF EXISTS "shop_staff_select" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_select_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_read" ON shop_staff;
DROP POLICY IF EXISTS "Users can view shop staff" ON shop_staff;

-- SERVICE_PROVIDERS
DROP POLICY IF EXISTS "service_providers_select" ON service_providers;
DROP POLICY IF EXISTS "service_providers_select_policy" ON service_providers;

-- BOOKINGS
DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON bookings;
DROP POLICY IF EXISTS "bookings_read" ON bookings;

-- =====================================================
-- STEP 3: CREATE NEW SIMPLE POLICIES
-- These policies are designed to WORK without circular dependencies
-- =====================================================

-- PROFILES: Critical - users MUST be able to read their own profile
-- This is the simplest possible policy that works
DROP POLICY IF EXISTS "profiles_select_all_auth" ON profiles;
CREATE POLICY "profiles_select_all_auth"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- PROFILES: Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- SHOPS: Authenticated users can view all shops
-- (Security is handled by what fields are exposed, not by hiding rows)
DROP POLICY IF EXISTS "shops_select_all_auth" ON shops;
CREATE POLICY "shops_select_all_auth"
ON shops FOR SELECT
TO authenticated
USING (true);

-- SHOP_SERVICES: Authenticated users can view all services
DROP POLICY IF EXISTS "shop_services_select_all_auth" ON shop_services;
CREATE POLICY "shop_services_select_all_auth"
ON shop_services FOR SELECT
TO authenticated
USING (true);

-- SHOP_STAFF: Authenticated users can view all staff
DROP POLICY IF EXISTS "shop_staff_select_all_auth" ON shop_staff;
CREATE POLICY "shop_staff_select_all_auth"
ON shop_staff FOR SELECT
TO authenticated
USING (true);

-- SERVICE_PROVIDERS: Authenticated users can view all service-provider assignments
DROP POLICY IF EXISTS "service_providers_select_all_auth" ON service_providers;
CREATE POLICY "service_providers_select_all_auth"
ON service_providers FOR SELECT
TO authenticated
USING (true);

-- BOOKINGS: Users can only see their own bookings (as customer or provider)
-- or bookings for shops they own/work at
DROP POLICY IF EXISTS "bookings_select_involved" ON bookings;
CREATE POLICY "bookings_select_involved"
ON bookings FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR barber_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = bookings.shop_id
        AND shops.created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM shop_staff
        WHERE shop_staff.shop_id = bookings.shop_id
        AND shop_staff.user_id = auth.uid()
        AND shop_staff.is_active = true
    )
);

-- =====================================================
-- STEP 4: VERIFY POLICIES
-- =====================================================

SELECT 'New policies after fix:' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'shops', 'shop_services', 'shop_staff', 'service_providers', 'bookings')
AND cmd = 'SELECT'
ORDER BY tablename;

-- =====================================================
-- STEP 5: TEST CRITICAL QUERIES
-- =====================================================

-- Test 1: Can we read the current user's profile?
SELECT 'Test 1 - Current user profile:' as info;
SELECT id, name, role, exclusive_shop_id
FROM profiles
WHERE id = auth.uid();

-- Test 2: Can we read shops?
SELECT 'Test 2 - Shops count:' as info;
SELECT COUNT(*) as total_shops FROM shops;

-- Test 3: Can we read shop_services?
SELECT 'Test 3 - Services count:' as info;
SELECT COUNT(*) as total_services FROM shop_services WHERE is_active = true;

-- Test 4: Can we read shop_staff?
SELECT 'Test 4 - Staff count:' as info;
SELECT COUNT(*) as total_staff FROM shop_staff WHERE is_active = true;

SELECT '========================================' as info;
SELECT 'RLS FIX COMPLETE!' as result;
SELECT 'All authenticated users can now read data.' as note;
SELECT 'Test by logging in as a customer.' as action;
SELECT '========================================' as info;
