/**
 * Supabase Edge Function: Send Push Notification via OneSignal
 *
 * Supports two OneSignal apps:
 * - Customer app (ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY)
 * - Provider app (ONESIGNAL_PROVIDER_APP_ID / ONESIGNAL_PROVIDER_REST_API_KEY)
 *
 * The caller specifies recipientApp: 'customer' | 'provider' to target the correct app.
 * Defaults to 'customer' for backward compatibility.
 *
 * Targeting strategy:
 * 1. If push_token (OneSignal Subscription ID) is stored in profiles -> use include_player_ids
 * 2. Otherwise -> use include_external_user_ids (Supabase user ID set via OneSignal.login())
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  priority?: number
  send_after?: string
}

/**
 * Infer recipient app from notification type when not explicitly provided.
 * This ensures backward compatibility with older app versions that don't pass recipientApp.
 */
function inferRecipientApp(type: string): string {
  switch (type) {
    // These go to the provider/business app
    case 'new_booking':
    case 'new_message':
    case 'provider_added':
      return 'provider'
    // These go to the customer app
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'booking_reminder':
    case 'booking_rescheduled':
      return 'customer'
    default:
      return 'customer'
  }
}

/**
 * Get OneSignal credentials based on target app
 */
function getOneSignalCredentials(recipientApp: string) {
  if (recipientApp === 'provider') {
    return {
      appId: Deno.env.get('ONESIGNAL_PROVIDER_APP_ID'),
      restApiKey: Deno.env.get('ONESIGNAL_PROVIDER_REST_API_KEY'),
    }
  }
  // Default to customer app
  return {
    appId: Deno.env.get('ONESIGNAL_APP_ID'),
    restApiKey: Deno.env.get('ONESIGNAL_REST_API_KEY'),
  }
}

async function sendOneSignalNotification(notification: OneSignalNotification, restApiKey: string) {
  console.log('Sending OneSignal notification:', JSON.stringify(notification, null, 2))

  const response = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${restApiKey}`,
    },
    body: JSON.stringify(notification),
  })

  const result = await response.json()
  console.log('OneSignal response:', JSON.stringify(result, null, 2))
  return result
}

async function getUserPlayerId(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single()

    if (error || !data?.push_token) return null
    return data.push_token
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      type,
      recipientUserId,
      recipientApp = 'customer',
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
      oldDate,
      oldTime,
    } = await req.json()

    // If recipientApp not provided, infer from notification type
    const targetApp = recipientApp || inferRecipientApp(type)

    console.log('Push notification request:', { type, recipientUserId, recipientApp: targetApp, providedApp: recipientApp || 'inferred' })

    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ error: 'recipientUserId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get credentials for the target app
    const { appId, restApiKey } = getOneSignalCredentials(targetApp)

    if (!appId || !restApiKey) {
      console.error('OneSignal credentials not configured for app:', targetApp)
      return new Response(
        JSON.stringify({
          success: false,
          error: `OneSignal credentials not configured for ${targetApp} app`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get player ID from profiles (may be null)
    const playerId = await getUserPlayerId(supabase, recipientUserId)

    const targeting = playerId
      ? { include_player_ids: [playerId] }
      : { include_external_user_ids: [recipientUserId] }

    console.log('Targeting:', playerId ? `player_id: ${playerId}` : `external_user_id: ${recipientUserId}`, '| App:', targetApp)

    // Build notification
    let notification: OneSignalNotification = {
      app_id: appId,
      ...targeting,
      headings: { en: '' },
      contents: { en: '' },
      data: {},
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      priority: 10,
    }

    switch (type) {
      case 'new_message':
        notification.headings.en = `New message from ${senderName || 'Someone'}`
        notification.contents.en = messagePreview?.length > 50
          ? messagePreview.substring(0, 50) + '...'
          : messagePreview || 'You have a new message'
        notification.data = { type: 'message', conversationId }
        break

      case 'new_booking':
        notification.headings.en = 'New Booking Request'
        notification.contents.en = `${customerName || 'A customer'} booked ${serviceName || 'a service'} for ${date || 'soon'} at ${time || 'scheduled time'}`
        notification.data = { type: 'new_booking', bookingId }
        break

      case 'booking_confirmed':
        notification.headings.en = 'Booking Confirmed!'
        notification.contents.en = `Your ${serviceName || 'appointment'} at ${shopName || 'the shop'} on ${date || 'scheduled date'} at ${time || 'scheduled time'} is confirmed`
        notification.data = { type: 'booking_confirmed', bookingId }
        break

      case 'booking_cancelled':
        notification.headings.en = 'Booking Cancelled'
        notification.contents.en = reason || `Your ${serviceName || 'appointment'} at ${shopName || 'the shop'} on ${date || 'the scheduled date'} has been cancelled`
        notification.data = { type: 'booking_cancelled', bookingId }
        notification.priority = 5
        break

      case 'booking_reminder':
        notification.headings.en = 'Upcoming Appointment'
        notification.contents.en = `Reminder: ${serviceName || 'Your appointment'} at ${shopName || 'the shop'} on ${date || 'scheduled date'} at ${time || 'scheduled time'}`
        notification.data = { type: 'booking_reminder', bookingId }
        notification.priority = 5
        if (scheduleAt) {
          notification.send_after = scheduleAt
        }
        break

      case 'booking_rescheduled':
        notification.headings.en = 'Booking Rescheduled'
        notification.contents.en = customerName
          ? `${customerName} rescheduled ${serviceName || 'their appointment'} to ${date || 'a new date'} at ${time || 'a new time'}`
          : `Your ${serviceName || 'appointment'} at ${shopName || 'the shop'} has been rescheduled to ${date || 'a new date'} at ${time || 'a new time'}`
        notification.data = { type: 'booking_rescheduled', bookingId }
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
    let result = await sendOneSignalNotification(notification, restApiKey)

    // If player_id targeting failed, retry with external_user_id
    if (result.errors && playerId) {
      console.log('Player ID targeting failed, retrying with external_user_id...')
      delete notification.include_player_ids
      notification.include_external_user_ids = [recipientUserId]
      result = await sendOneSignalNotification(notification, restApiKey)
    }

    if (result.errors && result.errors.length > 0) {
      console.error('OneSignal notification errors:', result.errors)
      return new Response(
        JSON.stringify({ success: false, errors: result.errors }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Push notification sent successfully, ID:', result.id)

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
    console.error('Error sending push notification:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send push notification',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
