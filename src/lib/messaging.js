import { supabase } from './supabase';
import { sendMessageNotification } from './notifications';

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
        user1:profiles!conversations_user1_id_fkey(id, name, email, profile_image),
        user2:profiles!conversations_user2_id_fkey(id, name, email, profile_image),
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
        sender:profiles!messages_sender_id_fkey(id, name, email, profile_image)
      `)
      .eq('conversation_id', conversationId)
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
        content: messageText,
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, name, email, profile_image)
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }

    // Get conversation to find recipient
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (!convError && conversation) {
      // Determine recipient (the other user in the conversation)
      const recipientId = conversation.user1_id === senderId
        ? conversation.user2_id
        : conversation.user1_id;

      // Send push notification to recipient (fire and forget)
      sendMessageNotification({
        recipientUserId: recipientId,
        senderName: data.sender?.name || 'Someone',
        messagePreview: messageText,
        conversationId: conversationId,
      }).catch(err => console.log('Push notification error (non-blocking):', err));
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
 * Subscribe to new messages in a conversation using polling
 * (Polling is used instead of realtime due to Supabase partitioned table limitations)
 */
export const subscribeToMessages = (conversationId, callback) => {
  console.log('🔌 Starting message polling for conversation:', conversationId);

  let seenMessageIds = new Set();
  let isPolling = true;
  let pollingInterval = null;

  // Poll for new messages every 2 seconds
  const pollForNewMessages = async () => {
    if (!isPolling) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, name, email, profile_image)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(20); // Get last 20 messages to check for new ones

      if (error) {
        console.error('❌ Error polling messages:', error);
        return;
      }

      if (data && data.length > 0) {
        // Filter out messages we've already seen
        const newMessages = data.filter(msg => !seenMessageIds.has(msg.id));

        if (newMessages.length > 0) {
          console.log(`✅ Polling found ${newMessages.length} new message(s)`);

          // Add new message IDs to seen set
          newMessages.forEach(msg => seenMessageIds.add(msg.id));

          // Call callback for each new message (in chronological order)
          newMessages.reverse().forEach((message) => {
            callback(message);
          });
        }
      }
    } catch (err) {
      console.error('❌ Unexpected error while polling:', err);
    }
  };

  // Initial fetch to populate seen message IDs
  const initializePolling = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(100); // Track last 100 messages as "seen"

      if (data && !error) {
        data.forEach(msg => seenMessageIds.add(msg.id));
        console.log(`📍 Initialized polling with ${seenMessageIds.size} existing messages`);
      }
    } catch (err) {
      console.log('ℹ️ No existing messages in conversation');
    }

    // Start polling interval
    pollingInterval = setInterval(pollForNewMessages, 2000);
    console.log('✅ Message polling started (every 2 seconds)');
  };

  // Start initialization
  initializePolling();

  // Return subscription-like object with unsubscribe method
  return {
    unsubscribe: () => {
      console.log('🔌 Stopping message polling');
      isPolling = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
      seenMessageIds.clear();
    },
  };
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
        user1:profiles!conversations_user1_id_fkey(id, name, email, profile_image),
        user2:profiles!conversations_user2_id_fkey(id, name, email, profile_image),
        shop:shops(id, name)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
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
