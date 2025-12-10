-- Add address column to profiles table
-- Set up storage bucket for profile images

-- Step 1: Add address column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address TEXT;

-- Step 2: Create storage bucket for profile images (if not exists)
-- You need to run this in Supabase Dashboard > Storage
-- Bucket name: profile-images
-- Public: true
-- Allowed MIME types: image/jpeg, image/png, image/jpg
-- Max file size: 5MB

-- Step 3: Create storage policies for profile images
-- Allow authenticated users to upload their own profile images
CREATE POLICY IF NOT EXISTS "Users can upload their own profile image"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own profile images
CREATE POLICY IF NOT EXISTS "Users can update their own profile image"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile images
CREATE POLICY IF NOT EXISTS "Users can delete their own profile image"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view profile images (public read)
CREATE POLICY IF NOT EXISTS "Anyone can view profile images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Verify the address column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'address';
