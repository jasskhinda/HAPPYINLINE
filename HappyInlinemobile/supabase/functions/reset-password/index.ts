/**
 * Supabase Edge Function: Reset Password
 *
 * Handles password reset via OTP verification
 * 1. send_otp: Sends OTP to user's email
 * 2. verify_otp: Verifies OTP and resets password
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
    const token = await getSendPulseToken()
    if (!token) {
      console.error('❌ Could not get SendPulse API token')
      return false
    }

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
    <p style="color: #666; font-size: 14px;">Password Reset Verification</p>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
    <p style="margin-bottom: 20px; font-size: 16px;">Your password reset code is:</p>
    <div style="background-color: #4A90E2; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 8px; display: inline-block;">
      ${otpCode}
    </div>
    <p style="margin-top: 20px; color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
    <p>If you did not request a password reset, please ignore this message.</p>
    <p style="margin-top: 10px;">© ${new Date().getFullYear()} Happy Inline. All rights reserved.</p>
  </div>
</body>
</html>
        `,
        text: `Your password reset code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you did not request a password reset, please ignore this message.\n\n- Happy Inline Team`,
        subject: 'Your Happy Inline Password Reset Code',
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp, newPassword, action } = await req.json()

    console.log('🔐 Password reset request:', { email, action })

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

    // Action: send_otp - Send OTP to user's email
    if (action === 'send_otp') {
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Missing email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user exists
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'No account found with this email address' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Store OTP in profiles table
      const { error: storeError } = await supabaseAdmin
        .from('profiles')
        .update({
          password_reset_otp: otpCode,
          password_reset_otp_expires: expiresAt.toISOString(),
        })
        .eq('id', user.id)

      if (storeError) {
        console.error('❌ Error storing OTP:', storeError.message)
        return new Response(
          JSON.stringify({ error: 'Failed to generate verification code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send email with OTP
      const emailSent = await sendOTPEmail(email, otpCode)

      console.log('✅ OTP generated:', otpCode, 'for:', email)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent to ' + email,
          emailSent: emailSent,
          // Always return OTP for testing (remove in production)
          _debug_otp: otpCode
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: check_otp - Verify OTP only (without resetting password)
    if (action === 'check_otp') {
      if (!email || !otp) {
        return new Response(
          JSON.stringify({ error: 'Missing email or otp' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find user by email
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get stored OTP from profile
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('password_reset_otp, password_reset_otp_expires')
        .eq('id', user.id)
        .single()

      if (fetchError || !profile) {
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if OTP matches
      if (profile.password_reset_otp !== otp) {
        console.log('❌ OTP mismatch:', profile.password_reset_otp, '!=', otp)
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if OTP expired
      if (new Date(profile.password_reset_otp_expires) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ OTP verified successfully (check_otp)')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code is valid'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action: verify_otp - Verify OTP and reset password
    if (action === 'verify_otp') {
      if (!email || !otp || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'Missing email, otp, or newPassword' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find user by email
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get stored OTP from profile
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('password_reset_otp, password_reset_otp_expires')
        .eq('id', user.id)
        .single()

      if (fetchError || !profile) {
        return new Response(
          JSON.stringify({ error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if OTP matches
      if (profile.password_reset_otp !== otp) {
        console.log('❌ OTP mismatch:', profile.password_reset_otp, '!=', otp)
        return new Response(
          JSON.stringify({ error: 'Invalid verification code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if OTP expired
      if (new Date(profile.password_reset_otp_expires) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // OTP verified! Now update the password
      console.log('✅ OTP verified, updating password...')

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('❌ Error updating password:', updateError.message)
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Clear OTP fields
      await supabaseAdmin
        .from('profiles')
        .update({
          password_reset_otp: null,
          password_reset_otp_expires: null,
        })
        .eq('id', user.id)

      console.log('✅ Password updated successfully for user:', user.id)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password updated successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
