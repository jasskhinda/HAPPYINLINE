# 🏪 COMPLETE SHOP-FIRST TRANSFORMATION GUIDE

## 🎯 What Changed

Your app is now transformed from a **single-barber shop** to a **multi-shop platform**:

### OLD Architecture:
```
- Home Screen → Browse Barbers
- Pick Barber → View Services → Book
- Profile shows global role (admin/manager/barber)
```

### NEW Architecture:
```
- Home Screen → Browse Shops
- Pick Shop → View Barbers & Services → Book (barber optional)
- Profile shows role within current shop (admin/manager/barber)
```

---

## 📦 What Was Created

### 1. Database Files (Backend)
- `SHOP_FIRST_DATABASE_SCHEMA.sql` - Complete database redesign
- `SHOP_FIRST_RLS_POLICIES.sql` - Security policies

### 2. Authentication & API
- `src/lib/shopAuth.js` - All shop-centric functions

### 3. Frontend Screens
- `src/presentation/main/bottomBar/home/ShopBrowserScreen.jsx` - Browse shops (NEW HOME)
- `src/presentation/main/bottomBar/home/ShopDetailsScreen.jsx` - Shop details with tabs
- `src/presentation/shop/CreateShopScreen.jsx` - Create new shop
- `src/presentation/shop/ShopSelectionScreen.jsx` - Switch between user's shops

---

## 🗄️ DATABASE CHANGES

### New Tables:

#### 1. `shops` - Shop Information
```sql
- id, name, description, address, city, state, phone
- logo_url, cover_image_url, gallery_images
- business_hours (JSON)
- rating, total_reviews, total_bookings
- is_active, is_verified
- created_by (owner)
```

#### 2. `shop_staff` - Staff Roles per Shop
```sql
- shop_id, user_id, role (admin/manager/barber)
- bio, specialties (for barbers)
- rating, total_reviews (for barbers)
- is_available, is_active
```

#### 3. `shop_reviews` - Shop Reviews
```sql
- shop_id, customer_id, booking_id
- rating, review_text
- barber_id, barber_rating (optional)
- services (JSON)
```

### Updated Tables:

#### `profiles` - Simplified
```sql
REMOVED: role, specialties, rating, total_reviews, bio, is_super_admin
ADDED: is_platform_admin (for platform owners)
KEPT: id, email, name, phone, profile_image, onboarding_completed
```

#### `services` - Shop-Owned
```sql
ADDED: shop_id (which shop owns this service)
ADDED: category, is_active
```

#### `bookings` - Shop-Centric
```sql
ADDED: shop_id (required)
CHANGED: barber_id (now optional - customers can book without choosing barber)
ADDED: shop_rating, shop_review, barber_rating, barber_review
```

---

## 🔒 SECURITY MODEL (RLS)

### Customers:
- ✅ View all active shops
- ✅ View shop services, barbers, reviews
- ✅ Create bookings
- ✅ View own bookings
- ✅ Rate/review shops after completed bookings

### Barbers:
- ✅ View assigned bookings in their shop
- ✅ Update booking status
- ✅ View shop they work for
- ❌ Cannot manage services or staff

### Managers:
- ✅ View all shop bookings
- ✅ Manage shop services
- ✅ Manage shop staff (add/remove barbers)
- ✅ Update booking statuses
- ❌ Cannot edit shop details

### Admins (Shop Owners):
- ✅ Full control over their shop
- ✅ Edit shop information
- ✅ Manage all staff and services
- ✅ View analytics
- ✅ Invite managers and barbers

### Platform Admins:
- ✅ View/manage all shops
- ✅ Verify shops
- ✅ Access all data (for support/moderation)

---

## 🚀 STEP-BY-STEP MIGRATION

### Step 1: Backup Your Database ⚠️
```sql
-- In Supabase Dashboard:
-- Settings → Project Settings → Database → Backups
-- Create a manual backup before proceeding!
```

### Step 2: Run Database Migration
```sql
-- In Supabase SQL Editor, run in order:
1. SHOP_FIRST_DATABASE_SCHEMA.sql
2. SHOP_FIRST_RLS_POLICIES.sql
```

This will:
- Create new tables
- Migrate existing data to a "default shop"
- Set up security policies
- Create helper functions

### Step 3: Update Frontend Files

#### 3.1 Replace Home Screen
Your old `HomeScreen.jsx` showed barbers. Replace it with shop browsing:

```javascript
// In src/Main.jsx or your navigator, change:
<RootStack.Screen name="HomeScreen" component={ShopBrowserScreen} />
```

#### 3.2 Add New Screens to Navigator
```javascript
// Add to your RootStack.Navigator:
<RootStack.Screen name="ShopBrowserScreen" component={ShopBrowserScreen} />
<RootStack.Screen name="ShopDetailsScreen" component={ShopDetailsScreen} />
<RootStack.Screen name="CreateShopScreen" component={CreateShopScreen} />
<RootStack.Screen name="ShopSelectionScreen" component={ShopSelectionScreen} />
```

#### 3.3 Update Profile Screen
Modify `ProfileScreen.jsx` to show user's role in current shop:

```javascript
import { getUserRoleInShop, getMyShops } from '../../lib/shopAuth';

// In your component:
const [userRole, setUserRole] = useState(null);
const [currentShop, setCurrentShop] = useState(null);

useEffect(() => {
  loadUserShopData();
}, []);

const loadUserShopData = async () => {
  const { success, shops } = await getMyShops();
  if (success && shops.length > 0) {
    const shop = shops[0]; // Or get from AsyncStorage
    setCurrentShop(shop);
    
    const { role } = await getUserRoleInShop(shop.shop_id);
    setUserRole(role);
  }
};

// Then display in UI:
{userRole && (
  <View style={styles.roleSection}>
    <Text>Your Role: {userRole.toUpperCase()}</Text>
    <Text>Shop: {currentShop.shop_name}</Text>
  </View>
)}
```

#### 3.4 Update Booking Components
```javascript
// BarberInfoScreen.jsx → ShopDetailsScreen.jsx
// When booking, always include shop_id:

import { createBooking } from '../../lib/shopAuth';

const handleBookNow = async () => {
  const bookingData = {
    shop_id: shopId, // From route params or state
    barber_id: selectedBarber?.id || null, // Optional
    services: selectedServices,
    appointment_date: date,
    appointment_time: time,
    total_amount: totalPrice,
    customer_notes: notes
  };
  
  const { success, booking } = await createBooking(bookingData);
  if (success) {
    Alert.alert('Success', `Booking created: ${booking.booking_id}`);
  }
};
```

#### 3.5 Update Management Screens
```javascript
// ServiceManagementScreen.jsx
import { getShopServices, createShopService, updateShopService } from '../../lib/shopAuth';

// Always pass shop_id:
const loadServices = async () => {
  const { success, services } = await getShopServices(currentShopId);
  setServices(services);
};

// When creating service:
const handleCreateService = async (serviceData) => {
  const { success } = await createShopService(currentShopId, serviceData);
};
```

#### 3.6 Update Bookings Screen
```javascript
// MyBookingScreen.jsx
import { getMyBookings } from '../../lib/shopAuth';

// User's bookings now show which shop they're for:
const loadBookings = async () => {
  const { success, bookings } = await getMyBookings();
  // Each booking has shop info:
  // booking.shop.name, booking.shop.address, etc.
};
```

---

## 📱 NEW USER FLOWS

### Customer Flow:
```
1. Open App → Browse Shops (ShopBrowserScreen)
2. Tap Shop → View Details (ShopDetailsScreen)
   - Services Tab: Browse services
   - Barbers Tab: Browse barbers (optional)
   - Reviews Tab: Read reviews
   - About Tab: Shop info & hours
3. Tap "Book" on Service or Barber
4. Fill booking details → Create booking
5. View in "My Bookings" → Rate after completion
```

### Shop Owner Flow:
```
1. Open App → "Create Your Shop" button
2. Fill shop details (CreateShopScreen)
3. Shop created → Automatically added as admin
4. Manage Shop:
   - Add Services
   - Invite Barbers/Managers
   - View Bookings
   - Respond to Reviews
```

### Barber Flow:
```
1. Shop admin invites barber (adds to shop_staff)
2. Barber opens app → Sees their shop
3. Profile shows: "Your Role: BARBER at Shop Name"
4. View assigned bookings
5. Update booking status (completed/no-show)
```

### Manager Flow:
```
1. Shop admin invites manager
2. Manager can:
   - View all shop bookings
   - Manage services
   - Invite/remove barbers
   - Confirm/cancel bookings
```

---

## 🔧 REQUIRED CODE UPDATES

### 1. Import New Functions
Replace old imports throughout your app:

```javascript
// OLD:
import { fetchBarbers, fetchServices } from './lib/auth';

// NEW:
import { 
  getAllShops, 
  getShopBarbers, 
  getShopServices,
  createBooking,
  getMyBookings
} from './lib/shopAuth';
```

### 2. Update All API Calls

#### OLD Way (Barber-Centric):
```javascript
// Get all barbers
const { barbers } = await fetchBarbers();

// Create booking
await createBooking({ barberId, services, date, time });
```

#### NEW Way (Shop-Centric):
```javascript
// Get all shops
const { shops } = await getAllShops();

// Get barbers for a shop
const { barbers } = await getShopBarbers(shopId);

// Create booking (shop required, barber optional)
await createBooking({ 
  shop_id: shopId, 
  barber_id: barberId || null, // Optional!
  services, 
  date, 
  time 
});
```

### 3. Update Profile Display

```javascript
// OLD: Show global role
<Text>Role: {user.role}</Text>

// NEW: Show role in current shop
const { role } = await getUserRoleInShop(currentShopId);
<Text>Role in {shopName}: {role?.toUpperCase() || 'Customer'}</Text>
```

---

## 🧪 TESTING CHECKLIST

### Database Migration:
- [ ] Backup created
- [ ] SHOP_FIRST_DATABASE_SCHEMA.sql executed successfully
- [ ] SHOP_FIRST_RLS_POLICIES.sql executed successfully
- [ ] Default shop created with your data
- [ ] You are admin of default shop

### Test Queries:
```sql
-- Check default shop
SELECT * FROM shops;

-- Check you're an admin
SELECT * FROM shop_staff WHERE user_id = 'your-user-id';

-- Check services migrated
SELECT * FROM services WHERE shop_id IS NOT NULL;

-- Check bookings migrated
SELECT * FROM bookings WHERE shop_id IS NOT NULL;
```

### Frontend Testing:
- [ ] Home screen shows shops (not barbers)
- [ ] Can tap shop to view details
- [ ] Can see barbers inside shop
- [ ] Can see services inside shop
- [ ] Can create booking with shop_id
- [ ] Profile shows role in shop
- [ ] Can create new shop
- [ ] Can invite staff to shop

### Role Testing:
- [ ] Customer: Can browse shops, create bookings
- [ ] Barber: Can see assigned bookings only
- [ ] Manager: Can see all shop bookings
- [ ] Admin: Can manage shop fully
- [ ] Platform Admin: Can see all shops

---

## 🎨 UI CHANGES SUMMARY

### Home Screen (OLD → NEW):
```
OLD: List of barbers with ratings
NEW: List of shops with ratings, location, images
```

### Booking Flow (OLD → NEW):
```
OLD: Pick Barber → Services → Book
NEW: Pick Shop → Services/Barbers → Book (barber optional)
```

### Profile (OLD → NEW):
```
OLD: "Role: Manager" (global)
NEW: "Role: MANAGER at Bob's Barbershop" (shop-specific)
```

### Management Screens:
```
- All filtered by current shop
- Can switch between shops if staff at multiple
- Role-based UI (barbers see less than managers)
```

---

## 🆘 TROUBLESHOOTING

### "No shops found":
```sql
-- Check shops exist:
SELECT * FROM shops;

-- If none, create manually:
INSERT INTO shops (name, address, phone, created_by)
VALUES ('My Shop', '123 Main St', '555-1234', 'your-user-id');
```

### "Permission denied" errors:
```sql
-- Check RLS policies:
SELECT * FROM pg_policies WHERE tablename = 'shops';

-- Test your role:
SELECT * FROM shop_staff WHERE user_id = auth.uid();
```

### "Bookings not showing":
```sql
-- Check bookings have shop_id:
SELECT id, booking_id, shop_id FROM bookings;

-- If NULL, assign to default shop:
UPDATE bookings SET shop_id = (SELECT id FROM shops LIMIT 1) WHERE shop_id IS NULL;
```

### Profile not showing role:
```javascript
// Make sure you're loading role correctly:
const { role } = await getUserRoleInShop(shopId);
console.log('User role:', role); // Should be 'admin', 'manager', or 'barber'
```

---

## 📊 KEY FEATURES

### ✅ What Works Now:
1. **Multiple Shops**: Anyone can create and manage shops
2. **Shop Discovery**: Browse all active shops with ratings
3. **Optional Barbers**: Book with shop only, or pick specific barber
4. **Role-Based Access**: Different permissions per shop per user
5. **Shop Reviews**: Rate shops and barbers separately
6. **Staff Management**: Admins can invite barbers/managers
7. **Data Isolation**: Each shop's data is private and secure

### 🚀 Future Enhancements:
1. Shop analytics dashboard
2. Multiple photos per shop
3. Map view for nearby shops
4. Advanced search/filters
5. Booking packages
6. Loyalty programs
7. Staff scheduling
8. Revenue tracking

---

## 💡 IMPORTANT NOTES

1. **Barber Selection is Optional**: Customers can now book without choosing a specific barber. The shop can assign later.

2. **Role Hierarchy**: 
   - Platform Admin > Shop Admin > Manager > Barber

3. **Reviews**: Customers rate the shop (required) and can optionally rate the barber.

4. **Old Data**: Your existing bookings and services are moved to a "default shop" that you own.

5. **Profile Changes**: User profiles no longer store role/rating globally. These are now per-shop in `shop_staff` table.

---

## ✨ YOU'RE DONE!

Your app is now a full-featured multi-shop platform! 🎉

**Next Steps:**
1. Run database migrations
2. Update your frontend imports
3. Test thoroughly
4. Deploy to production
5. Onboard shop owners!

---

**Need Help?** Check the troubleshooting section or review the SQL/JS files created.