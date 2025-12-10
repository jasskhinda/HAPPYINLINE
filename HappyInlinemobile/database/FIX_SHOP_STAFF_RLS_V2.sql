-- Fix for infinite recursion in shop_staff RLS policies
-- Run this in your Supabase SQL Editor

-- ============================================================
-- DROP ALL EXISTING shop_staff POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Shop owners can manage shop_staff" ON shop_staff;
DROP POLICY IF EXISTS "Users can insert their own shop_staff record via invitation" ON shop_staff;
DROP POLICY IF EXISTS "Users can view their own shop_staff records" ON shop_staff;
DROP POLICY IF EXISTS "Anyone can view shop_staff" ON shop_staff;
DROP POLICY IF EXISTS "Shop staff can view their shop's staff" ON shop_staff;
DROP POLICY IF EXISTS "Owners can delete shop_staff" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_select" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_insert" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_update" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_delete" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_select_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_insert_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_update_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_delete_policy" ON shop_staff;

-- ============================================================
-- CREATE NEW POLICIES (avoiding recursion)
-- ============================================================

-- 1. SELECT: Simple policy - users can see their own records OR records for shops they own
-- IMPORTANT: We avoid querying shop_staff within the shop_staff policy to prevent recursion
CREATE POLICY "shop_staff_select_policy" ON shop_staff
FOR SELECT
USING (
  -- User can see their own staff records
  auth.uid() = user_id
  OR
  -- User can see staff at shops they created (owner check via shops table only)
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
);

-- 2. INSERT: Shop owners can add staff (no self-referencing query)
CREATE POLICY "shop_staff_insert_policy" ON shop_staff
FOR INSERT
WITH CHECK (
  -- Shop owner can insert staff
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
  OR
  -- User can insert themselves (for invitation acceptance)
  auth.uid() = user_id
);

-- 3. UPDATE: Shop owners can update, or users can update their own record
CREATE POLICY "shop_staff_update_policy" ON shop_staff
FOR UPDATE
USING (
  -- Shop owner can update
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
  OR
  -- Users can update their own record
  auth.uid() = user_id
);

-- 4. DELETE: Shop owners can delete staff records
CREATE POLICY "shop_staff_delete_policy" ON shop_staff
FOR DELETE
USING (
  -- Shop owner can delete
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
);

-- ============================================================
-- VERIFY POLICIES
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'shop_staff';
