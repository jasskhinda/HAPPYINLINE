-- ============================================
-- QUICK UPDATE: Make smokygaming171@gmail.com SUPER ADMIN
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add is_super_admin column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Step 2: Update role constraint to include super_admin
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('customer', 'barber', 'manager', 'admin', 'super_admin'));

-- Step 3: Update your account to super_admin
UPDATE profiles 
SET role = 'super_admin',
    is_super_admin = true
WHERE email = 'smokygaming171@gmail.com';

-- Step 4: Create trigger to prevent super admin deletion
CREATE OR REPLACE FUNCTION prevent_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_super_admin = true THEN
    RAISE EXCEPTION 'Cannot delete super admin account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_super_admin_deletion_trigger ON profiles;
CREATE TRIGGER prevent_super_admin_deletion_trigger
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_deletion();

-- Step 5: Update role change function
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  -- Only super_admin can update roles
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admin can update user roles';
  END IF;
  
  -- Cannot change super_admin role
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = target_user_id
    AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Cannot change super admin role';
  END IF;
  
  UPDATE profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the update
SELECT 
  id, 
  email, 
  name, 
  role, 
  is_super_admin,
  created_at
FROM profiles 
WHERE email = 'smokygaming171@gmail.com';

-- ============================================
-- SUCCESS! ✅
-- ============================================
-- Your account is now a super_admin
-- You should see:
-- - role: super_admin
-- - is_super_admin: true
-- 
-- Now restart your app and you'll see the Admin toggle!
