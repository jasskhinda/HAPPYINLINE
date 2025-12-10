# 🔒 FIX: Storage RLS Policy Error - "new row violates row-level security policy"

## ❌ Error You're Seeing
```
ERROR  Upload error: [StorageApiError: new row violates row-level security policy]
ERROR  ❌ Logo upload failed: new row violates row-level security policy
ERROR  ❌ Banner upload failed: new row violates row-level security policy
```

## 🎯 Root Cause
You created the `shop-images` bucket ✅, but you didn't create the **storage policies** that allow authenticated users to upload files to it. Without these policies, Supabase blocks all upload attempts.

---

## ✅ SOLUTION: Add Storage Policies

### Method 1: SQL Script (Recommended - 1 minute)

1. **Open Supabase Dashboard** → Your Project → **SQL Editor**
2. **Copy entire contents** of `FIX_STORAGE_POLICIES.sql`
3. **Paste** into SQL Editor
4. **Click "Run"**
5. **Done!** ✅

### Method 2: Dashboard UI (Manual - 3 minutes)

1. **Go to Supabase Dashboard** → Your Project → **Storage** → **Policies** tab (in shop-images bucket)

2. **Click "New Policy"** → **"For full customization"**

3. **Create 4 policies:**

#### Policy 1: Allow Uploads (INSERT)
```
Policy Name: Allow authenticated users to upload shop images
Allowed operation: INSERT
Target roles: authenticated

Policy definition (WITH CHECK):
bucket_id = 'shop-images'
```

#### Policy 2: Allow Read (SELECT)
```
Policy Name: Allow public read access to shop images
Allowed operation: SELECT
Target roles: public

Policy definition (USING):
bucket_id = 'shop-images'
```

#### Policy 3: Allow Delete (DELETE)
```
Policy Name: Allow authenticated users to delete shop images
Allowed operation: DELETE
Target roles: authenticated

Policy definition (USING):
bucket_id = 'shop-images'
```

#### Policy 4: Allow Update (UPDATE)
```
Policy Name: Allow authenticated users to update shop images
Allowed operation: UPDATE
Target roles: authenticated

Policy definition (USING):
bucket_id = 'shop-images'

Policy definition (WITH CHECK):
bucket_id = 'shop-images'
```

---

## 🔍 Why You Need These Policies

### What Are Storage Policies?
Storage policies control who can:
- **INSERT** (upload files)
- **SELECT** (view/download files)
- **DELETE** (remove files)
- **UPDATE** (replace files)

### Why Did Creation Work But Not Upload?
- ✅ **Bucket creation** = Admin action (you have full access in dashboard)
- ❌ **File upload** = User action (needs explicit permission via policies)

Without policies, even authenticated users can't upload!

---

## 📋 What Each Policy Does

### 1. INSERT Policy (Upload)
```sql
CREATE POLICY "Allow authenticated users to upload shop images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-images');
```
- **Who**: Authenticated users (logged in)
- **What**: Can upload files
- **Where**: Only to 'shop-images' bucket

### 2. SELECT Policy (View)
```sql
CREATE POLICY "Allow public read access to shop images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'shop-images');
```
- **Who**: Everyone (public)
- **What**: Can view/download images
- **Why**: So shop logos/banners display in your app

### 3. DELETE Policy (Remove)
```sql
CREATE POLICY "Allow authenticated users to delete shop images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-images');
```
- **Who**: Authenticated users
- **What**: Can delete images
- **When**: When deleting shops

### 4. UPDATE Policy (Replace)
```sql
CREATE POLICY "Allow authenticated users to update shop images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shop-images')
WITH CHECK (bucket_id = 'shop-images');
```
- **Who**: Authenticated users
- **What**: Can replace existing images
- **When**: When updating shop details

---

## 🧪 How to Test

### After Running SQL Script:

1. **Verify Policies Exist**
   ```sql
   SELECT policyname, cmd as operation, roles
   FROM pg_policies
   WHERE schemaname = 'storage' 
   AND tablename = 'objects';
   ```
   Should show 4 policies for shop-images.

2. **Check Bucket is Public**
   ```sql
   SELECT id, name, public FROM storage.buckets;
   ```
   `shop-images` should have `public = true`.

3. **Test Upload in App**
   - Create a new shop with logo and banner
   - Should upload successfully ✅
   - Console should show: "✅ Logo uploaded: [url]"

---

## ⚠️ Common Issues After Running Script

### Issue 1: Still Getting RLS Error
**Check**: Is bucket set to PUBLIC?
```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'shop-images';
```

### Issue 2: Images Upload But Don't Display
**Check**: Do you have SELECT policy for public?
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND cmd = 'SELECT';
```

### Issue 3: Can Upload But Can't Delete
**Check**: Do you have DELETE policy?
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND cmd = 'DELETE';
```

### Issue 4: "Bucket not found" Error
**Check**: Bucket name is EXACTLY 'shop-images' (with hyphen)
```sql
SELECT id FROM storage.buckets WHERE id = 'shop-images';
```

---

## 🔐 Security Best Practices

### Current Setup (Good for Development)
- ✅ Anyone can view images (public SELECT)
- ✅ Only authenticated users can upload
- ✅ Only authenticated users can delete

### Production Setup (More Secure)
Restrict uploads to only shop admins:

```sql
-- Only shop admins can upload images for their shops
CREATE POLICY "Shop admins can upload shop images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' AND
  (storage.foldername(name))[1] IN (
    SELECT shop_id::text FROM shop_staff
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

---

## 🎯 Quick Reference

| Operation | Who Can Do It | Policy Required |
|-----------|---------------|-----------------|
| Upload image | Authenticated users | INSERT policy |
| View image | Everyone (public) | SELECT policy |
| Delete image | Authenticated users | DELETE policy |
| Update image | Authenticated users | UPDATE policy |

---

## ✅ Success Checklist

After running the SQL script:

- [ ] Ran `FIX_STORAGE_POLICIES.sql` in Supabase SQL Editor
- [ ] Saw 4 policies created (INSERT, SELECT, DELETE, UPDATE)
- [ ] Verified bucket is PUBLIC (`public = true`)
- [ ] Tested shop creation with images
- [ ] Images uploaded successfully (no RLS error)
- [ ] Console shows "✅ Logo uploaded: [url]"
- [ ] Images display in app
- [ ] Can delete shop and images

---

## 🆘 Still Having Issues?

### Check Authentication
```sql
-- Run this in SQL Editor
SELECT auth.uid();
```
If it returns `NULL`, you're not authenticated. Try logging out and back in.

### Check User Session
In your app console, check:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user); // Should not be null
```

### Manual Test Upload
1. Go to **Storage** → **shop-images** in Supabase Dashboard
2. Click **"Upload file"**
3. Try uploading any image
4. If this fails, there's a policy issue
5. If this works, there's an issue with your app code

### Check File Size
```sql
SELECT file_size_limit FROM storage.buckets WHERE id = 'shop-images';
```
- `NULL` or `0` = no limit
- If you see a number, make sure your images are smaller

---

## 🎉 After Fix

Once policies are set up:
- ✅ Shop logos upload successfully
- ✅ Shop banners upload successfully
- ✅ Shop cover images upload successfully
- ✅ Images display in app
- ✅ No more RLS policy errors
- ✅ Deletion works properly

**You only need to do this ONCE per bucket!** 🚀
