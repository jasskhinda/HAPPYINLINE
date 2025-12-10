# DEBUG: Guest Username & Missing Manager Toggle

## Problems Reported
1. **Shows "Guest" instead of user name** (should show "Bhavyansh")
2. **Manager role toggle switch not visible**

## Likely Causes

### Issue 1: Guest Username
The profile name is showing as "Guest" which means:
- Profile is being fetched
- BUT `profile.name` is NULL or undefined
- Default fallback: `profile.name || 'Guest'` → Shows "Guest"

**Possible Reasons:**
1. Profile in database actually has `name = NULL`
2. Profile not fetched correctly after login
3. Trigger didn't preserve the name when linking profile

### Issue 2: Manager Toggle Not Showing
The toggle switch code exists (line 499 in HomeScreen.jsx):
```javascript
{userRole === 'manager' && (
  <View style={styles.togglesContainer}>
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>Manager</Text>
      <Switch value={isManagerMode} ... />
    </View>
  </View>
)}
```

**Possible Reasons:**
1. `userRole` is not equal to 'manager'
2. Profile role in database is different
3. Profile not loaded correctly

## Added Debugging

### File 1: `src/lib/auth.js` - getCurrentUser()
```javascript
export const getCurrentUser = async () => {
  console.log('🔍 getCurrentUser: Fetching auth user...');
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('✅ Auth user found:', user.id);
  console.log('📧 Email:', user.email);
  
  console.log('📋 Fetching profile from database...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('✅ Profile found:');
  console.log('   ID:', profile.id);
  console.log('   Email:', profile.email);
  console.log('   Name:', profile.name);      // ← CHECK THIS
  console.log('   Role:', profile.role);       // ← CHECK THIS
  console.log('   Is Super Admin:', profile.is_super_admin);
  
  return { user, profile };
};
```

### File 2: `src/presentation/main/bottomBar/home/HomeScreen.jsx`
```javascript
console.log('🏠 HomeScreen: Fetching user profile...');
const { user, profile } = await getCurrentUser();
console.log('👤 User:', user);
console.log('📋 Profile:', profile);
console.log('   Profile name:', profile?.name);    // ← CHECK THIS
console.log('   Profile role:', profile?.role);     // ← CHECK THIS

const role = profile.role || 'customer';
const name = profile.name || 'Guest';

console.log('✅ Setting state:');
console.log('   Role:', role);     // ← CHECK THIS
console.log('   Name:', name);     // ← CHECK THIS

setUserRole(role);
setUserName(name);
```

## What to Check in Console Logs

After restarting the app and logging in, look for these logs:

### Expected for Manager (bhavyansh2018@gmail.com):
```
✅ Profile found:
   ID: 5cb26b7d-9fe3-4a39-b4af-b1c6df7afc6b
   Email: bhavyansh2018@gmail.com
   Name: Bhavyansh              ← Should NOT be null
   Role: manager                 ← Should be "manager"
   Is Super Admin: false

🏠 HomeScreen: Fetching user profile...
   Profile name: Bhavyansh      ← Should NOT be undefined
   Profile role: manager         ← Should be "manager"
✅ Setting state:
   Role: manager                 ← Should be "manager"
   Name: Bhavyansh              ← Should NOT be "Guest"
```

### If You See This (PROBLEM):
```
✅ Profile found:
   Name: null                    ← ❌ PROBLEM!
   Role: manager                 ← ✅ Correct

   Profile name: null            ← ❌ PROBLEM!
   Profile role: manager         ← ✅ Correct
✅ Setting state:
   Name: Guest                   ← ❌ Uses fallback
```

## If Name is NULL in Database

### Check Database:
Run this SQL in Supabase SQL Editor:
```sql
SELECT id, email, name, role 
FROM profiles 
WHERE email = 'bhavyansh2018@gmail.com';
```

### Expected Result:
| id | email | name | role |
|----|-------|------|------|
| 5cb26b7d... | bhavyansh2018@gmail.com | Bhavyansh | manager |

### If Name is NULL:
The trigger didn't preserve the name. Need to update manually:
```sql
UPDATE profiles
SET name = 'Bhavyansh'
WHERE email = 'bhavyansh2018@gmail.com';
```

## If Role is Wrong

### Check Role in Database:
```sql
SELECT id, email, name, role 
FROM profiles 
WHERE email = 'bhavyansh2018@gmail.com';
```

### If Role is NOT "manager":
```sql
UPDATE profiles
SET role = 'manager'
WHERE email = 'bhavyansh2018@gmail.com';
```

## Test After Fix

1. **Restart app** (close and reopen)
2. **Check console logs** - should see:
   ```
   Name: Bhavyansh (not Guest)
   Role: manager
   ```
3. **Check UI**:
   - Username should show "Bhavyansh" not "Guest"
   - Manager toggle switch should appear in top-right corner

## Quick Fix If Needed

If database shows NULL name, update it:

```sql
-- Fix the name
UPDATE profiles
SET name = 'Bhavyansh'
WHERE email = 'bhavyansh2018@gmail.com';

-- Verify
SELECT id, email, name, role 
FROM profiles 
WHERE email = 'bhavyansh2018@gmail.com';
```

Then restart the app.

## Status

✅ Added detailed logging to both files
✅ Will show exactly what's being fetched
✅ Will reveal if name is NULL or role is wrong

**Next Step: Check console logs and share what you see!**
