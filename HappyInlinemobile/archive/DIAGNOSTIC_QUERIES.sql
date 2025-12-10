-- ============================================
-- DIAGNOSTIC QUERIES
-- Run these BEFORE trying to fix the trigger
-- ============================================

-- 1. Check if profile exists for the test email
SELECT 
  id, 
  email, 
  name, 
  role, 
  onboarding_completed,
  created_at
FROM profiles 
WHERE email = 'bhavyansh2018@gmail.com';

-- 2. Check if auth user exists
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'bhavyansh2018@gmail.com';

-- 3. Check current trigger
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. Check RLS status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- 5. Check all constraints on profiles
SELECT
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass;

-- ============================================
-- RESULTS INTERPRETATION:
-- ============================================
-- If profile EXISTS but auth user DOESN'T: Normal case (admin created profile)
-- If BOTH exist: Problem - user already logged in before
-- If NEITHER exist: Email was never created by admin
-- If auth exists but profile DOESN'T: Trigger failed previously
