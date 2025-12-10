-- Complete fix for shop_staff RLS policies
-- Run this in your Supabase SQL Editor

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'shop_staff';

-- ============================================================
-- DROP ALL EXISTING shop_staff POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Shop owners can manage shop_staff" ON shop_staff;
DROP POLICY IF EXISTS "Users can insert their own shop_staff record via invitation" ON shop_staff;
DROP POLICY IF EXISTS "Users can view their own shop_staff records" ON shop_staff;
DROP POLICY IF EXISTS "Anyone can view shop_staff" ON shop_staff;
DROP POLICY IF EXISTS "Shop staff can view their shop's staff" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_select" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_insert" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_update" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_delete" ON shop_staff;
-- Also drop the new policy names in case they already exist
DROP POLICY IF EXISTS "shop_staff_select_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_insert_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_update_policy" ON shop_staff;
DROP POLICY IF EXISTS "shop_staff_delete_policy" ON shop_staff;

-- ============================================================
-- CREATE NEW COMPREHENSIVE POLICIES
-- ============================================================

-- 1. SELECT: Users can view staff at shops they belong to OR shops they own
CREATE POLICY "shop_staff_select_policy" ON shop_staff
FOR SELECT
USING (
  -- User can see their own staff records
  auth.uid() = user_id
  OR
  -- User can see staff at shops they are staff of
  EXISTS (
    SELECT 1 FROM shop_staff my_staff
    WHERE my_staff.shop_id = shop_staff.shop_id
    AND my_staff.user_id = auth.uid()
  )
  OR
  -- User can see staff at shops they own
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
);

-- 2. INSERT: Shop owners/managers can add staff, OR users can add themselves via invitation
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
  -- Existing shop admin/manager/owner can insert staff
  EXISTS (
    SELECT 1 FROM shop_staff existing_staff
    WHERE existing_staff.shop_id = shop_staff.shop_id
    AND existing_staff.user_id = auth.uid()
    AND existing_staff.role IN ('owner', 'admin', 'manager')
  )
  OR
  -- User can insert themselves if they have a pending invitation
  (
    auth.uid() = user_id
    AND
    EXISTS (
      SELECT 1 FROM invitations
      WHERE invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND invitations.shop_id = shop_staff.shop_id
      AND invitations.status = 'pending'
    )
  )
);

-- 3. UPDATE: Shop owners/managers can update staff records
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
  -- Shop admin/manager can update
  EXISTS (
    SELECT 1 FROM shop_staff my_staff
    WHERE my_staff.shop_id = shop_staff.shop_id
    AND my_staff.user_id = auth.uid()
    AND my_staff.role IN ('owner', 'admin', 'manager')
  )
  OR
  -- Users can update their own record
  auth.uid() = user_id
);

-- 4. DELETE: Shop owners/managers can delete staff records
CREATE POLICY "shop_staff_delete_policy" ON shop_staff
FOR DELETE
USING (
  -- Shop owner can delete
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
  OR
  -- Shop admin/manager can delete
  EXISTS (
    SELECT 1 FROM shop_staff my_staff
    WHERE my_staff.shop_id = shop_staff.shop_id
    AND my_staff.user_id = auth.uid()
    AND my_staff.role IN ('owner', 'admin', 'manager')
  )
);

-- ============================================================
-- UPDATE accept_provider_invitation FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION accept_provider_invitation(
  p_invitation_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_result JSONB;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already used');
  END IF;

  -- Add user to shop_staff (or update if exists)
  INSERT INTO shop_staff (shop_id, user_id, role, is_active, is_available)
  VALUES (v_invitation.shop_id, p_user_id, COALESCE(v_invitation.role, 'barber'), true, true)
  ON CONFLICT (shop_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      is_active = true,
      is_available = true;

  -- Update invitation status
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'shop_id', v_invitation.shop_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_provider_invitation TO authenticated;

-- ============================================================
-- CREATE FUNCTION FOR SHOP OWNERS TO ADD STAFF
-- ============================================================
-- This function allows shop owners to add staff members directly
-- It bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION add_staff_to_shop(
  p_shop_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'barber',
  p_invited_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop RECORD;
  v_is_owner BOOLEAN;
  v_is_staff BOOLEAN;
BEGIN
  -- Verify the calling user owns the shop or is admin/manager
  SELECT * INTO v_shop FROM shops WHERE id = p_shop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shop not found');
  END IF;

  -- Check if caller is the shop owner
  v_is_owner := v_shop.created_by = auth.uid();

  -- Check if caller is admin/manager of this shop
  SELECT EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_id = p_shop_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'manager')
  ) INTO v_is_staff;

  IF NOT v_is_owner AND NOT v_is_staff THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to add staff to this shop');
  END IF;

  -- Add user to shop_staff (or update if exists)
  INSERT INTO shop_staff (shop_id, user_id, role, invited_by, is_active, is_available)
  VALUES (p_shop_id, p_user_id, p_role, COALESCE(p_invited_by, auth.uid()), true, true)
  ON CONFLICT (shop_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      is_active = true,
      is_available = true;

  RETURN jsonb_build_object('success', true, 'message', 'Staff added successfully');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_staff_to_shop TO authenticated;

-- ============================================================
-- VERIFY POLICIES
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'shop_staff';
