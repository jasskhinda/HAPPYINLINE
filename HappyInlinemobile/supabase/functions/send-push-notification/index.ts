/**
 * Supabase Edge Function: Send Push Notification via OneSignal
 *
 * Sends push notifications via OneSignal REST API.
 * Can be triggered by database webhooks or called directly.
 *
 * Required environment variables:
 * - ONESIGNAL_APP_ID: Your OneSignal App ID
 * - ONESIGNAL_REST_API_KEY: Your OneSignal REST API Key
 *
 * Supported notification types:
 * - new_message: When someone sends a message
 * - new_booking: When a customer books an appointment
 * - booking_confirmed: When shop confirms a booking
 * - booking_cancelled: When booking is cancelled
 * - booking_reminder: Reminder before appointment
 * - provider_added: When added as provider to shop
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// OneSignal REST API endpoint
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications'

interface OneSignalNotification {
  app_id: string
  include_player_ids?: string[]
  include_external_user_ids?: string[]
  headings: { en: string }
  contents: { en: string }
  data?: Record<string, any>
  ios_badgeType?: string
  ios_badgeCount?: number
  android_channel_id?: string
  priority?: number
  send_after?: string // For scheduled notifications
  small_icon?: string
  large_icon?: string
}

/**
 * Send push notification via OneSignal REST API
 */
async function sendOneSignalNotification(notification: OneSignalNotification, restApiKey: string) {
  console.log('📤 Sending OneSignal notification:', JSON.stringify(notification, null, 2))

  const response = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${restApiKey}`,
    },
    body: JSON.stringify(notification),
  })

  const result = await response.json()
  console.log('📬 OneSignal response:', JSON.stringify(result, null, 2))

  return result
}

/**
 * Get user's OneSignal Player ID from profiles table
 */
async function getUserPlayerId(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .single()

  if (error || !data?.push_token) {
    console.log(`⚠️ No OneSignal Player ID found for user ${userId}`)
    return null
  }

  return data.push_token
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      type,
      recipientUserId,
      senderName,
      messagePreview,
      conversationId,
      customerName,
      serviceName,
      shopName,
      date,
      time,
      bookingId,
      reason,
      scheduleAt,
    } = await req.json()

    console.log('📱 Push notification request:', { type, recipientUserId })

    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ error: 'recipientUserId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OneSignal credentials from environment
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID')
    const oneSignalRestApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      console.error('❌ OneSignal credentials not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OneSignal credentials not configured',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get recipient's OneSignal Player ID
    const playerId = await getUserPlayerId(supabase, recipientUserId)

    if (!playerId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User has no OneSignal Player ID registered',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build notification based on type
    let notification: OneSignalNotification = {
      app_id: oneSignalAppId,
      include_player_ids: [playerId],
      headings: { en: '' },
      contents: { en: '' },
      data: {},
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      priority: 10, // High priority
    }

    switch (type) {
      case 'new_message':
        notification.headings.en = `New message from ${senderName || 'Someone'}`
        notification.contents.en = messagePreview?.length > 50
          ? messagePreview.substring(0, 50) + '...'
          : messagePreview || 'You have a new message'
        notification.data = { type: 'message', conversationId }
        notification.android_channel_id = 'messages'
        break

      case 'new_booking':
        notification.headings.en = 'New Booking Request'
        notification.contents.en = `${customerName || 'A customer'} booked ${serviceName || 'a service'} for ${date || 'soon'} at ${time || 'scheduled time'}`
        notification.data = { type: 'booking', bookingId }
        notification.android_channel_id = 'bookings'
        break

      case 'booking_confirmed':
        notification.headings.en = 'Booking Confirmed!'
        notification.contents.en = `Your ${serviceName || 'appointment'} at ${shopName || 'the shop'} on ${date || 'scheduled date'} at ${time || 'scheduled time'} is confirmed`
        notification.data = { type: 'booking_confirmed', bookingId }
        notification.android_channel_id = 'bookings'
        break

      case 'booking_cancelled':
        notification.headings.en = 'Booking Cancelled'
        notification.contents.en = reason || `Your ${serviceName || 'appointment'} at ${shopName || 'the shop'} on ${date || 'the scheduled date'} has been cancelled`
        notification.data = { type: 'booking_cancelled', bookingId }
        notification.android_channel_id = 'bookings'
        notification.priority = 5 // Normal priority for cancellations
        break

      case 'booking_reminder':
        notification.headings.en = 'Upcoming Appointment'
        notification.contents.en = `Reminder: ${serviceName || 'Your appointment'} at ${shopName || 'the shop'} on ${date || 'scheduled date'} at ${time || 'scheduled time'}`
        notification.data = { type: 'booking_reminder', bookingId }
        notification.android_channel_id = 'reminders'
        notification.priority = 5 // Normal priority for reminders

        // If scheduleAt is provided, schedule the notification
        if (scheduleAt) {
          notification.send_after = scheduleAt
        }
        break

      case 'provider_added':
        notification.headings.en = 'Welcome to the Team!'
        notification.contents.en = `You have been added as a provider at ${shopName || 'a business'}`
        notification.data = { type: 'provider_added' }
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown notification type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Send the notification
    const result = await sendOneSignalNotification(notification, oneSignalRestApiKey)

    // Check if there were any errors
    if (result.errors && result.errors.length > 0) {
      console.error('❌ OneSignal notification errors:', result.errors)
      return new Response(
        JSON.stringify({
          success: false,
          errors: result.errors,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Push notification sent successfully, notification ID:', result.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Push notification sent',
        notificationId: result.id,
        recipients: result.recipients,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error sending push notification:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send push notification',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
