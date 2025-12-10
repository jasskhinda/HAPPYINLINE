-- =====================================================
-- FIX USER PRESENCE REALTIME SUBSCRIPTION
-- =====================================================
-- This fixes the "mismatch between server and client bindings" error
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Remove the table from realtime (ignore error if not exists)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE user_presence;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Step 2: Add it back to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Step 3: Enable replica identity (required for realtime to work)
ALTER TABLE user_presence REPLICA IDENTITY FULL;

-- Step 4: Verify the setup
SELECT
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence';

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
WHERE relname = 'user_presence';

-- =====================================================
-- NOTES:
-- =====================================================
-- After running this:
-- 1. Restart your Expo app
-- 2. The realtime subscription should work without errors
-- 3. You should see online/offline status updates in real-time
-- =====================================================
