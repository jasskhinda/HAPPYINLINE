-- =====================================================
-- FIX MESSAGES TABLE - EXPLICIT SCHEMA FIX
-- =====================================================
-- This fixes the duplicate messages table issue
-- Run this in your Supabase SQL Editor
-- =====================================================

-- First, let's see what tables we have
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
  AND n.nspname IN ('public', 'realtime')
ORDER BY schema_name, table_name;

-- Fix the public.messages table explicitly
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Remove and re-add to publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Verify the fix
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
WHERE c.relname = 'messages'
  AND n.nspname = 'public';

-- =====================================================
-- NOTES:
-- =====================================================
-- After running this, restart your Expo app completely
-- =====================================================
