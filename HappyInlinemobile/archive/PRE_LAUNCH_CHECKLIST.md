# 🚀 PRE-LAUNCH CHECKLIST

## ✅ What You've Done:
- [x] Deleted all old tables (fresh start)
- [x] Run SHOP_FIRST_DATABASE_SCHEMA.sql
- [x] Run SHOP_FIRST_RLS_POLICIES.sql

---

## ⚠️ CRITICAL: Before Running App

### 1. **Create Your First User Account** (IMPORTANT!)

You need at least ONE user account in your database before the app will work properly.

**Do this NOW:**

1. Open your app on phone/emulator
2. Go through authentication:
   - Enter your email
   - Enter OTP code
   - **Complete onboarding** (enter name, phone, etc.)
3. This will create your first profile in the database

**Why?** The database schema created a trigger that auto-creates a profile when a user signs up. You need this profile to exist before you can create shops.

---

### 2. **Verify Database Setup** (Run in Supabase SQL Editor)

```sql
-- Check if profiles table exists
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if shops table exists
SELECT COUNT(*) as shop_count FROM shops;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'shops', 'shop_staff', 'services', 'bookings', 'shop_reviews');

-- All should show rowsecurity = true
```

**Expected Results:**
- `profile_count`: 0 (will increase after signup)
- `shop_count`: 0 or 1 (if default shop was created)
- All tables should show `rowsecurity = true`

---

### 3. **Update Your Navigation** (Code Changes Needed)

Your `Main.jsx` still uses the OLD `HomeScreen`. You need to update it to use the NEW shop-centric screens.

**Current Issue:** Your app is still pointing to old barber-centric home screen.

**You have 2 options:**

#### **Option A: Keep Old UI for Now** (Quick Test)
Just run the app as-is. The old UI won't work with new database, but you can:
- Sign up
- Complete onboarding
- You'll get errors when trying to view barbers (because there are no barbers in old format)

#### **Option B: Update to New UI** (Recommended)
Update your `Main.jsx` to use new screens:

```jsx
// Add these imports at the top
import ShopBrowserScreen from './presentation/main/bottomBar/home/ShopBrowserScreen';
import ShopDetailsScreen from './presentation/main/bottomBar/home/ShopDetailsScreen';
import CreateShopScreen from './presentation/shop/CreateShopScreen';
import ShopSelectionScreen from './presentation/shop/ShopSelectionScreen';

// In your RootStack.Navigator, replace:
<RootStack.Screen name="HomeScreen" component={HomeScreen}/>

// With:
<RootStack.Screen name="HomeScreen" component={ShopBrowserScreen}/>

// And add these new screens:
<RootStack.Screen name="ShopDetailsScreen" component={ShopDetailsScreen}/>
<RootStack.Screen name="CreateShopScreen" component={CreateShopScreen}/>
<RootStack.Screen name="ShopSelectionScreen" component={ShopSelectionScreen}/>
```

---

### 4. **Update Auth Functions Import**

Your app is likely still importing from `./lib/auth`. You need to:

**Check these files and update imports:**

```javascript
// OLD (won't work with new database)
import { ... } from './lib/auth';

// NEW (works with shop architecture)
import { ... } from './lib/shopAuth';
```

**Files that likely need updating:**
- `src/presentation/main/bottomBar/home/HomeScreen.jsx`
- `src/presentation/main/bottomBar/profile/ProfileScreen.jsx`
- Any booking components
- Any management screens

---

## 🎯 Recommended Approach: TEST IN PHASES

### **Phase 1: Basic Auth Test** (Do This First!)

1. **Start the app**
   ```bash
   npm start
   # or
   npx expo start
   ```

2. **Test Authentication:**
   - [ ] Can you enter email?
   - [ ] Do you receive OTP?
   - [ ] Can you enter OTP and verify?
   - [ ] Does onboarding screen appear?
   - [ ] Can you complete onboarding (name, phone)?

3. **Check Database:**
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM auth.users;
   SELECT * FROM profiles;
   ```
   
   You should see your user in both tables!

**If auth works:** ✅ Proceed to Phase 2
**If auth fails:** ⚠️ Check Supabase console for errors

---

### **Phase 2: Test Old Home Screen** (Will Show Errors)

After successful login and onboarding:
- [ ] App navigates to MainScreen
- [ ] You see bottom navigation
- [ ] Tap on Home tab

**Expected Behavior:**
- ❌ You'll see errors or empty screen
- ❌ Old HomeScreen tries to fetch barbers (doesn't exist in new schema)
- ❌ Services won't load properly

**This is NORMAL!** Old UI doesn't match new database structure.

---

### **Phase 3: Create Your First Shop** (Manual)

Since UI isn't updated yet, create a shop manually:

```sql
-- In Supabase SQL Editor
-- Replace 'YOUR_USER_ID' with your actual ID from auth.users or profiles
INSERT INTO shops (
  name,
  address,
  phone,
  email,
  is_active,
  is_verified,
  created_by
) VALUES (
  'My Barbershop',
  '123 Main Street, City, State',
  '+1234567890',
  'shop@example.com',
  true,
  true,
  'YOUR_USER_ID'  -- Replace with your actual user ID
);

-- Then add yourself as shop admin
INSERT INTO shop_staff (shop_id, user_id, role, is_active)
SELECT 
  (SELECT id FROM shops WHERE name = 'My Barbershop' LIMIT 1),
  'YOUR_USER_ID',  -- Replace with your actual user ID
  'admin',
  true;
```

---

### **Phase 4: Add Test Services** (Manual)

```sql
-- Get your shop ID first
SELECT id, name FROM shops;

-- Insert services (replace 'YOUR_SHOP_ID')
INSERT INTO services (shop_id, name, description, price, duration, category, is_active) VALUES
('YOUR_SHOP_ID', 'Haircut', 'Classic haircut with styling', 25.00, 30, 'Hair', true),
('YOUR_SHOP_ID', 'Beard Trim', 'Beard shaping and trim', 15.00, 15, 'Beard', true),
('YOUR_SHOP_ID', 'Hair + Beard Combo', 'Haircut and beard trim', 35.00, 45, 'Combo', true);
```

---

## 🚨 Known Issues You'll Face:

### Issue 1: Old HomeScreen Won't Load Data
**Why:** Old screen fetches barbers globally, new DB has shop-based staff
**Fix:** Update to ShopBrowserScreen (see Option B above)

### Issue 2: Booking Flow Broken
**Why:** Old booking requires barber_id, new DB allows optional barber
**Fix:** Update booking components to pass shop_id

### Issue 3: Profile Screen Shows Nothing
**Why:** Old profile tries to display global role, new DB has per-shop roles
**Fix:** Update ProfileScreen to use `getUserRoleInShop()` from shopAuth.js

### Issue 4: Management Screens Don't Work
**Why:** Old screens don't filter by shop_id
**Fix:** Update management screens to work with shop context

---

## ✅ Minimal Working Test (No Code Changes)

If you want to test WITHOUT code changes:

1. **Complete signup & onboarding** (creates profile)
2. **Create shop manually** (SQL above)
3. **Add services manually** (SQL above)
4. **Test these SQL queries work:**

```sql
-- Should return your shop
SELECT * FROM shops WHERE created_by = auth.uid();

-- Should return you as admin
SELECT * FROM shop_staff WHERE user_id = auth.uid();

-- Should return shop services
SELECT * FROM services WHERE shop_id = (SELECT id FROM shops LIMIT 1);
```

If these queries work, your database is PERFECT! ✅

The app UI just needs updating to match the new architecture.

---

## 🎯 What To Do RIGHT NOW:

1. **Start app**: `npm start`
2. **Sign up**: Create account, complete onboarding
3. **Check database**: Verify profile was created
4. **Choose one:**
   - **Quick test**: Try old UI (will have errors, but you can test auth)
   - **Full update**: Update Main.jsx to use ShopBrowserScreen

---

## 📝 Quick Code Fix (5 minutes)

Want to see the new home screen? Just do this:

**File: `src/Main.jsx`**

```javascript
// Line 11 - Change this:
import HomeScreen from './presentation/main/bottomBar/home/HomeScreen';

// To this:
import ShopBrowserScreen from './presentation/main/bottomBar/home/ShopBrowserScreen';

// Line 90 - Change this:
<RootStack.Screen name="HomeScreen" component={HomeScreen}/>

// To this:
<RootStack.Screen name="HomeScreen" component={ShopBrowserScreen}/>
```

Save, reload app, and you'll see the new shop browser! 🎉

---

## 🆘 If Something Goes Wrong:

### App crashes on startup:
- Check expo console for errors
- Verify Supabase URL/keys in app.json

### Can't sign up:
- Check Supabase auth settings
- Verify email auth is enabled
- Check auth policies

### Database errors:
- Re-run SHOP_FIRST_DATABASE_SCHEMA.sql
- Re-run SHOP_FIRST_RLS_POLICIES.sql
- Check Supabase logs

### UI shows old barber list:
- You're still using old HomeScreen
- Update to ShopBrowserScreen

---

## ✅ Summary:

**Database:** ✅ Ready (you ran both SQL files)
**Auth:** ✅ Should work (needs testing)
**UI:** ⚠️ Needs updating (old UI won't match new DB)

**Recommended Next Steps:**
1. Test auth (signup/login)
2. Update Main.jsx to use ShopBrowserScreen
3. Create a shop via app or SQL
4. Test booking flow
5. Update remaining screens gradually

---

**You're 90% there!** The database is perfect. You just need to connect the new UI. 🚀

Would you like me to help you update the Main.jsx file now?
