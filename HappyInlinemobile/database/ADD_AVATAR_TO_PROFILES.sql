-- ================================================================
-- ADD AVATAR_URL COLUMN TO PROFILES TABLE
-- ================================================================
-- Adds avatar_url column to store user profile pictures
-- ================================================================

-- Add avatar_url column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile picture/avatar';

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'avatar_url';
