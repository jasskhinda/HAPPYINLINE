-- =====================================================
-- FIX PARTITIONED MESSAGES TABLE FOR REALTIME
-- =====================================================
-- The messages table is partitioned by date, which causes
-- realtime subscription issues. We need to add all partitions
-- to the realtime publication.
-- =====================================================

-- Step 1: Set REPLICA IDENTITY FULL on the parent table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Step 2: Set REPLICA IDENTITY FULL on ALL existing partitions
ALTER TABLE public.messages_2025_11_07 REPLICA IDENTITY FULL;
ALTER TABLE public.messages_2025_11_08 REPLICA IDENTITY FULL;
ALTER TABLE public.messages_2025_11_09 REPLICA IDENTITY FULL;
ALTER TABLE public.messages_2025_11_10 REPLICA IDENTITY FULL;
ALTER TABLE public.messages_2025_11_11 REPLICA IDENTITY FULL;
ALTER TABLE public.messages_2025_11_12 REPLICA IDENTITY FULL;
ALTER TABLE public.messages_2025_11_13 REPLICA IDENTITY FULL;

-- Step 3: Add ALL partitions to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_2025_11_07;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_2025_11_08;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_2025_11_09;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_2025_11_10;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_2025_11_11;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_2025_11_12;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_2025_11_13;

-- Step 4: Verify all tables are in the publication
SELECT
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename LIKE 'messages%'
ORDER BY tablename;

-- Step 5: Verify replica identity
SELECT
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
WHERE c.relname LIKE 'messages%'
  AND c.relnamespace = 'public'::regnamespace
ORDER BY table_name;

-- =====================================================
-- IMPORTANT NOTE:
-- =====================================================
-- New partitions will be created automatically as dates pass.
-- You'll need to run this for new partitions:
--
-- ALTER TABLE public.messages_YYYY_MM_DD REPLICA IDENTITY FULL;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_YYYY_MM_DD;
--
-- Consider creating a trigger or cron job to automate this.
-- =====================================================
