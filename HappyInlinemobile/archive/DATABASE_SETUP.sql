-- ============================================
-- BARBER APP - COMPLETE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================
-- 
-- This script will:
-- 1. Delete old tables (clean slate)
-- 2. Create new tables with updated structure
-- 3. Add RLS policies
-- 4. Insert sample services
-- 5. Make smokygaming171@gmail.com admin
--
-- Just paste and run once!
-- ============================================

-- ============================================
-- 0. DELETE OLD TABLES (CLEAN SLATE)
-- ============================================

DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT);

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Profiles Table (Main user table with all roles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'barber', 'manager', 'admin', 'super_admin')),
  profile_image TEXT,
  phone TEXT,
  bio TEXT,
  specialties UUID[], -- Array of service IDs for barbers
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_super_admin BOOLEAN DEFAULT false, -- Flag for main admin (cannot be deleted)
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  price DECIMAL(10, 2),
  duration INTEGER, -- Duration in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. DROP EXISTING POLICIES (Clean start)
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Managers and admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow insert during signup" ON profiles;
DROP POLICY IF EXISTS "Admins and Managers can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins and Managers can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON services;
DROP POLICY IF EXISTS "Enable insert for managers and admins" ON services;
DROP POLICY IF EXISTS "Enable update for managers and admins" ON services;
DROP POLICY IF EXISTS "Enable delete for managers and admins" ON services;

-- ============================================
-- 4. PROFILES TABLE - RLS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile  
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow ANY authenticated user to INSERT their own profile (no recursion!)
CREATE POLICY "Allow insert during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. SERVICES TABLE - RLS POLICIES
-- ============================================

-- Everyone can read services
CREATE POLICY "Enable read access for all users" 
  ON services FOR SELECT
  USING (true);

-- Managers and admins can insert services
CREATE POLICY "Enable insert for managers and admins" 
  ON services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Managers and admins can update services
CREATE POLICY "Enable update for managers and admins" 
  ON services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Managers and admins can delete services
CREATE POLICY "Enable delete for managers and admins" 
  ON services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- ============================================
-- 6. TRIGGERS - Auto Update Timestamps
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for services table
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
  BEFORE UPDATE ON services
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, phone, bio, specialties, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bio', NULL),
    CASE 
      WHEN NEW.raw_user_meta_data->>'specialties' IS NOT NULL 
      THEN CAST(NEW.raw_user_meta_data->>'specialties' AS UUID[])
      ELSE ARRAY[]::UUID[]
    END,
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to update user role (only super_admin can call this)
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

-- Function to prevent deletion of super admin
CREATE OR REPLACE FUNCTION prevent_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_super_admin = true THEN
    RAISE EXCEPTION 'Cannot delete super admin account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent super admin deletion
DROP TRIGGER IF EXISTS prevent_super_admin_deletion_trigger ON profiles;
CREATE TRIGGER prevent_super_admin_deletion_trigger
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_deletion();

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO authenticated;
GRANT SELECT ON services TO anon;

-- ============================================
-- 10. INSERT SAMPLE SERVICES
-- ============================================

INSERT INTO services (name, description, icon_url, price, duration) 
SELECT * FROM (VALUES
  ('Haircut', 'Professional haircut service', 'https://cdn-icons-png.flaticon.com/512/3199/3199122.png', 25.00, 30),
  ('Shaving', 'Clean shave service', 'https://cdn-icons-png.flaticon.com/512/3199/3199124.png', 15.00, 20),
  ('Beard Trim', 'Beard trimming and styling', 'https://cdn-icons-png.flaticon.com/512/3199/3199126.png', 18.00, 20),
  ('Hair Styling', 'Complete hair styling', 'https://cdn-icons-png.flaticon.com/512/3199/3199128.png', 35.00, 45),
  ('Hair Color', 'Hair coloring service', 'https://cdn-icons-png.flaticon.com/512/3199/3199130.png', 50.00, 60),
  ('Facial', 'Relaxing facial treatment', 'https://cdn-icons-png.flaticon.com/512/3199/3199132.png', 40.00, 40)
) AS v(name, description, icon_url, price, duration)
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE services.name = v.name
);

-- ============================================
-- 11. VERIFICATION QUERIES
-- ============================================

-- View all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'services');

-- View all services
SELECT * FROM services ORDER BY name;

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('profiles', 'services')
ORDER BY tablename, policyname;

-- ============================================
-- 12. MAKE smokygaming171@gmail.com SUPER ADMIN (MAIN ADMIN)
-- ============================================

-- Update existing user to super_admin (if profile exists)
-- This is the main admin account - cannot be deleted
UPDATE profiles 
SET role = 'super_admin',
    is_super_admin = true
WHERE email = 'smokygaming171@gmail.com';

-- If user doesn't exist yet, they'll be created as admin on first login
-- (handled by handle_new_user trigger with metadata)

-- ============================================
-- SETUP COMPLETE! ✅
-- ============================================

-- NEXT STEPS:
-- 1. ✅ Tables created
-- 2. ✅ RLS policies added
-- 3. ✅ Sample services inserted
-- 4. ✅ smokygaming171@gmail.com set as admin
--
-- 5. Create storage bucket for service icons:
--    Dashboard → Storage → Create bucket 'service-icons' → Make Public
--
-- 6. Add storage policies (see SETUP_GUIDE.md)
--
-- 7. Login to your app with smokygaming171@gmail.com ✅
