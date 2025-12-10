    -- ============================================
    -- DEBUG: Why is the trigger not updating the profile ID?
    -- ============================================

    -- 1. Check if trigger exists
    SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
    FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created';

    -- 2. Check current profile data
    SELECT 
    id as profile_id,
    email,
    name,
    role,
    created_at
    FROM profiles 
    WHERE email = 'bhavyansh2018@gmail.com';

    -- 3. Check auth users
    SELECT 
    id as auth_id,
    email,
    created_at,
    confirmed_at
    FROM auth.users 
    WHERE email = 'bhavyansh2018@gmail.com';

    -- 4. Compare IDs
    SELECT 
    p.id as profile_id,
    u.id as auth_id,
    CASE 
        WHEN p.id = u.id THEN '✅ IDs Match - Trigger worked!'
        ELSE '❌ IDs Different - Trigger failed!'
    END as status,
    p.email,
    p.name,
    p.role
    FROM profiles p
    LEFT JOIN auth.users u ON u.email = p.email
    WHERE p.email = 'bhavyansh2018@gmail.com';

    -- ============================================
    -- THE PROBLEM
    -- ============================================
    -- If IDs are different, it means:
    -- 1. Trigger didn't run (check if it exists)
    -- 2. Trigger ran but UPDATE failed (check logs)
    -- 3. UPDATE has a constraint preventing it
    -- ============================================

    -- Check if there are any constraints on profiles.id
    SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'profiles' 
    AND kcu.column_name = 'id';

    -- ============================================
    -- SOLUTION: Run this to manually fix the ID
    -- ============================================

    -- Option 1: Update the profile ID to match auth ID (SAFE - preserves data)
    DO $$
    DECLARE
    v_auth_id UUID;
    v_profile_id UUID;
    BEGIN
    -- Get auth user ID
    SELECT id INTO v_auth_id 
    FROM auth.users 
    WHERE email = 'bhavyansh2018@gmail.com';
    
    -- Get current profile ID
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE email = 'bhavyansh2018@gmail.com';
    
    RAISE NOTICE 'Auth ID: %', v_auth_id;
    RAISE NOTICE 'Profile ID: %', v_profile_id;
    
    IF v_auth_id IS NOT NULL AND v_profile_id IS NOT NULL AND v_auth_id != v_profile_id THEN
        -- Update profile ID to match auth ID
        UPDATE profiles 
        SET id = v_auth_id
        WHERE email = 'bhavyansh2018@gmail.com';
        
        RAISE NOTICE '✅ Profile ID updated to match auth ID';
    ELSIF v_auth_id = v_profile_id THEN
        RAISE NOTICE '✅ IDs already match!';
    ELSE
        RAISE NOTICE '❌ Could not find auth user or profile';
    END IF;
    END $$;

    -- Verify the fix
    SELECT 
    p.id as profile_id,
    u.id as auth_id,
    CASE 
        WHEN p.id = u.id THEN '✅ FIXED!'
        ELSE '❌ Still broken'
    END as status,
    p.name,
    p.role
    FROM profiles p
    LEFT JOIN auth.users u ON u.email = p.email
    WHERE p.email = 'bhavyansh2018@gmail.com';
