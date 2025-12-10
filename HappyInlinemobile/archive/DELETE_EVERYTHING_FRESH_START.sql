-- ============================================
-- NUCLEAR OPTION - DELETE EVERYTHING
-- ============================================
-- ⚠️ BACKUP YOUR DATABASE FIRST!
-- ⚠️ This deletes ALL tables and starts fresh
-- ⚠️ Only auth.users will remain (Supabase managed)
-- ============================================

-- Disable RLS on all tables first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- Drop all policies on all tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Drop all triggers
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON ' || quote_ident(r.event_object_table);
    END LOOP;
END $$;

-- Drop all functions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all tables in public schema (except auth tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'auth_%'  -- Keep auth tables
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Verification
SELECT '🧹 Everything cleaned!' as status;
SELECT '📝 Tables remaining:' as info;
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT '✅ Ready for fresh start!' as result;
SELECT '📝 Next: Run SHOP_FIRST_DATABASE_SCHEMA.sql' as next_step;
