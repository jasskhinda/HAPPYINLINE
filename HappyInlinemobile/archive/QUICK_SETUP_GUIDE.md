# 🚀 Quick Setup Guide - Create Shop Implementation

## ⚡ Step 1: Install Required Package

```bash
npm install base64-arraybuffer
```

---

## 🗄️ Step 2: Run Database Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `DATABASE_MIGRATIONS.sql`
3. Click "Run" to execute

**What it does:**
- Adds `banner_image_url` column to shops table
- Adds `image_url` and `icon_url` columns to services table
- Creates `shop_invitations` table with functions
- Adds RLS policies for invitations

---

## 📦 Step 3: Create Supabase Storage Bucket

### Option A: Using Supabase Dashboard UI
1. Go to Supabase Dashboard → Storage
2. Click "Create bucket"
3. Name: `shop-images`
4. Set as **Public bucket**
5. Click "Create bucket"

### Option B: Using SQL
```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true);
```

---

## 🔐 Step 4: Add Storage RLS Policies

Run these policies in SQL Editor:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Users can upload shop images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-images');

-- Allow authenticated users to update their shop images
CREATE POLICY "Users can update shop images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'shop-images');

-- Allow authenticated users to delete their shop images
CREATE POLICY "Users can delete shop images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'shop-images');

-- Allow public read access
CREATE POLICY "Public read access for shop images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'shop-images');
```

---

## ✅ Step 5: Verify Setup

### Test Database Columns
```sql
-- Check shops table has new column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shops' 
AND column_name = 'banner_image_url';

-- Check services table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name IN ('image_url', 'icon_url');

-- Check shop_invitations table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'shop_invitations';
```

### Test Storage Bucket
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE name = 'shop-images';
```

---

## 🧪 Step 6: Test the App

1. **Start the app**: `npm start` or `expo start`
2. **Navigate to Create Shop screen**
3. **Test logo upload**:
   - Tap "Add Logo" section
   - Select an image
   - Verify preview shows
4. **Test banner upload**:
   - Tap "Add Banner Photo" section
   - Select an image
   - Verify preview shows
5. **Test validation**:
   - Try submitting without logo → Should show error
   - Try submitting without banner → Should show error
   - Try submitting without state → Should show error
6. **Test complete flow**:
   - Fill all required fields
   - Add logo, banner (cover optional)
   - Add manager, barber, service
   - Submit form
   - Verify shop is created
   - Check Supabase Storage for uploaded images

---

## 📱 Testing Checklist

### Form Fields
- [ ] Shop Name (required)
- [ ] Description (optional)
- [ ] Address (required)
- [ ] City (required)
- [ ] State (required) - NEW ✨
- [ ] Zip Code (required) - NEW ✨
- [ ] Country (optional, defaults to USA) - NEW ✨
- [ ] Phone (required)
- [ ] Email (optional)

### Images
- [ ] Logo Image (required) - NEW ✨
- [ ] Banner Image (required) - NEW ✨
- [ ] Cover Image (optional) - NEW ✨

### Staff & Services
- [ ] At least 1 Manager (required)
- [ ] At least 1 Barber (required)
- [ ] At least 1 Service (required)

### Validation
- [ ] Required fields show error when empty
- [ ] Required images show error when missing
- [ ] Email validation works
- [ ] Numeric zip code accepts numbers only

### Database
- [ ] Shop record created in shops table
- [ ] Logo URL saved in logo_url column
- [ ] Banner URL saved in banner_image_url column
- [ ] Cover URL saved in cover_image_url column (if uploaded)
- [ ] State, Zip Code, Country values saved

### Storage
- [ ] Images uploaded to shop-images bucket
- [ ] Files organized in {shopId}/ folder
- [ ] Public URLs generated correctly
- [ ] Images viewable in Supabase Storage dashboard

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'base64-arraybuffer'"
**Solution**: Run `npm install base64-arraybuffer`

### Issue: "Storage bucket not found"
**Solution**: Create the `shop-images` bucket in Supabase Storage

### Issue: "Permission denied when uploading"
**Solution**: Add the storage RLS policies from Step 4

### Issue: "Column banner_image_url does not exist"
**Solution**: Run the DATABASE_MIGRATIONS.sql file

### Issue: Images not uploading
**Solution**: 
1. Check internet connection
2. Verify storage bucket is public
3. Check console logs for error messages
4. Verify RLS policies are applied

### Issue: Image preview not showing
**Solution**:
1. Check if `expo-image-picker` permissions are granted
2. Verify image URI is valid
3. Check console for ImagePicker errors

---

## 🎯 Success Criteria

You'll know everything is working when:
1. ✅ All three image pickers show and work
2. ✅ Images preview correctly after selection
3. ✅ Validation shows errors for missing required images
4. ✅ Shop creates successfully with all data
5. ✅ Images appear in Supabase Storage dashboard
6. ✅ Shop record has all image URLs and address fields
7. ✅ No console errors during creation process

---

## 📞 Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Verify all steps above were completed
3. Check `CREATE_SHOP_UI_IMPLEMENTATION_COMPLETE.md` for detailed documentation
4. Review `DATABASE_MIGRATIONS.sql` for required schema changes

---

## 🎉 You're Ready!

Once all steps are complete, you can:
- Create shops with professional logo, banner, and cover images
- Store complete address information with state and zip code
- Upload images directly to Supabase Storage
- View uploaded images in shop details
- Manage shop staff and services

**Next Steps:**
- Implement the invitation system (documented in COMPLETE_IMPLEMENTATION_PLAN.md)
- Add service image uploads
- Update ShopDetailsScreen to display banner separately
