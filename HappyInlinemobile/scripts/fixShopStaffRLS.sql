-- Fix: Allow customers to view shop admins/managers for messaging
-- This updates the RLS policy on shop_staff to allow customers to find
-- who to message at a shop

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "shop_staff_select" ON shop_staff;

-- Create new policy that allows customers to view admin/manager info
-- for the purpose of messaging
CREATE POLICY "shop_staff_select"
ON shop_staff FOR SELECT
TO authenticated
USING (
  -- Shop staff can view their colleagues
  is_shop_staff(shop_id)
  OR
  -- Platform admins can view all
  is_platform_admin()
  OR
  -- Anyone can view barbers (for booking)
  (role = 'barber' AND is_active = true)
  OR
  -- NEW: Anyone can view active admins/managers (for messaging)
  (role IN ('admin', 'manager') AND is_active = true)
);

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'shop_staff' AND policyname = 'shop_staff_select';
