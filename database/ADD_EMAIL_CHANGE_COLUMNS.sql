-- Add columns to profiles table for email change OTP flow
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_change_otp TEXT,
ADD COLUMN IF NOT EXISTS email_change_otp_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_change_pending TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.email_change_otp IS 'Temporary OTP code for email change verification';
COMMENT ON COLUMN profiles.email_change_otp_expires IS 'Expiration time for the email change OTP';
COMMENT ON COLUMN profiles.email_change_pending IS 'The new email address pending verification';
