# HOW TO RUN THE MULTI-INDUSTRY MIGRATION

## ✅ Pre-Flight Checklist

Before running the migration:
1. ✅ Backup your database (just in case)
2. ✅ Make sure you have access to Supabase dashboard
3. ✅ This migration is NON-DESTRUCTIVE (adds columns, doesn't delete anything)

---

## 🚀 STEP-BY-STEP GUIDE

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Copy the Migration SQL
1. Open the file: `MULTI_INDUSTRY_MIGRATION.sql`
2. Select ALL the content (Cmd+A or Ctrl+A)
3. Copy it (Cmd+C or Ctrl+C)

### Step 3: Run the Migration
1. In Supabase SQL Editor, paste the entire migration
2. Click "Run" button (or press Cmd+Enter / Ctrl+Enter)
3. Wait for it to complete (should take 5-10 seconds)

### Step 4: Verify Success
You should see at the bottom:
```
✅ Multi-industry migration complete!
🎉 Your platform now supports ALL industries!
```

And a summary showing:
- 6 business categories created
- 59 business types created
- All existing shops updated with barbershop category

---

## 📊 WHAT THIS MIGRATION DOES

### New Tables Created
1. **business_categories** - 6 main industry categories
   - 💇 Beauty & Personal Care
   - 💪 Health & Wellness
   - 💼 Professional Services
   - 🏠 Home Services
   - 🚗 Automotive
   - 🎉 Events & Entertainment

2. **business_types** - 59+ specific business types
   - Barbershop, Hair Salon, Nail Salon, Spa & Massage, etc.
   - Massage Therapy, Personal Training, Yoga Studio, etc.
   - Consultants, Coaches, Tutors, etc.
   - House Cleaning, Plumbing, Electrical, etc.
   - Car Wash, Auto Detailing, etc.
   - Photography, DJ Services, Event Planning, etc.

3. **service_categories** - Organize services within a business

### Enhanced Existing Tables

**shops table** - Added 20+ new columns:
- `category_id` - Industry category
- `business_type_id` - Specific business type
- `is_mobile_service` - Can travel to customers
- `service_radius_km` - How far they travel
- `accepts_walkins` - Take walk-ins
- `booking_lead_time_hours` - Min hours to book in advance
- `cancellation_policy` - Business cancellation policy
- `amenities` - WiFi, Parking, etc.
- `languages_spoken` - Languages staff speaks
- `instagram_handle`, `facebook_url`, `twitter_handle`
- And more...

**services table** - Added flexible pricing and types:
- `service_type` - appointment, class, consultation, package, rental
- `is_group_service` - For classes/workshops
- `min/max_duration_minutes` - Variable duration
- `deposit_required`, `deposit_amount` - Deposit handling
- `image_url`, `gallery_images` - Service photos

**bookings table** - Enhanced tracking:
- `booking_type` - Different booking types
- `is_recurring` - Recurring appointments
- `payment_status` - Track payment state
- `cancellation_reason`, `cancelled_by`, `cancelled_at`
- `is_walkin` - Walk-in tracking

**profiles table** - Customer preferences:
- `favorite_businesses` - Saved favorites
- `city`, `state`, `country` - Location for "near me"
- `notification_preferences` - Notification settings
- `total_bookings`, `total_spent` - Customer stats

### New Helper Functions
- `get_business_categories()` - Get all categories with counts
- `get_business_types_by_category(category_id)` - Get types for a category
- `search_businesses(...)` - Search by category, type, location, query
- Updated `get_shop_details()` - Now includes category info

---

## ⚠️ TROUBLESHOOTING

### Error: "relation does not exist"
**Problem**: A table doesn't exist in your database
**Solution**: Make sure you're running this on the correct database

### Error: "column already exists"
**Problem**: Migration was already run before
**Solution**: This is OK! The migration uses `ADD COLUMN IF NOT EXISTS`, so it's safe to run multiple times

### Error: "permission denied"
**Problem**: User doesn't have permission
**Solution**: Make sure you're logged in as the database owner in Supabase

### Migration runs but no data
**Problem**: Tables created but categories are empty
**Solution**: Check if the INSERT statements completed. You can manually run just the STEP 8 section again.

---

## ✅ POST-MIGRATION CHECKLIST

After running the migration successfully:

1. **Verify Categories**
   Run this query to see all categories:
   ```sql
   SELECT * FROM get_business_categories();
   ```
   Should return 6 categories.

2. **Verify Business Types**
   Run this query:
   ```sql
   SELECT COUNT(*) FROM business_types WHERE is_active = true;
   ```
   Should return 59.

3. **Check Existing Shops**
   Run this query:
   ```sql
   SELECT name, category_id, business_type_id FROM shops;
   ```
   Existing shops should now have category_id and business_type_id set to "Barbershop".

4. **Test Search Function**
   Run this query:
   ```sql
   SELECT * FROM search_businesses(NULL, NULL, NULL, NULL, 10, 0);
   ```
   Should return shops (if any exist).

---

## 🎯 NEXT STEPS AFTER MIGRATION

Once the migration is complete:

1. ✅ **Update Registration UI** - Add category/type selection screens
2. ✅ **Update Home Screen** - Show category grid for browsing
3. ✅ **Update Search** - Allow filtering by category/type
4. ✅ **Update Terminology** - Change "shop" to "business" in UI
5. ✅ **Test End-to-End** - Register a new business with different category

---

## 🆘 NEED HELP?

If you encounter any issues:
1. Check the error message carefully
2. Make sure you copied the ENTIRE migration file
3. Try running it in smaller sections (one STEP at a time)
4. Check Supabase logs for detailed error messages

---

## 📝 ROLLBACK (If Needed)

If something goes wrong and you need to rollback:

```sql
-- Drop new tables (⚠️ This will delete all category data!)
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS business_types CASCADE;
DROP TABLE IF EXISTS business_categories CASCADE;

-- Remove new columns from shops (⚠️ Careful with this!)
ALTER TABLE shops DROP COLUMN IF EXISTS category_id;
ALTER TABLE shops DROP COLUMN IF EXISTS business_type_id;
-- (Continue for other columns if needed)
```

**Note**: Only use rollback if absolutely necessary. The migration is designed to be safe and non-destructive.

---

**Good luck! 🚀 Your app is about to support ALL industries!**
