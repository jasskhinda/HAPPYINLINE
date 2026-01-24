-- =====================================================
-- RESET ALL RLS TO SIMPLE WORKING POLICIES
-- =====================================================
-- This fixes ALL broken RLS policies with simple, permissive rules
-- Run this IMMEDIATELY to restore functionality
-- =====================================================

-- =====================================================
-- 1. PROFILES - CRITICAL FIX
-- =====================================================
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_read" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Simple: authenticated users can read all profiles
CREATE POLICY "profiles_select"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- 2. SHOPS - Simple policy
-- =====================================================
DROP POLICY IF EXISTS "shops_select_policy" ON shops;
DROP POLICY IF EXISTS "shops_read" ON shops;
DROP POLICY IF EXISTS "Anyone can view active shops" ON shops;
DROP POLICY IF EXISTS "Users can view shops" ON shops;

-- Authenticated users can read all shops
CREATE POLICY "shops_select"
ON shops FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 3. SHOP_SERVICES - Simple policy
-- =====================================================
DROP POLICY IF EXISTS "shop_services_select_policy" ON shop_services;
DROP POLICY IF EXISTS "shop_services_read" ON shop_services;
DROP POLICY IF EXISTS "Anyone can view active shop services" ON shop_services;
DROP POLICY IF EXISTS "Users can view shop services" ON shop_services;

-- Authenticated users can read all shop services
CREATE POLICY "shop_services_select"
ON shop_services FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 4. SHOP_STAFF - Simple policy
-- =====================================================
DROP POLICY IF EXISTS "shop_staff_select_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_read" ON shop_staff;
DROP POLICY IF EXISTS "Users can view shop staff" ON shop_staff;

-- Authenticated users can read all shop staff
CREATE POLICY "shop_staff_select"
ON shop_staff FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 5. SERVICE_PROVIDERS - Simple policy
-- =====================================================
DROP POLICY IF EXISTS "service_providers_select_policy" ON service_providers;

-- Authenticated users can read all service providers
CREATE POLICY "service_providers_select"
ON service_providers FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 6. BOOKINGS - Ensure customers can see their bookings
-- =====================================================
DROP POLICY IF EXISTS "bookings_select_policy" ON bookings;
DROP POLICY IF EXISTS "bookings_read" ON bookings;

-- Users can see bookings they're involved with
CREATE POLICY "bookings_select"
ON bookings FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR barber_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM shops WHERE id = bookings.shop_id AND created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM shop_staff WHERE shop_id = bookings.shop_id AND user_id = auth.uid()
    )
);

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'All SELECT policies:' as info;
SELECT tablename, policyname
FROM pg_policies
WHERE cmd = 'SELECT'
AND tablename IN ('profiles', 'shops', 'shop_services', 'shop_staff', 'service_providers', 'bookings')
ORDER BY tablename;

-- Quick test
SELECT 'Profile test:' as info;
SELECT id, name, role, exclusive_shop_id
FROM profiles
WHERE id = auth.uid();

SELECT 'RLS RESET COMPLETE - All policies simplified!' AS result;
