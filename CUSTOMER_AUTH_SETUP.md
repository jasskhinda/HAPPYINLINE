# CUSTOMER AUTHENTICATION SETUP
**Date**: 2025-10-30

---

## ✅ What's Been Done

### 1. Created New Customer Auth Screens
- **CustomerRegistration.jsx** - Email + Password + Name + Phone (NO OTP!)
- **CustomerLogin.jsx** - Email + Password login

### 2. Updated Navigation
- Added both screens to Main.jsx
- Updated CustomerOnboarding to use new screens

### 3. Database Trigger
- Created `UPDATE_PROFILE_TRIGGER.sql` to save customer data
- Trigger automatically creates profile with: name, email, phone, role

---

## 🔧 SETUP REQUIRED

### Run This SQL in Supabase (One Time Only)

Open Supabase Dashboard → SQL Editor → Paste this:

```sql
-- Update the profile creation trigger to include role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**This ensures that when a customer signs up:**
- ✅ Name is saved to profiles.name
- ✅ Email is saved to profiles.email
- ✅ Phone is saved to profiles.phone
- ✅ Role is saved to profiles.role (default: 'customer')

---

## 📱 Customer Registration Flow

### New User:
1. Open app → Tap "Customer"
2. Complete/Skip onboarding
3. **Create Account screen**
   - Enter: Name
   - Enter: Email
   - Enter: Phone
   - Enter: Password
   - Confirm Password
4. Tap "Create Account"
5. ✅ **Account created instantly** (no OTP!)
6. Auto-login → Main App

### Returning User:
1. Open app → Tap "Customer"
2. Tap "Already have an account? Sign In"
3. **Sign In screen**
   - Enter: Email
   - Enter: Password
4. Tap "Sign In"
5. ✅ Logged in → Main App

---

## 🗄️ Database Tables

### profiles table (already exists)
The trigger automatically saves customer data here:

```sql
id          UUID       -- Supabase auth user ID
name        TEXT       -- Customer's full name
email       TEXT       -- Customer's email
phone       TEXT       -- Customer's phone number
role        TEXT       -- 'customer', 'owner', 'manager', 'barber', 'super_admin'
created_at  TIMESTAMP
```

No additional tables needed! The existing `profiles` table handles everything.

---

## 🔐 How It Works

### Registration (CustomerRegistration.jsx):
```javascript
await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      name: name,        // Saved to raw_user_meta_data
      phone: phone,      // Saved to raw_user_meta_data
      role: 'customer',  // Saved to raw_user_meta_data
    }
  }
});
```

### Trigger Extracts Data:
```sql
-- The trigger reads raw_user_meta_data and creates profile
name  -> raw_user_meta_data->>'name'
phone -> raw_user_meta_data->>'phone'
role  -> raw_user_meta_data->>'role' (defaults to 'customer')
```

### Login (CustomerLogin.jsx):
```javascript
await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});
```

Simple password-based auth, no OTP required!

---

## ✅ Testing Checklist

### Test Registration:
- [ ] Open app on device/simulator
- [ ] Navigate to Customer path
- [ ] Fill in registration form
- [ ] Tap "Create Account"
- [ ] Should login automatically
- [ ] Check Supabase → Authentication → Users (new user created)
- [ ] Check Supabase → Table Editor → profiles (profile created with name, phone, role)

### Test Login:
- [ ] Log out from Profile tab
- [ ] Navigate to Customer → Sign In
- [ ] Enter email + password
- [ ] Should login successfully
- [ ] Navigate to Profile tab
- [ ] Verify name and phone are displayed

---

## 🐛 Troubleshooting

### Issue: Profile not created
**Check:** Run `UPDATE_PROFILE_TRIGGER.sql` in Supabase

### Issue: Name/Phone not showing
**Check:** Make sure trigger is using `raw_user_meta_data` correctly

### Issue: Login fails
**Check:** Make sure user exists and password is correct (min 6 characters)

### Issue: Role not set
**Check:** Trigger should default to 'customer' if not provided

---

## 📋 SQL Files Created

1. **UPDATE_PROFILE_TRIGGER.sql** - Run this in Supabase to update the trigger
2. **CHECK_PROFILE_TRIGGER.sql** - Optional: Check if trigger exists

---

## 🎯 Summary

**Before:** OTP-based passwordless auth (complicated, often fails)
**After:** Simple email + password auth (reliable, no OTP required)

**Customer Experience:**
- ✅ Fast registration (no waiting for OTP)
- ✅ Simple login (just email + password)
- ✅ All data saved automatically (name, phone, email, role)

**Ready to test!** 🚀

---

*Last Updated: 2025-10-30*
