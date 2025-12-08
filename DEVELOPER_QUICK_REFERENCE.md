# Developer Quick Reference Guide
**Happy Inline - Multi-Industry Booking Platform**

Quick reference for common development tasks and troubleshooting.

---

## 🚀 Quick Start

### Install Dependencies
```bash
cd "/Volumes/C/HAPPY INLINE"
npm install
```

### Run Development Server
```bash
# Start Expo dev server
npm start

# Or specific platform
npx expo start --ios
npx expo start --android
npx expo start --web
```

### Clear Cache
```bash
# If you encounter weird errors, clear cache
npx expo start --clear

# Or full cleanup
rm -rf node_modules
npm install
npx expo start --clear
```

---

## 🔧 Common Tasks

### Add New Dependency
```bash
# Install package
npm install package-name

# For Expo-compatible packages
npx expo install package-name
```

### Update Dependencies
```bash
# Update all packages
npm update

# Update Expo SDK
npx expo upgrade
```

### Run on Physical Device
```bash
# Make sure device and computer are on same Wi-Fi
npx expo start

# Scan QR code with:
# - iOS: Camera app
# - Android: Expo Go app
```

---

## 📁 Project Structure

```
/Volumes/C/HAPPY INLINE/
├── src/
│   ├── lib/                    # Core business logic
│   │   ├── auth.js            # Authentication functions
│   │   ├── shopAuth.js        # Shop management functions
│   │   ├── messaging.js       # Chat/messaging functions
│   │   ├── supabase.js        # Database configuration
│   │   └── presence.js        # User presence tracking
│   │
│   ├── presentation/           # UI Screens
│   │   ├── auth/              # Login/Registration screens
│   │   ├── booking/           # Booking flow screens
│   │   ├── main/              # Main app screens
│   │   ├── shop/              # Shop management screens
│   │   └── splash/            # Splash screen
│   │
│   ├── components/             # Reusable components
│   │   ├── shop/              # Shop-related components
│   │   ├── inputTextField/    # Input components
│   │   ├── services/          # Service components
│   │   ├── pricing/           # Pricing components
│   │   └── appBar/            # App bar components
│   │
│   ├── utils/                  # Utility functions
│   │   └── logger.js          # Production-safe logger
│   │
│   └── constants/              # App constants
│
├── assets/                     # Images, fonts, etc.
├── database/                   # SQL scripts
├── scripts/                    # Helper scripts
├── app.json                    # Expo configuration
└── package.json               # Dependencies
```

---

## 🔑 Key Files

### Authentication (`src/lib/auth.js`)
```javascript
import {
  signUpWithEmail,      // Register new user
  signInWithEmail,      // Send OTP to email
  verifyEmailOTP,       // Verify OTP code
  getCurrentUser,       // Get authenticated user
  checkAuthState,       // Check if user is logged in
  signOut,              // Logout user
  setupUserProfile,     // Create/update profile
  updateProfile,        // Update user profile
} from './lib/auth';

// Example: Login flow
const { success } = await signInWithEmail('user@email.com');
if (success) {
  // OTP sent, navigate to verification screen
  navigation.navigate('OTPVerification', { email: 'user@email.com' });
}
```

### Shop Management (`src/lib/shopAuth.js`)
```javascript
import {
  createShop,           // Create new business
  getShopDetails,       // Get shop by ID
  getAllShops,          // Get all active shops
  getShopStaff,         // Get shop staff members
  addStaffMember,       // Add staff to shop
  createBooking,        // Create booking for shop
  getShopBookings,      // Get shop bookings
} from './lib/shopAuth';

// Example: Create shop
const result = await createShop({
  name: 'My Salon',
  address: '123 Main St',
  phone: '555-1234',
  subscription_plan: 'starter',  // starter, professional, enterprise
  category_id: 'salon-uuid',
  business_type_id: 'hair-salon-uuid'
});
```

### Logging (`src/utils/logger.js`)
```javascript
import { logger } from './utils/logger';

// Development only (hidden in production)
logger.log('Debug information');
logger.warn('Warning message');
logger.info('Info message');

// Always logged (even in production)
logger.error('Error occurred', error);

// Special loggers
logRequest('POST', '/api/bookings', data, response);
logPerformance('Fetch bookings', async () => await fetchBookings());
logUserAction('Clicked booking button', { bookingId: '123' });
logNavigation('HomeScreen', 'BookingScreen', { shopId: '456' });
```

---

## 🎨 UI Components

### Toast Notifications
```javascript
import Toast from 'react-native-toast-message';

// Success
Toast.show({
  type: 'success',
  text1: 'Success',
  text2: 'Operation completed successfully'
});

// Error
Toast.show({
  type: 'error',
  text1: 'Error',
  text2: 'Something went wrong'
});

// Info
Toast.show({
  type: 'info',
  text1: 'Info',
  text2: 'Please wait...'
});
```

### Loading States
```javascript
const [loading, setLoading] = useState(false);

<TouchableOpacity
  disabled={loading}
  onPress={handleAction}
  style={[styles.button, loading && styles.buttonDisabled]}
>
  {loading ? (
    <ActivityIndicator size="small" color="#FFF" />
  ) : (
    <Text style={styles.buttonText}>Submit</Text>
  )}
</TouchableOpacity>
```

---

## 🗄️ Database Operations

### Query Patterns
```javascript
// SELECT with filters
const { data, error } = await supabase
  .from('shops')
  .select('id, name, address')
  .eq('is_active', true)
  .gte('rating', 4.0)
  .order('created_at', { ascending: false })
  .limit(20);

// INSERT
const { data, error } = await supabase
  .from('profiles')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    role: 'customer'
  })
  .select()
  .single();

// UPDATE
const { data, error } = await supabase
  .from('profiles')
  .update({ name: 'Jane Doe' })
  .eq('id', userId)
  .select()
  .single();

// DELETE
const { error } = await supabase
  .from('bookings')
  .delete()
  .eq('id', bookingId);
```

### Relationships (Joins)
```javascript
// Fetch booking with related customer and shop
const { data } = await supabase
  .from('bookings')
  .select(`
    *,
    customer:profiles!bookings_customer_id_fkey(id, name, email),
    shop:shops!bookings_shop_id_fkey(id, name, address)
  `)
  .eq('id', bookingId)
  .single();

// Access: data.customer.name, data.shop.name
```

---

## 🔐 Role-Based Access Control

### User Roles
```javascript
// Hierarchy (highest to lowest permission)
'super_admin'  // Platform admin (full access)
'owner'        // Business owner
'admin'        // Business admin
'manager'      // Business manager
'barber'       // Service provider (uses license)
'customer'     // Customer (default)
```

### Check User Role
```javascript
import { getCurrentUser } from './lib/auth';

const { user, profile } = await getCurrentUser();

if (profile.role === 'super_admin') {
  // Show admin features
} else if (['owner', 'admin', 'manager'].includes(profile.role)) {
  // Show business management features
} else if (profile.role === 'barber') {
  // Show barber features
} else {
  // Customer view
}
```

---

## 💰 Subscription Plans

### Available Plans
```javascript
const plans = {
  starter: {
    price: 24.99,
    maxLicenses: 2,
    features: ['1-2 providers', 'Unlimited bookings', 'Online payments']
  },
  professional: {
    price: 74.99,
    maxLicenses: 9,
    features: ['3-9 providers', 'Unlimited bookings', 'Online payments', 'Priority support']
  },
  enterprise: {
    price: 149.99,
    maxLicenses: 14,
    features: ['10-14 providers', 'Unlimited bookings', 'Online payments', 'Priority support', 'Custom features']
  }
};
```

### Check License Limits
```javascript
// Before adding staff
const shop = await getShopDetails(shopId);
const currentProviders = staff.filter(s => s.role === 'barber').length;

if (currentProviders >= shop.max_licenses) {
  Alert.alert(
    'License Limit Reached',
    `Your ${shop.subscription_plan} plan supports up to ${shop.max_licenses} providers.`
  );
  return;
}
```

---

## 🐛 Debugging

### Enable Debug Logs
```javascript
// src/utils/logger.js already handles this
// In development: all logs visible
// In production: only errors visible

// Force enable all logs temporarily
const __DEV__ = true;  // Change in logger.js
```

### Common Issues

**Issue: "No auth user found"**
```javascript
// Check if user is logged in
const { isAuthenticated, user, profile } = await checkAuthState();
console.log('Authenticated:', isAuthenticated);
console.log('User:', user);
console.log('Profile:', profile);
```

**Issue: "Column does not exist"**
```javascript
// Verify column names in Supabase dashboard
// Common fixes:
// - owner_id → created_by ✅ (fixed)
// - Check foreign key column names
```

**Issue: "RLS policy violation"**
```javascript
// Check RLS policies in Supabase dashboard
// Ensure policies allow the operation
// Test with correct user ID
```

---

## 📱 Navigation

### Navigate Between Screens
```javascript
// Navigate to screen
navigation.navigate('ScreenName', { param1: 'value' });

// Go back
navigation.goBack();

// Replace current screen (no back button)
navigation.replace('ScreenName');

// Reset navigation stack
navigation.reset({
  index: 0,
  routes: [{ name: 'HomeScreen' }],
});

// Access params
const { param1 } = route.params;
```

---

## 🧪 Testing

### Manual Testing Checklist
```
□ User Registration (OTP)
□ User Registration (Password)
□ User Login (OTP)
□ User Login (Password)
□ Create Business
□ Add Service Provider
□ Create Booking
□ Send Message
□ Update Profile
□ Logout
```

### Test with Different Roles
```javascript
// Create test users with different roles
const testUsers = {
  superAdmin: 'superadmin@test.com',
  owner: 'owner@test.com',
  manager: 'manager@test.com',
  barber: 'barber@test.com',
  customer: 'customer@test.com'
};
```

---

## 🚨 Troubleshooting

### App Won't Start
```bash
# 1. Clear cache
npx expo start --clear

# 2. Reinstall dependencies
rm -rf node_modules
npm install

# 3. Check for port conflicts
lsof -ti:19000 | xargs kill -9  # Kill process on port 19000
```

### Database Connection Issues
```javascript
// Check Supabase configuration
import { supabase } from './lib/supabase';
console.log('Supabase URL:', supabase.supabaseUrl);

// Test connection
const { data, error } = await supabase.from('profiles').select('count');
if (error) console.error('Connection error:', error);
else console.log('Connected successfully');
```

### Build Errors
```bash
# Clear Metro bundler cache
npx expo start --clear

# Clear iOS build cache
cd ios && pod install && cd ..

# Clear Android build cache
cd android && ./gradlew clean && cd ..
```

---

## 📞 Support

**Issues Found?**
1. Check this guide first
2. Check [ENTERPRISE_CODE_QUALITY_REPORT.md](./ENTERPRISE_CODE_QUALITY_REPORT.md)
3. Check [PRE_PRODUCTION_CHECKLIST.md](./PRE_PRODUCTION_CHECKLIST.md)
4. Search existing GitHub issues
5. Create new GitHub issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

**Quick Links:**
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

---

**Last Updated:** November 18, 2025
**Maintained By:** Development Team
