# 🏪 Multi-Shop Barber App - Complete Transformation Guide

## 📋 Overview

This guide will help you transform your single-barber app into a multi-shop platform where:
- Users can create and manage multiple barber shops
- Each shop can have its own barbers, managers, and services
- Customers can book with any shop
- Data is isolated between shops
- Role-based permissions work within each shop

## 🚀 Implementation Steps

### 1. Database Migration (CRITICAL - Backup First!)

**⚠️ BACKUP YOUR DATABASE BEFORE RUNNING THESE SCRIPTS!**

#### Step 1.1: Run the Multi-Shop Schema
```sql
-- Run this in Supabase SQL Editor
-- File: MULTI_SHOP_DATABASE_SCHEMA.sql
```

This script will:
- Create `shops`, `shop_members`, `shop_services`, `barber_availability` tables
- Add `shop_id` columns to existing tables
- Migrate existing data to a default shop
- Set up helper functions

#### Step 1.2: Update RLS Policies
```sql
-- Run this AFTER the schema migration
-- File: MULTI_SHOP_RLS_POLICIES.sql
```

This script will:
- Create shop-based access control policies
- Update existing table policies
- Enable role-based permissions

### 2. Frontend Updates

#### Step 2.1: Replace Main.jsx
Replace your current `src/Main.jsx` with `src/MainMultiShop.jsx`:

```bash
# Backup current Main.jsx
mv src/Main.jsx src/Main_backup.jsx

# Use the new multi-shop Main.jsx
mv src/MainMultiShop.jsx src/Main.jsx
```

#### Step 2.2: Update Authentication
Replace your current auth functions by updating `src/lib/auth.js` to import from the new multi-shop auth:

```javascript
// Add this to the top of your existing auth.js
export * from './multiShopAuth';
```

Or create a new auth file and update imports throughout your app.

#### Step 2.3: Add New Screens
The following new screens have been created:
- `src/presentation/shop/ShopSelectionScreen.jsx`
- `src/presentation/shop/CreateShopScreen.jsx`

### 3. Update Existing Components

#### Step 3.1: Update HomeScreen
Your `HomeScreen.jsx` needs to be updated to:
- Get services from current shop instead of global services
- Filter barbers by current shop
- Pass shop_id to booking functions

#### Step 3.2: Update Booking Components
- `BarberInfoScreen.jsx` - Update booking creation to include shop_id
- `MyBookingScreen.jsx` - Filter bookings by shop access
- `BookingManagementScreen.jsx` - Show only shop bookings

#### Step 3.3: Update Management Screens
- `ServiceManagementScreen.jsx` - Work with shop services
- `BarberManagementScreen.jsx` - Manage shop barbers
- Add shop member management

## 🔧 Key Changes Required

### Database Changes
1. **New Tables:**
   - `shops` - Store shop information
   - `shop_members` - Many-to-many relationship between users and shops
   - `shop_services` - Shop-specific services and pricing
   - `barber_availability` - Track barber schedules per shop

2. **Updated Tables:**
   - `services` - Add `shop_id` column (for backward compatibility)
   - `bookings` - Add `shop_id` column
   - `profiles` - Add `global_role` column
   - `reviews` - Add `shop_id` column (if exists)

### Frontend Changes
1. **New Flow:**
   ```
   Login → Onboarding → Shop Selection → Main App
   ```

2. **Shop Context:**
   - Current shop stored in AsyncStorage
   - All API calls filtered by current shop
   - Shop switcher in profile menu

3. **Role Changes:**
   - Global roles: `customer`, `platform_admin`, `super_admin`
   - Shop roles: `owner`, `manager`, `barber`, `staff`
   - Permissions are shop-specific

### API Changes
1. **New Functions:**
   ```javascript
   getUserShops()           // Get shops user belongs to
   createShop(shopData)     // Create new shop
   getShopServices(shopId)  // Get services for shop
   getShopBarbers(shopId)   // Get barbers for shop
   inviteUserToShop()       // Invite staff to shop
   getShopBookings()        // Get bookings for shop
   createShopBooking()      // Create booking with shop_id
   ```

2. **Updated Functions:**
   ```javascript
   // All existing functions now need shop context
   fetchUserBookings(shopId)  // Filter by shop
   fetchAllBookingsForManagers(shopId)  // Shop-specific
   ```

## 📱 User Experience Changes

### For Customers:
1. **Shop Discovery:**
   - Browse available shops
   - View shop services and barbers
   - Book with any shop

2. **Booking Flow:**
   ```
   Select Shop → Choose Service → Pick Barber (optional) → Book
   ```

### For Shop Owners:
1. **Shop Management:**
   - Create and customize shop
   - Invite managers and barbers
   - Set services and pricing
   - Manage bookings

2. **Staff Management:**
   - Invite barbers and managers
   - Set permissions
   - View shop analytics

### For Barbers:
1. **Multi-Shop Support:**
   - Work at multiple shops
   - Different availability per shop
   - Shop-specific booking access

### For Managers:
1. **Shop-Specific Access:**
   - Manage only assigned shop(s)
   - View shop bookings and staff
   - Handle shop operations

## 🔒 Security Features

### Row Level Security (RLS):
- Shop data isolation
- Role-based access within shops
- Platform admin override
- Customer access to public shop data

### Permissions:
```javascript
// Shop Owner
{
  can_manage_bookings: true,
  can_edit_services: true,
  can_manage_staff: true,
  can_edit_shop: true
}

// Manager
{
  can_manage_bookings: true,
  can_edit_services: true,
  can_manage_staff: true,
  can_edit_shop: false
}

// Barber
{
  can_manage_bookings: false,
  can_edit_services: false,
  can_manage_staff: false,
  can_edit_shop: false
}
```

## 🧪 Testing Plan

### Phase 1: Database Testing
1. Run migration scripts on development database
2. Verify data migration (existing bookings/services moved to default shop)
3. Test RLS policies with different user roles
4. Verify shop creation and membership

### Phase 2: Frontend Testing
1. Test shop selection flow
2. Test shop creation
3. Test booking flow with shop context
4. Test role-based UI rendering
5. Test shop switching

### Phase 3: Integration Testing
1. Test complete user journeys
2. Test multi-shop scenarios
3. Test permission boundaries
4. Test data isolation

## 📦 Deployment Steps

### Step 1: Database Migration
1. Backup production database
2. Run `MULTI_SHOP_DATABASE_SCHEMA.sql`
3. Run `MULTI_SHOP_RLS_POLICIES.sql`
4. Verify migration success

### Step 2: Frontend Deployment
1. Update authentication files
2. Add new components
3. Update existing components
4. Deploy to production

### Step 3: Post-Deployment
1. Monitor for errors
2. Test with real users
3. Gather feedback
4. Iterate on improvements

## 🔧 Optional Enhancements

### Phase 2 Features:
1. **Shop Analytics:**
   - Booking trends
   - Revenue tracking
   - Popular services

2. **Advanced Booking:**
   - Recurring appointments
   - Package deals
   - Loyalty programs

3. **Shop Discovery:**
   - Map integration
   - Search filters
   - Reviews and ratings

4. **Marketing Tools:**
   - Promotional campaigns
   - Customer communications
   - Social media integration

## 🆘 Troubleshooting

### Common Issues:

1. **RLS Policy Errors:**
   - Check function permissions
   - Verify user authentication
   - Debug with simple policies first

2. **Shop Selection Not Working:**
   - Check AsyncStorage
   - Verify shop membership
   - Clear app cache

3. **Booking Creation Fails:**
   - Verify shop_id is included
   - Check barber belongs to shop
   - Verify service availability

### Debug Commands:
```sql
-- Check user's shops
SELECT * FROM get_user_shops('user-id-here');

-- Check current user functions
SELECT 
  get_current_user_email(),
  get_current_user_id(),
  get_current_user_global_role();

-- Verify shop access
SELECT current_user_can_access_shop('shop-id-here');
```

## 🎉 Success Metrics

### Launch Success:
- [ ] Existing users can access their data
- [ ] New users can create shops
- [ ] Booking system works with shops
- [ ] Role-based access functions correctly
- [ ] Data is properly isolated between shops

### Long-term Success:
- Multiple active shops on platform
- Successful cross-shop bookings
- Positive user feedback
- Stable performance
- Growing user base

---

## 📋 Implementation Checklist

### Database:
- [ ] Backup production database
- [ ] Run schema migration
- [ ] Update RLS policies
- [ ] Test with sample data
- [ ] Verify existing data integrity

### Backend:
- [ ] Update authentication functions
- [ ] Add multi-shop API functions
- [ ] Test RLS policies
- [ ] Update existing endpoints
- [ ] Add error handling

### Frontend:
- [ ] Add shop selection screens
- [ ] Update main navigation flow
- [ ] Modify existing components
- [ ] Add shop context management
- [ ] Update UI for multi-shop

### Testing:
- [ ] Unit tests for new functions
- [ ] Integration tests for flows
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Security testing

### Deployment:
- [ ] Deploy to staging
- [ ] Full QA testing
- [ ] Deploy to production
- [ ] Monitor post-deployment
- [ ] Gather user feedback

---

🚀 **You're now ready to transform your single-barber app into a powerful multi-shop platform!**