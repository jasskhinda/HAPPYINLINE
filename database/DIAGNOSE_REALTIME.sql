-- =====================================================
-- DIAGNOSE REALTIME CONFIGURATION
-- =====================================================
-- This will show us exactly what's configured
-- =====================================================

-- 1. Show ALL tables in the realtime publication
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 2. Show replica identity for our specific tables
SELECT
  n.nspname as schema_name,
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('messages', 'conversations', 'user_presence')
  AND n.nspname = 'public'
ORDER BY table_name;

-- 3. Check if there's a realtime schema
SELECT
  n.nspname as schema_name,
  c.relname as table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'realtime'
  AND c.relkind = 'r'
ORDER BY table_name;

-- 4. Check for any Supabase realtime configuration tables
SELECT tablename
FROM pg_tables
WHERE schemaname IN ('realtime', '_realtime')
ORDER BY tablename;
