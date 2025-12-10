-- ================================================================
-- ADD MARK_CONVERSATION_READ FUNCTION
-- ================================================================
-- This function marks all unread messages in a conversation as read
-- for the current user
-- ================================================================

CREATE OR REPLACE FUNCTION public.mark_conversation_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Mark all messages in this conversation as read
    -- that were NOT sent by the current user
    UPDATE public.messages
    SET
        is_read = TRUE,
        updated_at = NOW()
    WHERE
        conversation_id = p_conversation_id
        AND sender_id != p_user_id
        AND is_read = FALSE;

    -- Log success
    RAISE NOTICE 'Marked conversation % as read for user %', p_conversation_id, p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.mark_conversation_read(UUID, UUID) IS 'Marks all unread messages in a conversation as read for a specific user';

-- Verify function was created
SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'mark_conversation_read';
