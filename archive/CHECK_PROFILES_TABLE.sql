-- ============================================
-- CHECK PROFILES TABLE - COMPLETE STRUCTURE
-- ============================================

-- Show all columns in YOUR profiles table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Show your manager profile data
SELECT * FROM profiles WHERE email = 'craftworld207@gmail.com';

-- Show the relationship between auth.users and profiles
SELECT 
  'auth.users' as table_name,
  u.id as user_id,
  u.email
FROM auth.users u
WHERE u.email = 'craftworld207@gmail.com'

UNION ALL

SELECT 
  'profiles' as table_name,
  p.id as profile_id,
  p.email
FROM profiles p
WHERE p.email = 'craftworld207@gmail.com';
