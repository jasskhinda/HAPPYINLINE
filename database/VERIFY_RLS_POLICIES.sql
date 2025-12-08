-- ============================================
-- RLS POLICY VERIFICATION SCRIPT
-- Happy Inline - Multi-Industry Booking Platform
-- ============================================

-- Run this script in Supabase SQL Editor to verify all RLS policies are configured correctly
-- Copy and paste each section into the SQL editor and run

-- ============================================
-- 1. CHECK IF RLS IS ENABLED
-- ============================================

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'shops', 'bookings', 'messages', 'shop_staff', 'services', 'reviews')
ORDER BY tablename;

-- Expected: rls_enabled = true for all tables
-- If false, run: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. LIST ALL EXISTING POLICIES
-- ============================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Review output to ensure all necessary policies exist

-- ============================================
-- 3. PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile (during registration)
CREATE POLICY IF NOT EXISTS "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Super admins can view all profiles
CREATE POLICY IF NOT EXISTS "Super admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);

-- ============================================
-- 4. SHOPS TABLE POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Anyone can view active shops (for browsing)
CREATE POLICY IF NOT EXISTS "Anyone can view active shops"
ON shops FOR SELECT
USING (is_active = true AND status = 'active');

-- Shop owner can view their shop (even if not active)
CREATE POLICY IF NOT EXISTS "Owner can view their shop"
ON shops FOR SELECT
USING (created_by = auth.uid());

-- Shop staff can view their shop
CREATE POLICY IF NOT EXISTS "Shop staff can view their shop"
ON shops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = shops.id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.is_active = true
  )
);

-- Only shop owner can update shop
CREATE POLICY IF NOT EXISTS "Owner can update their shop"
ON shops FOR UPDATE
USING (created_by = auth.uid());

-- Super admins can view all shops
CREATE POLICY IF NOT EXISTS "Super admins can view all shops"
ON shops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);

-- Super admins can update all shops
CREATE POLICY IF NOT EXISTS "Super admins can update all shops"
ON shops FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);

-- Users can create shops (one per account enforced in code)
CREATE POLICY IF NOT EXISTS "Authenticated users can create shops"
ON shops FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- ============================================
-- 5. BOOKINGS TABLE POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Customers can view their own bookings
CREATE POLICY IF NOT EXISTS "Customers can view their bookings"
ON bookings FOR SELECT
USING (customer_id = auth.uid());

-- Shop staff can view shop bookings
CREATE POLICY IF NOT EXISTS "Shop staff can view shop bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = bookings.shop_id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.is_active = true
  )
);

-- Customers can create bookings
CREATE POLICY IF NOT EXISTS "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Shop staff (manager/admin) can update bookings
CREATE POLICY IF NOT EXISTS "Shop staff can update bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shop_staff
    WHERE shop_staff.shop_id = bookings.shop_id
    AND shop_staff.user_id = auth.uid()
    AND shop_staff.role IN ('owner', 'admin', 'manager')
    AND shop_staff.is_active = true
  )
);

-- Customers can update their own bookings (for cancellation)
CREATE POLICY IF NOT EXISTS "Customers can update their bookings"
ON bookings FOR UPDATE
USING (customer_id = auth.uid());

-- ============================================
-- 6. SHOP_STAFF TABLE POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

-- Shop staff can view other staff in their shop
CREATE POLICY IF NOT EXISTS "Shop staff can view shop staff"
ON shop_staff FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shop_staff AS ss2
    WHERE ss2.shop_id = shop_staff.shop_id
    AND ss2.user_id = auth.uid()
    AND ss2.is_active = true
  )
);

-- Shop owner/admin can manage staff
CREATE POLICY IF NOT EXISTS "Shop owner can manage staff"
ON shop_staff FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM shop_staff AS ss2
    WHERE ss2.shop_id = shop_staff.shop_id
    AND ss2.user_id = auth.uid()
    AND ss2.role IN ('admin', 'manager')
    AND ss2.is_active = true
  )
);

-- ============================================
-- 7. MESSAGES TABLE POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY IF NOT EXISTS "Users can view their messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.customer_id = auth.uid()
      OR conversations.shop_id IN (
        SELECT shop_id FROM shop_staff
        WHERE user_id = auth.uid()
        AND is_active = true
      )
    )
  )
);

-- Users can send messages in their conversations
CREATE POLICY IF NOT EXISTS "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.customer_id = auth.uid()
      OR conversations.shop_id IN (
        SELECT shop_id FROM shop_staff
        WHERE user_id = auth.uid()
        AND is_active = true
      )
    )
  )
);

-- Users can update their own messages (for read status)
CREATE POLICY IF NOT EXISTS "Users can update message status"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.customer_id = auth.uid()
      OR conversations.shop_id IN (
        SELECT shop_id FROM shop_staff
        WHERE user_id = auth.uid()
        AND is_active = true
      )
    )
  )
);

-- ============================================
-- 8. CONVERSATIONS TABLE POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Customers can view their conversations
CREATE POLICY IF NOT EXISTS "Customers can view their conversations"
ON conversations FOR SELECT
USING (customer_id = auth.uid());

-- Shop staff can view shop conversations
CREATE POLICY IF NOT EXISTS "Shop staff can view shop conversations"
ON conversations FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Customers can create conversations
CREATE POLICY IF NOT EXISTS "Customers can create conversations"
ON conversations FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Participants can update conversations (for read status)
CREATE POLICY IF NOT EXISTS "Participants can update conversations"
ON conversations FOR UPDATE
USING (
  customer_id = auth.uid()
  OR shop_id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- ============================================
-- 9. SERVICES TABLE POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Anyone can view active services
CREATE POLICY IF NOT EXISTS "Anyone can view active services"
ON services FOR SELECT
USING (is_active = true);

-- Shop staff can view shop services (even inactive)
CREATE POLICY IF NOT EXISTS "Shop staff can view shop services"
ON services FOR SELECT
USING (
  shop_id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Shop owner/manager can manage services
CREATE POLICY IF NOT EXISTS "Shop staff can manage services"
ON services FOR ALL
USING (
  shop_id IN (
    SELECT shop_id FROM shop_staff
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'manager')
    AND is_active = true
  )
);

-- ============================================
-- 10. REVIEWS TABLE POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY IF NOT EXISTS "Anyone can view reviews"
ON reviews FOR SELECT
USING (true);

-- Customers can create reviews
CREATE POLICY IF NOT EXISTS "Customers can create reviews"
ON reviews FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Customers can update their own reviews
CREATE POLICY IF NOT EXISTS "Customers can update their reviews"
ON reviews FOR UPDATE
USING (customer_id = auth.uid());

-- Customers can delete their own reviews
CREATE POLICY IF NOT EXISTS "Customers can delete their reviews"
ON reviews FOR DELETE
USING (customer_id = auth.uid());

-- ============================================
-- 11. VERIFY SETUP COMPLETED
-- ============================================

-- Run this final query to verify all policies are in place
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'shops', 'bookings', 'messages', 'conversations', 'shop_staff', 'services', 'reviews')
GROUP BY tablename
ORDER BY tablename;

-- Expected minimum policy counts:
-- profiles: 4 policies
-- shops: 7 policies
-- bookings: 5 policies
-- shop_staff: 2 policies
-- messages: 3 policies
-- conversations: 4 policies
-- services: 3 policies
-- reviews: 4 policies

-- ============================================
-- 12. TEST POLICIES
-- ============================================

-- Test as customer (should only see own profile)
SELECT * FROM profiles WHERE id = auth.uid();

-- Test shop browsing (should see active shops)
SELECT * FROM shops WHERE is_active = true AND status = 'active' LIMIT 5;

-- Test bookings (should only see own bookings or shop bookings)
SELECT * FROM bookings LIMIT 5;

-- If any queries fail with "permission denied", RLS policies need adjustment

-- ============================================
-- NOTES
-- ============================================

-- 1. These policies ensure:
--    - Users can only access their own data
--    - Shop staff can only access their shop's data
--    - Customers can browse public shops and services
--    - Super admins have full access
--
-- 2. Always test policies with different user roles
--
-- 3. If you modify these policies, update this file
--
-- 4. Backup database before making changes:
--    Settings > Database > Backup

-- ============================================
-- END OF VERIFICATION SCRIPT
-- ============================================
