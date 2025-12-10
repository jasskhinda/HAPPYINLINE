-- =====================================================
-- ENABLE REAL-TIME MESSAGING
-- =====================================================
-- This script enables Supabase Realtime for the messaging system
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Enable Realtime on the messages table
-- This allows clients to subscribe to INSERT, UPDATE, DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Step 2: Enable Realtime on the conversations table (for conversation list updates)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Step 3: Verify that realtime is enabled
-- You should see 'messages' and 'conversations' in the result
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. After running this script, you need to enable Realtime in Supabase Dashboard:
--    - Go to Database → Replication
--    - Find 'messages' table
--    - Enable Realtime for INSERT events
--    - Find 'conversations' table
--    - Enable Realtime for INSERT and UPDATE events
--
-- 2. If you get an error "relation already exists in publication",
--    that means realtime is already enabled and you can skip this step.
--
-- 3. To check which tables have realtime enabled, run:
--    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- =====================================================
