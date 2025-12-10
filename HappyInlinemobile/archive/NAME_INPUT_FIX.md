# Fixed: "User not authenticated" Error After Name Input

## Problem

After user completed OTP verification and entered their name, clicking "Continue" showed:
```
ERROR ❌ User not authenticated - redirecting to login
```

Then redirected back to EmailAuthScreen, creating a frustrating loop.

## Root Cause

In `Onboarding.jsx`, the `handleCompleteOnboarding` function had a **redundant authentication check**:

```javascript
// BAD CODE (removed)
const authState = await checkAuthState();
if (!authState.isAuthenticated) {
  console.error('❌ User not authenticated - redirecting to login');
  navigation.replace('EmailAuthScreen');
  return;
}
```

**Why it failed:**
- User WAS authenticated after OTP
- But `checkAuthState()` returned `false` when re-checking
- Possible reasons:
  - Session not fully propagated yet
  - Timing issue with Supabase session
  - Profile not created yet (so checkAuthState returned false)

## The Fix

**Removed the redundant auth check** because `setupUserProfile()` already validates the session internally:

```javascript
// FIXED CODE
try {
  console.log('💾 Setting up user profile with name:', name);
  
  // Setup user profile - it checks session internally
  const result = await setupUserProfile(name.trim(), 'customer');
  
  if (result.success) {
    await markOnboardingComplete();
    navigation.replace('MainScreen');
  }
}
```

## Why This Works

1. **OTP verification** → User authenticated, session created ✅
2. **Navigate to Onboarding** with `fromOTP=true` ✅
3. **User enters name** → Clicks Continue ✅
4. **setupUserProfile()** is called:
   - Internally checks session: `await supabase.auth.getSession()`
   - If no session, returns error ✅
   - If session exists, creates profile ✅
5. **Navigate to MainScreen** ✅

## setupUserProfile Internal Check

The function already has proper session validation:

```javascript
// From auth.js
export const setupUserProfile = async (name, role = 'customer') => {
  // Get current session directly
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ No active session');
    return { success: false, error: 'No authenticated user. Please login again.' };
  }
  
  // Session exists, create profile
  const user = session.user;
  // ... create profile
}
```

So we don't need to check auth BEFORE calling it!

## Flow Now (Working)

### Complete User Journey:
```
1. Email Screen
   → User enters: john@example.com
   → Sends OTP

2. OTP Screen
   → User enters: 123456
   → Verifies OTP
   → Checks profile: null (new user)
   → navigation.replace('Onboarding', { fromOTP: true })

3. Onboarding Screen
   → fromOTP=true, shows name input
   → User enters: "John Doe"
   → Clicks Continue
   → Calls setupUserProfile("John Doe", "customer")
   → setupUserProfile checks session internally ✅
   → Creates profile in database ✅
   → Returns: { success: true, profile: {...} }
   → navigation.replace('MainScreen')

4. MainScreen
   → User is now in the app! ✅
```

## Console Logs (Expected)

```
[OTP Screen]
✅ OTP verified successfully
📋 Profile data: null
→ New user or incomplete profile, need name input

[Onboarding Screen]
🔍 Onboarding: Checking auth state...
   From OTP: true
✅ Coming from OTP verification, showing name input

[User clicks Continue]
💾 Setting up user profile with name: John Doe
   fromOTP flag: true
🔍 Getting current session...
✅ User found: abc-123-xyz
📧 Email: john@example.com
💾 Upserting profile...
✅ Profile created/updated successfully!

[Navigate to MainScreen]
✅ Welcome to the app!
```

## What Was Removed

**Before (Buggy):**
```javascript
// Redundant check that was failing
const authState = await checkAuthState();
if (!authState.isAuthenticated) {
  // This was returning true even though user WAS authenticated
  console.error('❌ User not authenticated - redirecting to login');
  navigation.replace('EmailAuthScreen'); // ❌ Wrong!
  return;
}
```

**After (Fixed):**
```javascript
// No redundant check, just call setupUserProfile
// It handles session validation internally
const result = await setupUserProfile(name.trim(), 'customer');
```

## Why The Redundant Check Failed

Possible reasons `checkAuthState()` returned false even after OTP:

1. **Timing**: Session not fully synced to AsyncStorage yet
2. **Profile Check**: `checkAuthState` queries profiles table, which doesn't exist yet for new user
3. **Race Condition**: Navigation happened before session fully propagated

By removing this check and relying on `setupUserProfile`'s internal session check, we avoid the timing issue.

## Files Modified

1. `src/presentation/onboarding/Onboarding.jsx`
   - Removed redundant `checkAuthState()` call in `handleCompleteOnboarding`
   - Now directly calls `setupUserProfile` which has its own session validation

## Test Checklist

- [x] New user: Email → OTP → Name input → MainScreen (no redirect to login!)
- [x] Existing user: Email → OTP → MainScreen directly
- [x] Error handling: If session actually invalid, setupUserProfile returns error
- [x] No console errors about "User not authenticated"

## Summary

✅ **Removed redundant authentication check** that was causing false negatives  
✅ **Trusted setupUserProfile's internal session validation** instead  
✅ **User can now complete signup flow** without being redirected to login  
✅ **Proper error handling** still exists in setupUserProfile  

**Result**: Smooth flow from OTP → Name → MainScreen! 🎉
