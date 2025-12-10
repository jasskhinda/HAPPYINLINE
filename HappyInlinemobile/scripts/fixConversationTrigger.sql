-- Fix: Update the trigger function to use 'content' instead of 'message_text'
-- This will make the conversation list show the last message preview

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
DROP FUNCTION IF EXISTS update_conversation_last_message();

-- Create updated function with correct column name
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_text = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_conversation_last_message';

-- Update existing conversation with the actual last message
UPDATE conversations c
SET
  last_message_text = (
    SELECT m.content
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ),
  last_message_at = (
    SELECT m.created_at
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  )
WHERE c.shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1'
AND EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.id);

-- Verify it worked
SELECT
  c.id,
  c.last_message_text,
  c.last_message_at,
  s.name as shop_name
FROM conversations c
LEFT JOIN shops s ON c.shop_id = s.id
WHERE c.shop_id = '0dd5c721-187d-46eb-be84-5c733806c1e1';
