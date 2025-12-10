# OTP Back Button Fix

## Problem

Back button on OTPVerificationScreen shows error:
```
ERROR  The action 'GO_BACK' was not handled by any navigator.
Is there any screen to go back to?
```

## Root Cause

In `EmailAuthScreen.jsx`, when user enters email and OTP is sent, the navigation used:

```javascript
navigation.replace('OTPVerificationScreen', { ... });
```

**`navigation.replace()`** removes the current screen (EmailAuthScreen) from the navigation stack and replaces it with OTPVerificationScreen.

**Result:** OTPVerificationScreen becomes the **first and only screen** in the stack. When user presses back button, there's no screen to go back to → Error!

## Solution

Changed `navigation.replace()` to `navigation.navigate()`:

```javascript
// BEFORE (BROKEN)
navigation.replace('OTPVerificationScreen', { ... }); // ❌ Removes EmailAuthScreen

// AFTER (FIXED)
navigation.navigate('OTPVerificationScreen', { ... }); // ✅ Keeps EmailAuthScreen in stack
```

**Now the navigation stack looks like:**
```
SplashScreen
  └─ Onboarding
      └─ EmailAuthScreen
          └─ OTPVerificationScreen  ← Back button goes here!
```

## Files Modified

**src/presentation/auth/EmailAuthScreen.jsx**
- Line ~61: Changed `navigation.replace()` to `navigation.navigate()`

## Testing

1. **Open app** → See onboarding slides
2. **Enter email** → Get OTP
3. **On OTP screen, press back button**
4. **Should return to EmailAuthScreen** ✅
5. **No error** ✅

## Previous Back Button Fix

You mentioned I fixed something previously. What I did before:

**OTPVerificationScreen.jsx (Previous fix):**
- Moved back button outside `content` view
- Increased z-index to 999
- Added white background with shadow
- Made touch area larger
- Added activeOpacity for feedback

**That fix made the button visible and touchable**, but didn't solve the navigation stack issue.

**This new fix solves the actual navigation problem** so there's a screen to go back to!

## Why Replace vs Navigate

**`navigation.replace()`** - Use when:
- ✅ You don't want user to go back (e.g., after login success → MainScreen)
- ✅ You want to remove previous screen from memory
- ✅ Final destination in a flow

**`navigation.navigate()` - Use when:**
- ✅ You want user to be able to go back
- ✅ Part of a multi-step flow (email → OTP → verification)
- ✅ User might need to correct previous input

**EmailAuthScreen → OTPVerificationScreen** is a multi-step flow where user might need to:
- Go back to re-enter email
- Check what email they entered
- Cancel the OTP process

So `navigate()` is the correct choice here!

## Date: October 5, 2025
