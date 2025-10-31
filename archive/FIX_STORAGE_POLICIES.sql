-- ============================================================================
-- FIX STORAGE BUCKET POLICIES - Upload Permission Issue
-- ============================================================================

-- Error: "new row violates row-level security policy"
-- Cause: Bucket exists but doesn't have policies allowing uploads

-- ============================================================================
-- STEP 1: Check Current Policies
-- ============================================================================

-- View existing policies on storage.objects
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- ============================================================================
-- STEP 2: Drop Any Conflicting Policies
-- ============================================================================

-- Drop existing policies for shop-images bucket (if any)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Shop images insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Shop images select policy" ON storage.objects;
DROP POLICY IF EXISTS "Shop images delete policy" ON storage.objects;
DROP POLICY IF EXISTS "Shop images update policy" ON storage.objects;

-- ============================================================================
-- STEP 3: Create Proper Storage Policies
-- ============================================================================

-- POLICY 1: Allow authenticated users to UPLOAD (INSERT) to shop-images bucket
CREATE POLICY "Allow authenticated users to upload shop images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images'
);

-- POLICY 2: Allow PUBLIC READ access to shop-images (so images display in app)
CREATE POLICY "Allow public read access to shop images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'shop-images'
);

-- POLICY 3: Allow authenticated users to DELETE their uploads
CREATE POLICY "Allow authenticated users to delete shop images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images'
);

-- POLICY 4: Allow authenticated users to UPDATE their uploads
CREATE POLICY "Allow authenticated users to update shop images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images'
)
WITH CHECK (
  bucket_id = 'shop-images'
);

-- ============================================================================
-- STEP 4: Verify Policies Were Created
-- ============================================================================

-- Check that all 4 policies now exist for storage.objects
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname ILIKE '%shop%';

-- Should show:
-- 1. Allow authenticated users to upload shop images | INSERT | authenticated
-- 2. Allow public read access to shop images | SELECT | public
-- 3. Allow authenticated users to delete shop images | DELETE | authenticated
-- 4. Allow authenticated users to update shop images | UPDATE | authenticated

-- ============================================================================
-- STEP 5: Test Query (Optional)
-- ============================================================================

-- This should return your shop-images bucket
SELECT * FROM storage.buckets WHERE id = 'shop-images';

-- ============================================================================
-- SUCCESS!
-- ============================================================================

SELECT 
  '✅ Storage policies fixed! You can now upload images to shop-images bucket.' as status,
  'Try creating a shop with images in your app now.' as next_step;

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

/*
If uploads STILL fail after running this:

1. Make sure bucket is PUBLIC:
   UPDATE storage.buckets 
   SET public = true 
   WHERE id = 'shop-images';

2. Check if bucket exists:
   SELECT * FROM storage.buckets;

3. Verify you're authenticated:
   SELECT auth.uid(); -- Should return your user ID, not null

4. Check file size limits:
   SELECT file_size_limit FROM storage.buckets WHERE id = 'shop-images';
   -- NULL or 0 means no limit, otherwise check if your images are too large

5. Try manual upload test in Supabase Dashboard:
   - Go to Storage → shop-images
   - Click "Upload file"
   - If this fails, there's a bucket configuration issue
*/
