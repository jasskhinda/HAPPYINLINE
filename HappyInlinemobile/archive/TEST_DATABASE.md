# Database Connection & Security Guide

## Recent Fixes Applied ✅

### 1. Loading Screen Timeout Fix
- Added timeout protection to prevent infinite loading
- App now gracefully handles database connection failures

### 2. **Authentication Bypass Prevention** 🔐
Fixed a critical security issue where users could access MainScreen without authentication.

**Changes made:**
- ✅ Main.jsx now properly checks authentication before allowing access
- ✅ Onboarding screen verifies auth before completing profile setup
- ✅ MainScreen validates authentication on mount and redirects if not authenticated
- ✅ All timeout fallbacks now default to unauthenticated state

**Flow:**
1. First-time user → Onboarding slides → **Must authenticate** → Name input → MainScreen
2. Returning user → **Must authenticate** → MainScreen
3. No bypass possible even if database timeout occurs

## Common Issues

## Most Likely Causes

### 1. Database Not Set Up ⚠️ **MOST COMMON**
**Symptom:** You just created `DATABASE_SETUP.sql` but haven't run it in Supabase yet.

**Solution:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy ALL contents of `DATABASE_SETUP.sql`
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for "Success" message
9. Restart your app

### 2. Supabase URL/Key Wrong
**Symptom:** Console shows connection errors, network timeouts.

**Check:**
```javascript
// In src/lib/supabase.js
const supabaseUrl = 'YOUR_URL_HERE';
const supabaseAnonKey = 'YOUR_KEY_HERE';
```

**Get correct values:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy `URL` and `anon public` key
4. Update `src/lib/supabase.js`

### 3. Tables Missing
**Symptom:** Console shows "relation does not exist" errors.

**Verify tables exist:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Should show:
- `profiles`
- `services`

If missing, run `DATABASE_SETUP.sql`.

### 4. RLS Policies Blocking Queries
**Symptom:** Console shows "new row violates row-level security policy".

**Check RLS is enabled:**
```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

If RLS is ON but policies missing, run `DATABASE_SETUP.sql` Section 6-8.

## Quick Fix Steps

### Step 1: Check Console Logs
Look in your terminal/console for these messages:
- ✅ `User is authenticated` → Auth working
- ⏱️ `timeout` → Database not responding
- ❌ `Error checking auth state` → Connection issue

### Step 2: Run Database Setup
If you see timeout warnings:
1. Open Supabase SQL Editor
2. Run `DATABASE_SETUP.sql` (entire file)
3. Restart app

### Step 3: Clear App Data (if still stuck)
```bash
# Run in terminal
npx expo start --clear
```

Then restart app on your device/emulator.

### Step 4: Test Connection Manually
Run this in Supabase SQL Editor:
```sql
-- Test query
SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as service_count FROM services;
```

Should return numbers (not errors).

## Expected Console Output (Working App)

```
🔄 Checking initial auth state...
👀 First launch: true
🔓 No active session
❌ User not authenticated
✅ Initialization complete
```

## Error Console Output (Broken Database)

```
🔄 Checking initial auth state...
👀 First launch: true
⏱️ checkAuthState timeout          ← DATABASE ISSUE
❌ User not authenticated
⏱️ Auth initialization timeout - proceeding with defaults
✅ Initialization complete
```

## If Still Stuck

1. **Verify Supabase Project Active**
   - Go to dashboard
   - Check project isn't paused (free tier)

2. **Check Internet Connection**
   - Supabase requires internet
   - Try: `ping supabase.com`

3. **Check Expo Connection**
   - Make sure device/emulator can reach your network
   - Try: Restart Expo Dev Server

4. **Clear Everything**
   ```bash
   # Terminal
   npx expo start --clear
   
   # Also manually:
   # - Close app completely
   # - Clear app data from device settings
   # - Restart Expo server
   ```

## Need More Help?

Share these console logs:
1. Terminal output when running `npx expo start`
2. Console output in app (look for ⏱️ or ❌ symbols)
3. Any red error messages in Supabase Dashboard → Logs
