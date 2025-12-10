-- =====================================================
-- DISABLE MESSAGES FROM REALTIME
-- =====================================================
-- Since Supabase's partitioning causes issues with realtime,
-- we'll remove messages from realtime and use polling instead
-- =====================================================

-- Remove messages and all its partitions from realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- Verify messages is removed
SELECT
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename LIKE 'messages%';

-- Should return no rows if successful
