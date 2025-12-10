-- Add columns to profiles table for password reset OTP flow
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_reset_otp TEXT,
ADD COLUMN IF NOT EXISTS password_reset_otp_expires TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN profiles.password_reset_otp IS 'Temporary OTP code for password reset verification';
COMMENT ON COLUMN profiles.password_reset_otp_expires IS 'Expiration time for the password reset OTP';
