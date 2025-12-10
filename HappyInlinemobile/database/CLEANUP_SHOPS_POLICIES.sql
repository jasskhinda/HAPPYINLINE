-- CLEANUP_SHOPS_POLICIES.sql
-- Remove extra policies causing infinite recursion
-- Run this in Supabase SQL Editor

-- ============================================================
-- STEP 1: Drop the problematic policies
-- ============================================================

-- This policy likely references shop_staff causing recursion
DROP POLICY IF EXISTS "shop_staff_can_view_their_shop" ON shops;

-- This policy might also have recursion issues
DROP POLICY IF EXISTS "shops_select_policy" ON shops;

-- ============================================================
-- STEP 2: Verify only our clean policies remain
-- ============================================================

SELECT 'shops' as table_name, policyname, cmd
FROM pg_policies
WHERE tablename = 'shops' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Expected output (ONLY these 7 policies):
-- shops_delete_simple (DELETE)
-- shops_insert_simple (INSERT)
-- shops_approved_select (SELECT)
-- shops_owner_select (SELECT)
-- shops_super_admin_select (SELECT)
-- shops_owner_update (UPDATE)
-- shops_super_admin_update (UPDATE)
