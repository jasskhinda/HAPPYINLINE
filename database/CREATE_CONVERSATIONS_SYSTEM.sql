-- ================================================================
-- PROFESSIONAL MESSAGING SYSTEM FOR MULTI-BUSINESS PLATFORM
-- ================================================================
-- Creates conversations and messages tables for customer-business chat
-- Supports multiple businesses per owner with business context
-- ================================================================

-- ================================================================
-- 1. CONVERSATIONS TABLE
-- ================================================================
-- Stores conversation metadata between customers and businesses
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique conversation per shop-user pair
    CONSTRAINT unique_conversation_per_shop UNIQUE(shop_id, user1_id, user2_id),

    -- Ensure user1 and user2 are different
    CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Add comments
COMMENT ON TABLE public.conversations IS 'Stores conversations between customers and business owners/managers';
COMMENT ON COLUMN public.conversations.shop_id IS 'Which business this conversation is about';
COMMENT ON COLUMN public.conversations.user1_id IS 'First participant (usually customer)';
COMMENT ON COLUMN public.conversations.user2_id IS 'Second participant (usually owner/manager)';
COMMENT ON COLUMN public.conversations.last_message_text IS 'Preview of last message for list view';
COMMENT ON COLUMN public.conversations.last_message_at IS 'Timestamp of last message for sorting';

-- ================================================================
-- 2. MESSAGES TABLE
-- ================================================================
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON COLUMN public.messages.conversation_id IS 'Which conversation this message belongs to';
COMMENT ON COLUMN public.messages.sender_id IS 'Who sent the message';
COMMENT ON COLUMN public.messages.is_read IS 'Whether recipient has read the message';

-- ================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ================================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_shop_id ON public.conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read) WHERE is_read = FALSE;

-- ================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
-- Users can view conversations they are part of
CREATE POLICY "Users can view their conversations"
    ON public.conversations FOR SELECT
    USING (
        auth.uid() = user1_id OR
        auth.uid() = user2_id
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (
        auth.uid() = user1_id OR
        auth.uid() = user2_id
    );

-- Users can update their own conversations
CREATE POLICY "Users can update their conversations"
    ON public.conversations FOR UPDATE
    USING (
        auth.uid() = user1_id OR
        auth.uid() = user2_id
    );

-- Messages Policies
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
        )
    );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = conversation_id
            AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
        )
    );

-- Users can update their own messages (for read receipts)
CREATE POLICY "Users can update messages in their conversations"
    ON public.messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
        )
    );

-- ================================================================
-- 5. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- 6. FUNCTION TO UPDATE CONVERSATION ON NEW MESSAGE
-- ================================================================

-- Function to update conversation's last_message fields when new message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET
        last_message_text = NEW.content,
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation on new message
DROP TRIGGER IF EXISTS update_conversation_on_new_message ON public.messages;
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_on_new_message();

-- ================================================================
-- 7. HELPER FUNCTION TO GET OR CREATE CONVERSATION
-- ================================================================

-- Function to get or create a conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    p_shop_id UUID,
    p_user1_id UUID,
    p_user2_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Try to find existing conversation (check both user orderings)
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE shop_id = p_shop_id
    AND (
        (user1_id = p_user1_id AND user2_id = p_user2_id) OR
        (user1_id = p_user2_id AND user2_id = p_user1_id)
    )
    LIMIT 1;

    -- If conversation doesn't exist, create it
    IF v_conversation_id IS NULL THEN
        INSERT INTO public.conversations (shop_id, user1_id, user2_id)
        VALUES (p_shop_id, p_user1_id, p_user2_id)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Verify tables were created
SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename;

-- Verify indexes
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, indexname;

-- Verify RLS is enabled
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename;
