-- ================================================
-- MESSAGING SYSTEM FOR SUPER ADMIN ↔ SHOP MANAGERS
-- ================================================

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Related shop (if conversation is about a specific shop)
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,

  -- Conversation type
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'support', 'shop_inquiry')),

  -- Last message info (for preview)
  last_message_text TEXT,
  last_message_at TIMESTAMP DEFAULT NOW(),
  last_message_by UUID REFERENCES profiles(id),

  -- Unread counts
  unread_count_participant_1 INTEGER DEFAULT 0,
  unread_count_participant_2 INTEGER DEFAULT 0,

  -- Status
  is_archived BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure no duplicate conversations between same participants
  UNIQUE(participant_1_id, participant_2_id, shop_id)
);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which conversation
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Who sent it
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Message content
  message_text TEXT NOT NULL,

  -- Attachments (optional - for future use)
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'document', 'link')),

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,

  -- Delivery status
  is_delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMP,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_shop ON conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- 4. Create function to update conversation last_message info
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_text = NEW.message_text,
    last_message_at = NEW.created_at,
    last_message_by = NEW.sender_id,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to auto-update conversation on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- 6. Create function to increment unread count
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
DECLARE
  conversation_row conversations%ROWTYPE;
BEGIN
  SELECT * INTO conversation_row FROM conversations WHERE id = NEW.conversation_id;

  -- Increment unread count for the OTHER participant
  IF NEW.sender_id = conversation_row.participant_1_id THEN
    UPDATE conversations
    SET unread_count_participant_2 = unread_count_participant_2 + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations
    SET unread_count_participant_1 = unread_count_participant_1 + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-increment unread count
DROP TRIGGER IF EXISTS trigger_increment_unread_count ON messages;
CREATE TRIGGER trigger_increment_unread_count
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increment_unread_count();

-- 8. Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for conversations

-- Users can see conversations they're part of
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
USING (
  auth.uid() = participant_1_id OR
  auth.uid() = participant_2_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Users can create conversations with others
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (
  auth.uid() = participant_1_id OR
  auth.uid() = participant_2_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Users can update their own conversations (mark read, archive, etc.)
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
USING (
  auth.uid() = participant_1_id OR
  auth.uid() = participant_2_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- 10. RLS Policies for messages

-- Users can see messages in their conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.participant_1_id = auth.uid() OR
      conversations.participant_2_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_super_admin = true
      )
    )
  )
);

-- Users can send messages in their conversations
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.participant_1_id = auth.uid() OR
      conversations.participant_2_id = auth.uid()
    )
  )
);

-- Users can update their own messages (mark as read, delete)
DROP POLICY IF EXISTS "Users can update messages" ON messages;
CREATE POLICY "Users can update messages"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.participant_1_id = auth.uid() OR
      conversations.participant_2_id = auth.uid()
    )
  )
);

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user1_id UUID,
  p_user2_id UUID,
  p_shop_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (
    (participant_1_id = p_user1_id AND participant_2_id = p_user2_id) OR
    (participant_1_id = p_user2_id AND participant_2_id = p_user1_id)
  )
  AND (shop_id = p_shop_id OR (shop_id IS NULL AND p_shop_id IS NULL))
  LIMIT 1;

  -- If not found, create new conversation
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      participant_1_id,
      participant_2_id,
      shop_id,
      type
    ) VALUES (
      p_user1_id,
      p_user2_id,
      p_shop_id,
      CASE WHEN p_shop_id IS NOT NULL THEN 'shop_inquiry' ELSE 'direct' END
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark conversation as read for a user
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  conversation_row conversations%ROWTYPE;
BEGIN
  SELECT * INTO conversation_row FROM conversations WHERE id = p_conversation_id;

  -- Reset unread count for this user
  IF p_user_id = conversation_row.participant_1_id THEN
    UPDATE conversations
    SET unread_count_participant_1 = 0
    WHERE id = p_conversation_id;
  ELSIF p_user_id = conversation_row.participant_2_id THEN
    UPDATE conversations
    SET unread_count_participant_2 = 0
    WHERE id = p_conversation_id;
  END IF;

  -- Mark all messages as read
  UPDATE messages
  SET is_read = true, read_at = NOW()
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND is_read = false;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Messaging system created successfully!';
  RAISE NOTICE '📝 Tables: conversations, messages';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '⚡ Triggers and functions created';
END $$;
