# ✅ Session Persistence - How It Works

## Current Implementation

Your app **already stores and validates sessions** exactly as you described!

---

## 📱 How It Works

### **On Login:**
```
User enters email → OTP → Name
         ↓
Session stored in AsyncStorage
         ↓
User navigates to MainScreen
```

### **On App Restart:**
```
App Opens
    ↓
Reads session from AsyncStorage (fast)
    ↓
Validates user exists in Supabase database
    ↓
✅ Valid → MainScreen
❌ Invalid → EmailAuthScreen
```

---

## ✅ Already Configured

### **1. Session Storage (supabase.js)**
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,        // ✅ Stores locally
    autoRefreshToken: true,        // ✅ Auto-refresh
    persistSession: true,          // ✅ Persists on restart
    detectSessionInUrl: false,
  },
});
```

### **2. Session Validation (auth.js)**
```javascript
export const checkAuthState = async () => {
  // Get stored session from AsyncStorage
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { isAuthenticated: false }; // No session = login
  }
  
  // Verify user exists in database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  if (!profile) {
    await supabase.auth.signOut(); // Clear invalid session
    return { isAuthenticated: false };
  }
  
  return { isAuthenticated: true, user: session.user, profile };
};
```

### **3. Navigation (Main.jsx)**
```javascript
// Check auth on app start
const authState = await checkAuthState();

if (authState.isAuthenticated) {
  // ✅ Navigate to MainScreen
} else {
  // ❌ Navigate to EmailAuthScreen
}
```

---

## 🧪 Test It

### **Test 1: Login and Restart**
1. Login to app
2. Close app completely
3. Open app again
4. **Expected:** Opens directly to MainScreen ✅

### **Test 2: Sign Out and Restart**
1. Sign out from Profile screen
2. Close app
3. Open app
4. **Expected:** Shows EmailAuthScreen ✅

---

## 📊 Console Logs

**When session is valid:**
```
🔍 Checking auth state (from stored session)...
🔐 Session found, checking if user exists in database...
✅ User authenticated, profile exists: user@email.com
→ Route: MainScreen
```

**When no session:**
```
🔍 Checking auth state (from stored session)...
🔓 No stored session found
❌ User not authenticated
→ Route: EmailAuthScreen
```

---

## 🐛 If You See Auth Screen Every Time

**Check these:**

1. **Profile Exists?**
   ```sql
   SELECT * FROM profiles WHERE id = 'your-user-id';
   ```

2. **Onboarding Complete?**
   ```sql
   SELECT onboarding_completed FROM profiles WHERE id = 'your-user-id';
   ```

3. **AsyncStorage Working?**
   ```javascript
   const keys = await AsyncStorage.getAllKeys();
   console.log('Stored keys:', keys);
   ```

---

## ✅ Summary

Your auth flow is **already correct**:
- ✅ Session stored in AsyncStorage
- ✅ Validated against Supabase on app start
- ✅ Navigates to MainScreen if valid
- ✅ Navigates to EmailAuthScreen if invalid

**The session DOES persist across app restarts!**

If you're seeing the auth screen every time, it means:
- Session expired/cleared
- Profile missing from database
- Or you signed out previously

Check the console logs to see which case applies.
