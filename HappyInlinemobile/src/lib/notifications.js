/**
 * Push Notifications Service - OneSignal
 * Handles push notifications via OneSignal for messages, bookings, etc.
 */

import { OneSignal, LogLevel } from 'react-native-onesignal';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get OneSignal App ID from config
const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId || '';

// =====================================================
// ONESIGNAL INITIALIZATION
// =====================================================

/**
 * Initialize OneSignal - call this once when app starts
 */
export const initializeOneSignal = () => {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') {
    console.log('⚠️ OneSignal App ID not configured');
    return;
  }

  // Enable verbose logging for development
  if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  }

  // Initialize OneSignal
  OneSignal.initialize(ONESIGNAL_APP_ID);

  console.log('✅ OneSignal initialized with App ID:', ONESIGNAL_APP_ID);
};

/**
 * Request notification permissions
 */
export const requestNotificationPermission = async () => {
  try {
    const granted = await OneSignal.Notifications.requestPermission(true);
    console.log(granted ? '✅ Notification permission granted' : '❌ Notification permission denied');
    return granted;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Register for push notifications and save player ID to profile
 */
export const registerForPushNotifications = async () => {
  try {
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') {
      console.log('⚠️ OneSignal not configured, skipping registration');
      return null;
    }

    // Request permission first
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      console.log('❌ Push notification permission not granted');
      return null;
    }

    // Get the OneSignal Player ID (also called Subscription ID)
    const playerId = await getOneSignalPlayerId();

    if (playerId) {
      console.log('✅ OneSignal Player ID:', playerId);

      // Store locally
      await AsyncStorage.setItem('onesignal_player_id', playerId);

      // Save to user profile in Supabase
      await savePlayerIdToProfile(playerId);

      return playerId;
    }

    return null;
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Get the OneSignal Player ID
 */
export const getOneSignalPlayerId = async () => {
  try {
    const subscription = OneSignal.User.pushSubscription;
    const playerId = subscription.getPushSubscriptionId();
    return playerId;
  } catch (error) {
    console.error('❌ Error getting OneSignal Player ID:', error);
    return null;
  }
};

/**
 * Save OneSignal Player ID to user's profile in Supabase
 */
const savePlayerIdToProfile = async (playerId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        push_token: playerId,
        push_token_updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Error saving OneSignal Player ID:', error);
    } else {
      console.log('✅ OneSignal Player ID saved to profile');
    }
  } catch (error) {
    console.error('❌ Error saving OneSignal Player ID:', error);
  }
};

/**
 * Set external user ID for targeting (use Supabase user ID)
 */
export const setExternalUserId = async (userId) => {
  try {
    if (!userId) return;

    OneSignal.login(userId);
    console.log('✅ OneSignal external user ID set:', userId);
  } catch (error) {
    console.error('❌ Error setting external user ID:', error);
  }
};

/**
 * Remove external user ID on logout
 */
export const removeExternalUserId = async () => {
  try {
    OneSignal.logout();
    console.log('✅ OneSignal external user ID removed');
  } catch (error) {
    console.error('❌ Error removing external user ID:', error);
  }
};

/**
 * Remove push token (on logout)
 */
export const removePushToken = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', user.id);
    }
    await AsyncStorage.removeItem('onesignal_player_id');
    await removeExternalUserId();
    console.log('✅ Push token removed');
  } catch (error) {
    console.error('❌ Error removing push token:', error);
  }
};

// =====================================================
// NOTIFICATION LISTENERS
// =====================================================

/**
 * Add listener for when a notification is received while app is foregrounded
 */
export const addNotificationReceivedListener = (callback) => {
  OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
    console.log('📬 OneSignal notification received in foreground:', event);

    // Get the notification from the event
    const notification = event.getNotification();

    // Call the callback with notification data
    callback({
      notification: {
        request: {
          content: {
            title: notification.title,
            body: notification.body,
            data: notification.additionalData || {},
          }
        }
      }
    });

    // Show the notification (don't prevent it)
    event.getNotification().display();
  });

  // Return a mock subscription object for compatibility
  return {
    remove: () => {
      OneSignal.Notifications.removeEventListener('foregroundWillDisplay');
    }
  };
};

/**
 * Add listener for when user taps on a notification
 */
export const addNotificationResponseListener = (callback) => {
  OneSignal.Notifications.addEventListener('click', (event) => {
    console.log('👆 OneSignal notification tapped:', event);

    const notification = event.notification;

    // Call the callback with notification response data
    callback({
      notification: {
        request: {
          content: {
            title: notification.title,
            body: notification.body,
            data: notification.additionalData || {},
          }
        }
      }
    });
  });

  // Return a mock subscription object for compatibility
  return {
    remove: () => {
      OneSignal.Notifications.removeEventListener('click');
    }
  };
};

// =====================================================
// LOCAL/IN-APP NOTIFICATIONS (for immediate display)
// =====================================================

/**
 * Show a local notification (OneSignal doesn't have local notifications,
 * so this will use Expo's local notification as fallback)
 */
export const showLocalNotification = async ({ title, body, data = {} }) => {
  try {
    // OneSignal doesn't support local notifications directly
    // You can use expo-notifications for local ones or skip this
    console.log('📱 Local notification (display only):', { title, body, data });
  } catch (error) {
    console.error('❌ Error showing local notification:', error);
  }
};

// =====================================================
// SERVER-SIDE PUSH NOTIFICATIONS (via Supabase Edge Function)
// Use these to send notifications to OTHER users
// =====================================================

/**
 * Send push notification to another user via server
 * This uses Supabase Edge Function to send notification via OneSignal
 */
export const sendServerPushNotification = async (params) => {
  try {
    console.log('📤 Sending server push notification:', params);

    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params,
    });

    if (error) {
      console.error('❌ Error sending server push notification:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Server push notification result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending server push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification for new message to recipient
 */
export const sendMessageNotification = async ({ recipientUserId, senderName, messagePreview, conversationId }) => {
  return sendServerPushNotification({
    type: 'new_message',
    recipientUserId,
    senderName,
    messagePreview,
    conversationId,
  });
};

/**
 * Send push notification for new booking to shop owner/staff
 */
export const sendNewBookingNotification = async ({ recipientUserId, customerName, serviceName, date, time, bookingId }) => {
  return sendServerPushNotification({
    type: 'new_booking',
    recipientUserId,
    customerName,
    serviceName,
    date,
    time,
    bookingId,
  });
};

/**
 * Send push notification for booking confirmation to customer
 */
export const sendBookingConfirmedNotification = async ({ recipientUserId, shopName, serviceName, date, time, bookingId }) => {
  return sendServerPushNotification({
    type: 'booking_confirmed',
    recipientUserId,
    shopName,
    serviceName,
    date,
    time,
    bookingId,
  });
};

/**
 * Send push notification for booking cancellation
 */
export const sendBookingCancelledNotification = async ({ recipientUserId, shopName, serviceName, date, bookingId, reason }) => {
  return sendServerPushNotification({
    type: 'booking_cancelled',
    recipientUserId,
    shopName,
    serviceName,
    date,
    bookingId,
    reason,
  });
};

/**
 * Send push notification when added as provider
 */
export const sendProviderAddedNotification = async ({ recipientUserId, shopName }) => {
  return sendServerPushNotification({
    type: 'provider_added',
    recipientUserId,
    shopName,
  });
};

/**
 * Schedule booking reminder - handled by server/OneSignal
 * Note: OneSignal supports scheduled notifications via their API
 */
export const scheduleBookingReminder = async ({ shopName, serviceName, appointmentDate, appointmentTime, bookingId, recipientUserId }) => {
  try {
    // Calculate delivery time (1 hour before appointment)
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const [hours, minutes] = appointmentTime.split(':').map(Number);

    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
    const reminderTime = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000); // 1 hour before

    // Only schedule if reminder time is in the future
    if (reminderTime > new Date()) {
      return sendServerPushNotification({
        type: 'booking_reminder',
        recipientUserId,
        shopName,
        serviceName,
        date: appointmentDate,
        time: appointmentTime,
        bookingId,
        scheduleAt: reminderTime.toISOString(),
      });
    }
    return null;
  } catch (error) {
    console.error('❌ Error scheduling booking reminder:', error);
    return null;
  }
};

/**
 * Cancel booking reminder (would need to store OneSignal notification ID)
 */
export const cancelBookingReminder = async (bookingId) => {
  try {
    const notificationId = await AsyncStorage.getItem(`booking_reminder_${bookingId}`);
    if (notificationId) {
      // Would need to call OneSignal API to cancel scheduled notification
      await AsyncStorage.removeItem(`booking_reminder_${bookingId}`);
    }
  } catch (error) {
    console.error('❌ Error cancelling booking reminder:', error);
  }
};

/**
 * Get badge count
 */
export const getBadgeCount = async () => {
  // OneSignal handles badge management automatically
  return 0;
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count) => {
  // OneSignal handles badge management automatically
  console.log('📱 Badge count set to:', count);
};

/**
 * Clear badge count
 */
export const clearBadgeCount = async () => {
  // OneSignal handles badge management automatically
  console.log('📱 Badge count cleared');
};

// =====================================================
// NOTIFICATION TYPE HELPERS (for local display)
// =====================================================

export const notifyNewMessage = async ({ senderName, messagePreview, conversationId }) => {
  await showLocalNotification({
    title: `New message from ${senderName}`,
    body: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
    data: { type: 'message', conversationId },
  });
};

export const notifyNewBooking = async ({ customerName, serviceName, date, time, bookingId }) => {
  await showLocalNotification({
    title: 'New Booking Request',
    body: `${customerName} booked ${serviceName} for ${date} at ${time}`,
    data: { type: 'booking', bookingId },
  });
};

export const notifyBookingConfirmed = async ({ shopName, serviceName, date, time, bookingId }) => {
  await showLocalNotification({
    title: 'Booking Confirmed!',
    body: `Your ${serviceName} at ${shopName} on ${date} at ${time} is confirmed`,
    data: { type: 'booking_confirmed', bookingId },
  });
};

export const notifyBookingCancelled = async ({ shopName, serviceName, date, bookingId, reason }) => {
  await showLocalNotification({
    title: 'Booking Cancelled',
    body: reason || `Your ${serviceName} at ${shopName} on ${date} has been cancelled`,
    data: { type: 'booking_cancelled', bookingId },
  });
};

export const notifyBookingReminder = async ({ shopName, serviceName, date, time, bookingId }) => {
  await showLocalNotification({
    title: 'Upcoming Appointment',
    body: `Reminder: ${serviceName} at ${shopName} on ${date} at ${time}`,
    data: { type: 'booking_reminder', bookingId },
  });
};

export const notifyProviderAdded = async ({ shopName }) => {
  await showLocalNotification({
    title: 'Welcome to the Team!',
    body: `You have been added as a provider at ${shopName}`,
    data: { type: 'provider_added' },
  });
};

// =====================================================
// EMAIL NOTIFICATIONS (via Supabase Edge Function)
// =====================================================

/**
 * Send email via Supabase Edge Function
 */
export const sendEmail = async (params) => {
  try {
    console.log('📧 Sending email:', params.type, 'to:', params.to?.email);

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send booking confirmation email to customer
 */
export const sendBookingConfirmationEmail = async ({ customerEmail, customerName, shopName, serviceName, date, time, bookingReference, totalAmount }) => {
  return sendEmail({
    type: 'booking_confirmation',
    to: { email: customerEmail, name: customerName },
    data: {
      customerName,
      shopName,
      serviceName,
      date,
      time,
      bookingReference,
      totalAmount,
    },
  });
};

/**
 * Send welcome email to new customer
 */
export const sendWelcomeEmail = async ({ email, name }) => {
  return sendEmail({
    type: 'welcome',
    to: { email, name },
    data: { name },
  });
};

/**
 * Send welcome email to new business owner
 */
export const sendBusinessWelcomeEmail = async ({ email, name }) => {
  return sendEmail({
    type: 'business_welcome',
    to: { email, name },
    data: { name },
  });
};

/**
 * Send new booking notification email to shop owner
 */
export const sendNewBookingEmail = async ({ ownerEmail, ownerName, customerName, serviceName, date, time }) => {
  return sendEmail({
    type: 'new_booking_notification',
    to: { email: ownerEmail, name: ownerName },
    data: {
      customerName,
      serviceName,
      date,
      time,
    },
  });
};

/**
 * Send booking cancellation email
 */
export const sendBookingCancelledEmail = async ({ customerEmail, customerName, shopName, serviceName, date, reason }) => {
  return sendEmail({
    type: 'booking_cancelled',
    to: { email: customerEmail, name: customerName },
    data: {
      customerName,
      shopName,
      serviceName,
      date,
      reason,
    },
  });
};

/**
 * Send provider invitation email (for new users who need to create an account)
 */
export const sendProviderInvitationEmail = async ({ providerEmail, providerName, shopName, inviterName, signupLink }) => {
  return sendEmail({
    type: 'provider_invitation',
    to: { email: providerEmail, name: providerName || providerEmail },
    data: {
      providerName,
      providerEmail,
      shopName,
      inviterName,
      signupLink,
    },
  });
};

/**
 * Send provider added email (for existing users who were added to a shop)
 */
export const sendProviderAddedEmail = async ({ providerEmail, providerName, shopName }) => {
  return sendEmail({
    type: 'provider_added',
    to: { email: providerEmail, name: providerName },
    data: {
      providerName,
      shopName,
    },
  });
};

export default {
  initializeOneSignal,
  requestNotificationPermission,
  registerForPushNotifications,
  getOneSignalPlayerId,
  setExternalUserId,
  removeExternalUserId,
  removePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  showLocalNotification,
  // Server-side notification functions
  sendServerPushNotification,
  sendMessageNotification,
  sendNewBookingNotification,
  sendBookingConfirmedNotification,
  sendBookingCancelledNotification,
  sendProviderAddedNotification,
  scheduleBookingReminder,
  cancelBookingReminder,
  getBadgeCount,
  setBadgeCount,
  clearBadgeCount,
  // Local notification helpers
  notifyNewMessage,
  notifyNewBooking,
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyBookingReminder,
  notifyProviderAdded,
  // Email functions
  sendEmail,
  sendBookingConfirmationEmail,
  sendWelcomeEmail,
  sendBusinessWelcomeEmail,
  sendNewBookingEmail,
  sendBookingCancelledEmail,
  sendProviderInvitationEmail,
  sendProviderAddedEmail,
};
