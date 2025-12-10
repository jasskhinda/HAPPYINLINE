-- ============================================
-- FIX: Shop Staff INSERT Policy
-- Allows shop creator to add themselves as admin
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "shop_staff_insert" ON shop_staff;

-- Recreate with fix for shop creator
CREATE POLICY "shop_staff_insert"
ON shop_staff FOR INSERT
TO authenticated
WITH CHECK (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin() OR
  -- ✅ FIX: Allow shop creator to add themselves as first admin
  (role = 'admin' AND user_id = auth.uid() AND 
   EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND created_by = auth.uid()))
);

-- Verify
SELECT '✅ Policy fixed!' as status;
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'shop_staff'
  AND policyname = 'shop_staff_insert';
