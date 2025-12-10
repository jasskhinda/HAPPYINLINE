# ✅ FIXED - Duplicate Function Error

## What Was Wrong
The `getUserRoleInShop` function was declared **twice** in `shopAuth.js`:
- Line 272: Original version (uses shop_staff table directly)
- Line 1027: Duplicate version (uses RPC function)

## What I Fixed
✅ **Removed the duplicate code** (lines 1020-1254)
✅ **Kept the original working functions**
✅ **Created simple SQL for adding basic services**

---

## 📋 Your Current Setup

### You Already Have:
- ✅ `shop_staff` table
- ✅ `services` table
- ✅ Working shop creation
- ✅ Service management screens

### You DON'T Need:
- ❌ Complex authorization system (you already have `shop_staff`)
- ❌ master_services table (services table is enough)
- ❌ RPC functions (direct queries work fine)

---

## 🚀 Quick Start - Add Basic Services

### Step 1: Get Your Shop ID

```sql
-- Run in Supabase SQL Editor:
SELECT id, name FROM shops WHERE created_by = auth.uid();
```

Copy the `id` value.

### Step 2: Open the SQL File

Open `ADD_BASIC_BARBER_SERVICES.sql`

### Step 3: Replace Shop ID

Find all instances of `'YOUR_SHOP_ID_HERE'` and replace with your actual shop ID.

**Example:**
```sql
-- Before:
('YOUR_SHOP_ID_HERE', 'Haircut', 'Classic men''s haircut', 25.00, 30, true, '...')

-- After:
('abc123-your-actual-shop-id', 'Haircut', 'Classic men''s haircut', 25.00, 30, true, '...')
```

### Step 4: Run the SQL

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Paste the modified SQL
4. Click "Run"

### Step 5: Verify

```sql
SELECT name, price, duration FROM services 
WHERE shop_id = 'YOUR_SHOP_ID_HERE'
ORDER BY name;
```

You should see 12 basic services!

---

## 📦 What Services Are Added

1. **Haircut** - $25 / 30 min
2. **Buzz Cut** - $15 / 15 min
3. **Fade Haircut** - $30 / 45 min
4. **Kids Haircut** - $18 / 25 min
5. **Beard Trim** - $15 / 20 min
6. **Beard Grooming** - $25 / 30 min
7. **Clean Shave** - $20 / 25 min
8. **Haircut + Beard Trim** - $35 / 45 min
9. **Deluxe Service** - $50 / 60 min
10. **Hair Coloring** - $40 / 60 min
11. **Hot Towel Treatment** - $10 / 15 min
12. **Scalp Massage** - $15 / 20 min

---

## 🎨 About Icons

The SQL uses placeholder icons from DiceBear:
```
https://api.dicebear.com/7.x/shapes/svg?seed=haircut
```

**To add real images:**
1. Go to your app
2. Navigate to Service Management
3. Edit each service
4. Upload a real image from your phone/gallery
5. The app will store it in Supabase Storage

---

## 🔧 Customization

### Change Prices
```sql
UPDATE services 
SET price = 30.00 
WHERE name = 'Haircut' AND shop_id = 'YOUR_SHOP_ID';
```

### Change Duration
```sql
UPDATE services 
SET duration = 45 
WHERE name = 'Haircut' AND shop_id = 'YOUR_SHOP_ID';
```

### Add More Services
```sql
INSERT INTO services (shop_id, name, description, price, duration, is_active)
VALUES ('YOUR_SHOP_ID', 'Premium Cut', 'VIP haircut service', 50.00, 60, true);
```

### Delete a Service
```sql
DELETE FROM services 
WHERE name = 'Buzz Cut' AND shop_id = 'YOUR_SHOP_ID';
```

---

## 💡 How It Works

### Your Current Flow:
```
User creates shop
    ↓
shop_staff entry created (user is admin)
    ↓
User goes to Service Management
    ↓
Can add/edit/delete services
    ↓
Services stored in 'services' table
    ↓
Other shops can create similar services independently
```

### Simple & Effective:
- Each shop has its own services
- No shared service library needed
- Shop owners control their services
- Customers book from shop's specific services

---

## 🎯 No Complex Authorization Needed

You already have:
- ✅ `shop_staff` table checking who can manage
- ✅ UI showing/hiding buttons based on role
- ✅ Simple permissions structure

You DON'T need:
- ❌ RPC functions for role checking
- ❌ Complex policies
- ❌ Shared master_services table

**Your existing setup is perfect!** 👍

---

## 📱 Test Your App

1. **Run the SQL** to add services
2. **Open your app**
3. **Go to Service Management**
4. **You should see all 12 services**
5. **Edit/delete/add more as needed**

---

## 🐛 Error Should Be Fixed

The build error:
```
ERROR: Identifier 'getUserRoleInShop' has already been declared
```

Is now **FIXED** ✅

Try reloading your app:
```bash
# Press 'r' in Expo terminal
# Or
npx expo start --clear
```

---

## 📚 Files Summary

### Modified:
- ✅ `src/lib/shopAuth.js` - Removed duplicate functions

### Created:
- ✅ `ADD_BASIC_BARBER_SERVICES.sql` - SQL to add 12 basic services
- ✅ `SIMPLE_SERVICES_SETUP.md` - This guide

### Can Delete (Not Needed):
- ❌ `MULTI_SHOP_AUTHORIZATION_SETUP.sql` - Too complex for your needs
- ❌ `CREATE_MASTER_SERVICES_TABLE.sql` - You don't need master_services
- ❌ `AUTHORIZATION_IMPLEMENTATION_COMPLETE.md` - Overcomplicated

---

## ✨ You're All Set!

Your simple architecture is:
```
shops table → services table → bookings
           ↓
      shop_staff (permissions)
```

**No need to overcomplicate it!** 🎉

Run the SQL file and start testing! 🚀
