# 🔍 Debugging Payment Flow

**Issue:** Payment screen not appearing after plan selection

---

## ✅ What Should Happen

```
Step 1: Business Info (email, name, business name, password)
   ↓
Step 2: Industry & Business Type
   ↓
Step 3: Plan Selection (Starter/Professional/Enterprise)
   ↓
Step 4: Review & Confirm
   ↓ Click "Create Account"
   ↓
PAYMENT SCREEN (PaymentMethodScreen) ← Should appear here!
   ↓
Success Screen
```

---

## 🐛 Common Issues & Fixes

### Issue 1: PaymentMethodScreen Not Registered

**Check:** `src/Main.jsx`

Should have these lines:
```javascript
// Line 15-16: Imports
import PaymentMethodScreen from './presentation/auth/PaymentMethodScreen';
import PaymentSuccessScreen from './presentation/auth/PaymentSuccessScreen';

// Line 131-132: Screen registration
<RootStack.Screen name="PaymentMethodScreen" component={PaymentMethodScreen} options={{ headerShown: false }}/>
<RootStack.Screen name="PaymentSuccessScreen" component={PaymentSuccessScreen} options={{ headerShown: false }}/>
```

**Fix if missing:**
```bash
# Restart app
npx expo start --clear
```

---

### Issue 2: Shop Creation Failing

**Symptom:** Error alert "Failed to create shop"

**Check console logs for:**
```
❌ Shop creation error: [error message]
```

**Common causes:**
- Missing `created_by` column in shops table
- Missing `subscription_plan` column
- RLS policy blocking insert

**Fix:**
1. Run database migration:
   ```sql
   -- In Supabase SQL Editor
   -- Run: database/UPDATE_SUBSCRIPTION_PRICING.sql
   ```

2. Check RLS policies:
   ```sql
   -- Allow shop creation
   CREATE POLICY "Users can create shops"
   ON shops FOR INSERT
   WITH CHECK (auth.uid() = created_by);
   ```

---

### Issue 3: Navigation Not Working

**Check:** `src/presentation/auth/BusinessRegistration.jsx` lines 160-170

Should have:
```javascript
navigation.replace('PaymentMethodScreen', {
  businessData: {
    shopId: shopData.id,
    email: email.toLowerCase().trim(),
    selectedPlan: selectedPlan,
    businessName: businessName,
    userId: authData.user?.id,
    selectedCategory: selectedCategory,
    selectedBusinessType: selectedBusinessType,
  }
});
```

**If it has `RegistrationSuccessScreen` instead:**
```bash
# The file was updated - restart app
npx expo start --clear
```

---

### Issue 4: Stripe Not Initialized

**Symptom:** Error "Stripe provider not initialized"

**Check:** `src/Main.jsx` should have:
```javascript
// Line 5: Import
import { StripeProvider } from '@stripe/stripe-react-native';

// Line 117: Get key
const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey || '';

// Line 121: Wrap app
<StripeProvider publishableKey={stripePublishableKey}>
  <GestureHandlerRootView style={{ flex: 1 }}>
    ...
  </GestureHandlerRootView>
</StripeProvider>
```

**Check:** `app.json` should have:
```json
"extra": {
  "stripePublishableKey": "pk_test_..."
}
```

---

## 🔍 Step-by-Step Debugging

### 1. Check Console Logs

After clicking "Create Account", look for:

```
✅ Auth account created: [user-id]
✅ Shop created: [shop-id]
```

**If you see:**
```
❌ Shop creation error: ...
```

Then the issue is with database permissions or schema.

---

### 2. Test Direct Navigation

Add a test button to BusinessRegistration:

```javascript
// Temporary test button
<TouchableOpacity
  onPress={() => navigation.navigate('PaymentMethodScreen', {
    businessData: {
      shopId: 'test-id',
      email: 'test@test.com',
      selectedPlan: 'starter',
      businessName: 'Test Shop',
    }
  })}
>
  <Text>TEST: Go to Payment</Text>
</TouchableOpacity>
```

If this works → Issue is with shop creation
If this doesn't work → Issue is with screen registration

---

### 3. Verify Screen Registration

Check if screen appears in Metro bundler:

```bash
# In terminal where Metro is running, look for:
Bundled 1234ms /node_modules/.../PaymentMethodScreen.jsx
```

If you don't see PaymentMethodScreen being bundled:
- Screen might not be registered
- Import path might be wrong

---

### 4. Check Payment Screen Imports

**File:** `src/presentation/auth/PaymentMethodScreen.jsx`

Should have:
```javascript
import { CardField, useStripe } from '@stripe/stripe-react-native';
```

If error:
```bash
npm install @stripe/stripe-react-native
npx expo start --clear
```

---

## 🛠️ Quick Fixes

### Fix 1: Restart Everything

```bash
# Kill all Metro bundler processes
pkill -f "expo start"
pkill -f "node.*expo"

# Clear everything
rm -rf node_modules
npm install
watchman watch-del-all

# Start fresh
npx expo start --clear
```

---

### Fix 2: Verify Database Schema

```sql
-- In Supabase SQL Editor
-- Check if columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN ('created_by', 'subscription_plan', 'subscription_status');

-- Should return 3 rows
```

If missing, run:
```sql
-- Add subscription columns
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pending_payment';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
```

---

### Fix 3: Test with Simpler Flow

Temporarily skip shop creation:

```javascript
// In BusinessRegistration.jsx handleRegister function
// Comment out shop creation, use dummy data
navigation.replace('PaymentMethodScreen', {
  businessData: {
    shopId: 'temp-shop-id', // Temporary
    email: email.toLowerCase().trim(),
    selectedPlan: selectedPlan,
    businessName: businessName,
  }
});
```

If payment screen appears → Issue is with shop creation
If still doesn't appear → Issue is with navigation/registration

---

## 📱 Testing Steps

1. **Open app**
2. **Register business** (fill all fields)
3. **Select plan** (any plan)
4. **Click "Create Account"**
5. **Watch console logs**

**Expected logs:**
```
📝 Starting business registration...
✅ Auth account created: abc123
✅ Shop created: xyz789
```

**Then should navigate to:** PaymentMethodScreen

---

## ✅ Verification Checklist

- [ ] `PaymentMethodScreen.jsx` exists in `src/presentation/auth/`
- [ ] `PaymentSuccessScreen.jsx` exists in `src/presentation/auth/`
- [ ] Both screens imported in `Main.jsx`
- [ ] Both screens registered in RootStack.Navigator
- [ ] StripeProvider wraps app in `Main.jsx`
- [ ] `stripePublishableKey` in `app.json`
- [ ] Database has `subscription_plan` column
- [ ] Database has `subscription_status` column
- [ ] RLS policy allows shop creation
- [ ] App restarted after code changes

---

## 🆘 Still Not Working?

### Check These:

1. **Metro bundler errors?**
   - Look at terminal where `npx expo start` is running
   - Any red errors?

2. **React Navigation error?**
   - "Couldn't find a route named PaymentMethodScreen"
   - → Screen not registered

3. **Stripe initialization error?**
   - "Stripe provider must be initialized"
   - → StripeProvider not wrapping app

4. **Import error?**
   - "Cannot find module"
   - → Check file paths

---

## 💡 Most Likely Causes

1. **App not restarted** after adding new screens (90%)
2. **Screen not registered** in Main.jsx (5%)
3. **Database error** blocking shop creation (3%)
4. **Import path wrong** (2%)

**Solution:** Restart app with `npx expo start --clear`

---

**If still stuck after trying all above, check:**
- Metro bundler logs (terminal)
- Device/simulator logs (React Native debugger)
- Network tab (for API errors)
- Supabase logs (for database errors)
