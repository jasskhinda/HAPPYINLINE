# Edit Profile Error Fix

## Problem
Edit Profile screen was crashing with error:
```
Error saving profile:
{"code":"PGRST204","details":null,"hint":null,"message":"Could not find the 'address' column of 'profiles' in the schema cache"}
```

## Root Cause
The EditProfileScreen was trying to save `address` and `date_of_birth` columns that don't exist in the profiles table.

**Profiles table only has:**
- `id`
- `name`
- `email`
- `phone`
- `role`
- `created_at`
- `updated_at`
- `onboarding_completed`
- `is_super_admin`
- `profile_image` (maybe)

**EditProfileScreen was trying to save:**
- ❌ `address` (doesn't exist)
- ❌ `date_of_birth` (doesn't exist)

## Solution

### File Changed: [EditProfileScreen.jsx](src/presentation/main/bottomBar/profile/screens/EditProfileScreen.jsx)

**Changes made:**

1. **Removed address and dateOfBirth from state** (Line 22-26):
```javascript
// Before
const [profileData, setProfileData] = useState({
  name: '',
  email: '',
  phone: '',
  address: '',        // ❌ Removed
  dateOfBirth: '',   // ❌ Removed
});

// After
const [profileData, setProfileData] = useState({
  name: '',
  email: '',
  phone: '',
});
```

2. **Removed from fetch** (Line 56-60):
```javascript
// Before
setProfileData({
  name: profile.name || '',
  email: profile.email || user.email || '',
  phone: profile.phone || '',
  address: profile.address || '',        // ❌ Removed
  dateOfBirth: profile.date_of_birth || '', // ❌ Removed
});

// After
setProfileData({
  name: profile.name || '',
  email: profile.email || user.email || '',
  phone: profile.phone || '',
});
```

3. **Removed from save** (Line 91-98):
```javascript
// Before
const { error } = await supabase
  .from('profiles')
  .update({
    name: profileData.name.trim(),
    phone: profileData.phone.trim(),
    address: profileData.address.trim(),     // ❌ Removed
    date_of_birth: profileData.dateOfBirth,  // ❌ Removed
    updated_at: new Date().toISOString(),
  })
  .eq('id', userId);

// After
const { error } = await supabase
  .from('profiles')
  .update({
    name: profileData.name.trim(),
    phone: profileData.phone.trim(),
    updated_at: new Date().toISOString(),
  })
  .eq('id', userId);
```

4. **Removed UI fields** (Lines 211-238):
   - Removed "Address" input field
   - Removed "Date of Birth" input field

## What the Edit Profile Screen Now Has

### Editable Fields:
- ✅ **Full Name** - Can edit
- ✅ **Phone Number** - Can edit

### Read-Only Fields:
- 🔒 **Email Address** - Cannot edit (grayed out with helper text)

### Coming Soon:
- 📷 Profile Picture (shows logo, tap to change - shows alert)

## Testing

1. Go to Profile screen
2. Tap "Edit Profile"
3. Should load without errors
4. Edit your name and phone
5. Tap "Save Changes"
6. Should see "Success" alert (no database errors)

## Status
✅ **FIXED** - Edit Profile now works without database errors

## Future Enhancement (Optional)

If you want address and date of birth in the future, you'll need to:

1. Add columns to profiles table:
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE;
```

2. Update RLS policies if needed

3. Then you can add those fields back to EditProfileScreen
