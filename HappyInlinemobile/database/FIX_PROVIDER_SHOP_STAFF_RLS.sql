-- Fix RLS policy for shop_staff to allow providers with pending invitations to be added
-- Run this in your Supabase SQL Editor

-- First, let's check existing policies
SELECT * FROM pg_policies WHERE tablename = 'shop_staff';

-- Drop existing insert policy if it exists (we'll recreate it)
DROP POLICY IF EXISTS "Users can insert their own shop_staff record via invitation" ON shop_staff;

-- Create a new policy that allows users to insert themselves into shop_staff
-- if they have a pending invitation for that shop
CREATE POLICY "Users can insert their own shop_staff record via invitation" ON shop_staff
FOR INSERT
WITH CHECK (
  -- User can only insert their own record
  auth.uid() = user_id
  AND
  -- They must have a pending invitation for this shop
  EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND invitations.shop_id = shop_staff.shop_id
    AND invitations.status = 'pending'
  )
);

-- Also ensure users can read their own shop_staff records
DROP POLICY IF EXISTS "Users can view their own shop_staff records" ON shop_staff;
CREATE POLICY "Users can view their own shop_staff records" ON shop_staff
FOR SELECT
USING (auth.uid() = user_id);

-- Shop owners/managers can manage staff
DROP POLICY IF EXISTS "Shop owners can manage shop_staff" ON shop_staff;
CREATE POLICY "Shop owners can manage shop_staff" ON shop_staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM shop_staff ss
    WHERE ss.shop_id = shop_staff.shop_id
    AND ss.user_id = auth.uid()
    AND ss.role IN ('owner', 'manager', 'admin')
  )
);

-- Alternative: Create a database function to handle provider signup
-- This bypasses RLS by using SECURITY DEFINER
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

  -- Add user to shop_staff
  INSERT INTO shop_staff (shop_id, user_id, role, status)
  VALUES (v_invitation.shop_id, p_user_id, v_invitation.role, 'active')
  ON CONFLICT (shop_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, status = 'active';

  -- Update invitation status
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object('success', true, 'shop_id', v_invitation.shop_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_provider_invitation TO authenticated;
