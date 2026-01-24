-- =====================================================
-- FIX SHOP_SERVICES RLS FOR CUSTOMER ACCESS
-- =====================================================
-- This ensures customers linked to a shop can view its services
-- Run in Supabase SQL Editor
-- =====================================================

-- Step 1: Check current state
SELECT 'Current shop_services policies:' as info;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'shop_services';

-- Step 2: Check if shop is active
SELECT 'Shops status:' as info;
SELECT id, name, is_active, status
FROM shops
LIMIT 10;

-- Step 3: Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "shop_services_read" ON shop_services;
DROP POLICY IF EXISTS "shop_services_select_policy" ON shop_services;
DROP POLICY IF EXISTS "Anyone can view active shop services" ON shop_services;
DROP POLICY IF EXISTS "Users can view shop services" ON shop_services;

-- Step 4: Create permissive SELECT policy for shop_services
-- Allows:
-- 1. Shop owner/staff to view their shop's services
-- 2. Customers linked to the shop to view services
-- 3. Anyone to view services for active shops (for public booking pages)
CREATE POLICY "shop_services_select_policy"
ON shop_services
FOR SELECT
USING (
    -- Services must be active
    is_active = true
    AND (
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
        -- Public access for active shops (allows browsing)
        EXISTS (
            SELECT 1 FROM shops
            WHERE id = shop_services.shop_id
            AND is_active = true
            AND status IN ('active', 'approved')
        )
    )
);

-- Step 5: Ensure INSERT policy exists for owners
DROP POLICY IF EXISTS "shop_services_create" ON shop_services;
DROP POLICY IF EXISTS "shop_services_insert_policy" ON shop_services;

CREATE POLICY "shop_services_insert_policy"
ON shop_services
FOR INSERT
WITH CHECK (
    -- Shop owner
    EXISTS (
        SELECT 1 FROM shops
        WHERE id = shop_services.shop_id
        AND created_by = auth.uid()
    )
    OR
    -- Shop admin/manager
    EXISTS (
        SELECT 1 FROM shop_staff
        WHERE shop_id = shop_services.shop_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager', 'admin')
        AND is_active = true
    )
    OR
    -- Super admin
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Step 6: Ensure UPDATE policy exists
DROP POLICY IF EXISTS "shop_services_update" ON shop_services;
DROP POLICY IF EXISTS "shop_services_update_policy" ON shop_services;

CREATE POLICY "shop_services_update_policy"
ON shop_services
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM shops
        WHERE id = shop_services.shop_id
        AND created_by = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM shop_staff
        WHERE shop_id = shop_services.shop_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager', 'admin')
        AND is_active = true
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Step 7: Ensure DELETE policy exists
DROP POLICY IF EXISTS "shop_services_delete" ON shop_services;
DROP POLICY IF EXISTS "shop_services_delete_policy" ON shop_services;

CREATE POLICY "shop_services_delete_policy"
ON shop_services
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM shops
        WHERE id = shop_services.shop_id
        AND created_by = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM shop_staff
        WHERE shop_id = shop_services.shop_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager', 'admin')
        AND is_active = true
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Step 8: Verify new policies
SELECT 'New shop_services policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'shop_services';

-- Step 9: Test query (as if a customer is checking services)
SELECT 'Sample services query result:' as info;
SELECT
    ss.id,
    ss.name,
    ss.price,
    ss.is_active,
    s.name as shop_name,
    s.is_active as shop_is_active,
    s.status as shop_status
FROM shop_services ss
JOIN shops s ON s.id = ss.shop_id
WHERE ss.is_active = true
LIMIT 10;

SELECT 'Shop services RLS fix complete!' AS result;
