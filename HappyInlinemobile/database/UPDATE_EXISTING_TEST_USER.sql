-- Update existing test user to be exclusive to Avon Barber Shop
-- Run this ONLY if you have a test user that was registered before the migration

-- First, find the Avon Barber Shop ID
SELECT id, name FROM shops WHERE name ILIKE '%avon%';

-- Then, update your test user (replace the email and shop_id)
-- UPDATE profiles
-- SET exclusive_shop_id = 'YOUR_SHOP_ID_HERE'
-- WHERE email = 'jassavon@ineffabledesign.com';

-- Example (uncomment and replace with actual IDs):
-- UPDATE profiles
-- SET exclusive_shop_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- WHERE email = 'jassavon@ineffabledesign.com';

-- Verify the update
SELECT
  id,
  email,
  name,
  role,
  exclusive_shop_id,
  created_at
FROM profiles
WHERE email = 'jassavon@ineffabledesign.com';
