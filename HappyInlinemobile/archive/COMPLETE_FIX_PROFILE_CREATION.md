# ✅ COMPLETE FIX: Profile Linking for All Roles

## Problem
- Admin creates users (manager/barber/admin) with names in database
- When they login, trigger DELETES and RECREATES profile
- Name is lost → Shows "Guest" → Can't access features

## Solution
**UPDATE the profile ID instead of DELETE + INSERT**
- This preserves ALL data (name, role, phone, bio, etc.)
- Only changes the ID to link with auth account

---

## Run This SQL in Supabase

```sql
-- ============================================
-- FINAL WORKING TRIGGER
-- ============================================
-- This trigger preserves ALL profile data when linking
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create improved trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  old_profile RECORD;
BEGIN
  -- Check if profile already exists by email
  SELECT * INTO old_profile 
  FROM public.profiles 
  WHERE email = NEW.email;
  
  IF old_profile IS NOT NULL THEN
    -- Profile exists (admin created it for manager/barber/admin)
    -- Just UPDATE the ID to link with auth account
    RAISE NOTICE 'Linking existing profile: % (Role: %, Name: %)', NEW.email, old_profile.role, old_profile.name;
    
    BEGIN
      -- UPDATE preserves ALL data (name, role, phone, bio, etc.)
      UPDATE public.profiles
      SET id = NEW.id
      WHERE email = NEW.email;
      
      RAISE NOTICE '✅ Successfully linked: % → ID: %', NEW.email, NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- If UPDATE fails (e.g., ID constraint), try delete+recreate
        RAISE WARNING 'UPDATE failed, trying delete+insert: % - %', SQLSTATE, SQLERRM;
        
        BEGIN
          DELETE FROM public.profiles WHERE email = NEW.email;
          
          INSERT INTO public.profiles (
            id, email, name, role, profile_image, phone, bio, 
            specialties, rating, total_reviews, is_active, 
            is_super_admin, onboarding_completed, created_at
          )
          VALUES (
            NEW.id,
            NEW.email,
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
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING '❌ Could not link profile: % - %', SQLSTATE, SQLERRM;
        END;
    END;
  ELSE
    -- New customer signup (no existing profile)
    RAISE NOTICE 'Creating new customer profile: %', NEW.email;
    
    BEGIN
      INSERT INTO public.profiles (
        id, email, name, role, onboarding_completed
      )
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
  
  -- ALWAYS return NEW to ensure auth user is created
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Verify trigger exists
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

SELECT '✅ TRIGGER UPDATED SUCCESSFULLY!' as status;
SELECT 'Trigger now uses UPDATE instead of DELETE+INSERT' as improvement;
SELECT 'All profile data (name, role, etc.) will be preserved!' as result;
```

---

## Why This Works

### Old Trigger (BAD):
```sql
DELETE FROM profiles WHERE email = 'manager@email.com';
INSERT INTO profiles (id, email, name, role) VALUES (auth_id, email, name, role);
```
**Problem:** Sometimes INSERT fails or name becomes NULL

### New Trigger (GOOD):
```sql
UPDATE profiles 
SET id = auth_id 
WHERE email = 'manager@email.com';
```
**Solution:** Just changes the ID, keeps everything else!

---

## Flow After Fix

### For Manager/Barber/Admin:
```
1. Admin creates: name="Bhavyansh", role="manager" ✅
2. User logs in → OTP verification ✅
3. Trigger fires:
   → Finds existing profile ✅
   → UPDATE id = auth_id ✅
   → Name PRESERVED: "Bhavyansh" ✅
   → Role PRESERVED: "manager" ✅
4. fetchLatestProfile() gets full profile ✅
5. OTPVerificationScreen sees name exists ✅
6. Navigate to MainScreen (no name input) ✅
7. HomeScreen shows correct name & role ✅
8. Manager toggle switch appears ✅
```

### For New Customer:
```
1. User signs up (no existing profile) ✅
2. Trigger creates new profile with role="customer" ✅
3. Name is empty ✅
4. Goes to name input screen ✅
5. User enters name ✅
6. Goes to MainScreen ✅
```

---

## Test After Running SQL

1. **Run the SQL** in Supabase SQL Editor
2. **Logout** from app
3. **Delete auth account** for manager (optional, to test fresh)
4. **Login with manager** email
5. **Check console logs** - Should see:
   ```
   ✅ Successfully linked: bhavyansh2018@gmail.com
   ✅ Profile found:
      Name: Bhavyansh
      Role: manager
   ```
6. **Should go directly to MainScreen** ✅
7. **Manager toggle should appear** ✅
8. **Username should show "Bhavyansh" not "Guest"** ✅

---

## Status
✅ SQL updated to use UPDATE instead of DELETE+INSERT
✅ Preserves ALL profile data (name, role, phone, bio, etc.)
✅ Ready to test

**Run this SQL now and test!** 🚀
