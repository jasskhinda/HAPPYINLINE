-- =====================================================
-- FIX MESSAGES REALTIME SUBSCRIPTION
-- =====================================================
-- This fixes the "Channel error - real-time updates may not work" error
-- for the messages table
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Remove the table from realtime (ignore error if not exists)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE messages;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Step 2: Add it back to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Step 3: Enable replica identity (required for realtime to work)
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Step 4: Verify the setup
SELECT
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'messages';

-- Step 5: Check replica identity
SELECT
  relname as table_name,
  CASE relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class
WHERE relname = 'messages';

-- =====================================================
-- NOTES:
-- =====================================================
-- After running this:
-- 1. The messages realtime subscription should work without errors
-- 2. You should see real-time message updates in chat
-- =====================================================
