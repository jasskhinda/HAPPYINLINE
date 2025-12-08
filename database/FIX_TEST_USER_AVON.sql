-- Fix: Bind existing test user to Avon Barber Shop
-- This is for the user who registered before exclusive_shop_id was working

-- Step 1: Get Avon Barber Shop ID
SELECT id, name FROM shops WHERE name ILIKE '%avon%';

-- Step 2: Update the test user with Avon's shop ID
-- (Replace 'SHOP_ID_FROM_STEP_1' with the actual ID from the query above)

UPDATE profiles
SET
  exclusive_shop_id = (SELECT id FROM shops WHERE name ILIKE '%avon%' LIMIT 1),
  updated_at = NOW()
WHERE email = 'jassavon@ineffabledesign.com';

-- Step 3: Verify the update worked
SELECT
  id,
  email,
  name,
  role,
  exclusive_shop_id,
  (SELECT name FROM shops WHERE id = profiles.exclusive_shop_id) as shop_name,
  updated_at
FROM profiles
WHERE email = 'jassavon@ineffabledesign.com';

-- Expected result:
-- exclusive_shop_id should now have a UUID
-- shop_name should show "Avon Barber Shop"
