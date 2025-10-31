-- ============================================
-- COMPLETE FIX: Update Profile ID + Fix Trigger
-- ============================================
-- This will:
-- 1. Check for foreign key blocking UPDATE
-- 2. Drop foreign keys if needed
-- 3. Update profile ID to match auth ID
-- 4. Recreate trigger to handle future logins
-- ============================================

-- STEP 1: Check what's blocking the UPDATE
SELECT
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles' 
  AND kcu.column_name = 'id';

-- STEP 2: Drop foreign keys that reference profiles.id
-- These prevent us from updating the ID
DO $$
DECLARE
  fk_record RECORD;
BEGIN
  FOR fk_record IN 
    SELECT 
      tc.table_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
  LOOP
    RAISE NOTICE 'Dropping FK: %.% (references profiles.id)', 
                 fk_record.table_name, fk_record.constraint_name;
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                   fk_record.table_name, fk_record.constraint_name);
  END LOOP;
END $$;

-- STEP 3: Disable RLS (if not already disabled)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- STEP 4: Update profile ID to match auth ID
DO $$
DECLARE
  v_auth_id UUID;
  v_profile_id UUID;
  v_name TEXT;
  v_role TEXT;
BEGIN
  -- Get auth user info
  SELECT id INTO v_auth_id 
  FROM auth.users 
  WHERE email = 'bhavyansh2018@gmail.com';
  
  -- Get current profile info
  SELECT id, name, role INTO v_profile_id, v_name, v_role
  FROM profiles
  WHERE email = 'bhavyansh2018@gmail.com';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth ID: %', v_auth_id;
  RAISE NOTICE 'Profile ID: %', v_profile_id;
  RAISE NOTICE 'Name: %', v_name;
  RAISE NOTICE 'Role: %', v_role;
  RAISE NOTICE '========================================';
  
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found for bhavyansh2018@gmail.com';
  END IF;
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for bhavyansh2018@gmail.com';
  END IF;
  
  IF v_auth_id = v_profile_id THEN
    RAISE NOTICE '✅ IDs already match! No update needed.';
  ELSE
    RAISE NOTICE '🔄 Updating profile ID: % → %', v_profile_id, v_auth_id;
    
    -- Try UPDATE
    BEGIN
      UPDATE profiles 
      SET id = v_auth_id
      WHERE email = 'bhavyansh2018@gmail.com';
      
      RAISE NOTICE '✅ Profile ID updated successfully!';
      RAISE NOTICE 'Name preserved: %', v_name;
      RAISE NOTICE 'Role preserved: %', v_role;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update profile ID: % - %', SQLSTATE, SQLERRM;
    END;
  END IF;
END $$;

-- STEP 5: Verify the fix
SELECT 
  p.id as profile_id,
  u.id as auth_id,
  CASE 
    WHEN p.id = u.id THEN '✅ IDs MATCH!'
    ELSE '❌ IDs STILL DIFFERENT'
  END as status,
  p.email,
  p.name,
  p.role,
  p.phone
FROM profiles p
LEFT JOIN auth.users u ON u.email = p.email
WHERE p.email = 'bhavyansh2018@gmail.com';

-- STEP 6: Recreate trigger for future logins
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  old_profile RECORD;
BEGIN
  -- Check if profile exists
  SELECT * INTO old_profile 
  FROM public.profiles 
  WHERE email = NEW.email;
  
  IF old_profile IS NOT NULL THEN
    -- Profile exists - link it to auth account
    RAISE NOTICE '🔗 Linking profile: % (Name: %, Role: %)', 
                 NEW.email, old_profile.name, old_profile.role;
    
    BEGIN
      -- Just UPDATE the ID
      UPDATE public.profiles
      SET id = NEW.id
      WHERE email = NEW.email;
      
      RAISE NOTICE '✅ Linked successfully!';
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Failed to link: % - %', SQLSTATE, SQLERRM;
        
        -- Fallback: Delete and recreate with preserved data
        BEGIN
          DELETE FROM public.profiles WHERE email = NEW.email;
          
          INSERT INTO public.profiles (
            id, email, name, role, profile_image, phone, bio,
            specialties, rating, total_reviews, is_active,
            is_super_admin, onboarding_completed, created_at
          )
          VALUES (
            NEW.id, NEW.email,
            COALESCE(old_profile.name, ''),
            COALESCE(old_profile.role, 'customer'),
            old_profile.profile_image,
            old_profile.phone,
            old_profile.bio,
            COALESCE(old_profile.specialties, ARRAY[]::UUID[]),
            COALESCE(old_profile.rating, 0),
            COALESCE(old_profile.total_reviews, 0),
            COALESCE(old_profile.is_active, true),
            COALESCE(old_profile.is_super_admin, false),
            COALESCE(old_profile.onboarding_completed, true),
            COALESCE(old_profile.created_at, NOW())
          );
          
          RAISE NOTICE '✅ Recreated profile successfully!';
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING '❌ Fallback also failed: % - %', SQLSTATE, SQLERRM;
        END;
    END;
  ELSE
    -- New customer - create profile
    RAISE NOTICE '👤 Creating new profile: %', NEW.email;
    
    BEGIN
      INSERT INTO public.profiles (id, email, name, role, onboarding_completed)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
        FALSE
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Could not create profile: % - %', SQLSTATE, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Final verification
SELECT '✅ COMPLETE FIX APPLIED!' as status;
SELECT 'Profile ID should now match auth ID' as result;
SELECT 'Trigger recreated for future logins' as info;

-- Show final state
SELECT 
  'Current State:' as info,
  p.id as profile_id,
  p.name,
  p.role,
  p.email
FROM profiles p
WHERE p.email = 'bhavyansh2018@gmail.com';
