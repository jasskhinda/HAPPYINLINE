# 🎯 GLOBAL SERVICE CATALOG - QUICK START

## What You Asked For ✅

> "In create shop when clicked on services, I want the UI where we can see services present in table and shop owner can create new service as well if not exist there, which is going to store in service table which is globally available"

**DONE!** ✅

---

## 📱 How It Works Now

### **Before (Old Way):**
```
Shop A creates "Haircut" @ $25
Shop B creates "Haircut" @ $30
Shop C creates "Haircut" @ $28

❌ 3 duplicate "Haircut" entries in database
❌ Each shop recreates same services
```

### **After (New Way - Global Catalog):**
```
services table (GLOBAL):
- Haircut (no price, no shop_id)
- Beard Trim
- Fade
... (shared by all shops)

shop_services table (LINKS):
- Shop A → Haircut @ $25
- Shop B → Haircut @ $30
- Shop C → Haircut @ $28

✅ 1 "Haircut" service (shared)
✅ Each shop sets their own price
✅ No duplicates
```

---

## 🎨 UI Flow

### **When Shop Owner Clicks "Add Service":**

```
┌─────────────────────────────────────┐
│  Add Service to Your Shop           │
├─────────────────────────────────────┤
│  [Select Existing] [Create New]  ←─── TWO TABS
└─────────────────────────────────────┘

TAB 1: Select Existing
┌─────────────────────────────────────┐
│ Search: [.................]         │
│                                     │
│ Available Services:                 │
│ ┌─────────────────────────────────┐ │
│ │ 💇 Haircut                      │ │
│ │ Category: Hair                  │ │
│ │ Duration: 30 min                │ │
│ │ Your Price: [$_____]            │ │
│ │ [Add to Shop]                   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🧔 Beard Trim                   │ │
│ │ Category: Beard                 │ │
│ │ Duration: 20 min                │ │
│ │ Your Price: [$_____]            │ │
│ │ [Add to Shop]                   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

TAB 2: Create New
┌─────────────────────────────────────┐
│ Service Name: [.................]   │
│ Description: [.................]    │
│ Duration (min): [30]                │
│ Category: [Hair ▼]                  │
│ Your Price: [$25.00]                │
│ Image: [Upload Image]               │
│                                     │
│ [Create & Add to Shop]              │
└─────────────────────────────────────┘
```

---

## 🚀 What You Need to Do

### **STEP 1: Run SQL Script** (3 minutes)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Open file: `SETUP_GLOBAL_SERVICE_CATALOG.sql`
4. Copy all content
5. Paste in SQL Editor
6. Click **Run**

**What it does:**
- ✅ Backs up old data
- ✅ Recreates `services` table (global, no shop_id)
- ✅ Creates `shop_services` table (links)
- ✅ Migrates existing data
- ✅ Adds default services (Haircut, Beard Trim, etc.)

### **STEP 2: Test the App** (5 minutes)

1. **Open app → Service Management**
2. **Click "Add Service"**
3. **You should see TWO TABS:**
   - "Select Existing" (browse global services)
   - "Create New" (create new service)

4. **Test Select Existing:**
   - Go to "Select Existing" tab
   - See services like "Haircut", "Beard Trim"
   - Enter a price
   - Click "Add to Shop"
   - ✅ Service appears in your shop

5. **Test Create New:**
   - Go to "Create New" tab
   - Fill: Name = "Hot Towel Shave", Duration = 20, Price = $30
   - Click "Create & Add"
   - ✅ Service created globally + added to your shop

6. **Test from Another Shop:**
   - Create a second shop
   - Go to Service Management
   - Click "Add Service" → "Select Existing"
   - ✅ You should see "Hot Towel Shave" available!

---

## 📊 Database Tables

### **`services` (Global Catalog)**
```
id    | name          | default_duration | category | created_by
------|---------------|------------------|----------|------------
uuid1 | Haircut       | 30              | Hair     | user123
uuid2 | Beard Trim    | 20              | Beard    | user123
uuid3 | Fade Haircut  | 45              | Hair     | user456
```
**NO shop_id** - available to ALL shops
**NO price** - each shop sets their own

### **`shop_services` (Links + Pricing)**
```
id    | shop_id | service_id | custom_price | is_active
------|---------|------------|--------------|----------
uuid1 | shop1   | uuid1      | 25.00       | true
uuid2 | shop2   | uuid1      | 30.00       | true
uuid3 | shop1   | uuid2      | 20.00       | true
```
**Links shops to services**
**Each shop has their own price**

---

## 🔍 Verification

### **Check Global Catalog:**
```sql
SELECT * FROM services ORDER BY category, name;
```

### **Check Shop's Services:**
```sql
SELECT 
  s.name,
  ss.custom_price,
  ss.is_active
FROM shop_services ss
JOIN services s ON s.id = ss.service_id
WHERE ss.shop_id = 'your-shop-id';
```

---

## ✅ What's Different

| Feature | Before | After (Global Catalog) |
|---------|--------|----------------------|
| **Service Storage** | Each shop creates own | All shops share catalog |
| **Pricing** | Fixed per service | Custom per shop |
| **Duplicates** | Yes (many "Haircut"s) | No (one "Haircut") |
| **Add Service** | Create only | Select existing OR create |
| **Edit Service** | Edit all fields | Edit price only |
| **Delete Service** | Deletes completely | Removes from shop only |

---

## 🎉 Summary

**You now have:**
- ✅ Global service catalog (shared by all shops)
- ✅ Dual-mode UI (Select/Create)
- ✅ Custom pricing per shop
- ✅ No duplicate services
- ✅ Easy service browsing

**Files Changed:**
- ✅ `SETUP_GLOBAL_SERVICE_CATALOG.sql` - Database setup
- ✅ `src/lib/shopAuth.js` - New API functions
- ✅ `src/components/shop/ServiceSelectorModal.jsx` - Dual mode UI
- ✅ `src/presentation/shop/ServiceManagementScreen.jsx` - Updated handlers

**To Use:**
1. Run SQL script
2. Test in app
3. Enjoy! 🚀

---

## 📞 Need Help?

Check these files:
- `GLOBAL_CATALOG_COMPLETE_GUIDE.md` - Full documentation
- `SETUP_GLOBAL_SERVICE_CATALOG.sql` - Database script

**Everything is ready!** Just run the SQL and test! 🎯
