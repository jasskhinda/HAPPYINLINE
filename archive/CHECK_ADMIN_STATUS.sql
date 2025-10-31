-- ============================================
-- QUICK CHECK: Verify Your Admin Status
-- Run this to see if you're super_admin
-- ============================================

SELECT 
  id,
  email,
  name
  role,
  is_super_admin,
  onboarding_completed,
  created_at
FROM profiles 
WHERE email = 'smokygaming171@gmail.com';

-- ============================================
-- Expected Result:
-- ============================================
-- email: smokygaming171@gmail.com
-- role: super_admin  ← Should be this
-- is_super_admin: true  ← Should be true
--
-- If role is still 'admin' or is_super_admin is false/null:
-- → Run UPDATE_ADMIN_TO_SUPER.sql first!
-- ============================================

-- Check all admins in the system
SELECT 
  email,
  name,
  role,
  is_super_admin
FROM profiles 
WHERE role IN ('admin', 'super_admin')
ORDER BY is_super_admin DESC, role DESC;
