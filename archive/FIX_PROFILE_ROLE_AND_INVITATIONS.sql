-- ============================================
-- FIX: Set Default Role for Existing Users
-- ============================================

-- Fix your profile - set role to 'customer' (default)
UPDATE profiles 
SET role = 'customer'
WHERE email = 'bhavyansh2018@gmail.com'
AND (role IS NULL OR role = '');

-- Fix all other users with NULL/empty roles
UPDATE profiles 
SET role = 'customer'
WHERE role IS NULL OR role = '';

-- Verify the fix
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM profiles 
WHERE email = 'bhavyansh2018@gmail.com';

-- ============================================
-- CHECK: Shop Invitations
-- ============================================

-- See if you have any pending invitations
SELECT 
  inv.id,
  inv.invitee_email,
  inv.role as invited_role,
  inv.status,
  inv.created_at,
  inv.expires_at,
  s.name as shop_name,
  s.address as shop_address,
  sender.name as invited_by_name,
  sender.email as invited_by_email
FROM shop_invitations inv
LEFT JOIN shops s ON inv.shop_id = s.id
LEFT JOIN profiles sender ON inv.invited_by = sender.id
WHERE inv.invitee_email = 'bhavyansh2018@gmail.com'
AND inv.status = 'pending'
AND inv.expires_at > NOW();

-- ============================================
-- CHECK: Bookings Table Structure
-- ============================================

-- Check if booking_id column exists
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
