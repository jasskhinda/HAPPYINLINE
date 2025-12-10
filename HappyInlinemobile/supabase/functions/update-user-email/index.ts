/**
 * Supabase Edge Function: Update User Email
 *
 * Updates the email in auth.users table using service role key.
 * Sends OTP via SendPulse SMTP for email verification.
 */

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SendPulse API Configuration
const SENDPULSE_CONFIG = {
  userId: Deno.env.get('SENDPULSE_API_USER_ID') || '',
  secret: Deno.env.get('SENDPULSE_API_SECRET') || '',
  from: 'noreply@happyinline.com',
  fromName: 'Happy Inline'
}

// Get SendPulse API token
async function getSendPulseToken(): Promise<string | null> {
  try {
    const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: SENDPULSE_CONFIG.userId,
        client_secret: SENDPULSE_CONFIG.secret,
      }),
    })

    if (!response.ok) {
      console.error('❌ Failed to get SendPulse token:', response.status)
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('❌ Error getting SendPulse token:', error)
    return null
  }
}

async function sendOTPEmail(toEmail: string, otpCode: string): Promise<boolean> {
  try {
    // Get API token
    const token = await getSendPulseToken()
    if (!token) {
      console.error('❌ Could not get SendPulse API token')
      return false
    }

    // Prepare email
    const emailData = {
      email: {
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4A90E2; margin-bottom: 10px;">Happy Inline</h1>
    <p style="color: #666; font-size: 14px;">Email Change Verification</p>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
    <p style="margin-bottom: 20px; font-size: 16px;">Your verification code is:</p>
    <div style="background-color: #4A90E2; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block;">
      ${otpCode}
    </div>
    <p style="margin-top: 20px; color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
    <p>If you did not request this email change, please ignore this message.</p>
    <p style="margin-top: 10px;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
  </div>
</body>
</html>
        `,
        text: `Your verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this email change, please ignore this message.\n\n- Happy Inline Team`,
        subject: 'Your Happy Inline Email Change Verification Code',
        from: {
          name: SENDPULSE_CONFIG.fromName,
          email: SENDPULSE_CONFIG.from,
        },
        to: [
          {
            email: toEmail,
          },
        ],
      },
    }

    // Send email via SendPulse API
    const response = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ SendPulse API error:', response.status, errorText)
      return false
    }

    console.log('✅ Email sent successfully to:', toEmail)
    return true
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, newEmail, otp, action } = await req.json()

    console.log('📧 Request:', { userId, newEmail, action })

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Action: send_otp - Send OTP to new email
    if (action === 'send_otp') {
      if (!newEmail || !userId) {
        return new Response(
          JSON.stringify({ error: 'Missing newEmail or userId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if email already exists in auth.users (excluding current user)
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const emailExists = existingUsers?.users?.some(u => u.email === newEmail && u.id !== userId)

      if (emailExists) {
        return new Response(
          JSON.stringify({ error: 'This email is already in use by another account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate a 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Store OTP in profiles table
      const { error: storeError } = await supabaseAdmin
        .from('profiles')
        .update({
          email_change_otp: otpCode,
          email_change_otp_expires: expiresAt.toISOString(),
          email_change_pending: newEmail
        })
        .eq('id', userId)

      if (storeError) {
        console.error('❌ Error storing OTP:', storeError.message)
        return new Response(
          JSON.stringify({ error: 'Failed to generate verification code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send email with OTP
      const emailSent = await sendOTPEmail(newEmail, otpCode)

      if (!emailSent) {
        console.log('⚠️ Email failed, but OTP stored. Code:', otpCode)
        // Still return success - user can check logs or we can show code for testing
      }

      console.log('✅ OTP generated:', otpCode, 'for:', newEmail)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent to ' + newEmail,
          emailSent: emailSent,
          // Always return OTP for testing (remove in production)
          _debug_otp: otpCode
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: verify_otp - Verify OTP and update email
    if (action === 'verify_otp') {
      if (!userId || !newEmail || !otp) {
        return new Response(
          JSON.stringify({ error: 'Missing userId, newEmail, or otp' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get stored OTP from profile
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('email_change_otp, email_change_otp_expires, email_change_pending')
        .eq('id', userId)
        .single()

      if (fetchError || !profile) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if OTP matches
      if (profile.email_change_otp !== otp) {
        console.log('❌ OTP mismatch:', profile.email_change_otp, '!=', otp)
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if OTP expired
      if (new Date(profile.email_change_otp_expires) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if pending email matches
      if (profile.email_change_pending !== newEmail) {
        return new Response(
          JSON.stringify({ error: 'Email mismatch. Please start over.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // OTP verified! Now update the email
      console.log('✅ OTP verified, updating email...')

      // Update auth.users email
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: newEmail, email_confirm: true }
      )

      if (error) {
        console.error('❌ Error updating auth email:', error.message)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update profile and clear OTP fields
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: newEmail,
          email_change_otp: null,
          email_change_otp_expires: null,
          email_change_pending: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileError) {
        console.error('⚠️ Error updating profile email:', profileError.message)
      }

      console.log('✅ Email updated successfully for user:', userId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email updated successfully',
          user: data.user
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default action: direct update (legacy - no OTP verification)
    if (!userId || !newEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or newEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the user's email in auth.users
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail, email_confirm: true }
    )

    if (error) {
      console.error('❌ Error updating auth email:', error.message)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also update the profiles table to keep in sync
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('⚠️ Error updating profile email:', profileError.message)
    }

    console.log('✅ Email updated successfully for user:', userId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email updated successfully',
        user: data.user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
