-- ================================================================
-- CLEANUP TEST/DEMO STORES FROM DATABASE
-- ================================================================
-- This SQL script will delete all test and demo shops from the database
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ================================================================

-- Show test shops before deletion
SELECT
  '📊 Test shops to be deleted:' as info,
  id,
  name,
  created_at
FROM shops
WHERE
  name ILIKE '%test%'
  OR name ILIKE '%demo%'
  OR name ILIKE '%avon%';

-- ================================================================
-- STEP 1: Delete associated messages (if table exists)
-- ================================================================
-- Note: Run this only if the messages table exists
-- DELETE FROM messages
-- WHERE conversation_id IN (
--   SELECT id FROM conversations
--   WHERE shop_id IN (
--     SELECT id FROM shops
--     WHERE name ILIKE '%test%'
--       OR name ILIKE '%demo%'
--       OR name ILIKE '%avon%'
--   )
-- );

-- ================================================================
-- STEP 2: Delete associated conversations (if table exists)
-- ================================================================
-- Note: Run this only if the conversations table exists
-- DELETE FROM conversations
-- WHERE shop_id IN (
--   SELECT id FROM shops
--   WHERE name ILIKE '%test%'
--     OR name ILIKE '%demo%'
--     OR name ILIKE '%avon%'
-- );

-- ================================================================
-- STEP 3: Delete associated bookings
-- ================================================================
DELETE FROM bookings
WHERE shop_id IN (
  SELECT id FROM shops
  WHERE name ILIKE '%test%'
    OR name ILIKE '%demo%'
    OR name ILIKE '%avon%'
);

-- ================================================================
-- STEP 4: Delete shop_staff entries
-- ================================================================
DELETE FROM shop_staff
WHERE shop_id IN (
  SELECT id FROM shops
  WHERE name ILIKE '%test%'
    OR name ILIKE '%demo%'
    OR name ILIKE '%avon%'
);

-- ================================================================
-- STEP 5: Delete shop_services
-- ================================================================
DELETE FROM shop_services
WHERE shop_id IN (
  SELECT id FROM shops
  WHERE name ILIKE '%test%'
    OR name ILIKE '%demo%'
    OR name ILIKE '%avon%'
);

-- ================================================================
-- STEP 6: Delete shop_invitations
-- ================================================================
DELETE FROM shop_invitations
WHERE shop_id IN (
  SELECT id FROM shops
  WHERE name ILIKE '%test%'
    OR name ILIKE '%demo%'
    OR name ILIKE '%avon%'
);

-- ================================================================
-- STEP 7: Delete the shops themselves
-- ================================================================
DELETE FROM shops
WHERE
  name ILIKE '%test%'
  OR name ILIKE '%demo%'
  OR name ILIKE '%avon%';

-- ================================================================
-- VERIFY CLEANUP
-- ================================================================
SELECT
  '✅ Remaining test shops (should be empty):' as verification,
  id,
  name,
  created_at
FROM shops
WHERE
  name ILIKE '%test%'
  OR name ILIKE '%demo%'
  OR name ILIKE '%avon%';

-- Show all remaining shops
SELECT
  '📋 All remaining shops:' as info,
  id,
  name,
  business_type_id,
  created_at
FROM shops
ORDER BY created_at DESC;
