-- =====================================================
-- FIX: Ensure business owners get role='manager'
-- =====================================================

-- STEP 1: Check if handle_new_user function exists and what it does
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- STEP 2: If function doesn't exist or is wrong, recreate it
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_profile RECORD;
  user_role TEXT;
  user_name TEXT;
BEGIN
  -- Get role from metadata, default to 'customer'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  -- Get name from metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');

  -- Check if profile already exists by EMAIL
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE email = NEW.email;

  IF existing_profile IS NOT NULL THEN
    -- Profile exists - update the auth user_id to link them
    UPDATE public.profiles
    SET id = NEW.id,
        role = user_role,  -- Update role from metadata
        name = COALESCE(NULLIF(user_name, ''), existing_profile.name),  -- Keep existing name if metadata is empty
        updated_at = NOW()
    WHERE email = NEW.email;

    RAISE NOTICE 'Updated existing profile for %', NEW.email;
  ELSE
    -- Profile doesn't exist - create new one
    INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_role,  -- Use role from metadata
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created new profile for % with role %', NEW.email, user_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- STEP 4: Fix existing business owner accounts that have wrong role
-- This updates anyone who registered through BusinessRegistration but got customer role
UPDATE profiles
SET role = 'manager'
WHERE role = 'customer'
AND email IN (
  SELECT email
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'manager'
);

-- STEP 5: Specifically fix your account (just in case)
UPDATE profiles
SET role = 'manager'
WHERE email = 'yomek19737@hh7f.com';

-- STEP 6: Verify the fixes
SELECT
  p.email,
  p.name,
  p.role as profile_role,
  au.raw_user_meta_data->>'role' as metadata_role
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.email = 'yomek19737@hh7f.com';

-- Should show: profile_role = 'manager' and metadata_role = 'manager'
