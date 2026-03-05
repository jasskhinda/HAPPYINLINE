import { supabase } from './supabase';

// FEATURE FLAG: Set to false to disable presence system entirely
const PRESENCE_ENABLED = true;

/**
 * Update user's online status
 * NOTE: This requires the user_presence table and functions to be set up in Supabase
 * If not set up, it will fail gracefully without breaking chat functionality
 *
 * Currently DISABLED - set PRESENCE_ENABLED = true to enable
 */
export const updateUserPresence = async (userId, isOnline) => {
  if (!PRESENCE_ENABLED) {
    return { success: false, error: 'Presence system disabled', gracefulFailure: true };
  }

  try {
    console.log(`👤 Updating presence for user ${userId}: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    const { error } = await supabase.rpc('update_user_presence', {
      p_user_id: userId,
      p_is_online: isOnline,
    });

    if (error) {
      // Check if it's the "function not found" error - fail gracefully
      if (error.message?.includes('Could not find the function') || error.code === '42883') {
        console.warn('⚠️ Presence system not set up - skipping (chat will still work)');
        return { success: false, error: 'Presence system not configured', gracefulFailure: true };
      }
      console.error('❌ Error updating user presence:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Presence updated: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    return { success: true };
  } catch (err) {
    console.warn('⚠️ Presence update failed - skipping (chat will still work)');
    return { success: false, error: 'An unexpected error occurred', gracefulFailure: true };
  }
};

/**
 * Get user's online status
 * NOTE: This requires the user_presence table and functions to be set up in Supabase
 * If not set up, it will fail gracefully without breaking chat functionality
 *
 * Currently DISABLED - set PRESENCE_ENABLED = true to enable
 */
export const getUserOnlineStatus = async (userId) => {
  if (!PRESENCE_ENABLED) {
    return { success: false, error: 'Presence system disabled', isOnline: false, gracefulFailure: true };
  }

  try {
    const { data, error } = await supabase.rpc('get_user_online_status', {
      p_user_id: userId,
    });

    if (error) {
      // Check if it's the "function not found" error - fail gracefully
      if (error.message?.includes('Could not find the function') || error.code === '42883') {
        console.warn('⚠️ Presence system not set up - returning offline status');
        return { success: false, error: 'Presence system not configured', isOnline: false, gracefulFailure: true };
      }
      console.error('❌ Error getting user online status:', error);
      return { success: false, error: error.message, isOnline: false };
    }

    const isOnline = data && data.length > 0 ? data[0].is_online : false;
    const lastSeen = data && data.length > 0 ? data[0].last_seen : null;

    return { success: true, isOnline, lastSeen };
  } catch (err) {
    console.warn('⚠️ Get online status failed - returning offline');
    return { success: false, error: 'An unexpected error occurred', isOnline: false, gracefulFailure: true };
  }
};

/**
 * Subscribe to user presence changes (real-time)
 * NOTE: This requires the user_presence table to be set up in Supabase
 * If not set up, it will fail gracefully without breaking chat functionality
 *
 * Currently DISABLED - set PRESENCE_ENABLED = true to enable
 */
export const subscribeToUserPresence = (userId, callback) => {
  if (!PRESENCE_ENABLED) {
    console.log('⚠️ Presence system is disabled - skipping subscription');
    return null;
  }

  console.log('👀 Subscribing to presence updates for user:', userId);

  try {
    const subscription = supabase
      .channel(`presence:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('👤 Presence update received:', {
            userId,
            isOnline: payload.new?.is_online,
            lastSeen: payload.new?.last_seen,
          });

          callback({
            isOnline: payload.new?.is_online || false,
            lastSeen: payload.new?.last_seen,
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Presence subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Presence subscription failed - presence features unavailable (chat still works)');
        }
      });

    return subscription;
  } catch (err) {
    console.warn('⚠️ Presence subscription error - skipping presence features');
    return null;
  }
};

/**
 * Unsubscribe from presence updates
 */
export const unsubscribeFromPresence = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};

/**
 * Start presence heartbeat - sends periodic updates to keep user online
 */
export const startPresenceHeartbeat = (userId) => {
  console.log('💓 Starting presence heartbeat for user:', userId);

  // Set online immediately
  updateUserPresence(userId, true);

  // Send heartbeat every 20 seconds
  const heartbeatInterval = setInterval(() => {
    updateUserPresence(userId, true);
  }, 20000); // 20 seconds

  return heartbeatInterval;
};

/**
 * Stop presence heartbeat and set user offline
 */
export const stopPresenceHeartbeat = async (heartbeatInterval, userId) => {
  console.log('💔 Stopping presence heartbeat for user:', userId);

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Set offline
  await updateUserPresence(userId, false);
};

/**
 * Format last seen time
 */
export const formatLastSeen = (lastSeenTimestamp) => {
  if (!lastSeenTimestamp) return 'Last seen a while ago';

  const now = new Date();
  const lastSeen = new Date(lastSeenTimestamp);
  const diffInSeconds = Math.floor((now - lastSeen) / 1000);

  if (diffInSeconds < 60) {
    return 'Last seen just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `Last seen ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Last seen ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `Last seen ${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
};
