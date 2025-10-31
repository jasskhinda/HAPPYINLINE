-- Update specific user to 'owner' role
-- User: yomek19737@hh7f.com

-- First, check the current role
SELECT id, email, name, role
FROM profiles
WHERE email = 'yomek19737@hh7f.com';

-- Update the profile to 'owner' role
UPDATE profiles
SET role = 'owner',
    updated_at = NOW()
WHERE email = 'yomek19737@hh7f.com';

-- Verify the update
SELECT id, email, name, role, updated_at
FROM profiles
WHERE email = 'yomek19737@hh7f.com';

-- Check if this user has shops (to verify they should be owner)
SELECT s.id, s.name, s.status, ss.role as shop_role
FROM shops s
JOIN shop_staff ss ON s.id = ss.shop_id
JOIN profiles p ON ss.user_id = p.id
WHERE p.email = 'yomek19737@hh7f.com';
