# ACTUAL CODE FIXES IMPLEMENTED - OTP Flow

## Problem
After OTP verification, app takes users to "What's your name?" screen EVEN if they already exist in database.

## Solution - 2 File Changes

---

## FILE 1: `src/lib/auth.js`

### CHANGE 1: Added helper function (around line 156)

**ADD THIS FUNCTION:**
```javascript
/**
 * Fetch latest profile after auth (used after OTP verification)
 * @param {string} userId - User ID
 * @returns {Promise<object|null>}
 */
const fetchLatestProfile = async (userId) => {
  try {
    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('⚠️ Could not fetch profile:', error.message);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    return null;
  }
};
```

### CHANGE 2: Update `verifyEmailOTP` function (around line 125)

**FIND THIS CODE:**
```javascript
console.log('✅ OTP verified successfully!');
console.log('👤 User ID:', data.user.id);

// Get user profile (might not exist yet for new signups)
console.log('📋 Fetching user profile...');
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user.id)
  .single();

if (profileError) {
  console.log('⚠️ Profile not found (will be created later):', profileError.message);
} else {
  console.log('✅ Profile loaded');
}
```

**REPLACE WITH:**
```javascript
console.log('✅ OTP verified successfully!');
console.log('👤 User ID:', data.user.id);

// Get user profile - Wait for trigger to complete profile linking
console.log('📋 Fetching user profile (waiting for trigger to complete)...');
const profile = await fetchLatestProfile(data.user.id);

if (profile) {
  console.log('✅ Profile loaded');
  console.log('   Name:', profile.name);
  console.log('   Role:', profile.role);
  console.log('   Onboarding completed:', profile.onboarding_completed);
} else {
  console.log('⚠️ Profile not found (will be created during name input)');
}
```

---

## FILE 2: `src/presentation/auth/OTPVerificationScreen.jsx`

### CHANGE: Update profile check logic (around line 73-110)

**FIND THIS CODE:**
```javascript
if (result.success) {
  console.log('✅ OTP verified successfully');
  console.log('📋 Profile data:', result.profile);
  
  // Check if user has completed profile setup
  // User needs both: profile exists AND has name AND onboarding completed
  if (result.profile && result.profile.name && result.profile.onboarding_completed) {
    // Existing user with complete profile → Go to MainScreen
    console.log('→ Existing user with complete profile, going to MainScreen');
    console.log('   Name:', result.profile.name);
    Toast.show({
      type: 'success',
      text1: 'Welcome back!',
      text2: `Hi ${result.profile.name}`,
    });
    navigation.replace('MainScreen');
  } else {
    // New user or incomplete profile → Go to name input (Onboarding)
    console.log('→ New user or incomplete profile, need name input');
    // ... rest of code
  }
}
```

**REPLACE WITH:**
```javascript
if (result.success) {
  console.log('✅ OTP verified successfully');
  console.log('📋 Profile data:', result.profile);
  
  // SIMPLE CHECK: If user exists in database with a name, skip name input screen
  // This works for:
  // 1. Admin-created users (manager/barber/admin) - already have names
  // 2. Returning customers - already completed profile
  // 3. New signups - no profile or no name yet
  const userExistsInDatabase = result.profile && 
                               result.profile.name && 
                               result.profile.name.trim() !== '';
  
  console.log('🔍 User check:');
  console.log('   Profile exists:', !!result.profile);
  console.log('   Has name:', result.profile?.name);
  console.log('   Role:', result.profile?.role);
  console.log('   ✅ User exists in database:', userExistsInDatabase);
  
  if (userExistsInDatabase) {
    // User exists in database with name → Go straight to MainScreen
    console.log('→ User exists in database, going directly to MainScreen');
    
    const roleLabel = result.profile.role === 'admin' || result.profile.role === 'super_admin' ? 'Admin' :
                     result.profile.role === 'manager' ? 'Manager' :
                     result.profile.role === 'barber' ? 'Barber' : '';
    
    Toast.show({
      type: 'success',
      text1: `Welcome back${roleLabel ? ' ' + roleLabel : ''}!`,
      text2: `Hi ${result.profile.name}`,
    });
    navigation.replace('MainScreen');
  } else {
    // User does NOT exist in database → Show name input screen
    console.log('→ User does not exist in database, showing name input screen');
    Toast.show({
      type: 'success',
      text1: 'Verified!',
      text2: "Let's set up your profile",
    });
    navigation.replace('Onboarding', { fromOTP: true });
  }
}
```

---

## HOW IT WORKS NOW

### Flow 1: Existing User (Has Name in Database)
```
1. User enters email → Receives OTP
2. User enters OTP → verifyEmailOTP() called
3. Wait 500ms for database trigger to link profile
4. Fetch profile from database
5. Check: Does user have a name?
   ✅ YES → result.profile.name = "John Doe"
6. userExistsInDatabase = TRUE
7. Navigate to MainScreen (SKIP "What's your name?" screen)
8. Show: "Welcome back! Hi John Doe"
```

### Flow 2: New User (No Name in Database)
```
1. User enters email → Receives OTP
2. User enters OTP → verifyEmailOTP() called
3. Wait 500ms for database trigger
4. Fetch profile from database
5. Check: Does user have a name?
   ❌ NO → result.profile.name = null or ""
6. userExistsInDatabase = FALSE
7. Navigate to Onboarding (SHOW "What's your name?" screen)
8. User enters name → Then go to MainScreen
```

---

## TESTING

### Test Existing User:
```bash
Email: bhavyansh2018@gmail.com
Expected: Skip name screen → Go to MainScreen
Message: "Welcome back Manager! Hi Bhavyansh"
```

### Test New User:
```bash
Email: newuser@test.com
Expected: Show "What's your name?" screen
After entering name → Go to MainScreen
```

---

## ✅ CHANGES ALREADY APPLIED

Both files have been modified with the exact code above.

**To apply these changes:**
1. The code is already in your files
2. Save all files if not saved
3. Restart your app: `npm start` or `expo start`
4. Test the flow

**Status: READY TO TEST** 🚀
