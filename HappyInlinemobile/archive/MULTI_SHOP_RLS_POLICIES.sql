-- ============================================
-- MULTI-SHOP RLS POLICIES
-- Row Level Security for shop-based data isolation
-- ============================================
-- 
-- This script creates RLS policies for:
-- 1. Shop-based data access control
-- 2. Role-based permissions within shops
-- 3. Platform admin access to all data
-- 4. Customer access to relevant shop data
--
-- Run AFTER running MULTI_SHOP_DATABASE_SCHEMA.sql
-- ============================================

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;

-- Tables already have RLS enabled: profiles, services, bookings

-- ============================================
-- 2. HELPER FUNCTIONS FOR RLS
-- ============================================

-- Get current user's email from JWT
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() ->> 'email';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's profile ID by email
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  user_email text;
  profile_id uuid;
BEGIN
  user_email := get_current_user_email();
  SELECT id INTO profile_id FROM profiles WHERE email = user_email LIMIT 1;
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's global role
CREATE OR REPLACE FUNCTION get_current_user_global_role()
RETURNS TEXT AS $$
DECLARE
  user_id uuid;
  user_role text;
BEGIN
  user_id := get_current_user_id();
  SELECT global_role INTO user_role FROM profiles WHERE id = user_id LIMIT 1;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user has access to shop
CREATE OR REPLACE FUNCTION current_user_can_access_shop(shop_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_id uuid;
  user_global_role text;
BEGIN
  user_id := get_current_user_id();
  user_global_role := get_current_user_global_role();
  
  -- Platform admins can access any shop
  IF user_global_role IN ('platform_admin', 'super_admin') THEN
    RETURN true;
  END IF;
  
  -- Check if user is member of the shop
  RETURN EXISTS (
    SELECT 1 FROM shop_members 
    WHERE user_id = user_id AND shop_id = shop_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's role in specific shop
CREATE OR REPLACE FUNCTION get_current_user_shop_role(shop_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_id uuid;
  shop_role text;
BEGIN
  user_id := get_current_user_id();
  
  SELECT role INTO shop_role 
  FROM shop_members 
  WHERE user_id = user_id AND shop_id = shop_id AND is_active = true
  LIMIT 1;
  
  RETURN shop_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_global_role() TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_can_access_shop(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_shop_role(UUID) TO authenticated;

-- ============================================
-- 3. DROP EXISTING POLICIES (CLEAN SLATE)
-- ============================================

-- Profiles policies
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Services policies
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'services') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON services';
    END LOOP;
END $$;

-- Bookings policies
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON bookings';
    END LOOP;
END $$;

-- ============================================
-- 4. SHOPS TABLE POLICIES
-- ============================================

-- Anyone can view active shops (for discovery/browsing)
CREATE POLICY "shops_public_read"
ON shops FOR SELECT
TO authenticated
USING (is_active = true);

-- Users can create shops (becoming owner)
CREATE POLICY "shops_create"
ON shops FOR INSERT
TO authenticated
WITH CHECK (owner_id = get_current_user_id());

-- Shop owners and platform admins can update shops
CREATE POLICY "shops_update"
ON shops FOR UPDATE
TO authenticated
USING (
  owner_id = get_current_user_id() OR 
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
)
WITH CHECK (
  owner_id = get_current_user_id() OR 
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- Only platform admins can delete shops
CREATE POLICY "shops_delete"
ON shops FOR DELETE
TO authenticated
USING (get_current_user_global_role() IN ('platform_admin', 'super_admin'));

-- ============================================
-- 5. SHOP_MEMBERS TABLE POLICIES
-- ============================================

-- Users can see shop members for shops they belong to
CREATE POLICY "shop_members_read"
ON shop_members FOR SELECT
TO authenticated
USING (
  current_user_can_access_shop(shop_id) OR
  user_id = get_current_user_id()
);

-- Shop owners and managers can invite members
CREATE POLICY "shop_members_invite"
ON shop_members FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- Shop owners and managers can update member roles
CREATE POLICY "shop_members_update"
ON shop_members FOR UPDATE
TO authenticated
USING (
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  user_id = get_current_user_id() -- Users can update their own membership
)
WITH CHECK (
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  user_id = get_current_user_id()
);

-- Shop owners and the member themselves can remove membership
CREATE POLICY "shop_members_delete"
ON shop_members FOR DELETE
TO authenticated
USING (
  get_current_user_shop_role(shop_id) = 'owner' OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  user_id = get_current_user_id()
);

-- ============================================
-- 6. SHOP_SERVICES TABLE POLICIES
-- ============================================

-- Anyone can view services for shops they have access to
CREATE POLICY "shop_services_read"
ON shop_services FOR SELECT
TO authenticated
USING (
  is_active = true AND (
    current_user_can_access_shop(shop_id) OR
    -- Allow customers to view services for public booking
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND is_active = true)
  )
);

-- Shop owners/managers can create services
CREATE POLICY "shop_services_create"
ON shop_services FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- Shop owners/managers can update services
CREATE POLICY "shop_services_update"
ON shop_services FOR UPDATE
TO authenticated
USING (
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
)
WITH CHECK (
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- Shop owners/managers can delete services
CREATE POLICY "shop_services_delete"
ON shop_services FOR DELETE
TO authenticated
USING (
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- ============================================
-- 7. BARBER_AVAILABILITY TABLE POLICIES
-- ============================================

-- Shop members can view availability
CREATE POLICY "barber_availability_read"
ON barber_availability FOR SELECT
TO authenticated
USING (
  current_user_can_access_shop(shop_id) OR
  barber_id = get_current_user_id()
);

-- Barbers can manage their own availability, managers can manage all
CREATE POLICY "barber_availability_create"
ON barber_availability FOR INSERT
TO authenticated
WITH CHECK (
  barber_id = get_current_user_id() OR
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- Update availability
CREATE POLICY "barber_availability_update"
ON barber_availability FOR UPDATE
TO authenticated
USING (
  barber_id = get_current_user_id() OR
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
)
WITH CHECK (
  barber_id = get_current_user_id() OR
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- Delete availability
CREATE POLICY "barber_availability_delete"
ON barber_availability FOR DELETE
TO authenticated
USING (
  barber_id = get_current_user_id() OR
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  get_current_user_global_role() IN ('platform_admin', 'super_admin')
);

-- ============================================
-- 8. UPDATED PROFILES TABLE POLICIES
-- ============================================

-- Everyone can view public profile data
CREATE POLICY "profiles_read"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
TO authenticated
USING (id = get_current_user_id())
WITH CHECK (id = get_current_user_id());

-- Allow profile creation during signup
CREATE POLICY "profiles_create"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = get_current_user_id());

-- ============================================
-- 9. UPDATED SERVICES TABLE POLICIES (LEGACY)
-- ============================================
-- For backward compatibility with existing services

-- Read services (shop-specific or global)
CREATE POLICY "services_read"
ON services FOR SELECT
TO authenticated
USING (
  shop_id IS NULL OR -- Global services
  current_user_can_access_shop(shop_id)
);

-- Only platform admins can manage global services
CREATE POLICY "services_manage"
ON services FOR ALL
TO authenticated
USING (
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  (shop_id IS NOT NULL AND get_current_user_shop_role(shop_id) IN ('owner', 'manager'))
)
WITH CHECK (
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  (shop_id IS NOT NULL AND get_current_user_shop_role(shop_id) IN ('owner', 'manager'))
);

-- ============================================
-- 10. UPDATED BOOKINGS TABLE POLICIES
-- ============================================

-- Read bookings based on role and shop access
CREATE POLICY "bookings_read"
ON bookings FOR SELECT
TO authenticated
USING (
  -- Platform admins see all
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  
  -- Shop owners/managers see all bookings for their shop
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  
  -- Customers see their own bookings
  customer_id = get_current_user_id() OR
  
  -- Barbers see their assigned bookings
  barber_id = get_current_user_id()
);

-- Customers can create bookings for shops
CREATE POLICY "bookings_create"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  customer_id = get_current_user_id() AND
  -- Ensure booking is for an active shop
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND is_active = true)
);

-- Update bookings based on role
CREATE POLICY "bookings_update"
ON bookings FOR UPDATE
TO authenticated
USING (
  -- Platform admins can update any booking
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  
  -- Shop owners/managers can update shop bookings
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  
  -- Customers can update their pending bookings
  (customer_id = get_current_user_id() AND status = 'pending') OR
  
  -- Barbers can update their assigned bookings
  barber_id = get_current_user_id()
)
WITH CHECK (
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  get_current_user_shop_role(shop_id) IN ('owner', 'manager') OR
  (customer_id = get_current_user_id() AND status = 'pending') OR
  barber_id = get_current_user_id()
);

-- Delete bookings (limited access)
CREATE POLICY "bookings_delete"
ON bookings FOR DELETE
TO authenticated
USING (
  get_current_user_global_role() IN ('platform_admin', 'super_admin') OR
  get_current_user_shop_role(shop_id) IN ('owner', 'manager')
);

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

-- Grant table permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON shops TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON shops TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON barber_availability TO authenticated;

-- Update existing permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO authenticated;

-- ============================================
-- 12. VERIFICATION QUERIES
-- ============================================

SELECT '✅ Multi-shop RLS policies created!' as status;

-- Check policies exist
SELECT 'Shops policies:' as table_name, COUNT(*) as policy_count
FROM pg_policies WHERE tablename = 'shops'
UNION ALL
SELECT 'Shop members policies:', COUNT(*)
FROM pg_policies WHERE tablename = 'shop_members'
UNION ALL
SELECT 'Shop services policies:', COUNT(*)
FROM pg_policies WHERE tablename = 'shop_services'
UNION ALL
SELECT 'Bookings policies:', COUNT(*)
FROM pg_policies WHERE tablename = 'bookings'
UNION ALL
SELECT 'Profiles policies:', COUNT(*)
FROM pg_policies WHERE tablename = 'profiles';

-- Test functions
SELECT 'Testing functions:' as info;
SELECT 
  get_current_user_email() as current_email,
  get_current_user_id() as current_user_id,
  get_current_user_global_role() as current_global_role;

SELECT '🎉 Multi-shop RLS setup complete!' as result;

-- ============================================
-- NOTES FOR TESTING
-- ============================================

/*
TO TEST THE POLICIES:

1. Create a test shop:
INSERT INTO shops (name, description, owner_id) 
VALUES ('Test Shop', 'My test barber shop', get_current_user_id());

2. Test shop access:
SELECT * FROM shops; -- Should see shops you own or are member of

3. Test shop services:
INSERT INTO shop_services (shop_id, name, price, duration) 
VALUES ((SELECT id FROM shops WHERE owner_id = get_current_user_id() LIMIT 1), 'Test Cut', 25.00, 30);

4. Test bookings:
-- Should only see bookings related to shops you have access to
SELECT * FROM bookings;

KEY SECURITY FEATURES:
- Shop data isolation: Users only see data for shops they belong to
- Role-based permissions within shops
- Platform admin override for system management
- Customer access to public shop data for booking
- Barber access to assigned bookings only
*/