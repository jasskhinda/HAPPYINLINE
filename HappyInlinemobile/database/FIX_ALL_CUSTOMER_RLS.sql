-- =====================================================
-- FIX ALL RLS FOR CUSTOMER BOOKING FLOW
-- =====================================================
-- Fixes RLS for: shops, shop_services, shop_staff, service_providers
-- so customers linked via exclusive_shop_id can view all needed data
-- =====================================================

-- =====================================================
-- 1. FIX SHOPS TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS "shops_select_policy" ON shops;
DROP POLICY IF EXISTS "shops_read" ON shops;
DROP POLICY IF EXISTS "Anyone can view active shops" ON shops;
DROP POLICY IF EXISTS "Users can view shops" ON shops;

CREATE POLICY "shops_select_policy"
ON shops
FOR SELECT
USING (
    -- Shop owner
    created_by = auth.uid()
    OR
    -- Shop staff member
    EXISTS (
        SELECT 1 FROM shop_staff
        WHERE shop_id = shops.id
        AND user_id = auth.uid()
        AND is_active = true
    )
    OR
    -- Customer linked to the shop
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND exclusive_shop_id = shops.id
    )
    OR
    -- Super admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
    OR
    -- Public access for active/approved shops
    (is_active = true AND status IN ('active', 'approved'))
);

-- =====================================================
-- 2. FIX SHOP_SERVICES TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS "shop_services_select_policy" ON shop_services;
DROP POLICY IF EXISTS "shop_services_read" ON shop_services;
DROP POLICY IF EXISTS "Anyone can view active shop services" ON shop_services;
DROP POLICY IF EXISTS "Users can view shop services" ON shop_services;

CREATE POLICY "shop_services_select_policy"
ON shop_services
FOR SELECT
USING (
    -- Shop owner
    EXISTS (
        SELECT 1 FROM shops
        WHERE id = shop_services.shop_id
        AND created_by = auth.uid()
    )
    OR
    -- Shop staff member
    EXISTS (
        SELECT 1 FROM shop_staff
        WHERE shop_id = shop_services.shop_id
        AND user_id = auth.uid()
        AND is_active = true
    )
    OR
    -- Customer linked to the shop via exclusive_shop_id
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND exclusive_shop_id = shop_services.shop_id
    )
    OR
    -- Super admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
    OR
    -- Public access for active shops with active services
    (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM shops
            WHERE id = shop_services.shop_id
            AND is_active = true
            AND status IN ('active', 'approved')
        )
    )
);

-- =====================================================
-- 3. FIX SHOP_STAFF TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS "shop_staff_select_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_read" ON shop_staff;
DROP POLICY IF EXISTS "Users can view shop staff" ON shop_staff;

CREATE POLICY "shop_staff_select_policy"
ON shop_staff
FOR SELECT
USING (
    -- Shop owner
    EXISTS (
        SELECT 1 FROM shops
        WHERE id = shop_staff.shop_id
        AND created_by = auth.uid()
    )
    OR
    -- Shop staff member (can see colleagues)
    EXISTS (
        SELECT 1 FROM shop_staff ss
        WHERE ss.shop_id = shop_staff.shop_id
        AND ss.user_id = auth.uid()
        AND ss.is_active = true
    )
    OR
    -- Customer linked to the shop (for booking flow)
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND exclusive_shop_id = shop_staff.shop_id
    )
    OR
    -- Super admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
    OR
    -- Public access for active staff at active shops
    (
        is_active = true
        AND is_available = true
        AND EXISTS (
            SELECT 1 FROM shops
            WHERE id = shop_staff.shop_id
            AND is_active = true
            AND status IN ('active', 'approved')
        )
    )
);

-- =====================================================
-- 4. FIX SERVICE_PROVIDERS TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS "service_providers_select_policy" ON service_providers;

CREATE POLICY "service_providers_select_policy"
ON service_providers
FOR SELECT
USING (
    -- Shop owner
    EXISTS (
        SELECT 1 FROM shops
        WHERE id = service_providers.shop_id
        AND created_by = auth.uid()
    )
    OR
    -- Shop staff member
    EXISTS (
        SELECT 1 FROM shop_staff
        WHERE shop_id = service_providers.shop_id
        AND user_id = auth.uid()
        AND is_active = true
    )
    OR
    -- Customer linked to the shop (for booking flow)
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND exclusive_shop_id = service_providers.shop_id
    )
    OR
    -- Super admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
    OR
    -- Public access for active shops
    EXISTS (
        SELECT 1 FROM shops
        WHERE id = service_providers.shop_id
        AND is_active = true
        AND status IN ('active', 'approved')
    )
);

-- =====================================================
-- 5. FIX PROFILES TABLE RLS (for reading provider info)
-- =====================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_read" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "profiles_select_policy"
ON profiles
FOR SELECT
USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Super admin
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
    OR
    -- Can view profiles of staff at shops you have access to
    EXISTS (
        SELECT 1 FROM shop_staff ss
        WHERE ss.user_id = profiles.id
        AND ss.is_active = true
        AND (
            -- You're the shop owner
            EXISTS (
                SELECT 1 FROM shops s
                WHERE s.id = ss.shop_id
                AND s.created_by = auth.uid()
            )
            OR
            -- You're staff at the same shop
            EXISTS (
                SELECT 1 FROM shop_staff ss2
                WHERE ss2.shop_id = ss.shop_id
                AND ss2.user_id = auth.uid()
                AND ss2.is_active = true
            )
            OR
            -- You're a customer linked to the shop
            EXISTS (
                SELECT 1 FROM profiles p2
                WHERE p2.id = auth.uid()
                AND p2.exclusive_shop_id = ss.shop_id
            )
            OR
            -- Shop is public/active
            EXISTS (
                SELECT 1 FROM shops s2
                WHERE s2.id = ss.shop_id
                AND s2.is_active = true
                AND s2.status IN ('active', 'approved')
            )
        )
    )
);

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

SELECT 'Policies created:' as info;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('shops', 'shop_services', 'shop_staff', 'service_providers', 'profiles')
AND policyname LIKE '%select%'
ORDER BY tablename, policyname;

-- Check shop status
SELECT 'Shop status check:' as info;
SELECT id, name, is_active, status FROM shops LIMIT 5;

-- Check services exist
SELECT 'Services check:' as info;
SELECT COUNT(*) as total_services FROM shop_services WHERE is_active = true;

SELECT 'All customer RLS policies fixed!' AS result;
