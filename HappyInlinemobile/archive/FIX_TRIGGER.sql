-- ============================================
-- FIX: Handle New User Trigger for Account Creation
-- ============================================
-- This fixes "Database error saving new user" when creating barbers/managers/admins
-- Run this in Supabase SQL Editor

-- Drop and recreate the trigger function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_specialties UUID[];
BEGIN
  -- Get role from metadata, default to 'customer'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  -- Handle specialties carefully - only try to parse if it exists and is not null
  BEGIN
    IF NEW.raw_user_meta_data->>'specialties' IS NOT NULL AND NEW.raw_user_meta_data->>'specialties' != 'null' THEN
      user_specialties := CAST(NEW.raw_user_meta_data->>'specialties' AS UUID[]);
    ELSE
      user_specialties := ARRAY[]::UUID[];
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If casting fails, just use empty array
      user_specialties := ARRAY[]::UUID[];
  END;
  
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    phone, 
    bio, 
    specialties, 
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bio', NULL),
    user_specialties,
    -- Auto-complete onboarding for barbers, managers, admins
    CASE 
      WHEN user_role IN ('barber', 'manager', 'admin', 'super_admin') THEN true
      ELSE COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
    END
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise with more details
    RAISE NOTICE 'Error in handle_new_user: %, SQLERRM: %', SQLSTATE, SQLERRM;
    RAISE NOTICE 'Metadata: %', NEW.raw_user_meta_data;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Verify the function exists
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- Test: Check if trigger is active
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

SELECT '✅ Trigger function updated successfully!' as status;
