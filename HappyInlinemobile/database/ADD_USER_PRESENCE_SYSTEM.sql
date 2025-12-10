-- =====================================================
-- USER PRESENCE SYSTEM FOR ACCURATE ONLINE STATUS
-- =====================================================
-- This creates a presence system to track which users are online
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Create user_presence table to track online status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE user_presence ENABLE ROW LEVEL Security;

-- Step 3: Create RLS policies for user_presence
-- Users can read anyone's presence
CREATE POLICY "Anyone can view user presence"
  ON user_presence
  FOR SELECT
  USING (true);

-- Users can only update their own presence
CREATE POLICY "Users can update own presence"
  ON user_presence
  FOR ALL
  USING (auth.uid() = user_id);

-- Step 4: Create function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_id UUID,
  p_is_online BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen, updated_at)
  VALUES (p_user_id, p_is_online, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    is_online = p_is_online,
    last_seen = NOW(),
    updated_at = NOW();
END;
$$;

-- Step 5: Create function to get user online status
CREATE OR REPLACE FUNCTION get_user_online_status(p_user_id UUID)
RETURNS TABLE (
  is_online BOOLEAN,
  last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      -- Consider online if explicitly online and last updated within 30 seconds
      WHEN up.is_online = true AND up.updated_at > NOW() - INTERVAL '30 seconds' THEN true
      ELSE false
    END as is_online,
    up.last_seen
  FROM user_presence up
  WHERE up.user_id = p_user_id;
END;
$$;

-- Step 6: Enable Realtime for user_presence table
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Step 7: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(is_online, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);

-- Step 8: Verify setup
SELECT
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Users are considered online if:
--    - is_online = true
--    - updated_at is within the last 30 seconds
--
-- 2. The app should:
--    - Call update_user_presence(user_id, true) when chat opens
--    - Call update_user_presence(user_id, false) when chat closes
--    - Send heartbeat every 15-20 seconds while chat is open
--
-- 3. This provides accurate real-time online status
-- =====================================================
