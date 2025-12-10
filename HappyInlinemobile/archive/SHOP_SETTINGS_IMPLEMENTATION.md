# Shop Settings Screen Implementation

## Overview
Implemented a comprehensive Shop Settings screen that allows **admin-only** users to edit all shop details, upload images, and delete the shop. The delete functionality has been moved from ShopDetailsScreen to this dedicated settings screen.

## Changes Made

### 1. **New Screen Created: ShopSettingsScreen.jsx**
Location: `src/presentation/main/bottomBar/home/ShopSettingsScreen.jsx`

#### Features:
- ✅ **Admin-Only Access** - Only users with 'admin' role can access
- ✅ **Shop Images Management**
  - Upload/Change Logo (1:1 aspect ratio)
  - Upload/Change Cover Image (16:9 aspect ratio)
  - Preview uploaded images
  - Loading indicators during upload
  
- ✅ **Basic Information Editing**
  - Shop Name (required)
  - Description (optional, max 200 characters with counter)
  
- ✅ **Location Details**
  - Full Address (required)
  - City (required)
  - State (required)
  - Zip Code (required)
  - Country (optional, defaults to USA)
  
- ✅ **Contact Information**
  - Phone Number (required)
  - Email (optional, validated)
  
- ✅ **Operating Hours**
  - Select operating days (Monday-Sunday)
  - Set opening time
  - Set closing time
  - Uses existing OperatingHoursSelector component
  
- ✅ **Danger Zone**
  - Delete Shop button (red with warning)
  - Confirmation dialog
  - Deletes all related data (staff, services, bookings, reviews)
  - Navigates to ShopSelectionScreen after deletion

#### Validation:
- Required field checking
- Email format validation
- Operating days selection requirement
- Operating hours requirement
- Real-time error display

### 2. **Updated ShopDetailsScreen.jsx**

#### Changes:
- **Replaced** trash/delete icon with settings icon
- Settings icon only visible to **admin** users
- Settings icon navigates to ShopSettingsScreen
- **Removed** handleDeleteShop function (moved to ShopSettingsScreen)
- Updated styles (deleteButton → settingsButton)

#### Code Changes:
```jsx
// BEFORE:
{userRole === 'admin' && (
  <TouchableOpacity onPress={handleDeleteShop}>
    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
  </TouchableOpacity>
)}

// AFTER:
{userRole === 'admin' && (
  <TouchableOpacity onPress={() => navigation.navigate('ShopSettingsScreen', { shopId })}>
    <Ionicons name="settings-outline" size={24} color="#007AFF" />
  </TouchableOpacity>
)}
```

### 3. **New Functions in shopAuth.js**

#### `updateShopDetails(shopId, updateData)`
- Updates shop information in database
- Verifies user is admin before allowing update
- Returns success/error status
- Supports all shop fields

#### `uploadShopImage(shopId, uri, type)`
- Uploads images to Supabase Storage
- Parameters:
  - `shopId`: Shop ID
  - `uri`: Local image URI from ImagePicker
  - `type`: 'logo' or 'cover'
- Creates folder structure: `shop_images/shop_{shopId}/`
- Automatically updates shop record with new URL
- Returns public URL of uploaded image

### 4. **Navigation Registration**

#### Updated Files:
- **Main.jsx**: Added ShopSettingsScreen import and route
- **MainMultiShop.jsx**: Added ShopSettingsScreen import and route

#### Routes Added:
```jsx
<RootStack.Screen name="ShopSettingsScreen" component={ShopSettingsScreen}/>
```

## User Flow

### Admin User:
1. Views shop in **ShopDetailsScreen**
2. Sees **settings icon** in header (top right)
3. Taps settings icon
4. Navigates to **ShopSettingsScreen**
5. Can edit any shop detail
6. Can upload/change logo and cover image
7. Can modify operating hours
8. Can delete shop (in Danger Zone)
9. Taps "Save Changes" to update
10. Returns to ShopDetailsScreen with updated data

### Non-Admin Users:
- **Do NOT see** settings icon in ShopDetailsScreen
- **Cannot access** ShopSettingsScreen
- Can only view shop details

## Permissions Model

### What Admin Can Do:
✅ Edit all shop details (name, description, address, etc.)
✅ Upload/change shop logo
✅ Upload/change shop cover image
✅ Modify operating hours
✅ Delete shop
✅ Manage all staff (via StaffManagementScreen)
✅ Manage services (via ServiceManagementScreen)

### What Managers Can Do:
❌ Cannot edit shop details
❌ Cannot upload shop images
❌ Cannot delete shop
✅ Can manage barbers (via StaffManagementScreen)
✅ Can manage services (via ServiceManagementScreen)

### What Barbers/Customers Can Do:
❌ Cannot edit shop
❌ Cannot manage staff
❌ Cannot delete shop
✅ Can view shop details

## Image Upload Details

### Storage Structure:
```
shop-images/
  └── shop_{shopId}/
      ├── {timestamp}.jpg (logo)
      ├── {timestamp}.jpg (cover)
      └── ... (other images)
```

### Supported Features:
- Image cropping (1:1 for logo, 16:9 for cover)
- Quality optimization (0.8)
- Automatic public URL generation
- Database auto-update with new URL
- Loading states during upload

### Required Permissions:
- Camera roll access (requested on first use)
- Uses expo-image-picker library

## Database Changes

### Updated Fields:
All existing shop fields can be updated:
- `name`
- `description`
- `address`
- `city`
- `state`
- `zip_code`
- `country`
- `phone`
- `email`
- `logo_url`
- `cover_image_url`
- `operating_days`
- `opening_time`
- `closing_time`

### No Schema Changes Required:
All fields already exist in the `shops` table.

## UI/UX Features

### Form Features:
- Scrollable content with fixed header and footer
- Character counter for description (200 max)
- Real-time validation with error messages
- Placeholder text with proper visibility (#999 color)
- Loading states for all async operations
- Success/error alerts

### Image Upload UX:
- Dashed border placeholders
- Image preview after upload
- Loading spinner during upload
- Success confirmation
- Error handling with user-friendly messages

### Danger Zone:
- Visually separated (red theme)
- Clear warning message
- Double confirmation (alert dialog)
- Cannot be undone warning

## Testing Checklist

### Basic Functionality:
- ✅ Admin can see settings icon
- ✅ Non-admin cannot see settings icon
- ✅ Navigation to ShopSettingsScreen works
- ✅ Shop data loads correctly
- ✅ All fields populate with existing data

### Image Upload:
- ✅ Logo upload works
- ✅ Cover image upload works
- ✅ Image preview displays
- ✅ Loading states show during upload
- ✅ Database updates with new URLs

### Form Validation:
- ✅ Required fields show errors when empty
- ✅ Email validation works
- ✅ Operating days validation works
- ✅ Form cannot submit with errors

### Save Functionality:
- ✅ Save button works
- ✅ Loading state shows during save
- ✅ Success alert displays
- ✅ Navigation back to ShopDetailsScreen
- ✅ Changes reflect immediately

### Delete Functionality:
- ✅ Delete button shows in Danger Zone
- ✅ Confirmation dialog appears
- ✅ Cancel works (returns to settings)
- ✅ Delete confirms and executes
- ✅ Success alert shows
- ✅ Navigates to ShopSelectionScreen
- ✅ Shop is actually deleted from database

## Files Modified

1. **New File**: `src/presentation/main/bottomBar/home/ShopSettingsScreen.jsx`
2. **Modified**: `src/presentation/main/bottomBar/home/ShopDetailsScreen.jsx`
3. **Modified**: `src/lib/shopAuth.js`
4. **Modified**: `src/Main.jsx`
5. **Modified**: `src/MainMultiShop.jsx`

## Dependencies Used

- `expo-image-picker` - For image selection
- `react-native-safe-area-context` - For safe area handling
- `@expo/vector-icons` - For icons
- Supabase Storage - For image hosting
- Existing OperatingHoursSelector component

## Future Enhancements (Optional)

- [ ] Image compression before upload
- [ ] Crop/rotate image before upload
- [ ] Multiple image upload for gallery
- [ ] Business hours exception dates (holidays)
- [ ] Shop verification status management
- [ ] Analytics/statistics view
- [ ] Shop category/tags management
- [ ] Social media links
- [ ] Shop amenities/features checklist

## Notes

- All permissions are UI-only (no RLS changes needed)
- Image uploads create new files (no deletion of old images)
- Shop deletion cascades to all related records
- Operating hours use existing OperatingHoursSelector component
- No new database migrations required
- Compatible with both Main.jsx and MainMultiShop.jsx navigation

## Success Criteria

✅ Admin-only access to settings
✅ All shop details editable
✅ Image upload working for logo and cover
✅ Operating hours fully editable
✅ Delete functionality moved from ShopDetailsScreen
✅ Full validation on all fields
✅ Proper error handling
✅ Loading states on all async operations
✅ Navigation properly registered
✅ No TypeScript/JavaScript errors
✅ Consistent UI with rest of app
