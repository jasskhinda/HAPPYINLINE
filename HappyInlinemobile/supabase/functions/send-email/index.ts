/**
 * Supabase Edge Function: Send Email via SendPulse
 *
 * Sends transactional emails via SendPulse SMTP API.
 *
 * Required environment variables:
 * - SENDPULSE_API_USER_ID: Your SendPulse API User ID
 * - SENDPULSE_API_SECRET: Your SendPulse API Secret
 *
 * Supported email types:
 * - booking_confirmation: When customer books an appointment
 * - booking_reminder: Reminder before appointment
 * - booking_cancelled: When booking is cancelled
 * - welcome: Welcome email for new users
 * - business_welcome: Welcome email for new business owners
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SendPulse API endpoints
const SENDPULSE_AUTH_URL = 'https://api.sendpulse.com/oauth/access_token'
const SENDPULSE_SMTP_URL = 'https://api.sendpulse.com/smtp/emails'

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get SendPulse access token (with caching)
 */
async function getAccessToken(userId: string, secret: string): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  console.log('🔑 Getting new SendPulse access token...')

  const response = await fetch(SENDPULSE_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: userId,
      client_secret: secret,
    }),
  })

  const data = await response.json()

  if (!data.access_token) {
    console.error('❌ Failed to get SendPulse token:', data)
    throw new Error('Failed to authenticate with SendPulse')
  }

  // Cache the token (expires in 1 hour, we'll refresh 5 min early)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }

  console.log('✅ Got SendPulse access token')
  return data.access_token
}

/**
 * Send email via SendPulse SMTP API
 */
async function sendEmail(
  accessToken: string,
  to: { email: string; name?: string },
  subject: string,
  htmlContent: string,
  textContent?: string
) {
  const payload = {
    email: {
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      subject: subject,
      from: {
        name: 'Happy Inline',
        email: 'noreply@happyinline.com',
      },
      to: [
        {
          email: to.email,
          name: to.name || to.email,
        },
      ],
    },
  }

  console.log('📧 Sending email to:', to.email)

  const response = await fetch(SENDPULSE_SMTP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  console.log('📬 SendPulse response:', JSON.stringify(result, null, 2))

  return result
}

/**
 * Helper to determine effective format for a service
 */
function getEffectiveFormat(service: any): 'in_person' | 'online' {
  if (service.chosen_format) return service.chosen_format;
  if (service.service_type === 'online') return 'online';
  return 'in_person';
}

/**
 * Format date for display (e.g., "Friday, January 27, 2026")
 */
function formatDateForEmail(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
function formatTimeForEmail(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Generate email HTML based on type
 * NOTE: Uses inline styles for maximum email client compatibility
 */
function generateEmailContent(type: string, data: any): { subject: string; html: string } {
  switch (type) {
    case 'booking_confirmation': {
      // Handle services array for online meeting detection
      const services = data.services || [];
      const onlineServices = services.filter((s: any) => getEffectiveFormat(s) === 'online');
      const inPersonServices = services.filter((s: any) => getEffectiveFormat(s) === 'in_person');
      const hasOnlineServices = onlineServices.length > 0;
      const hasInPersonServices = inPersonServices.length > 0;
      const hasOnlineMeetingLinks = onlineServices.some((s: any) => s.online_meeting_link);

      // Generate services list with format badges
      const servicesHTML = services.map((s: any) => {
        const format = getEffectiveFormat(s);
        const formatBadge = format === 'online'
          ? '<span style="display: inline-block; background: #8b5cf6; color: #ffffff; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">📹 Online</span>'
          : '<span style="display: inline-block; background: #10b981; color: #ffffff; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">📍 In-Person</span>';
        return `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <span style="color: #09264b; font-weight: 500;">${s.name}</span>
              ${formatBadge}
              <div style="color: #888; font-size: 12px; margin-top: 4px;">${s.duration} min</div>
            </td>
            <td style="padding: 12px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">$${(s.price || 0).toFixed ? (s.price || 0).toFixed(2) : s.price || 0}</td>
          </tr>
        `;
      }).join('');

      // Generate online meeting section
      const onlineSectionHTML = hasOnlineServices ? `
        <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 12px; padding: 25px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin: 0 0 20px 0; font-size: 20px; text-align: center;">📹 Your Online Session</h3>
          ${onlineServices.map((s: any) => `
            <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 20px; margin-bottom: 15px;">
              <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">${s.name}</p>
              ${s.online_meeting_link ? `
                <div style="text-align: center; margin-bottom: 20px;">
                  <a href="${s.online_meeting_link}" style="display: inline-block; background: #ffffff; color: #8b5cf6; font-size: 18px; font-weight: 700; text-decoration: none; padding: 15px 40px; border-radius: 30px;">🚀 JOIN NOW</a>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px;">
                  <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">Meeting Link</p>
                  <p style="color: #ffffff; font-size: 13px; margin: 0; word-break: break-all;">${s.online_meeting_link}</p>
                </div>
              ` : `
                <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px;">
                  <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; text-align: center;">Meeting details will be provided by ${data.shopName}</p>
                </div>
              `}
              ${s.online_meeting_password ? `
                <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-top: 10px;">
                  <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">🔐 Password</p>
                  <p style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; font-family: monospace; letter-spacing: 2px;">${s.online_meeting_password}</p>
                </div>
              ` : ''}
              ${s.online_instructions ? `
                <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-top: 10px;">
                  <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">📋 Instructions</p>
                  <p style="color: #ffffff; font-size: 14px; margin: 0; line-height: 1.6;">${s.online_instructions}</p>
                </div>
              ` : ''}
            </div>
          `).join('')}
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 10px 0 0 0; text-align: center;">
            ${hasOnlineMeetingLinks ? '⏰ Please join the meeting a few minutes before your scheduled time.' : '⏰ The business will contact you with meeting details before your appointment.'}
          </p>
        </div>
      ` : '';

      // Generate in-person section
      const inPersonSectionHTML = hasInPersonServices && data.shopAddress ? `
        <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; padding: 25px; margin: 20px 0;">
          <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 20px; text-align: center;">📍 In-Person Appointment</h3>
          <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 20px; text-align: center;">
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Location</p>
            <p style="color: #ffffff; font-size: 16px; font-weight: 500; margin: 0;">${data.shopAddress}</p>
            ${data.shopPhone ? `<p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 10px 0 0 0;">📞 ${data.shopPhone}</p>` : ''}
          </div>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 20px 0 0 0; text-align: center;">Please arrive 5-10 minutes before your scheduled time.</p>
        </div>
      ` : '';

      // Use formatted date/time if raw values provided
      const displayDate = data.date || (data.appointmentDate ? formatDateForEmail(data.appointmentDate) : '');
      const displayTime = data.time || (data.appointmentTime ? formatTimeForEmail(data.appointmentTime) : '');

      return {
        subject: `Booking Confirmed - ${data.shopName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmation</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #09264b, #0a3a6b); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${data.customerName},</p>
                <p style="margin: 0 0 20px 0; font-size: 16px;">Your appointment has been confirmed. Here are your booking details:</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #09264b; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #0393d5; padding-bottom: 10px;">📋 Appointment Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #666; border-bottom: 1px solid #eee;">Business:</td>
                      <td style="padding: 12px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">${data.shopName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #666; border-bottom: 1px solid #eee;">Date:</td>
                      <td style="padding: 12px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">${displayDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #666; border-bottom: 1px solid #eee;">Time:</td>
                      <td style="padding: 12px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">${displayTime}</td>
                    </tr>
                    ${data.providerName ? `
                    <tr>
                      <td style="padding: 12px 0; color: #666; border-bottom: 1px solid #eee;">Provider:</td>
                      <td style="padding: 12px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">${data.providerName}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 12px 0; color: #666; border-bottom: 1px solid #eee;">Reference:</td>
                      <td style="padding: 12px 0; font-weight: bold; text-align: right; color: #0393d5; border-bottom: 1px solid #eee;">${data.bookingReference || data.bookingId || 'N/A'}</td>
                    </tr>
                  </table>
                </div>

                ${services.length > 0 ? `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #09264b; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #0393d5; padding-bottom: 10px;">✨ Services Booked</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    ${servicesHTML}
                  </table>
                  ${data.totalAmount ? `
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #eee;">
                    <table style="width: 100%;"><tr>
                      <td style="color: #09264b; font-size: 18px; font-weight: bold;">Total</td>
                      <td style="text-align: right; color: #0393d5; font-size: 20px; font-weight: bold;">$${data.totalAmount}</td>
                    </tr></table>
                  </div>
                  ` : ''}
                </div>
                ` : `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #666; border-bottom: 1px solid #eee;">Service:</td>
                      <td style="padding: 12px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #eee;">${data.serviceName || 'N/A'}</td>
                    </tr>
                    ${data.totalAmount ? `
                    <tr>
                      <td style="padding: 12px 0; color: #666;">Amount:</td>
                      <td style="padding: 12px 0; font-weight: bold; text-align: right; color: #0393d5; font-size: 18px;">$${data.totalAmount}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                `}

                ${data.customerNotes ? `
                <div style="background: #fff3cd; border-radius: 12px; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <strong style="color: #856404;">📝 Notes:</strong>
                  <p style="color: #856404; margin: 5px 0 0 0;">${data.customerNotes}</p>
                </div>
                ` : ''}

                ${onlineSectionHTML}
                ${inPersonSectionHTML}

                <p style="margin: 20px 0 0 0; font-size: 16px; text-align: center; color: #666;">We look forward to seeing you!</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; color: #0393d5;">Skip the wait. Join the line.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    }

    case 'booking_reminder':
      return {
        subject: `Reminder: Your appointment at ${data.shopName} is coming up!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Appointment Reminder</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #FF9500, #FFB800); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">⏰ Appointment Reminder</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${data.customerName},</p>
                <p style="margin: 0 0 20px 0; font-size: 16px;">This is a friendly reminder that your appointment is coming up soon!</p>

                <div style="background: #fff8f0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF9500;">
                  <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>${data.serviceName}</strong> at <strong>${data.shopName}</strong></p>
                  <p style="margin: 0; font-size: 16px; color: #FF9500;">📅 ${data.date} at ${data.time}</p>
                </div>

                <p style="margin: 20px 0 0 0; font-size: 16px;">See you soon!</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; color: #0393d5;">Skip the wait. Join the line.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    case 'booking_cancelled':
      return {
        subject: `Booking Cancelled - ${data.shopName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Cancelled</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #FF3B30, #FF6B6B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">❌ Booking Cancelled</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${data.customerName},</p>
                <p style="margin: 0 0 20px 0; font-size: 16px;">Your booking at <strong>${data.shopName}</strong> for <strong>${data.serviceName}</strong> on <strong>${data.date}</strong> has been cancelled.</p>
                ${data.reason ? `<p style="margin: 0 0 20px 0; font-size: 16px; color: #666;">Reason: ${data.reason}</p>` : ''}
                <p style="margin: 20px 0 0 0; font-size: 16px;">We hope to see you again soon!</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; color: #0393d5;">Skip the wait. Join the line.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    case 'welcome':
      return {
        subject: 'Welcome to Happy Inline!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Happy Inline</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0393d5, #00c6ff); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">👋 Welcome to Happy Inline!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${data.name},</p>
                <p style="margin: 0 0 20px 0; font-size: 16px;">Welcome to Happy Inline! We're excited to have you on board.</p>

                <p style="margin: 0 0 15px 0; font-size: 16px;">With Happy Inline, you can:</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">📅 Book appointments with local businesses</div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">💬 Message service providers directly</div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">⭐ Rate and review your experiences</div>

                <p style="margin: 20px 0 0 0; font-size: 16px;">Start exploring and book your first appointment today!</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; color: #0393d5;">Skip the wait. Join the line.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    case 'business_welcome':
      return {
        subject: 'Welcome to Happy Inline for Business!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Happy Inline for Business</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #34C759, #30D158); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🎊 Welcome, Business Owner!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${data.name},</p>
                <p style="margin: 0 0 20px 0; font-size: 16px;">Congratulations on joining Happy Inline! Your business is now set up and ready to receive bookings.</p>

                <p style="margin: 0 0 15px 0; font-size: 16px;">Next steps to get started:</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                  <span style="display: inline-block; background: #34C759; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-weight: bold;">1</span>
                  Add your services and pricing
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                  <span style="display: inline-block; background: #34C759; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-weight: bold;">2</span>
                  Set your operating hours
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                  <span style="display: inline-block; background: #34C759; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-weight: bold;">3</span>
                  Add team members (if applicable)
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                  <span style="display: inline-block; background: #34C759; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-weight: bold;">4</span>
                  Share your booking link with customers
                </div>

                <p style="margin: 20px 0 0 0; font-size: 16px;">Welcome aboard!</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; color: #0393d5;">Skip the wait. Join the line.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    case 'new_booking_notification':
      return {
        subject: `New Booking - ${data.customerName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Booking</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #34C759, #30D158); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">📅 New Booking!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 20px 0; font-size: 16px;">You have a new booking!</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${data.customerName}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${data.serviceName}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${data.date}</p>
                  <p style="margin: 0;"><strong>Time:</strong> ${data.time}</p>
                </div>

                <p style="margin: 20px 0 0 0; font-size: 16px;">Open the app to view and manage this booking.</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; color: #0393d5;">Skip the wait. Join the line.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    case 'provider_invitation':
      return {
        subject: `You've been invited to join ${data.shopName} on Happy Inline!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Provider Invitation</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0393d5, #00c6ff); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">Hi${data.providerName ? ' ' + data.providerName : ''},</p>

                <div style="background: #f0f8ff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0393d5;">
                  <p style="font-size: 18px; margin: 0;"><strong>${data.inviterName || 'A business owner'}</strong> has invited you to join <strong>${data.shopName}</strong> as a service provider on Happy Inline!</p>
                </div>

                <p style="margin: 0 0 20px 0; font-size: 16px;">Happy Inline is a professional booking platform that helps service providers manage appointments and connect with customers.</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="font-weight: bold; margin: 0 0 15px 0;">Getting started is easy:</p>
                  <div style="padding: 10px 0;">
                    <span style="display: inline-block; background: #0393d5; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-weight: bold;">1</span>
                    Download the Happy Inline app
                  </div>
                  <div style="padding: 10px 0;">
                    <span style="display: inline-block; background: #0393d5; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-weight: bold;">2</span>
                    Create your account using this email: <strong>${data.providerEmail}</strong>
                  </div>
                  <div style="padding: 10px 0;">
                    <span style="display: inline-block; background: #0393d5; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-weight: bold;">3</span>
                    Accept the invitation to join ${data.shopName}
                  </div>
                </div>

                <p style="text-align: center; margin: 25px 0;">
                  <a href="${data.signupLink || 'https://happyinline.app'}" style="display: inline-block; background: linear-gradient(135deg, #0393d5, #00c6ff); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Get Started Now</a>
                </p>

                <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">Once you join, you'll be able to:</p>
                <ul style="color: #666; margin: 0 0 20px 0;">
                  <li>Receive booking notifications</li>
                  <li>Manage your schedule</li>
                  <li>Communicate with customers</li>
                  <li>Track your appointments</li>
                </ul>

                <p style="margin: 0 0 15px 0; font-size: 16px;">If you have any questions, feel free to reach out to ${data.inviterName || 'your inviter'} or contact our support team.</p>

                <p style="margin: 0; font-size: 16px;">We're excited to have you join the Happy Inline community!</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #999;">If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    case 'provider_added':
      return {
        subject: `Welcome to ${data.shopName} on Happy Inline!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to the Team</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #34C759, #30D158); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🎊 Welcome to the Team!</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="margin: 0 0 15px 0; font-size: 16px;">Hi ${data.providerName || 'there'},</p>

                <div style="background: #f0fff4; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34C759;">
                  <p style="font-size: 18px; margin: 0;">You have been added as a service provider at <strong>${data.shopName}</strong>!</p>
                </div>

                <p style="margin: 0 0 15px 0; font-size: 16px;">You now have access to:</p>
                <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; margin: 8px 0;">📅 View and manage bookings assigned to you</div>
                <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; margin: 8px 0;">💬 Communicate with customers</div>
                <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; margin: 8px 0;">🔔 Receive notifications for new appointments</div>
                <div style="background: #f8f9fa; padding: 12px 15px; border-radius: 8px; margin: 8px 0;">📊 Track your schedule</div>

                <p style="margin: 20px 0 15px 0; font-size: 16px;">Open the Happy Inline app to get started and see your upcoming appointments!</p>

                <p style="margin: 0; font-size: 16px;">Welcome aboard!</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="margin: 5px 0 0 0; color: #0393d5;">Skip the wait. Join the line.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    default:
      throw new Error(`Unknown email type: ${type}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, to, data } = await req.json()

    console.log('📧 Email request:', { type, to: to?.email })

    if (!type || !to?.email) {
      return new Response(
        JSON.stringify({ error: 'type and to.email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get SendPulse credentials from environment
    const sendPulseUserId = Deno.env.get('SENDPULSE_API_USER_ID')
    const sendPulseSecret = Deno.env.get('SENDPULSE_API_SECRET')

    if (!sendPulseUserId || !sendPulseSecret) {
      console.error('❌ SendPulse credentials not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SendPulse credentials not configured',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get access token
    const accessToken = await getAccessToken(sendPulseUserId, sendPulseSecret)

    // Generate email content
    const { subject, html } = generateEmailContent(type, data)

    // Send the email
    const result = await sendEmail(accessToken, to, subject, html)

    if (result.result !== true && !result.id) {
      console.error('❌ SendPulse email error:', result)
      return new Response(
        JSON.stringify({
          success: false,
          error: result.message || 'Failed to send email',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Email sent successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: result.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error sending email:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
