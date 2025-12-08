/**
 * Supabase Edge Function: Send Provider Notification Email
 *
 * Sends email notifications to newly added providers with their login information.
 * Uses Resend API for email delivery (easiest setup, free tier: 3000 emails/month)
 *
 * Configure these secrets in Supabase Dashboard → Edge Functions → Secrets:
 * - RESEND_API_KEY: Your Resend API key from resend.com
 * - FROM_EMAIL: Your verified sender email (e.g., noreply@happyinline.com)
 *
 * Setup steps:
 * 1. Sign up at resend.com
 * 2. Add and verify your domain (happyinline.com)
 * 3. Get your API key
 * 4. Add secrets to Supabase Edge Functions
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      providerEmail,
      providerName,
      businessName,
      inviterName,
      shopId
    } = await req.json()

    console.log('📧 Sending notification to provider:', providerEmail)

    // Validate required fields
    if (!providerEmail || !providerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: providerEmail, providerName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@happyinline.com'
    const fromName = Deno.env.get('FROM_NAME') || 'Happy InLine'
    const appUrl = Deno.env.get('APP_URL') || 'https://happyinline.com'

    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service not configured. Please contact support.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create email content
    const directLoginLink = appUrl

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${businessName || 'Happy InLine'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #0393d5, #0277b5); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Welcome to the Team!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">You've been added as a service provider</p>
    </div>

    <div style="padding: 40px 30px;">
      <p style="font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #0393d5;">Hello ${providerName}!</p>

      <p style="font-size: 16px; color: #555; margin-bottom: 25px;">
        Great news! <strong>${inviterName || 'The business owner'}</strong> has added you as a service provider
        ${businessName ? `at <strong>${businessName}</strong>` : ''}.
      </p>

      <p style="font-size: 16px; color: #555; margin-bottom: 25px;">
        You can now receive bookings and manage your appointments through the Happy InLine app.
      </p>

      <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #0393d5;">
        <h3 style="margin: 0 0 10px; color: #333; font-size: 16px;">📧 Your Login Email</h3>
        <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>${providerEmail}</strong></p>
        <p style="font-size: 13px; color: #888;">Use this email to sign in to the app</p>
      </div>

      <div style="margin: 25px 0;">
        <h3 style="margin-bottom: 15px; color: #333;">How to Get Started:</h3>

        <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
          <div style="background-color: #0393d5; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">1</div>
          <div style="font-size: 15px; color: #555; padding-top: 4px;">Download the <strong>Happy InLine</strong> app from the App Store or Google Play</div>
        </div>

        <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
          <div style="background-color: #0393d5; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">2</div>
          <div style="font-size: 15px; color: #555; padding-top: 4px;">Tap <strong>"Sign In as Provider"</strong></div>
        </div>

        <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
          <div style="background-color: #0393d5; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">3</div>
          <div style="font-size: 15px; color: #555; padding-top: 4px;">Enter your email (<strong>${providerEmail}</strong>) and request a login code</div>
        </div>

        <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
          <div style="background-color: #0393d5; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0;">4</div>
          <div style="font-size: 15px; color: #555; padding-top: 4px;">Check your email for the one-time login code and enter it</div>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${directLoginLink}" style="display: inline-block; background-color: #0393d5; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px;">Open Happy InLine</a>
      </div>

      <p style="font-size: 14px; color: #888; text-align: center;">
        If you have any questions, please contact ${inviterName || 'your business administrator'}.
      </p>
    </div>

    <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 5px 0; font-size: 13px; color: #888;">© ${new Date().getFullYear()} Happy InLine. All rights reserved.</p>
      <p style="margin: 5px 0; font-size: 13px; color: #888;">Making appointments easy for everyone</p>
    </div>
  </div>
</body>
</html>
    `

    const textContent = `
Welcome to the Team, ${providerName}!

Great news! ${inviterName || 'The business owner'} has added you as a service provider${businessName ? ` at ${businessName}` : ''}.

Your Login Email: ${providerEmail}

How to Get Started:
1. Download the Happy InLine app from the App Store or Google Play
2. Tap "Sign In as Provider"
3. Enter your email (${providerEmail}) and request a login code
4. Check your email for the one-time login code and enter it

Open the app: ${directLoginLink}

If you have any questions, please contact ${inviterName || 'your business administrator'}.

© ${new Date().getFullYear()} Happy InLine. All rights reserved.
    `

    // Send email via Resend API
    console.log('📤 Sending email via Resend...')

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [providerEmail],
        subject: `Welcome to ${businessName || 'Happy InLine'} - You've Been Added as a Provider!`,
        html: htmlContent,
        text: textContent
      })
    })

    const result = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('❌ Resend API error:', result)
      return new Response(
        JSON.stringify({
          success: false,
          error: result.message || 'Failed to send email'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Email sent via Resend:', result)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Provider notification email sent successfully',
        emailId: result.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error sending notification:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send notification'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
