-- Add Push Notification Support to Profiles Table
-- Run this in your Supabase SQL Editor

-- Add push_token column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.push_token IS 'Expo Push Token for sending push notifications to this user';
COMMENT ON COLUMN profiles.push_token_updated_at IS 'When the push token was last updated';

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('push_token', 'push_token_updated_at');
