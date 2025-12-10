-- Check the actual messages table schema in your database

-- Get column names for messages table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Then based on the column names, run the appropriate query:

-- If column is 'content', use this:
SELECT
  m.id,
  m.conversation_id,
  m.sender_id,
  m.content,
  m.created_at,
  p.name as sender_name
FROM messages m
LEFT JOIN profiles p ON m.sender_id = p.id
WHERE m.conversation_id IN (
  SELECT id FROM conversations WHERE shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
)
ORDER BY m.created_at DESC;

-- If column is 'message_text', use this instead:
-- SELECT
--   m.id,
--   m.conversation_id,
--   m.sender_id,
--   m.message_text,
--   m.created_at,
--   p.name as sender_name
-- FROM messages m
-- LEFT JOIN profiles p ON m.sender_id = p.id
-- WHERE m.conversation_id IN (
--   SELECT id FROM conversations WHERE shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
-- )
-- ORDER BY m.created_at DESC;
