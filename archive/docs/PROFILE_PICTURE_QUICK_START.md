# Profile Picture Upload - Quick Start (5 minutes)

## What You're Getting
Professional profile editing with:
- ✅ Camera or gallery photo upload
- ✅ Image cropping (square)
- ✅ Profile pictures everywhere in the app
- ✅ Address field for owners

---

## Setup (3 Steps - 5 Minutes)

### Step 1: Database Migration (2 min)
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy **ALL** this SQL and click **RUN**:

```sql
-- Add address column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address TEXT;

-- Storage policies for profile images
CREATE POLICY IF NOT EXISTS "Users can upload their own profile image"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can update their own profile image"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can delete their own profile image"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Anyone can view profile images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address';
```

✅ Should see: "Success. Rows affected: N" and verification shows 'address' column

---

### Step 2: Create Storage Bucket (1 min)
1. In Supabase Dashboard, go to **Storage**
2. Click **"New Bucket"**
3. Fill in:
   - **Name**: `profile-images` (exact name!)
   - **Public bucket**: ✅ **Turn ON** (toggle to right)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: Leave default or add: `image/jpeg,image/png,image/jpg`
4. Click **"Create Bucket"**

✅ Should see new bucket named `profile-images` in list

---

### Step 3: Test in App (2 min)
1. Login to app as owner
2. Tap **Profile** → **Edit Profile**
3. Tap the **camera icon** on profile picture
4. Choose **"Take Photo"** or **"Choose from Gallery"**
5. Crop your photo (square crop)
6. Tap **"Choose"** or **"Confirm"**
7. Wait for **"Profile picture updated successfully"**
8. Go back to Profile screen

✅ Should see your new photo everywhere!

---

## What's Now Available

### Edit Profile Screen
- 📷 **Profile Picture** - Upload from camera/gallery
- ✏️ **Full Name** - Edit
- 📧 **Email** - Read-only
- 📱 **Phone** - Edit
- 📍 **Address** - Edit (multiline)
- 💾 **Save Changes** button

### Profile Display
Your profile picture now shows in:
- ✅ Profile screen (main view)
- ✅ Edit Profile screen (with upload option)
- 📋 Future: Manager Dashboard, Bookings, Staff lists

---

## Troubleshooting

### Can't upload - "Bucket not found"
**Fix**: Create the storage bucket (Step 2) with exact name `profile-images`

### Can't upload - Permission denied
**Fix**: Make sure bucket is **Public** (Storage → profile-images → Settings → Public = ON)

### Address field error
**Fix**: Run Step 1 database migration SQL again

### Image doesn't show after upload
**Fix**:
1. Logout and login again
2. Check bucket is public
3. Check you see success message after upload

---

## That's It!

**Total Time**: ~5 minutes
**Files Changed**: 1 (EditProfileScreen.jsx)
**Database Changes**: Added `address` column + storage policies
**Storage**: Created `profile-images` bucket

Now your owners have professional profile editing with real image uploads! 🎉

📚 **Full documentation**: See [PROFILE_PICTURE_COMPLETE_GUIDE.md](PROFILE_PICTURE_COMPLETE_GUIDE.md)
