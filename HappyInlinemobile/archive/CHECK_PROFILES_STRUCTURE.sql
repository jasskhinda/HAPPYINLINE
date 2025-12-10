-- ============================================
-- CHECK PROFILES TABLE STRUCTURE
-- ============================================

-- Check all columns in profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check your specific manager profile
SELECT *
FROM profiles
WHERE email = 'craftworld207@gmail.com';

-- Check if there's a user_id or auth_id column that links to auth.users
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name LIKE '%user%' OR column_name LIKE '%auth%';
