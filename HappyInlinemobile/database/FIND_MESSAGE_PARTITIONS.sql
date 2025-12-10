-- =====================================================
-- FIND ALL MESSAGE PARTITION NAMES
-- =====================================================
-- This will show us the exact partition table names
-- =====================================================

-- Find all tables that start with 'messages'
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename LIKE 'messages%'
  AND schemaname = 'public'
ORDER BY tablename;

-- Also check in the realtime publication
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename LIKE 'messages%'
ORDER BY tablename;
