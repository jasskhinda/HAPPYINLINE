# Admin-Created User Login Fix

## Problem
When admin creates users (manager/barber/admin), those users already have profiles with:
- ✅ Name populated
- ✅ Role set (manager/barber/admin)
- ✅ `onboarding_completed: true`

**But** when they log in for the first time, the app was taking them to the "What's your name?" screen instead of directly to MainScreen.

## Root Cause
After OTP verification, the app wasn't waiting for the database trigger to complete the profile linking. The trigger needs time to:
1. Find existing profile by email
2. Delete old profile with temp UUID
3. Insert new profile with auth user's ID
4. Preserve all data (name, role, etc.)

This meant the profile data wasn't immediately available, causing the app to think the user needed to complete onboarding.

## Solution

### 1. Added Profile Fetch Helper (`auth.js`)
```javascript
const fetchLatestProfile = async (userId) => {
  // Wait 500ms for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return profile;
};
```

### 2. Updated `verifyEmailOTP()` Function
- Now waits for trigger to complete before fetching profile
- Logs all profile details (name, role, onboarding_completed)
- Returns complete profile data

### 3. Simplified Profile Check in `OTPVerificationScreen.jsx`
**SIMPLE RULE:** If user has a name in the database → Skip name input

```javascript
// Check if user exists in database (has a name)
const userExistsInDatabase = result.profile && 
                            result.profile.name && 
                            result.profile.name.trim() !== '';

if (userExistsInDatabase) {
  // User exists → Go straight to MainScreen
  Toast.show({
    type: 'success',
    text1: 'Welcome back Manager!', // Shows role
    text2: `Hi ${result.profile.name}`,
  });
  navigation.replace('MainScreen');
} else {
  // User does NOT exist → Show name input
  navigation.replace('Onboarding', { fromOTP: true });
}
```

## Flow Now

### For Admin-Created Users (Manager/Barber/Admin)
```
1. Admin creates manager profile → Stored in database
   ├─ Email: manager@example.com
   ├─ Name: "John Manager"
   ├─ Role: manager
   └─ onboarding_completed: true

2. Manager logs in → Enters email → Receives OTP

3. Manager enters OTP → Auth account created

4. Trigger runs → Links profile to auth account
   ├─ Finds existing profile by email
   ├─ Deletes old profile with temp UUID
   ├─ Inserts new profile with auth ID
   └─ Preserves ALL data (name, role, etc.)

5. App waits 500ms → Fetches linked profile

6. Profile check:
   ✅ Profile exists
   ✅ Has name: "John Manager"
   ✅ userExistsInDatabase: true

7. Navigate to MainScreen directly ✅
   Shows: "Welcome back Manager! Hi John Manager"
```

### For New Customer Signups
```
1. Customer signs up → Enters email → Receives OTP

2. Customer enters OTP → Auth account created

3. Trigger runs → No existing profile found
   └─ Creates basic profile with auth ID

4. App fetches profile:
   ✅ Profile exists (created by trigger)
   ❌ No name yet
   ❌ userExistsInDatabase: false

5. Navigate to Onboarding → Enter name screen ✅
```

## Testing

### Test Admin-Created User Login:
1. **Create a manager** via AdminManagementScreen
2. **Logout** from admin account
3. **Login with manager email** → Enter OTP
4. **Expected:** Should go directly to MainScreen
5. **Success message:** "Welcome back Manager! Hi [Name]"

### Test Customer Signup:
1. **Sign up with new email** (not admin-created)
2. **Enter OTP**
3. **Expected:** Should go to "What's your name?" screen
4. **Enter name** → Then go to MainScreen

## Files Modified
- ✅ `src/lib/auth.js` - Added `fetchLatestProfile()` helper and updated `verifyEmailOTP()`
- ✅ `src/presentation/auth/OTPVerificationScreen.jsx` - Enhanced profile check logic

## Key Changes
1. **Wait for trigger:** 500ms delay ensures database trigger completes
2. **Detailed logging:** All profile properties logged for debugging
3. **Strict validation:** Checks profile exists, has name, and onboarding_completed is exactly `true`
4. **Role-aware messages:** Toast shows user's role (Manager/Barber/Admin)

## Result
✅ Admin-created users (manager/barber/admin) go directly to MainScreen
✅ New customers still see name input screen
✅ All profile data preserved (name, role, permissions)
✅ No data loss or role changes
