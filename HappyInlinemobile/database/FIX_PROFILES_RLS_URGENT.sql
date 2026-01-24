-- =====================================================
-- URGENT FIX: PROFILES RLS
-- =====================================================
-- The previous profiles RLS was too restrictive
-- Users MUST be able to read their own profile!
-- =====================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_read" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create a simple, permissive SELECT policy for profiles
CREATE POLICY "profiles_select_policy"
ON profiles
FOR SELECT
USING (
    -- CRITICAL: Users can ALWAYS read their own profile
    id = auth.uid()
    OR
    -- Super admin can read all
    role = 'super_admin'
    OR
    -- Users can read profiles of people in same shop context
    EXISTS (
        SELECT 1 FROM shop_staff ss
        WHERE ss.user_id = profiles.id
        AND ss.is_active = true
    )
    OR
    -- Allow reading customer profiles linked to your shop (for shop owners)
    EXISTS (
        SELECT 1 FROM shops s
        WHERE s.created_by = auth.uid()
        AND profiles.exclusive_shop_id = s.id
    )
);

-- Ensure UPDATE policy exists for own profile
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_update_policy"
ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Verify
SELECT 'Profiles policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Test: Can current user read their own profile?
SELECT 'Testing profile access:' as info;
SELECT id, name, role, exclusive_shop_id FROM profiles WHERE id = auth.uid();

SELECT 'Profiles RLS fixed!' AS result;
