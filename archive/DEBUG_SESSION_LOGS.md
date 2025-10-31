# 🔍 Session Persistence Debug Guide

## What I Added

I've added **comprehensive logging** throughout your authentication flow to help us debug why the session isn't persisting.

---

## 🧪 Test Instructions

### **Step 1: Login Fresh**
1. **Clear app data** (Settings → Apps → Your App → Clear Data)
2. **Open app**
3. **Login with email** → Enter OTP → Enter name
4. **You should see** MainScreen

### **Step 2: Restart App**
1. **Close app completely** (swipe away from recent apps)
2. **Open app again**
3. **Check console logs carefully**

---

## 📊 What to Look For in Console

### **Expected Logs (Session Working):**

```
🚀 APP STARTING - Initializing Authentication...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👀 First launch check:
   - AsyncStorage value: true
   - Is first launch: false

📱 Calling checkAuthState()...

==================================================
🔍 CHECKING AUTH STATE ON APP START
==================================================
📦 Session check result:
   - Session exists: true
   - Session error: null
   - User ID: abc-123-xyz
   - User email: user@email.com
   - Session expires at: Oct 12, 2025, 10:30 AM
✅ Session found in AsyncStorage
🔐 Now checking if user exists in Supabase database...
📋 Profile check result:
   - Profile exists: true
   - Profile error: None
   - Profile data: { id: 'abc-123', name: 'John', ... }
✅✅✅ USER AUTHENTICATED SUCCESSFULLY
   - User ID: abc-123-xyz
   - Name: John Doe
   - Email: user@email.com
   - Role: customer
   - Onboarding complete: true
→ Navigating to MainScreen
==================================================

📊 Auth state result:
   - isAuthenticated: true
   - User ID: abc-123-xyz
   - Profile: EXISTS

✅ USER IS AUTHENTICATED
   - User email: user@email.com
   - User name: John Doe
   - User role: customer
   - Onboarding completed: true

🎯 DETERMINING INITIAL ROUTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current state:
   - isFirstLaunch: false
   - isAuthenticated: true
   - onboardingComplete: true

✅✅✅ Decision: Show main app
   Reason: Authenticated AND onboarding complete
→ Navigating to: MainScreen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### **Problem Logs (Session NOT Working):**

#### **Case 1: No Session Found**
```
📦 Session check result:
   - Session exists: false          ← PROBLEM!
   - Session error: null
🔓 NO STORED SESSION FOUND
→ User needs to login

→ Navigating to: EmailAuthScreen    ← Goes to login
```

**Meaning:** Session is not being stored in AsyncStorage

**Solutions:**
- Check if AsyncStorage has permissions
- Verify Supabase config has `persistSession: true`
- Check if device storage is full

---

#### **Case 2: Session Exists But Profile Missing**
```
📦 Session check result:
   - Session exists: true            ← Session OK
   - User ID: abc-123-xyz

📋 Profile check result:
   - Profile exists: false           ← PROBLEM!
   - Profile error: "Row not found"
⚠️ USER SESSION EXISTS BUT PROFILE NOT FOUND IN DATABASE
🧹 Clearing invalid session...

→ Navigating to: EmailAuthScreen
```

**Meaning:** User authenticated but profile wasn't created in database

**Solutions:**
- Check `verifyEmailOTP()` creates profile
- Verify database RLS policies allow profile creation
- Check if user was deleted from profiles table

---

#### **Case 3: Onboarding Not Complete**
```
📦 Session check result:
   - Session exists: true
📋 Profile check result:
   - Profile exists: true
   - Onboarding complete: false      ← PROBLEM!

→ Navigating to: Onboarding          ← Shows name input
```

**Meaning:** User logged in but didn't complete name input

**Solutions:**
- Complete onboarding by entering name
- Or manually update database:
  ```sql
  UPDATE profiles 
  SET onboarding_completed = true 
  WHERE email = 'your-email@email.com';
  ```

---

## 🔧 Quick Fixes

### **Fix 1: Verify Supabase Config**

Check `src/lib/supabase.js`:
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,        // ✅ Must be AsyncStorage
    autoRefreshToken: true,        // ✅ Must be true
    persistSession: true,          // ✅ Must be true
    detectSessionInUrl: false,
  },
});
```

---

### **Fix 2: Check AsyncStorage**

Add this temporary debug code in HomeScreen:

```javascript
useEffect(() => {
  const debugStorage = async () => {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log('📦 All AsyncStorage keys:', keys);
    
    // Get Supabase keys
    const supabaseKeys = keys.filter(k => k.includes('supabase'));
    console.log('🔑 Supabase keys:', supabaseKeys);
    
    // Get session
    for (const key of supabaseKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`   ${key}:`, value ? 'HAS VALUE' : 'EMPTY');
    }
  };
  
  debugStorage();
}, []);
```

---

### **Fix 3: Manually Check Database**

Run these queries in Supabase SQL Editor:

```sql
-- Check if profile exists
SELECT * FROM profiles WHERE email = 'your-email@email.com';

-- Check if onboarding is complete
SELECT id, name, email, onboarding_completed 
FROM profiles 
WHERE email = 'your-email@email.com';

-- If onboarding is false, update it
UPDATE profiles 
SET onboarding_completed = true 
WHERE email = 'your-email@email.com';
```

---

### **Fix 4: Force Clear and Re-login**

If nothing works, add this button temporarily:

```javascript
// In ProfileScreen or any screen
<TouchableOpacity onPress={async () => {
  await AsyncStorage.clear();
  await supabase.auth.signOut();
  console.log('🧹 Everything cleared - restart app');
}}>
  <Text>Clear All & Logout</Text>
</TouchableOpacity>
```

Then:
1. Tap button
2. Restart app
3. Login again
4. Check console logs

---

## 🎯 What Should Happen

### **Correct Flow:**

1. **First Time:**
   ```
   Open App → Intro Slides → Email → OTP → Name → MainScreen
   ```

2. **After Restart:**
   ```
   Open App → [Check session] → MainScreen (directly)
   ```

3. **After Sign Out:**
   ```
   Open App → [Check session] → EmailAuthScreen
   ```

---

## 📝 Common Issues & Solutions

| Issue | Logs Show | Solution |
|-------|-----------|----------|
| Always shows login | `Session exists: false` | Check AsyncStorage permissions |
| Profile not found | `Profile exists: false` | Check if profile created in DB |
| Shows name input | `Onboarding complete: false` | Update `onboarding_completed` to true |
| Session expired | `Session expires at: [past date]` | Normal - login again |
| AsyncStorage empty | No supabase keys | Check device storage space |

---

## 🚨 Action Items

**After you run the app:**

1. ✅ **Login completely** (email → OTP → name → MainScreen)
2. ✅ **Close app** completely
3. ✅ **Open app again**
4. ✅ **Copy ALL console logs** from when it says "APP STARTING"
5. ✅ **Share the logs** with me

The detailed logs will show **exactly** where the problem is!

---

## 🔍 What the Logs Will Tell Us

The logs will reveal:
- ✅ Is session being stored in AsyncStorage?
- ✅ Is session being read back correctly?
- ✅ Does the profile exist in database?
- ✅ Is onboarding marked as complete?
- ✅ Which route is being chosen and why?

**With these logs, I can pinpoint the exact issue!** 🎯

---

## Expected Result

**If everything is working:**
- Login once
- Close app
- Open again
- **Goes directly to MainScreen** (no login screen)
- Console shows "✅✅✅ USER AUTHENTICATED SUCCESSFULLY"

**If it's not working:**
- Share the console logs
- I'll identify the exact problem
- We'll fix it specifically

---

**Run the test and share the logs!** 📋
