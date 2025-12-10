-- FIX_SHOP_STAFF_RLS_V3.sql
-- This script COMPLETELY removes all RLS policies on shop_staff and creates simple, non-recursive ones
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily to drop all policies
ALTER TABLE shop_staff DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on shop_staff (using pattern matching)
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE tablename = 'shop_staff' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON shop_staff', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies

-- Policy 1: SELECT - Users can see their own records OR records in shops they own
-- This avoids recursion by NOT querying shop_staff to check permissions
CREATE POLICY "shop_staff_select_simple" ON shop_staff
FOR SELECT
USING (
    -- User can see their own staff record
    auth.uid() = user_id
    OR
    -- User can see all staff in shops they created (shop owner)
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
);

-- Policy 2: INSERT - Only shop owners can add staff
CREATE POLICY "shop_staff_insert_simple" ON shop_staff
FOR INSERT
WITH CHECK (
    -- Shop owner can add anyone
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
    OR
    -- User can add themselves (for accepting invitations)
    auth.uid() = user_id
);

-- Policy 3: UPDATE - Users can update their own record OR shop owner can update any
CREATE POLICY "shop_staff_update_simple" ON shop_staff
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

-- Policy 4: DELETE - Only shop owners can delete staff
CREATE POLICY "shop_staff_delete_simple" ON shop_staff
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM shops
        WHERE shops.id = shop_staff.shop_id
        AND shops.created_by = auth.uid()
    )
);

-- Step 5: Verify policies were created
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'shop_staff' AND schemaname = 'public';
