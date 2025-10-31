-- ============================================
-- FINAL FIX FOR ID MISMATCH ISSUE
-- This accounts for profiles where id != auth.uid()
-- ============================================

-- The problem: Your manager profile has:
--   profile.id = aac0b13e-e6dc-4d8c-9509-d07e1f49140c
--   auth.uid() = 95db3733-8436-4930-b7b6-52b64026f985
-- These don't match, so get_current_user_role() returns NULL!

-- ============================================
-- STEP 1: Fix the helper function to use EMAIL
-- ============================================

DROP FUNCTION IF EXISTS get_current_user_role();

-- NEW function that uses email instead of id
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_email text;
  user_role text;
BEGIN
  -- Get the authenticated user's email using jwt claim
  user_email := auth.jwt() ->> 'email';
  
  -- Find the profile by email (not by id!)
  SELECT role INTO user_role
  FROM profiles
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- ============================================
-- STEP 2: Test the function
-- ============================================

SELECT 
  '🧪 Testing get_current_user_role() function' as test,
  get_current_user_role() as detected_role,
  auth.jwt() ->> 'email' as current_email;

-- ============================================
-- STEP 3: Recreate ALL policies (already done in previous SQL)
-- The policies use get_current_user_role() which now works correctly
-- ============================================

-- Drop all existing policies
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON bookings';
    END LOOP;
END $$;

-- PROFILES policies
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
TO authenticated
USING (email = (auth.jwt() ->> 'email'))
WITH CHECK (email = (auth.jwt() ->> 'email'));

-- BOOKINGS policies
CREATE POLICY "bookings_select_policy"
ON bookings FOR SELECT
TO authenticated
USING (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR customer_id IN (SELECT id FROM profiles WHERE email = (auth.jwt() ->> 'email'))
  OR barber_id IN (SELECT id FROM profiles WHERE email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "bookings_insert_policy"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  customer_id IN (SELECT id FROM profiles WHERE email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "bookings_update_policy"
ON bookings FOR UPDATE
TO authenticated
USING (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR (customer_id IN (SELECT id FROM profiles WHERE email = (auth.jwt() ->> 'email')) AND status = 'pending')
  OR barber_id IN (SELECT id FROM profiles WHERE email = (auth.jwt() ->> 'email'))
)
WITH CHECK (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR (customer_id IN (SELECT id FROM profiles WHERE email = (auth.jwt() ->> 'email')) AND status = 'pending')
  OR barber_id IN (SELECT id FROM profiles WHERE email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "bookings_delete_policy"
ON bookings FOR DELETE
TO authenticated
USING (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
);

-- ============================================
-- STEP 4: Verify everything
-- ============================================

SELECT '📋 Current user info:' as info;
SELECT 
  auth.jwt() ->> 'email' as email,
  get_current_user_role() as role;

SELECT '📋 Profiles table check:' as info;
SELECT id, email, role, name FROM profiles WHERE email = (auth.jwt() ->> 'email');

SELECT '📋 Bookings policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY policyname;

SELECT '📋 Test SELECT bookings:' as info;
SELECT COUNT(*) as bookings_count FROM bookings;

SELECT '✅ Setup complete! Check the counts above.' as result;
