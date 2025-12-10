-- Debug: Check messages for Avon Barber Shop conversation
-- Shop ID: 0dd5c721-187d-46eb-be84-5c733806c1e1
-- Customer: Jass Khinda
-- Owner/Admin: Asher Collins (928c8c40-546f-4fd4-833a-0a7b1dbb3c45)

-- 1. Find the conversation
SELECT
  c.id as conversation_id,
  c.shop_id,
  c.user1_id,
  c.user2_id,
  c.created_at,
  c.updated_at,
  p1.name as user1_name,
  p1.email as user1_email,
  p2.name as user2_name,
  p2.email as user2_email
FROM conversations c
LEFT JOIN profiles p1 ON c.user1_id = p1.id
LEFT JOIN profiles p2 ON c.user2_id = p2.id
WHERE c.shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
ORDER BY c.created_at DESC;

-- 2. Check ALL messages in this conversation
SELECT
  m.id,
  m.conversation_id,
  m.sender_id,
  m.message_text,
  m.created_at,
  m.is_read,
  p.name as sender_name,
  p.email as sender_email
FROM messages m
LEFT JOIN profiles p ON m.sender_id = p.id
WHERE m.conversation_id IN (
  SELECT id FROM conversations WHERE shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
)
ORDER BY m.created_at DESC;

-- 3. Check if messages exist but RLS is blocking them
-- This query bypasses RLS to see all messages
SET ROLE postgres; -- Run as superuser to bypass RLS
SELECT
  m.id,
  m.conversation_id,
  m.sender_id,
  m.message_text,
  m.created_at,
  p.name as sender_name
FROM messages m
LEFT JOIN profiles p ON m.sender_id = p.id
WHERE m.conversation_id IN (
  SELECT id FROM conversations WHERE shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
)
ORDER BY m.created_at DESC;
RESET ROLE; -- Reset to normal user

-- 4. Check the messages RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'messages';
