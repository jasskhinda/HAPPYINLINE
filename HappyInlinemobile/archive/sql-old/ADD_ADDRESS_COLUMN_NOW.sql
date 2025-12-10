-- Add address column to profiles table
-- Run this NOW to fix the error

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address TEXT;

-- Verify it was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'address';

-- Should return one row showing: address | text | YES
