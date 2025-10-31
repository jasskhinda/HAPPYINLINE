# Profile ID Mismatch Fix - Session Persistence Issue

## Critical Issue Found

### The Real Problem

After careful analysis of the terminal logs, the issue is **NOT** about AsyncStorage or session storage. The problem is:

**Profile ID Mismatch:**
- Auth User ID: `95db3733-8436-4930-b7b6-52b64026f985` (from Supabase Auth)
- Profile ID in DB: `aac0b13e-e6dc-4d8c-9509-d07e1f49140c` (from profiles table)

**They're DIFFERENT!** This causes the query to fail:

```javascript
// This query FAILS because IDs don't match
await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id) // Looking for 95db3733...
  .single(); // But DB has aac0b13e...

// Error: "Cannot coerce the result to a single JSON object"
```

### Why This Happens

Your database has a **trigger** that should update the profile ID to match the auth user ID when a user signs in. But the trigger either:
1. Failed to run
2. Hasn't been updated yet
3. Was never set up for existing users

So you have **old profiles** with mismatched IDs.

### Evidence from Logs

```
✅ Session found in AsyncStorage
   - User ID: 95db3733-8436-4930-b7b6-52b64026f985
   - User email: craftworld207@gmail.com

📋 Profile check result:
   - Profile exists: false
   - Profile error: Cannot coerce the result to a single JSON object

⚠️ USER SESSION EXISTS BUT PROFILE NOT FOUND IN DATABASE
→ Clearing invalid session (WRONG!)
```

The session IS valid, but the query failed because of ID mismatch!

## Solution Implemented

### Strategy: Fallback to Email Lookup

Since `email` is the consistent identifier across auth and profiles tables, we use email as a fallback:

```javascript
// TRY 1: Query by auth user ID (preferred)
let profile = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .single();

// TRY 2: If failed, query by EMAIL (fallback)
if (!profile) {
  profile = await supabase
    .from('profiles')
    .select('*')
    .eq('email', session.user.email)
    .single();
}

// If found by email → SUCCESS!
// User can login even with ID mismatch
```

### Changes Made

**File: `src/lib/auth.js` - `checkAuthState()` function**

**BEFORE (BROKEN):**
```javascript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, name, email, phone, role, onboarding_completed')
  .eq('id', session.user.id)
  .single();

if (profileError || !profile) {
  // Immediately give up and sign out ❌
  await supabase.auth.signOut();
  return { isAuthenticated: false };
}
```

**AFTER (FIXED):**
```javascript
// Try by ID first
let { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, name, email, phone, role, onboarding_completed')
  .eq('id', session.user.id)
  .single();

// If not found by ID, try by EMAIL (fallback)
if (profileError || !profile) {
  console.log('⚠️ Profile not found by auth user ID, trying by email...');
  
  const { data: profileByEmail, error: emailError } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, onboarding_completed')
    .eq('email', session.user.email)
    .single();
  
  if (!emailError && profileByEmail) {
    console.log('✅ Profile found by email!');
    profile = profileByEmail; // Use the email-matched profile ✅
  } else {
    // Only sign out if BOTH lookups fail
    await supabase.auth.signOut();
    return { isAuthenticated: false };
  }
}
```

## Why This Works

### Consistency with Other Functions

`getCurrentUser()` (which was working) already uses this email fallback pattern:

```javascript
// getCurrentUser() - WORKING
let profile = await supabase.from('profiles').eq('id', user.id).single();

if (!profile) {
  // Fallback to email ✅
  profile = await supabase.from('profiles').eq('email', user.email).single();
}
```

Now `checkAuthState()` uses the **same pattern**, making it consistent!

## Expected Behavior Now

### Scenario 1: Fresh Login
1. User logs in
2. Session stored in AsyncStorage
3. Trigger may or may not update profile ID
4. **Doesn't matter!** Email lookup will work ✅

### Scenario 2: App Restart (THE FIX!)
```
App Opens → SplashScreen
           ↓
   checkAuthState()
           ↓
   Read session from AsyncStorage
   User ID: 95db3733... ✅
   Email: craftworld207@gmail.com ✅
           ↓
   Query profile by ID: 95db3733...
   → NOT FOUND (ID mismatch)
           ↓
   Query profile by EMAIL: craftworld207@gmail.com
   → FOUND! ✅
           ↓
   Profile: {
     id: "aac0b13e...",
     name: "Craftworld",
     role: "manager"
   }
           ↓
   ✅✅✅ AUTHENTICATED!
           ↓
   Navigate to MainScreen ✅
```

**Result: User stays logged in!** 🎉

## New Terminal Logs

After the fix, you'll see:

```
🚀 SPLASH SCREEN - Checking Authentication...

🔐 Step 1: Checking authentication state...

📦 Session check result:
   - Session exists: true
   - User ID: 95db3733-8436-4930-b7b6-52b64026f985
   - User email: craftworld207@gmail.com

📋 Profile check result (by ID):
   - Profile exists: false
   - Profile error: Cannot coerce to single JSON object

⚠️ Profile not found by auth user ID, trying by email...
   Looking for email: craftworld207@gmail.com

📋 Profile check result (by email):
   - Profile exists: true
   - Profile error: None

✅ Profile found by email!
   Profile ID in DB: aac0b13e-e6dc-4d8c-9509-d07e1f49140c
   Auth User ID: 95db3733-8436-4930-b7b6-52b64026f985

⚠️ WARNING: ID mismatch detected (auth trigger may have failed)

✅✅✅ USER AUTHENTICATED SUCCESSFULLY
   - Name: Craftworld
   - Email: craftworld207@gmail.com
   - Role: manager

→ Decision: Navigate to MainScreen
```

## Root Cause Analysis

### Why Do IDs Mismatch?

You likely created the profile **manually** in the database before the user authenticated. When you created it:
- Profile got a random UUID: `aac0b13e...`

Later, when user signed up with Supabase Auth:
- Auth created a different UUID: `95db3733...`
- Trigger should update profile.id to match auth.user.id
- **But trigger didn't run or failed!**

### Database Trigger Issue

Check your trigger (should be something like):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Update existing profile with matching email to use auth user ID
  UPDATE public.profiles
  SET id = new.id
  WHERE email = new.email;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Problem:** This trigger might not be working correctly!

## Long-Term Solution Options

### Option 1: Fix the Database (Recommended)

Run this SQL to fix existing mismatched profiles:

```sql
-- Update profile IDs to match auth user IDs
UPDATE profiles p
SET id = au.id
FROM auth.users au
WHERE p.email = au.email
AND p.id != au.id;
```

**Warning:** This is a destructive operation! Backup first!

### Option 2: Keep Email Fallback (Current Fix)

Keep the current code that falls back to email lookup. This is:
- ✅ Safe
- ✅ Works with mismatched IDs
- ✅ No database changes needed
- ⚠️ Slightly slower (two queries instead of one)

### Option 3: Always Use Email (Simplest)

Change the query to ALWAYS use email:

```javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', session.user.email) // Use email directly
  .single();
```

**Pros:**
- One query only
- Always works
- Email is unique anyway

**Cons:**
- Relies on email uniqueness (should be enforced by DB)
- Slightly less efficient than ID lookup

## Recommendation

**Keep the current fix (Option 2)** because:
1. ✅ Works immediately without DB changes
2. ✅ Safe for production
3. ✅ Handles both new and old users
4. ✅ Consistent with `getCurrentUser()` behavior
5. ✅ Provides clear warning logs for debugging

When you have time, investigate and fix your database trigger (Option 1).

## Files Modified

**src/lib/auth.js**
- Modified `checkAuthState()` function
- Added email fallback lookup
- Added detailed logging for debugging
- Added ID mismatch warning

## Testing

1. **Login completely** (email + OTP + name)
2. **Check terminal:** Should see profile found by email
3. **Close app completely**
4. **Reopen app**
5. **Check terminal:** Should see same email fallback, then MainScreen
6. **Verify:** User stays logged in ✅

## Date: October 5, 2025

---

## Summary

The issue was **NOT** with AsyncStorage or session storage. The issue was a **Profile ID mismatch** in your database. The query was failing because it was looking for a profile with ID `95db3733...` but the database had ID `aac0b13e...` for the same user.

The fix adds an email-based fallback lookup, which works because email is consistent across both tables. This matches the pattern already used in `getCurrentUser()`.

**You should now be able to stay logged in after app restart!** 🎉
