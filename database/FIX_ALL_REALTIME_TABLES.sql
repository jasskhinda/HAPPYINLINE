-- =====================================================
-- FIX ALL REALTIME SUBSCRIPTIONS
-- =====================================================
-- This fixes "mismatch between server and client bindings" errors
-- for all chat-related tables
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Fix messages table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE messages;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Fix conversations table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE conversations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Fix user_presence table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE user_presence;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER TABLE user_presence REPLICA IDENTITY FULL;

-- Verify all tables are in realtime
SELECT
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'conversations', 'user_presence')
ORDER BY tablename;

-- Check replica identity for all tables
SELECT
  relname as table_name,
  CASE relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class
WHERE relname IN ('messages', 'conversations', 'user_presence')
ORDER BY relname;

-- =====================================================
-- NOTES:
-- =====================================================
-- After running this:
-- 1. Restart your Expo app completely (kill all node processes)
-- 2. Clear Supabase realtime cache if possible
-- 3. All real-time subscriptions should work without errors
-- =====================================================
