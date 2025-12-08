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
 * Generate email HTML based on type
 */
function generateEmailContent(type: string, data: any): { subject: string; html: string } {
  switch (type) {
    case 'booking_confirmation':
      return {
        subject: `Booking Confirmed - ${data.shopName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0393d5, #00c6ff); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .detail-label { color: #666; }
              .detail-value { font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Booking Confirmed!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.customerName},</p>
                <p>Your appointment has been confirmed. Here are your booking details:</p>

                <div class="booking-details">
                  <div class="detail-row">
                    <span class="detail-label">Business:</span>
                    <span class="detail-value">${data.shopName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Service:</span>
                    <span class="detail-value">${data.serviceName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${data.date}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${data.time}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Reference:</span>
                    <span class="detail-value">${data.bookingReference}</span>
                  </div>
                  ${data.totalAmount ? `
                  <div class="detail-row">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value">$${data.totalAmount}</span>
                  </div>
                  ` : ''}
                </div>

                <p>We look forward to seeing you!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }

    case 'booking_reminder':
      return {
        subject: `Reminder: Your appointment at ${data.shopName} is coming up!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF9500, #FFB800); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .reminder-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF9500; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Appointment Reminder</h1>
              </div>
              <div class="content">
                <p>Hi ${data.customerName},</p>
                <p>This is a friendly reminder that your appointment is coming up soon!</p>

                <div class="reminder-box">
                  <p><strong>${data.serviceName}</strong> at <strong>${data.shopName}</strong></p>
                  <p>📅 ${data.date} at ${data.time}</p>
                </div>

                <p>See you soon!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
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
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF3B30, #FF6B6B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Booking Cancelled</h1>
              </div>
              <div class="content">
                <p>Hi ${data.customerName},</p>
                <p>Your booking at <strong>${data.shopName}</strong> for <strong>${data.serviceName}</strong> on <strong>${data.date}</strong> has been cancelled.</p>
                ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
                <p>We hope to see you again soon!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
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
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0393d5, #00c6ff); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .feature { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Happy Inline!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name},</p>
                <p>Welcome to Happy Inline! We're excited to have you on board.</p>

                <p>With Happy Inline, you can:</p>
                <div class="feature">📅 Book appointments with local businesses</div>
                <div class="feature">💬 Message service providers directly</div>
                <div class="feature">⭐ Rate and review your experiences</div>

                <p>Start exploring and book your first appointment today!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
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
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #34C759, #30D158); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .step { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; display: flex; align-items: center; }
              .step-number { background: #34C759; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome, Business Owner!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name},</p>
                <p>Congratulations on joining Happy Inline! Your business is now set up and ready to receive bookings.</p>

                <p>Next steps to get started:</p>
                <div class="step">
                  <div class="step-number">1</div>
                  <span>Add your services and pricing</span>
                </div>
                <div class="step">
                  <div class="step-number">2</div>
                  <span>Set your operating hours</span>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <span>Add team members (if applicable)</span>
                </div>
                <div class="step">
                  <div class="step-number">4</div>
                  <span>Share your booking link with customers</span>
                </div>

                <p>Welcome aboard!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
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
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #34C759, #30D158); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Booking!</h1>
              </div>
              <div class="content">
                <p>You have a new booking!</p>

                <div class="booking-details">
                  <p><strong>Customer:</strong> ${data.customerName}</p>
                  <p><strong>Service:</strong> ${data.serviceName}</p>
                  <p><strong>Date:</strong> ${data.date}</p>
                  <p><strong>Time:</strong> ${data.time}</p>
                </div>

                <p>Open the app to view and manage this booking.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
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
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0393d5, #00c6ff); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .invite-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0393d5; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #0393d5, #00c6ff); color: white !important; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
              .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .step { display: flex; align-items: center; padding: 10px 0; }
              .step-number { background: #0393d5; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You're Invited!</h1>
              </div>
              <div class="content">
                <p>Hi${data.providerName ? ' ' + data.providerName : ''},</p>

                <div class="invite-box">
                  <p style="font-size: 18px; margin: 0;"><strong>${data.inviterName || 'A business owner'}</strong> has invited you to join <strong>${data.shopName}</strong> as a service provider on Happy Inline!</p>
                </div>

                <p>Happy Inline is a professional booking platform that helps service providers manage appointments and connect with customers.</p>

                <div class="steps">
                  <p style="font-weight: bold; margin-bottom: 15px;">Getting started is easy:</p>
                  <div class="step">
                    <span class="step-number">1</span>
                    <span>Download the Happy Inline app</span>
                  </div>
                  <div class="step">
                    <span class="step-number">2</span>
                    <span>Create your account using this email: <strong>${data.providerEmail}</strong></span>
                  </div>
                  <div class="step">
                    <span class="step-number">3</span>
                    <span>Accept the invitation to join ${data.shopName}</span>
                  </div>
                </div>

                <p style="text-align: center;">
                  <a href="${data.signupLink || 'https://happyinline.app'}" class="cta-button">Get Started Now</a>
                </p>

                <p style="color: #666; font-size: 14px;">Once you join, you'll be able to:</p>
                <ul style="color: #666;">
                  <li>Receive booking notifications</li>
                  <li>Manage your schedule</li>
                  <li>Communicate with customers</li>
                  <li>Track your appointments</li>
                </ul>

                <p>If you have any questions, feel free to reach out to ${data.inviterName || 'your inviter'} or contact our support team.</p>

                <p>We're excited to have you join the Happy Inline community!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
                <p style="font-size: 11px; color: #999;">If you didn't expect this invitation, you can safely ignore this email.</p>
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
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #34C759, #30D158); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .welcome-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34C759; }
              .feature { background: white; padding: 12px 15px; border-radius: 8px; margin: 8px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to the Team!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.providerName || 'there'},</p>

                <div class="welcome-box">
                  <p style="font-size: 18px; margin: 0;">You have been added as a service provider at <strong>${data.shopName}</strong>!</p>
                </div>

                <p>You now have access to:</p>
                <div class="feature">📅 View and manage bookings assigned to you</div>
                <div class="feature">💬 Communicate with customers</div>
                <div class="feature">🔔 Receive notifications for new appointments</div>
                <div class="feature">📊 Track your schedule</div>

                <p>Open the Happy Inline app to get started and see your upcoming appointments!</p>

                <p>Welcome aboard!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
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
