-- Create Storage Buckets for Happy Inline App
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================

-- Profile Pictures Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,  -- Public bucket
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- Shop Logos Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-logos',
  'shop-logos',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- Service Images Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- Shop Banners Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-banners',
  'shop-banners',
  true,
  10485760,  -- 10MB limit for banners
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

-- ============================================
-- 2. SET UP STORAGE POLICIES (RLS)
-- ============================================

-- Profile Pictures Policies
-- Allow anyone to read profile pictures
CREATE POLICY "Public read access for profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Shop Logos Policies
-- Allow anyone to read shop logos
CREATE POLICY "Public read access for shop logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-logos');

-- Allow shop owners/managers to upload logos
CREATE POLICY "Shop owners can upload shop logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-logos'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'admin')
  )
);

-- Allow shop owners/managers to update logos
CREATE POLICY "Shop owners can update shop logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-logos'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'admin')
  )
);

-- Allow shop owners/managers to delete logos
CREATE POLICY "Shop owners can delete shop logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-logos'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'admin')
  )
);

-- Service Images Policies
-- Allow anyone to read service images
CREATE POLICY "Public read access for service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

-- Allow shop staff to upload service images
CREATE POLICY "Shop staff can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'barber', 'admin')
  )
);

-- Allow shop staff to update service images
CREATE POLICY "Shop staff can update service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'barber', 'admin')
  )
);

-- Allow shop staff to delete service images
CREATE POLICY "Shop staff can delete service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'barber', 'admin')
  )
);

-- Shop Banners Policies
-- Allow anyone to read shop banners
CREATE POLICY "Public read access for shop banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-banners');

-- Allow shop owners/managers to upload banners
CREATE POLICY "Shop owners can upload shop banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-banners'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'admin')
  )
);

-- Allow shop owners/managers to update banners
CREATE POLICY "Shop owners can update shop banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-banners'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'admin')
  )
);

-- Allow shop owners/managers to delete banners
CREATE POLICY "Shop owners can delete shop banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-banners'
  AND auth.uid() IN (
    SELECT user_id FROM profiles 
    WHERE role IN ('owner', 'manager', 'admin')
  )
);

-- ============================================
-- 3. VERIFY BUCKETS CREATED
-- ============================================

SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('profile-pictures', 'shop-logos', 'service-images', 'shop-banners')
ORDER BY name;
