-- FIX_ALL_RLS_POLICIES.sql
-- Fixes infinite recursion in BOTH shops and shop_staff tables
-- Run this in Supabase SQL Editor

-- ============================================================
-- PART 1: FIX SHOPS TABLE
-- ============================================================

-- Step 1: Disable RLS temporarily
ALTER TABLE shops DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on shops
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE tablename = 'shops' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON shops', policy_name);
        RAISE NOTICE 'Dropped shops policy: %', policy_name;
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies for shops

-- SELECT: Anyone can view approved shops, owners can see their own shops
CREATE POLICY "shops_select_simple" ON shops
FOR SELECT
USING (
    -- Anyone can see approved shops
    status = 'approved'
    OR
    -- Owner can see their own shops (any status)
    created_by = auth.uid()
);

-- INSERT: Any authenticated user can create a shop
CREATE POLICY "shops_insert_simple" ON shops
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
);

-- UPDATE: Only shop owner can update
CREATE POLICY "shops_update_simple" ON shops
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- DELETE: Only shop owner can delete
CREATE POLICY "shops_delete_simple" ON shops
FOR DELETE
USING (created_by = auth.uid());

-- ============================================================
-- PART 2: FIX SHOP_STAFF TABLE
-- ============================================================

-- Step 1: Disable RLS temporarily
ALTER TABLE shop_staff DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on shop_staff
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE tablename = 'shop_staff' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON shop_staff', policy_name);
        RAISE NOTICE 'Dropped shop_staff policy: %', policy_name;
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies for shop_staff

-- SELECT: Users can see their own records OR records in shops they own
CREATE POLICY "shop_staff_select_v4" ON shop_staff
FOR SELECT
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
);

-- INSERT: Shop owners can add staff, or users can add themselves
CREATE POLICY "shop_staff_insert_v4" ON shop_staff
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
    OR
    auth.uid() = user_id
);

-- UPDATE: Users can update their own record OR shop owner can update
CREATE POLICY "shop_staff_update_v4" ON shop_staff
FOR UPDATE
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
);

-- DELETE: Only shop owners can delete staff
CREATE POLICY "shop_staff_delete_v4" ON shop_staff
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
);

-- ============================================================
-- PART 3: VERIFY ALL POLICIES
-- ============================================================

SELECT 'shops' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'shops' AND schemaname = 'public'
UNION ALL
SELECT 'shop_staff' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'shop_staff' AND schemaname = 'public'
ORDER BY table_name, cmd;
