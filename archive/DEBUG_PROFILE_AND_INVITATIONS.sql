-- ============================================
-- DEBUG: PROFILE ROLE AND SHOP INVITATIONS
-- ============================================

-- Check your profile structure and role
SELECT 
  id,
  email,
  name,
  role,
  phone,
  is_platform_admin,
  created_at
FROM profiles 
WHERE email = 'bhavyansh2018@gmail.com';

-- Check if role column exists in profiles table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check shop_invitations table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shop_invitations'
ORDER BY ordinal_position;

-- Check if there are any invitations for your email
SELECT 
  inv.*,
  s.name as shop_name,
  s.address as shop_address,
  sender.name as invited_by_name
FROM shop_invitations inv
LEFT JOIN shops s ON inv.shop_id = s.id
LEFT JOIN profiles sender ON inv.invited_by = sender.id
WHERE inv.invitee_email = 'bhavyansh2018@gmail.com';

-- Check bookings table - why booking_id is undefined
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name LIKE '%booking%'
ORDER BY ordinal_position;

-- Check actual booking data structure
SELECT 
  id,
  booking_id,
  shop_id,
  customer_id,
  status,
  appointment_date,
  total_price
FROM bookings
WHERE customer_id = '1ec12d56-7fdb-4cfa-acd0-2929cae32833'
LIMIT 5;
