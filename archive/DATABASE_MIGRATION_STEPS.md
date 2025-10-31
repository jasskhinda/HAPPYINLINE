# 🔧 DATABASE MIGRATION GUIDE - CLEAN APPROACH

## Problem
You're getting dependency errors because:
- **RLS Policies** on tables depend on old columns
- **Triggers** depend on functions
- **Functions** depend on old table structures
- Can't drop columns because policies reference them

## Solution - Two Scripts Approach

### 📝 **Script 1: DROP_ALL_CLEAN_SLATE.sql**
**Run this FIRST** - Safely drops everything in correct order:
1. ✅ Drops all RLS policies
2. ✅ Disables RLS on tables
3. ✅ Drops all triggers
4. ✅ Drops all functions
5. ✅ Drops old tables (shops, shop_staff, shop_reviews, etc.)
6. ✅ Cleans up profiles table (removes old columns)

### 📝 **Script 2: SHOP_FIRST_DATABASE_SCHEMA.sql**
**Run this SECOND** - Creates new structure:
1. ✅ Creates shops table
2. ✅ Creates shop_staff table
3. ✅ Updates profiles table
4. ✅ Creates/updates services table
5. ✅ Creates/updates bookings table
6. ✅ Creates shop_reviews table
7. ✅ Creates indexes
8. ✅ Creates helper functions
9. ✅ Creates triggers
10. ✅ Migrates existing data to default shop
11. ✅ Grants permissions

## 🚀 How to Run

### Step 1: Backup Your Database
**CRITICAL!** In Supabase Dashboard:
- Go to Database → Backups
- Create a manual backup
- Or export your data

### Step 2: Run DROP_ALL_CLEAN_SLATE.sql
```sql
-- Copy entire contents of DROP_ALL_CLEAN_SLATE.sql
-- Paste in Supabase SQL Editor
-- Click "Run"
```

**Expected Output:**
```
✅ All old structures dropped!
📝 Now run: SHOP_FIRST_DATABASE_SCHEMA.sql
```

### Step 3: Run SHOP_FIRST_DATABASE_SCHEMA.sql
```sql
-- Copy entire contents of SHOP_FIRST_DATABASE_SCHEMA.sql
-- Paste in Supabase SQL Editor
-- Click "Run"
```

**Expected Output:**
```
✅ Database schema created!
🎉 Shop-first database ready!
📝 Next: Run SHOP_FIRST_RLS_POLICIES.sql
```

### Step 4: Run SHOP_FIRST_RLS_POLICIES.sql
```sql
-- Copy entire contents of SHOP_FIRST_RLS_POLICIES.sql
-- Paste in Supabase SQL Editor
-- Click "Run"
```

## ✅ What Gets Preserved

- ✅ **auth.users** table (Supabase auth)
- ✅ **profiles** table (cleaned up, no old columns)
- ✅ Your user accounts
- ✅ Authentication data

## ❌ What Gets Deleted

- ❌ Old shops, shop_members, shop_services tables
- ❌ Old RLS policies
- ❌ Old functions and triggers
- ❌ Old services and bookings (BUT will be migrated to default shop)

## 🔄 What Gets Migrated

The **SHOP_FIRST_DATABASE_SCHEMA.sql** script includes migration logic:

1. **Finds your admin account** (smokygaming171@gmail.com)
2. **Creates default shop** named "Premium Barbershop"
3. **Makes you admin** of default shop
4. **Migrates existing services** to default shop
5. **Migrates existing bookings** to default shop

## 🎯 After Migration

Your database will have:
- ✅ **shops** table with your default shop
- ✅ **shop_staff** table with you as admin
- ✅ **services** table with shop_id
- ✅ **bookings** table with shop_id
- ✅ **shop_reviews** table (empty, ready for reviews)
- ✅ All new functions and triggers
- ✅ Clean profiles table (no role column, has is_platform_admin)

## 🐛 Troubleshooting

### Error: "relation does not exist"
**Solution:** Run DROP_ALL_CLEAN_SLATE.sql first

### Error: "cannot drop because other objects depend on it"
**Solution:** The DROP_ALL_CLEAN_SLATE.sql script handles this with CASCADE

### Error: "column does not exist"
**Solution:** Script uses IF EXISTS checks, should not happen

### No default shop created
**Check:** Do you have any users in profiles table?
**Fix:** The script uses first user if your email not found

## 📞 Support

If you still get errors:
1. Check Supabase logs for detailed error
2. Verify you ran DROP_ALL_CLEAN_SLATE.sql first
3. Make sure you have backup!
4. Try running each script section by section

---

## 🎉 Ready to Start!

1. **Backup** your database
2. Run **DROP_ALL_CLEAN_SLATE.sql**
3. Run **SHOP_FIRST_DATABASE_SCHEMA.sql**
4. Run **SHOP_FIRST_RLS_POLICIES.sql**
5. Test your app!
