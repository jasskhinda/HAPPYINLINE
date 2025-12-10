# App Flow - Correct & Clear ✅

## Fixed Flow Overview

```
FIRST TIME USER:
App Start → Onboarding Slides → Login Screen → OTP Screen → Name Input → Home

RETURNING USER (No Profile):
App Start → Login Screen → OTP Screen → Name Input → Home

RETURNING USER (With Profile):
App Start → Login Screen → OTP Screen → Home (Direct)

LOGGED IN USER:
App Start → Home (Direct)
```

## Detailed Flow with Code Logic

### 1️⃣ App Start (Main.jsx)

```javascript
getInitialRouteName() {
  // First time user (never seen app before)
  if (!isAuthenticated && isFirstLaunch) {
    return 'Onboarding'; // Shows intro slides
  }
  
  // Returning user not logged in
  if (!isAuthenticated && !isFirstLaunch) {
    return 'EmailAuthScreen'; // Skip to login
  }
  
  // Logged in but no profile (shouldn't happen, but safe)
  if (isAuthenticated && !onboardingComplete) {
    return 'Onboarding'; // Show name input
  }
  
  // Logged in with complete profile
  return 'MainScreen'; // Go to app
}
```

**Console Output:**
```
🎯 Determining initial route...
   isFirstLaunch: true/false
   isAuthenticated: true/false
   onboardingComplete: true/false
→ Route: Onboarding/EmailAuthScreen/MainScreen
```

### 2️⃣ Onboarding Screen (Two Modes)

#### Mode A: Intro Slides (Not Authenticated)
- Shows 3 welcome slides
- "Skip" or "Get Started" → EmailAuthScreen
- Marks `has_seen_onboarding = true`

```javascript
useEffect(() => {
  if (!authState.isAuthenticated) {
    setShowSlides(true); // Show intro
  }
});

handleFinish() {
  await AsyncStorage.setItem('has_seen_onboarding', 'true');
  navigation.replace('EmailAuthScreen');
}
```

#### Mode B: Name Input (Authenticated, Coming from OTP)
- Shows "What's your name?" screen only
- Validates name → Creates profile → MainScreen

```javascript
useEffect(() => {
  if (authState.isAuthenticated) {
    setShowNameInput(true); // Show name form
  }
});

handleCompleteOnboarding() {
  await setupUserProfile(name, 'customer');
  await markOnboardingComplete();
  navigation.replace('MainScreen');
}
```

### 3️⃣ Email Auth Screen

- User enters email
- Sends OTP via Supabase
- Navigates to OTPVerificationScreen with email param

```javascript
handleSendOTP(email) {
  await signInWithEmail(email); // or signUpWithEmail
  navigation.navigate('OTPVerificationScreen', { email, isSignup });
}
```

### 4️⃣ OTP Verification Screen (KEY DECISION POINT)

**After OTP verified, check profile:**

```javascript
const result = await verifyEmailOTP(email, otpCode);

if (result.success) {
  // Check if user has completed profile
  if (result.profile && result.profile.onboarding_completed) {
    // EXISTING USER → Direct to MainScreen
    console.log('→ Existing user, going to MainScreen');
    navigation.replace('MainScreen');
  } else {
    // NEW USER → Need to set up profile
    console.log('→ New user, need to complete profile');
    navigation.replace('Onboarding'); // Name input mode
  }
}
```

**Console Output:**
```
✅ OTP verified successfully
📋 Profile data: { name: "John", onboarding_completed: true, ... }
→ Existing user, going to MainScreen
```

OR

```
✅ OTP verified successfully
📋 Profile data: null
→ New user, need to complete profile
```

### 5️⃣ Main Screen

- Protected route
- Only accessible if authenticated + profile complete
- Shows bottom tab navigation

## Flow Examples

### Example 1: Brand New User
```
1. Open app
   → Main.jsx: isFirstLaunch=true, isAuthenticated=false
   → Shows: Onboarding (intro slides)

2. Click "Get Started"
   → Marks has_seen_onboarding=true
   → Shows: EmailAuthScreen

3. Enter email "john@example.com"
   → Sends OTP
   → Shows: OTPVerificationScreen

4. Enter OTP "123456"
   → verifyEmailOTP returns: { profile: null }
   → Shows: Onboarding (name input mode)

5. Enter name "John Doe"
   → Creates profile in database
   → Shows: MainScreen ✅
```

### Example 2: Returning User (Seen Intro Before)
```
1. Open app
   → Main.jsx: isFirstLaunch=false, isAuthenticated=false
   → Shows: EmailAuthScreen (skip intro)

2. Enter email "jane@example.com"
   → Sends OTP
   → Shows: OTPVerificationScreen

3. Enter OTP "654321"
   → verifyEmailOTP returns: { profile: { name: "Jane", onboarding_completed: true } }
   → Shows: MainScreen directly ✅ (skip name input)
```

### Example 3: Already Logged In User
```
1. Open app
   → Main.jsx: isAuthenticated=true, onboardingComplete=true
   → Shows: MainScreen directly ✅
```

### Example 4: Ghost Session (Profile Deleted)
```
1. Open app
   → Main.jsx: session exists but profile missing
   → checkAuthState: Clears session
   → isAuthenticated=false
   → Shows: EmailAuthScreen
   → Toast: "Session Expired. Please login again"
```

## Key Changes Made

### 1. OTPVerificationScreen.jsx
**Before:**
```javascript
if (result.success) {
  navigation.replace('Onboarding'); // Always!
}
```

**After:**
```javascript
if (result.success) {
  if (result.profile && result.profile.onboarding_completed) {
    navigation.replace('MainScreen'); // Existing user
  } else {
    navigation.replace('Onboarding'); // New user
  }
}
```

### 2. Onboarding.jsx
**Before:**
- Always showed slides first

**After:**
- If authenticated → Show name input only
- If not authenticated → Show slides

### 3. Main.jsx
**Before:**
- Confusing routing logic

**After:**
- Clear console logs
- Explicit routing based on state

## Console Log Reference

### Good Flow (New User)
```
🔄 Checking initial auth state...
👀 First launch: true
❌ User not authenticated
🎯 Determining initial route...
→ Route: Onboarding (intro slides)
---
[User clicks Get Started]
→ Navigates to EmailAuthScreen
---
[User enters OTP]
✅ OTP verified successfully
📋 Profile data: null
→ New user, need to complete profile
→ Navigates to Onboarding (name input)
---
[User enters name]
💾 Setting up user profile with name: John
✅ Profile setup successful
→ Navigates to MainScreen
```

### Good Flow (Existing User)
```
🔄 Checking initial auth state...
👀 First launch: false
❌ User not authenticated
🎯 Determining initial route...
→ Route: EmailAuthScreen (login)
---
[User enters OTP]
✅ OTP verified successfully
📋 Profile data: { name: "Jane", onboarding_completed: true }
→ Existing user, going to MainScreen
→ Navigates to MainScreen directly ✅
```

## Files Modified

1. `src/presentation/auth/OTPVerificationScreen.jsx` - Smart routing after OTP
2. `src/presentation/onboarding/Onboarding.jsx` - Two modes (slides vs name)
3. `src/Main.jsx` - Clear routing logic with logs

## Test Checklist

- [ ] Fresh install → Shows onboarding slides
- [ ] Click "Get Started" → Goes to login
- [ ] New email + OTP → Goes to name input (not slides again!)
- [ ] Enter name → Goes to MainScreen
- [ ] Logout and login again → Goes directly to MainScreen (skips name)
- [ ] Second install (reinstall app) → Goes to login (skips intro slides)

**Result**: Clear, logical flow that makes sense! 🎉
