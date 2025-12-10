-- ============================================
-- CLEAN SLATE - DROP EVERYTHING SAFELY
-- ============================================
-- Run this FIRST if you're getting dependency errors
-- This will drop all old structures completely
-- ⚠️ BACKUP YOUR DATABASE FIRST!
-- ============================================

-- ============================================
-- STEP 1: DROP ALL RLS POLICIES
-- ============================================

-- Drop policies on services table
DROP POLICY IF EXISTS "Enable insert for managers and admins" ON services;
DROP POLICY IF EXISTS "Enable update for managers and admins" ON services;
DROP POLICY IF EXISTS "Enable delete for managers and admins" ON services;
DROP POLICY IF EXISTS "Enable read access for all users" ON services;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON services;
DROP POLICY IF EXISTS "Enable update for service owner" ON services;
DROP POLICY IF EXISTS "Enable delete for service owner" ON services;

-- Drop policies on bookings table
DROP POLICY IF EXISTS "Enable read access for booking participants" ON bookings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON bookings;
DROP POLICY IF EXISTS "Enable update for booking participants" ON bookings;
DROP POLICY IF EXISTS "Enable delete for booking owner" ON bookings;
DROP POLICY IF EXISTS "Customers can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can view their assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update their own bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can update their assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Managers can update all bookings" ON bookings;

-- Drop policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;

-- Drop policies on shops table (if exists)
DROP POLICY IF EXISTS "Enable read access for all users" ON shops;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shops;
DROP POLICY IF EXISTS "Enable update for shop owners" ON shops;
DROP POLICY IF EXISTS "Enable delete for shop owners" ON shops;

-- Drop policies on shop_staff table (if exists)
DROP POLICY IF EXISTS "Enable read for shop staff" ON shop_staff;
DROP POLICY IF EXISTS "Enable insert for shop admins" ON shop_staff;
DROP POLICY IF EXISTS "Enable update for shop admins" ON shop_staff;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shop_staff;

-- Drop policies on shop_reviews table (if exists)
DROP POLICY IF EXISTS "Enable read for all" ON shop_reviews;
DROP POLICY IF EXISTS "Enable insert for customers" ON shop_reviews;
DROP POLICY IF EXISTS "Enable update for review owner" ON shop_reviews;
DROP POLICY IF EXISTS "Enable delete for review owner" ON shop_reviews;

-- Drop policies on reviews table (if exists)
DROP POLICY IF EXISTS "Enable read access for all users" ON reviews;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON reviews;
DROP POLICY IF EXISTS "Enable update for review owner" ON reviews;
DROP POLICY IF EXISTS "Enable delete for review owner" ON reviews;

-- Drop policies on shop_members table (if exists)
DROP POLICY IF EXISTS "Enable read for shop members" ON shop_members;
DROP POLICY IF EXISTS "Enable insert for shop owners" ON shop_members;
DROP POLICY IF EXISTS "Enable update for shop owners" ON shop_members;
DROP POLICY IF EXISTS "Enable delete for shop owners" ON shop_members;

-- Drop policies on shop_services table (if exists)
DROP POLICY IF EXISTS "Enable read for all" ON shop_services;
DROP POLICY IF EXISTS "Enable insert for shop staff" ON shop_services;
DROP POLICY IF EXISTS "Enable update for shop staff" ON shop_services;
DROP POLICY IF EXISTS "Enable delete for shop admins" ON shop_services;

-- ============================================
-- STEP 2: DISABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shops DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shop_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: DROP ALL TRIGGERS
-- ============================================

DO $$ 
BEGIN
    -- Profiles triggers
    DROP TRIGGER IF EXISTS prevent_super_admin_deletion_trigger ON profiles;
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    DROP TRIGGER IF EXISTS on_auth_user_created ON profiles;
    
    -- Services triggers
    DROP TRIGGER IF EXISTS services_updated_at ON services;
    DROP TRIGGER IF EXISTS update_services_updated_at ON services;
    
    -- Bookings triggers
    DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
    DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
    
    -- Shops triggers (if exists)
    DROP TRIGGER IF EXISTS add_shop_owner_trigger ON shops;
    DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
    DROP TRIGGER IF EXISTS shops_updated_at ON shops;
    
    -- Shop staff triggers
    DROP TRIGGER IF EXISTS shop_staff_updated_at ON shop_staff;
    
    -- Shop services triggers
    DROP TRIGGER IF EXISTS update_shop_services_updated_at ON shop_services;
    
    -- Reviews triggers
    DROP TRIGGER IF EXISTS reviews_updated_at ON shop_reviews;
    DROP TRIGGER IF EXISTS after_review_update_rating ON shop_reviews;
END $$;

-- ============================================
-- STEP 4: DROP ALL FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS add_shop_owner_as_member() CASCADE;
DROP FUNCTION IF EXISTS prevent_super_admin_deletion() CASCADE;
DROP FUNCTION IF EXISTS update_shop_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS get_user_shop_role(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS can_user_access_shop(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_shops(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_role_in_shop(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_shop_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_shop_barbers(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_shop_rating(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_update_shop_rating() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS auth_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_shop_admin(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_shop_manager_or_admin(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_shop_staff(UUID, UUID) CASCADE;

-- ============================================
-- STEP 5: DROP ALL TABLES
-- ============================================

DROP TABLE IF EXISTS shop_reviews CASCADE;
DROP TABLE IF EXISTS shop_staff CASCADE;
DROP TABLE IF EXISTS shop_services CASCADE;
DROP TABLE IF EXISTS shop_members CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS barber_availability CASCADE;

-- DON'T drop profiles table - just clean it up
-- profiles table is linked to auth.users, so we keep it

-- ============================================
-- STEP 6: CLEAN UP PROFILES TABLE
-- ============================================

-- Remove old columns
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS specialties CASCADE;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS rating CASCADE;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS total_reviews CASCADE;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS is_super_admin CASCADE;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS bio CASCADE;

-- Add new column
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ All old structures dropped!' as status;
SELECT '📝 Now run: SHOP_FIRST_DATABASE_SCHEMA.sql' as next_step;

-- Check remaining tables
SELECT 'Remaining tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
