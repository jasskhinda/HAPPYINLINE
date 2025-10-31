-- ============================================
-- PROPER FIX WITH ROLE-BASED ACCESS
-- - Managers: See ALL bookings
-- - Customers: See own bookings (where customer_id matches)
-- - Barbers: See ONLY assigned bookings (where barber_id matches)
-- ============================================

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON bookings';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS get_current_user_role();
DROP FUNCTION IF EXISTS get_current_user_profile_id();

-- ============================================
-- STEP 2: Create helper function using JWT email
-- ============================================

-- Get current user's profile ID by email (works with ID mismatch)
CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email text;
  profile_id uuid;
BEGIN
  user_email := auth.jwt() ->> 'email';
  SELECT id INTO profile_id FROM profiles WHERE email = user_email LIMIT 1;
  RETURN profile_id;
END;
$$;

-- Get current user's role by email (works with ID mismatch)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email text;
  user_role text;
BEGIN
  user_email := auth.jwt() ->> 'email';
  SELECT role INTO user_role FROM profiles WHERE email = user_email LIMIT 1;
  RETURN user_role;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- ============================================
-- STEP 3: Profiles policies
-- ============================================

CREATE POLICY "profiles_select"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
TO authenticated
USING (id = get_current_user_profile_id())
WITH CHECK (id = get_current_user_profile_id());

-- ============================================
-- STEP 4: Bookings SELECT policy (ROLE-BASED)
-- ============================================

CREATE POLICY "bookings_select"
ON bookings FOR SELECT
TO authenticated
USING (
  -- Managers/Admins/Super Admins can see ALL bookings
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  -- Customers can see bookings where they are the customer
  customer_id = get_current_user_profile_id()
  OR
  -- Barbers can see ONLY bookings assigned to them
  barber_id = get_current_user_profile_id()
);

-- ============================================
-- STEP 5: Bookings INSERT policy
-- ============================================

CREATE POLICY "bookings_insert"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  -- Only customers can create bookings
  customer_id = get_current_user_profile_id()
);

-- ============================================
-- STEP 6: Bookings UPDATE policy
-- ============================================

CREATE POLICY "bookings_update"
ON bookings FOR UPDATE
TO authenticated
USING (
  -- Managers/Admins can update any booking
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  -- Customers can update their own pending bookings
  (customer_id = get_current_user_profile_id() AND status = 'pending')
  OR
  -- Barbers can update their assigned bookings
  barber_id = get_current_user_profile_id()
)
WITH CHECK (
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  (customer_id = get_current_user_profile_id() AND status = 'pending')
  OR
  barber_id = get_current_user_profile_id()
);

-- ============================================
-- STEP 7: Bookings DELETE policy
-- ============================================

CREATE POLICY "bookings_delete"
ON bookings FOR DELETE
TO authenticated
USING (
  -- Only Managers/Admins can delete
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Setup complete!' as status;

SELECT '🧪 Testing functions:' as info;
SELECT 
  get_current_user_role() as my_role,
  get_current_user_profile_id() as my_profile_id,
  auth.jwt() ->> 'email' as my_email;

SELECT 'Bookings policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings' ORDER BY policyname;

SELECT 'Profiles policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

SELECT 'My bookings (filtered by role):' as test;
SELECT COUNT(*) as my_bookings_count FROM bookings;

SELECT '🎉 DONE!' as result;
SELECT '- Managers see ALL bookings' as note1;
SELECT '- Customers see only their bookings' as note2;
SELECT '- Barbers see only bookings assigned to them' as note3;
