-- ============================================
-- ABSOLUTE FINAL FIX - Clean slate approach
-- Drops EVERYTHING and recreates from scratch
-- ============================================

-- ============================================
-- PART 1: Drop ALL existing policies
-- ============================================

-- Drop profiles policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Drop bookings policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON bookings';
    END LOOP;
END $$;

-- Drop helper functions if they exist
DROP FUNCTION IF EXISTS get_current_user_role();
DROP FUNCTION IF EXISTS get_profile_id_by_auth_uid();

-- ============================================
-- PART 2: Create SECURITY DEFINER helper functions
-- ============================================

-- Function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- ============================================
-- PART 3: PROFILES table policies (simple)
-- ============================================

-- Everyone can read profiles (needed for app)
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update own profile only
CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- PART 4: BOOKINGS table policies (using helper function)
-- ============================================

-- SELECT: Managers see all, others see their own
CREATE POLICY "bookings_select_policy"
ON bookings FOR SELECT
TO authenticated
USING (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR customer_id = auth.uid()
  OR barber_id = auth.uid()
);

-- INSERT: Only customers can create
CREATE POLICY "bookings_insert_policy"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'customer'
  AND customer_id = auth.uid()
);

-- UPDATE: Managers can update all, others update own
CREATE POLICY "bookings_update_policy"
ON bookings FOR UPDATE
TO authenticated
USING (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR (customer_id = auth.uid() AND status = 'pending')
  OR barber_id = auth.uid()
)
WITH CHECK (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR (customer_id = auth.uid() AND status = 'pending')
  OR barber_id = auth.uid()
);

-- DELETE: Only managers/admins
CREATE POLICY "bookings_delete_policy"
ON bookings FOR DELETE
TO authenticated
USING (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Setup complete!' as status;

SELECT 'PROFILES POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

SELECT 'BOOKINGS POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY policyname;

SELECT 'TEST SELECT:' as test;
SELECT COUNT(*) as bookings_count FROM bookings;

-- Test UPDATE
SELECT 'TEST UPDATE (check if error appears):' as test;
UPDATE bookings 
SET updated_at = now() 
WHERE id = (SELECT id FROM bookings LIMIT 1);

SELECT '✅ If you see this, UPDATE worked! No permission error!' as result;
