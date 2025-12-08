# Storage Bucket Setup Guide

## Current Issue
You're seeing errors like: `"Bucket not found"`

This means the storage buckets haven't been created in your Supabase project yet.

## Solution: Run the SQL Migration

### Step 1: Access Supabase SQL Editor
1. Open https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Execute the Migration
1. Open the file: `CREATE_STORAGE_BUCKETS.sql`
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor
4. Click **Run** (green button at the bottom right)

### Step 3: Verify Buckets Were Created
1. Go to **Storage** in the left sidebar
2. You should see 4 new buckets:
   - ✅ `profile-pictures`
   - ✅ `shop-logos`
   - ✅ `service-images`
   - ✅ `shop-banners`

### Step 4: Test in Your App
1. Restart your Expo app
2. Try uploading an image (profile picture, shop logo, etc.)
3. The "Bucket not found" error should be gone! ✅

## What This SQL File Does

### Creates 4 Storage Buckets
- **profile-pictures**: User profile photos (5MB limit)
- **shop-logos**: Business/shop logos (5MB limit)
- **service-images**: Service photos (5MB limit)
- **shop-banners**: Shop banner images (10MB limit)

### Sets Up Security Policies (RLS)
- ✅ Public read access (anyone can view images)
- ✅ Authenticated upload (only logged-in users can upload)
- ✅ User-specific permissions (users can only modify their own files)

## Alternative: Manual Setup (Not Recommended)

If you prefer to create buckets manually through the UI:

1. Go to **Storage** → **New Bucket**
2. Create each bucket with these settings:

**profile-pictures**
- Name: `profile-pictures`
- Public: ✅ Yes
- File size limit: `5242880` (5MB)
- Allowed MIME types: `image/jpeg, image/png, image/jpg, image/webp`

**shop-logos**
- Same settings as profile-pictures

**service-images**
- Same settings as profile-pictures

**shop-banners**
- Name: `shop-banners`
- Public: ✅ Yes
- File size limit: `10485760` (10MB)
- Allowed MIME types: `image/jpeg, image/png, image/jpg, image/webp`

⚠️ **Note**: Manual setup won't create the RLS policies. You'll need to run the SQL file anyway for proper security.

## Troubleshooting

### "Bucket not found" persists
- Make sure you ran the ENTIRE SQL file
- Check that all 4 buckets appear in Storage
- Restart your app

### "Permission denied" errors
- The RLS policies weren't created
- Run the SQL file (it includes the policies)

### Images not uploading
- Check file size (must be under limit)
- Check file format (only jpeg, png, jpg, webp allowed)
- Check your internet connection

## Need Help?

If you're still having issues:
1. Check the Supabase SQL Editor for any error messages
2. Verify your Supabase project is active
3. Make sure your API keys are correct in your app
