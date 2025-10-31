# ✅ DATABASE MIGRATION CHECKLIST

## Pre-Flight Check
- [ ] I have read FRESH_START_GUIDE.md
- [ ] I understand this will delete all tables
- [ ] I have backed up my database in Supabase
- [ ] I am ready to start fresh

---

## Step 1: Clean Slate
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `DELETE_EVERYTHING_FRESH_START.sql`
- [ ] Paste and click "Run"
- [ ] Wait for success message: "🧹 Everything cleaned!"
- [ ] Verify tables are gone (or only system tables remain)

---

## Step 2: Create New Structure  
- [ ] Copy contents of `SHOP_FIRST_DATABASE_SCHEMA.sql`
- [ ] Paste and click "Run"
- [ ] Wait for success message: "🎉 Shop-first database ready!"
- [ ] Verify default shop created
- [ ] Verify you are shop admin

---

## Step 3: Add Security
- [ ] Copy contents of `SHOP_FIRST_RLS_POLICIES.sql`
- [ ] Paste and click "Run"
- [ ] Wait for success message: "✅ All RLS policies created!"
- [ ] Verify policies are active

---

## Step 4: Test Database
- [ ] Run test query to check shops:
```sql
SELECT * FROM shops;
```
- [ ] Run test query to check shop_staff:
```sql
SELECT * FROM shop_staff;
```
- [ ] Run test query to check your role:
```sql
SELECT * FROM get_user_shops((SELECT id FROM profiles WHERE email = 'smokygaming171@gmail.com'));
```

---

## Step 5: Update Frontend Code

### A. Update Imports
- [ ] Change all `import { ... } from './lib/auth'` to `from './lib/shopAuth'`
- [ ] Update App.js/Main navigation to use new screens

### B. Replace Home Screen
- [ ] Import ShopBrowserScreen
- [ ] Replace old HomeScreen with ShopBrowserScreen
- [ ] Add new routes: ShopDetailsScreen, CreateShopScreen, ShopSelectionScreen

### C. Update Profile Screen
- [ ] Import `getUserRoleInShop`, `getMyShops` from shopAuth
- [ ] Display user's shop and role
- [ ] Show "Create Shop" option

### D. Update Booking Flow
- [ ] Modify booking to require shop_id
- [ ] Make barber_id optional
- [ ] Update UI to show shop selection first

### E. Update Management Screens
- [ ] Add shop_id context to all management screens
- [ ] Filter services by shop_id
- [ ] Filter bookings by shop_id
- [ ] Update staff management for shop context

---

## Step 6: Test App

### Test as Customer:
- [ ] Can browse shops
- [ ] Can view shop details
- [ ] Can see shop services
- [ ] Can see shop barbers
- [ ] Can book appointment (with or without barber)
- [ ] Can view own bookings
- [ ] Can leave review

### Test as Shop Admin:
- [ ] Can create new shop
- [ ] Can edit shop details
- [ ] Can add services
- [ ] Can invite staff
- [ ] Can manage bookings
- [ ] Can view reviews

### Test as Barber:
- [ ] Can see assigned bookings
- [ ] Can update booking status
- [ ] Profile shows correct role

### Test as Manager:
- [ ] Can manage shop bookings
- [ ] Can manage services
- [ ] Can manage staff

---

## Step 7: Update Shop Details (Optional)
- [ ] Go to Supabase SQL Editor
- [ ] Update default shop with real info:
```sql
UPDATE shops 
SET 
  name = 'Your Shop Name',
  description = 'Your shop description',
  address = 'Your address',
  city = 'Your city',
  state = 'Your state',
  zip_code = 'Your zip',
  phone = 'Your phone',
  email = 'Your email',
  website = 'Your website',
  logo_url = 'Your logo URL'
WHERE name = 'Premium Barbershop';
```

---

## Troubleshooting

### If DELETE_EVERYTHING_FRESH_START.sql fails:
- Check error message
- You may need to run it multiple times
- Some dependencies might require manual intervention

### If SHOP_FIRST_DATABASE_SCHEMA.sql fails:
- Make sure step 1 completed successfully
- Check if profiles table exists (should be auto-created by Supabase auth)
- Verify you have at least one user in auth.users

### If SHOP_FIRST_RLS_POLICIES.sql fails:
- Make sure step 2 completed successfully
- Check if all tables exist
- Verify functions were created

### If app shows errors:
- Check Supabase URL and anon key
- Verify RLS policies are enabled
- Check browser console for detailed errors
- Verify user is logged in

---

## Success Criteria

### Database:
- ✅ All new tables created
- ✅ Default shop exists
- ✅ You are shop admin
- ✅ RLS policies active
- ✅ Functions working

### Frontend:
- ✅ Home shows shops (not barbers)
- ✅ Can view shop details
- ✅ Can create bookings
- ✅ Profile shows shop role
- ✅ Management screens work

---

## 🎉 Done!

You now have a complete multi-shop platform!

**Next steps:**
- Customize default shop
- Add services
- Invite team members
- Promote to users
- Get bookings!

---

## Need Help?

Check these files:
- `FRESH_START_GUIDE.md` - Detailed explanation
- `PROJECT_TRANSFORMATION_SUMMARY.md` - Complete overview
- `SHOP_FIRST_COMPLETE_GUIDE.md` - Implementation details
- `DATABASE_MIGRATION_STEPS.md` - Migration info

Good luck! 🚀
