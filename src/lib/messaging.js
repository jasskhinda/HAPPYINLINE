import { supabase } from './supabase';

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = async (userId1, userId2, shopId = null) => {
  try {
    // Call Supabase function to get or create conversation
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_user1_id: userId1,
      p_user2_id: userId2,
      p_shop_id: shopId,
    });

    if (error) {
      console.error('Error getting/creating conversation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, conversationId: data };
  } catch (err) {
    console.error('Unexpected error in getOrCreateConversation:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get conversation details including both participants
 */
export const getConversationDetails = async (conversationId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:profiles!conversations_participant_1_id_fkey(id, name, email, profile_picture_url),
        participant_2:profiles!conversations_participant_2_id_fkey(id, name, email, profile_picture_url),
        shop:shops(id, name)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, conversation: data };
  } catch (err) {
    console.error('Unexpected error in getConversationDetails:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get all messages in a conversation
 */
export const getConversationMessages = async (conversationId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, email, profile_picture_url)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messages: data || [] };
  } catch (err) {
    console.error('Unexpected error in getConversationMessages:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (conversationId, senderId, messageText, attachmentUrl = null) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_text: messageText,
        attachment_url: attachmentUrl,
        is_delivered: true,
        delivered_at: new Date().toISOString(),
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, email, profile_picture_url)
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: data };
  } catch (err) {
    console.error('Unexpected error in sendMessage:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Mark conversation as read for current user
 */
export const markConversationAsRead = async (conversationId, userId) => {
  try {
    const { error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error marking conversation as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error in markConversationAsRead:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Subscribe to new messages in a conversation (real-time)
 */
export const subscribeToMessages = (conversationId, callback) => {
  const subscription = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch the full message with sender details
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, name, email, profile_picture_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (!error && data) {
          callback(data);
        }
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Unsubscribe from real-time updates
 */
export const unsubscribeFromMessages = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:profiles!conversations_participant_1_id_fkey(id, name, email, profile_picture_url),
        participant_2:profiles!conversations_participant_2_id_fkey(id, name, email, profile_picture_url),
        shop:shops(id, name)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user conversations:', error);
      return { success: false, error: error.message };
    }

    return { success: true, conversations: data || [] };
  } catch (err) {
    console.error('Unexpected error in getUserConversations:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
};
