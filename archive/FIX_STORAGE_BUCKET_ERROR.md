# 🪣 FIX: Storage Bucket Not Found Error

## ❌ Error Message
```
ERROR  Upload error: [StorageApiError: Bucket not found]
ERROR  Logo upload failed: Bucket not found
ERROR  Banner upload failed: Bucket not found
```

## 🎯 Root Cause
The Supabase Storage bucket `shop-images` doesn't exist yet. You need to create it first.

---

## ✅ SOLUTION: Create Storage Bucket in Supabase

### Step 1: Open Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Storage** in the left sidebar

### Step 2: Create New Bucket
1. Click **"New bucket"** button (top right)
2. Fill in the details:
   ```
   Name: shop-images
   Public bucket: ✅ YES (check this box)
   File size limit: 50 MB (optional)
   Allowed MIME types: Leave empty or add: image/jpeg, image/png, image/jpg, image/webp
   ```
3. Click **"Create bucket"**

### Step 3: Configure Bucket Policies (Important!)
After creating the bucket, you need to set up policies so authenticated users can upload/delete images.

1. Click on the `shop-images` bucket
2. Go to **"Policies"** tab
3. Click **"New policy"**

#### Policy 1: Allow Upload
```
Policy name: Allow authenticated users to upload
Target roles: authenticated
Operation: INSERT
Policy definition:
```
```sql
true
```

#### Policy 2: Allow Read (Public)
```
Policy name: Allow public read access
Target roles: public
Operation: SELECT
Policy definition:
```
```sql
true
```

#### Policy 3: Allow Delete
```
Policy name: Allow authenticated users to delete
Target roles: authenticated
Operation: DELETE
Policy definition:
```
```sql
true
```

---

## 🚀 Quick Method: SQL Script

Alternatively, run this SQL script in Supabase SQL Editor:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-images');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shop-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'shop-images');

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shop-images');
```

---

## ✅ Verification

After creating the bucket, verify it works:

1. **Check Bucket Exists:**
   - Go to Storage in Supabase Dashboard
   - You should see `shop-images` bucket listed
   - It should show as "Public"

2. **Test Upload:**
   - Try creating a shop with images in your app
   - Images should upload successfully
   - No "Bucket not found" errors

3. **Check Console:**
   - Should show: "✅ Logo uploaded: [url]"
   - Should show: "✅ Banner uploaded: [url]"
   - Should show: "✅ Cover uploaded: [url]" (if added)

---

## 📸 Expected Folder Structure

After uploading images, your bucket will have this structure:

```
shop-images/
├── {shop-id-1}/
│   ├── logo_1234567890.jpg
│   ├── banner_1234567891.jpg
│   ├── cover_1234567892.jpg
│   └── services/
│       ├── haircut_1234567893.jpg
│       └── shaving_1234567894.jpg
├── {shop-id-2}/
│   ├── logo_1234567895.jpg
│   └── banner_1234567896.jpg
└── ...
```

---

## ⚠️ Common Issues

### Issue 1: Bucket created but still getting error
**Fix:** Make sure bucket is set to **Public**
- Edit bucket settings
- Check "Public bucket" option
- Save changes

### Issue 2: Upload works but can't view images
**Fix:** Add public read policy (see Policy 2 above)

### Issue 3: Can upload but can't delete
**Fix:** Add delete policy for authenticated users (see Policy 3 above)

### Issue 4: Images upload but URLs don't work
**Fix:** 
1. Verify bucket is public
2. Check RLS policies are created
3. Test URL in browser: `https://[project-id].supabase.co/storage/v1/object/public/shop-images/[file-path]`

---

## 🔐 Security Best Practices

### Current Setup (Simple - Good for Development)
- Public bucket with open policies
- Anyone can read
- Only authenticated users can upload/delete

### Production Setup (Recommended)
Use more restrictive policies:

```sql
-- Only shop admins can upload their shop images
CREATE POLICY "Shop admins can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' AND
  (storage.foldername(name))[1] IN (
    SELECT shop_id::text FROM shop_staff
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Only shop admins can delete their shop images
CREATE POLICY "Shop admins can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images' AND
  (storage.foldername(name))[1] IN (
    SELECT shop_id::text FROM shop_staff
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

---

## 📋 Checklist

After following this guide:

- [ ] Created `shop-images` bucket in Supabase Storage
- [ ] Set bucket to "Public"
- [ ] Created upload policy (INSERT)
- [ ] Created read policy (SELECT)
- [ ] Created delete policy (DELETE)
- [ ] Tested shop creation with images
- [ ] Verified images appear in app
- [ ] No "Bucket not found" errors in console

---

## 🆘 Still Having Issues?

1. **Check Supabase Project:**
   - Make sure you're in the correct project
   - Verify project is not paused/inactive

2. **Check Connection:**
   - Verify Supabase credentials in `.env` or config
   - Test connection with simple query

3. **Check Console Logs:**
   - Look for specific error messages
   - Check if authentication is working

4. **Manual Test:**
   - Try uploading a file manually through Supabase Dashboard
   - If manual upload fails, check bucket permissions

---

## 🎉 Success!

Once the bucket is created and policies are set:
- ✅ Images upload successfully
- ✅ No more "Bucket not found" errors
- ✅ Images display in app
- ✅ Shop logos, banners, and covers work
- ✅ Service images work (future feature)

**You're all set!** 🚀
