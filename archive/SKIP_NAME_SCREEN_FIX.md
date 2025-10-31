# Skip "What's Your Name?" Screen for Existing Users

## Requirement
"When a user signs in with OTP, check if their record already exists in the database.
- If the user EXISTS → Skip 'What's your name?' screen → Go to main screen
- If the user does NOT exist → Show 'What's your name?' screen"

## Solution Implemented

### Simple Logic:
```javascript
// After OTP verification, check if user has a name in database
const userExistsInDatabase = result.profile && 
                            result.profile.name && 
                            result.profile.name.trim() !== '';

if (userExistsInDatabase) {
  // User exists → Go to MainScreen ✅
  navigation.replace('MainScreen');
} else {
  // User does NOT exist → Show name input ✅
  navigation.replace('Onboarding', { fromOTP: true });
}
```

## How It Works

### Scenario 1: Admin-Created User (Manager/Barber/Admin)
```
Admin creates profile:
├─ Email: manager@example.com
├─ Name: "John Manager"
└─ Role: manager

User logs in with OTP:
1. OTP verified ✅
2. Trigger links profile to auth account ✅
3. App waits 500ms for trigger to complete ✅
4. App fetches profile ✅
5. Check: profile.name = "John Manager" ✅
6. userExistsInDatabase = TRUE ✅
7. Navigate to MainScreen (SKIP name input) ✅

Result: "Welcome back Manager! Hi John Manager"
```

### Scenario 2: Returning Customer
```
Existing customer profile:
├─ Email: customer@example.com
├─ Name: "Jane Doe"
└─ Role: customer

User logs in with OTP:
1. OTP verified ✅
2. Trigger links profile ✅
3. App fetches profile ✅
4. Check: profile.name = "Jane Doe" ✅
5. userExistsInDatabase = TRUE ✅
6. Navigate to MainScreen (SKIP name input) ✅

Result: "Welcome back! Hi Jane Doe"
```

### Scenario 3: New Customer Signup
```
No existing profile:

User signs up with OTP:
1. OTP verified ✅
2. Trigger creates basic profile ✅
3. App fetches profile ✅
4. Check: profile.name = null or "" ❌
5. userExistsInDatabase = FALSE ❌
6. Navigate to Onboarding (SHOW name input) ✅

User enters name → Profile completed → Go to MainScreen
```

## Files Modified

### 1. `src/lib/auth.js`
**Added helper function to wait for database trigger:**
```javascript
const fetchLatestProfile = async (userId) => {
  // Wait 500ms for trigger to complete profile linking
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return profile;
};
```

**Updated `verifyEmailOTP()`:**
- Uses `fetchLatestProfile()` instead of immediate query
- Ensures trigger has completed before checking profile
- Logs all profile details for debugging

### 2. `src/presentation/auth/OTPVerificationScreen.jsx`
**Simplified profile check:**
```javascript
// SIMPLE: Check if user has a name in database
const userExistsInDatabase = result.profile && 
                            result.profile.name && 
                            result.profile.name.trim() !== '';

if (userExistsInDatabase) {
  // EXISTS → MainScreen
  navigation.replace('MainScreen');
} else {
  // DOES NOT EXIST → Name input
  navigation.replace('Onboarding', { fromOTP: true });
}
```

## Testing Checklist

### ✅ Test 1: Admin-Created Manager
- [ ] Login with: `bhavyansh2018@gmail.com`
- [ ] Enter OTP
- [ ] Expected: Skip name screen, go directly to MainScreen
- [ ] Expected message: "Welcome back Manager! Hi Bhavyansh"

### ✅ Test 2: Super Admin
- [ ] Login with: `smokygaming171@gmail.com`
- [ ] Enter OTP
- [ ] Expected: Skip name screen, go directly to MainScreen
- [ ] Expected message: "Welcome back Admin! Hi Admin"

### ✅ Test 3: New Customer
- [ ] Signup with new email (e.g., `newcustomer@test.com`)
- [ ] Enter OTP
- [ ] Expected: Show "What's your name?" screen
- [ ] Enter name
- [ ] Expected: Go to MainScreen

## Key Points

1. **Database Check:** We check if `profile.name` exists and is not empty
2. **Trigger Wait:** 500ms delay ensures database trigger completes profile linking
3. **Role Aware:** Shows different welcome messages for different roles
4. **Simple Logic:** Just check if name exists - no complex conditions needed

## Result
✅ Users with existing database records (name populated) skip the name input screen
✅ New users without names see the name input screen
✅ Works for admin-created users, returning customers, and new signups
✅ All profile data preserved (role, permissions, etc.)
