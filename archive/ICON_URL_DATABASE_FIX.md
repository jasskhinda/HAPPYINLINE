# Icon URL Not Saving to Database - FIXED

## Problem
Image was successfully uploading to Supabase Storage, but the `icon_url` field in the `services` table remained NULL.

## Root Cause
The `createShopService()` function in `shopAuth.js` had **hardcoded fields** and was NOT including `icon_url` or `image_url` in the database insert statement.

### Before (Broken Code):
```javascript
.insert({
  shop_id: shopId,
  name: serviceData.name,
  description: serviceData.description,
  price: serviceData.price,
  duration: serviceData.duration,
  category: serviceData.category,
  is_active: true  // ❌ Hardcoded, ignoring icon_url!
})
```

## Solution
Added `icon_url` and `image_url` fields to the insert statement:

### After (Fixed Code):
```javascript
.insert({
  shop_id: shopId,
  name: serviceData.name,
  description: serviceData.description,
  price: serviceData.price,
  duration: serviceData.duration,
  category: serviceData.category,
  icon_url: serviceData.icon_url || null,      // ✅ Now included
  image_url: serviceData.image_url || null,    // ✅ Now included
  is_active: serviceData.is_active !== undefined ? serviceData.is_active : true
})
```

## What Was Changed
**File:** `src/lib/shopAuth.js`
**Function:** `createShopService()`

Changes:
1. ✅ Added `icon_url: serviceData.icon_url || null`
2. ✅ Added `image_url: serviceData.image_url || null`
3. ✅ Changed `is_active` from hardcoded `true` to use `serviceData.is_active`

## Testing Steps

1. **Delete any test services** with NULL icon_url
2. **Create a new service** with an image:
   - Open Service Management
   - Tap "Add New Service"
   - Pick an image
   - Wait for "Image uploaded successfully"
   - Fill in all fields
   - Tap "Create Service"
3. **Check database:**
   - Go to Supabase Dashboard → Table Editor → services
   - Find the new service
   - ✅ `icon_url` should now have the Supabase Storage URL
   - Should look like: `https://...supabase.co/storage/v1/object/public/service-icons/shop_xxx/1760781103716.png`

## Complete Flow Now Working

1. ✅ User picks image
2. ✅ Image uploads to Supabase Storage
3. ✅ Public URL returned
4. ✅ URL stored in `formData.icon_url`
5. ✅ `serviceData` passed to `createShopService()`
6. ✅ **icon_url saved to database** ← This was broken, now fixed!
7. ✅ Service displays with icon

## Files Modified
- `src/lib/shopAuth.js` - Fixed `createShopService()` function

## Notes
- The `updateShopService()` function was already correct (uses generic `updates` object)
- Both `icon_url` and `image_url` are nullable - only one is required
- Default value is `null` if not provided
