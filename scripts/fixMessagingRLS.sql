-- Fix: RLS policies for messages and conversations
-- Your database uses user1_id/user2_id schema

-- ============================================
-- STEP 1: Drop any existing conflicting policies
-- ============================================

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;

DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;

-- ============================================
-- STEP 2: Create correct RLS policies for MESSAGES
-- ============================================

-- Allow users to SELECT messages in conversations they're part of
CREATE POLICY "messages_select_policy"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
  )
);

-- Allow users to INSERT messages in conversations they're part of
CREATE POLICY "messages_insert_policy"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
  )
);

-- Allow users to UPDATE messages (for read receipts) in their conversations
CREATE POLICY "messages_update_policy"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
  )
);

-- ============================================
-- STEP 3: Create correct RLS policies for CONVERSATIONS
-- ============================================

-- Allow users to SELECT conversations they're part of
CREATE POLICY "conversations_select_policy"
ON conversations FOR SELECT
TO authenticated
USING (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- Allow users to INSERT conversations (when starting a new chat)
CREATE POLICY "conversations_insert_policy"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- Allow users to UPDATE conversations they're part of (last_message, etc)
CREATE POLICY "conversations_update_policy"
ON conversations FOR UPDATE
TO authenticated
USING (
  user1_id = auth.uid() OR user2_id = auth.uid()
)
WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- ============================================
-- STEP 4: Verify policies were created
-- ============================================

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('messages', 'conversations')
ORDER BY tablename, cmd;
