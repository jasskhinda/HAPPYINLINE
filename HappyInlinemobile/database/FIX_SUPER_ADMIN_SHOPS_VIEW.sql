-- FIX_SUPER_ADMIN_SHOPS_VIEW.sql
-- Allows super_admin users (role = 'super_admin') to view ALL shops
-- IMPORTANT: This uses simple, non-recursive policies
-- Run this in Supabase SQL Editor

-- ============================================================
-- STEP 1: Drop ALL existing shops policies to avoid conflicts
-- ============================================================

DROP POLICY IF EXISTS "shops_select_simple" ON shops;
DROP POLICY IF EXISTS "shops_select_with_super_admin" ON shops;
DROP POLICY IF EXISTS "shops_update_simple" ON shops;
DROP POLICY IF EXISTS "shops_update_with_super_admin" ON shops;

-- ============================================================
-- STEP 2: Create simple SELECT policy (NO shop_staff reference!)
-- ============================================================

-- Policy 1: Super admins can see ALL shops
CREATE POLICY "shops_super_admin_select" ON shops
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Policy 2: Anyone can see approved shops
CREATE POLICY "shops_approved_select" ON shops
FOR SELECT
USING (status = 'approved');

-- Policy 3: Owner can see their own shops (any status)
CREATE POLICY "shops_owner_select" ON shops
FOR SELECT
USING (created_by = auth.uid());

-- ============================================================
-- STEP 3: Create simple UPDATE policies
-- ============================================================

-- Policy 1: Super admins can update any shop
CREATE POLICY "shops_super_admin_update" ON shops
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Policy 2: Owner can update their own shop
CREATE POLICY "shops_owner_update" ON shops
FOR UPDATE
USING (created_by = auth.uid());

-- ============================================================
-- STEP 4: Make sure INSERT and DELETE policies exist
-- ============================================================

-- Keep insert policy simple
DROP POLICY IF EXISTS "shops_insert_simple" ON shops;
CREATE POLICY "shops_insert_simple" ON shops
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
);

-- Keep delete policy simple
DROP POLICY IF EXISTS "shops_delete_simple" ON shops;
CREATE POLICY "shops_delete_simple" ON shops
FOR DELETE
USING (created_by = auth.uid());

-- ============================================================
-- STEP 5: Verify the new policies
-- ============================================================

SELECT 'shops' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'shops' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Expected output:
-- shops_delete_simple (DELETE)
-- shops_insert_simple (INSERT)
-- shops_approved_select (SELECT)
-- shops_owner_select (SELECT)
-- shops_super_admin_select (SELECT)
-- shops_owner_update (UPDATE)
-- shops_super_admin_update (UPDATE)
