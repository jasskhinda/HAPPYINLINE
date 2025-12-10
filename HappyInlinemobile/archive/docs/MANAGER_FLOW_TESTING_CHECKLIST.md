# Manager Flow - Complete Testing Checklist

## Overview
This checklist covers the complete journey of a business owner from registration to managing their shop with staff.

---

## Phase 1: Business Registration ✅

### Test 1.1: Register New Business Owner
**Steps:**
1. Open app
2. Click "I'm a Business Owner"
3. **Step 1 - Business Email**:
   - Enter email: `newowner@test.com`
   - Click "Continue"
4. **Step 2 - Business Details**:
   - Business Name: `Test Barbershop`
   - Your Name: `John Doe`
   - Phone: `555-1234`
   - Click "Continue"
5. **Step 3 - Create Password**:
   - Password: `Test123456`
   - Confirm Password: `Test123456`
   - Click "Complete Registration"

**Expected Result:**
- ✅ All three steps complete without keyboard closing
- ✅ Navigate to RegistrationSuccessScreen
- ✅ See green checkmark and success message
- ✅ See business name "Test Barbershop" displayed
- ✅ See email "newowner@test.com" displayed
- ✅ See "What Happens Next" section with 3 steps
- ✅ See "Sign In to Continue" button

**Database Check:**
```sql
-- Check auth account created
SELECT email, raw_user_meta_data
FROM auth.users
WHERE email = 'newowner@test.com';
-- Should show: role = 'manager' in metadata

-- Check profile created with correct role
SELECT email, name, role
FROM profiles
WHERE email = 'newowner@test.com';
-- Should show: role = 'manager'
```

**Issues to watch for:**
- ❌ Keyboard closes after each character → Fixed with complete rewrite
- ❌ Profile role is 'customer' → Fixed with trigger update
- ❌ Navigation goes to WelcomeScreen → Fixed to go to RegistrationSuccessScreen

---

## Phase 2: First Login ✅

### Test 2.1: Login as New Owner
**Steps:**
1. From RegistrationSuccessScreen, click "Sign In to Continue"
2. Verify email is pre-filled: `newowner@test.com`
3. Enter password: `Test123456`
4. Click "Sign In"

**Expected Result:**
- ✅ Email field pre-populated
- ✅ Successful login
- ✅ Navigate to HomeScreen
- ✅ See Manager Dashboard (NOT customer view)
- ✅ See "Create Your Shop" empty state
- ✅ See large storefront icon
- ✅ See "Get Started" message
- ✅ See "Create Shop" button

**Console Logs to Check:**
```
👔 Manager role detected in profile
Manager mode: true
No shops found, showing create shop UI
```

**Issues to watch for:**
- ❌ Shows customer view instead → Fixed with profile role check in HomeScreen
- ❌ Manager mode gets overridden to false → Fixed by not overriding when no shops
- ❌ Back button too high (in notch) → Fixed with top: 60

---

## Phase 3: Shop Creation ✅

### Test 3.1: Create First Shop
**Steps:**
1. Click "Create Shop" button from empty state
2. Fill in shop details:
   - Shop Name: `Test Barbershop`
   - Email: `shop@test.com`
   - Phone: `555-5555`
   - Address: `123 Main St`
   - City: `Test City`
   - State: `CA`
   - Zip: `12345`
   - Description: `Best barbershop in town`
3. Set operating hours (optional)
4. Add services (optional)
5. Click "Create Shop"

**Expected Result:**
- ✅ Shop created successfully
- ✅ Navigate to ShopReviewSubmission screen
- ✅ See shop summary with all details
- ✅ See "What Happens Next" section
- ✅ See "Submit for Review" button
- ✅ Shop status = 'draft'

**Database Check:**
```sql
-- Check shop created
SELECT id, name, email, status, manager_id
FROM shops
WHERE email = 'shop@test.com';
-- Should show: status = 'draft', manager_id = owner's user_id

-- Check shop_staff entry created
SELECT shop_id, user_id, role
FROM shop_staff
WHERE user_id = (SELECT id FROM profiles WHERE email = 'newowner@test.com');
-- Should show: role = 'admin'
```

---

### Test 3.2: Submit Shop for Review
**Steps:**
1. From ShopReviewSubmission, click "Submit for Review"

**Expected Result:**
- ✅ Shop status changes to 'pending_review'
- ✅ Navigate to ShopPendingReview screen
- ✅ See yellow "Under Review" badge
- ✅ See timeline showing submission
- ✅ See "Checking back soon" message

**Database Check:**
```sql
-- Check status updated
SELECT name, status, submitted_for_review_at
FROM shops
WHERE email = 'shop@test.com';
-- Should show: status = 'pending_review', timestamp populated

-- Check status history logged
SELECT * FROM shop_status_history
WHERE shop_id = (SELECT id FROM shops WHERE email = 'shop@test.com')
ORDER BY changed_at DESC;
-- Should show: old_status = 'draft', new_status = 'pending_review'
```

---

## Phase 4: Manager Dashboard Features ✅

### Test 4.1: View Manager Dashboard (No Shops)
**Steps:**
1. Login as manager who has no shops yet
2. View dashboard

**Expected Result:**
- ✅ See empty state with storefront icon
- ✅ See "Create Your Shop" heading
- ✅ See "Get Started" message
- ✅ See "Create Shop" button
- ✅ NO customer UI elements (search bar, featured shops)

---

### Test 4.2: View Manager Dashboard (Draft Shop)
**Steps:**
1. Login as owner with draft shop
2. View dashboard

**Expected Result:**
- ✅ See gray "Draft" badge at top
- ✅ See yellow alert: "Complete Your Shop Setup"
- ✅ See "Continue Setup" button
- ✅ Stats show zeros (bookings, revenue, rating)
- ✅ No appointments listed
- ✅ Quick Actions grid visible
- ✅ Management menu visible

---

### Test 4.3: View Manager Dashboard (Pending Review)
**Steps:**
1. Login as owner with pending shop
2. View dashboard

**Expected Result:**
- ✅ See yellow "Under Review" badge
- ✅ See info alert: "Shop Under Review"
- ✅ See "View Status" button
- ✅ Stats show zeros
- ✅ Limited functionality message

---

### Test 4.4: View Manager Dashboard (Approved Shop)
**Steps:**
1. Login as owner with approved shop
2. View dashboard

**Expected Result:**
- ✅ See green "Active" badge
- ✅ No status alerts
- ✅ See real stats (bookings, revenue, rating, customers)
- ✅ See today's appointments
- ✅ See quick actions: Services, Barbers, Bookings, Settings
- ✅ See full management menu:
   - My Shops
   - Services
   - Staff Management
   - Bookings
   - Reviews
   - Shop Settings
   - Operating Hours
   - Analytics (coming soon)

---

### Test 4.5: View Manager Dashboard (Rejected Shop)
**Steps:**
1. Login as owner with rejected shop
2. View dashboard

**Expected Result:**
- ✅ See red "Rejected" badge
- ✅ See error alert with rejection reason
- ✅ See "Review Feedback" button
- ✅ See instructions to fix and resubmit

---

## Phase 5: Add Manager Feature ✅

### Test 5.1: Add Manager (Create New Account)
**Steps:**
1. Login as shop owner
2. Navigate to Staff Management
3. Click "Add Manager"
4. Switch to "Create New" tab
5. Fill form:
   - Email: `newmanager@test.com`
   - Name: `Jane Smith`
   - Phone: `555-9999`
   - Password: `Manager123`
6. Click "Create Manager Account"

**Expected Result:**
- ✅ Success message appears
- ✅ Modal closes
- ✅ Manager appears in staff list with role "Admin"

**Database Check:**
```sql
-- Check auth account created
SELECT email, raw_user_meta_data
FROM auth.users
WHERE email = 'newmanager@test.com';
-- Should show: name, phone, role = 'manager' in metadata

-- Check profile created
SELECT email, name, phone, role
FROM profiles
WHERE email = 'newmanager@test.com';
-- Should show: role = 'manager'

-- Check shop_staff entry
SELECT shop_id, user_id, role
FROM shop_staff
WHERE user_id = (SELECT id FROM profiles WHERE email = 'newmanager@test.com');
-- Should show: role = 'admin' for the shop
```

---

### Test 5.2: New Manager Can Login
**Steps:**
1. Logout from owner account
2. Click "Sign In"
3. Enter email: `newmanager@test.com`
4. Enter password: `Manager123`
5. Click "Sign In"

**Expected Result:**
- ✅ Successful login
- ✅ See Manager Dashboard (not customer view)
- ✅ See the shop they were added to
- ✅ See shop status badge
- ✅ Can access all management features

---

### Test 5.3: Add Manager (Existing User)
**Steps:**
1. Login as shop owner
2. Have another account ready (e.g., customer account)
3. Navigate to Staff Management
4. Click "Add Manager"
5. Stay on "Search Existing" tab
6. Type existing user's email
7. Click "Add Manager" when they appear

**Expected Result:**
- ✅ User found in search
- ✅ See their name, email, phone, current role
- ✅ Successfully added to shop_staff
- ✅ Appear in staff list

**Database Check:**
```sql
-- Check shop_staff entry added
SELECT shop_id, user_id, role
FROM shop_staff
WHERE user_id = (SELECT id FROM profiles WHERE email = 'existinguser@test.com');
-- Should show: new entry with role = 'admin'
```

---

### Test 5.4: Search Not Found → Create Flow
**Steps:**
1. Click "Add Manager"
2. Search for: `doesnotexist@test.com`
3. See "User not found" message
4. Click "Create New Account" button
5. Verify email pre-fills
6. Complete form and create

**Expected Result:**
- ✅ Smooth transition from search to create
- ✅ Email already populated
- ✅ Account created successfully

---

## Phase 6: Multi-Manager Permissions ✅

### Test 6.1: Second Manager Can Manage Shop
**Steps:**
1. Login as the newly added manager
2. Navigate to shop settings
3. Try to edit shop details
4. Try to add services
5. Try to view bookings

**Expected Result:**
- ✅ Can edit shop name, hours, description
- ✅ Can add/edit/delete services
- ✅ Can view all shop bookings
- ✅ Can add more staff members
- ✅ See same shop stats as owner

---

### Test 6.2: Manager Cannot Delete Shop
**Steps:**
1. Login as added manager (not original owner)
2. Navigate to shop settings
3. Look for delete shop option

**Expected Result:**
- ✅ Delete shop button NOT visible (or disabled)
- ✅ Only original owner can delete shop

---

## Phase 7: Super Admin Approval Flow ✅

### Test 7.1: Super Admin Sees Pending Shops
**Steps:**
1. Login as super admin
2. View Super Admin Dashboard
3. Check pending shops list

**Expected Result:**
- ✅ See list of shops with status = 'pending_review'
- ✅ See shop details (name, email, submitted date)
- ✅ See "Approve" and "Reject" buttons

---

### Test 7.2: Super Admin Approves Shop
**Steps:**
1. From pending shops list
2. Click "Approve" on a shop
3. Confirm approval

**Expected Result:**
- ✅ Shop status changes to 'approved'
- ✅ Shop removed from pending list
- ✅ Owner sees green "Active" badge when they login
- ✅ Shop appears in customer search results

**Database Check:**
```sql
-- Check status updated
SELECT name, status, reviewed_at, reviewed_by
FROM shops
WHERE id = 'shop-id';
-- Should show: status = 'approved', timestamps populated

-- Check status history
SELECT * FROM shop_status_history
WHERE shop_id = 'shop-id'
ORDER BY changed_at DESC;
-- Should show: pending_review → approved transition
```

---

### Test 7.3: Super Admin Rejects Shop
**Steps:**
1. From pending shops list
2. Click "Reject" on a shop
3. Enter rejection reason: "Please add more services and update shop hours"
4. Confirm rejection

**Expected Result:**
- ✅ Shop status changes to 'rejected'
- ✅ Rejection reason saved
- ✅ Owner sees red "Rejected" badge
- ✅ Owner sees rejection reason in dashboard

**Database Check:**
```sql
SELECT name, status, rejection_reason, reviewed_at
FROM shops
WHERE id = 'shop-id';
-- Should show: status = 'rejected', rejection_reason populated
```

---

## Phase 8: Edge Cases & Error Handling

### Test 8.1: Register with Existing Email
**Steps:**
1. Try to register business with already-used email
2. Complete registration form

**Expected Result:**
- ✅ Error message: "Email already registered"
- ✅ Prompt to login instead
- ✅ No duplicate accounts created

---

### Test 8.2: Create Manager with Existing Email
**Steps:**
1. In Add Manager modal
2. Use "Create New" tab
3. Enter email that already exists

**Expected Result:**
- ✅ Error message: "User already exists"
- ✅ Suggestion to use "Search Existing" instead
- ✅ No duplicate accounts created

---

### Test 8.3: Weak Password
**Steps:**
1. Register new business with password: `123`

**Expected Result:**
- ✅ Validation error: "Password must be at least 6 characters"
- ✅ Cannot proceed until fixed

---

### Test 8.4: Invalid Email Format
**Steps:**
1. Enter email: `notanemail`
2. Try to continue

**Expected Result:**
- ✅ Validation error: "Invalid email format"
- ✅ Cannot proceed

---

### Test 8.5: Session Persistence
**Steps:**
1. Login as manager
2. Close app completely
3. Reopen app

**Expected Result:**
- ✅ Still logged in
- ✅ Manager dashboard still shows
- ✅ Shop data persists

---

### Test 8.6: Token Refresh
**Steps:**
1. Login as manager
2. Leave app open for 1+ hours
3. Try to perform an action (edit shop, add service)

**Expected Result:**
- ✅ Action succeeds (token refreshed automatically)
- ✅ No re-login required
- ✅ Smooth user experience

---

## Quick Reference: SQL Debugging Queries

### Check User Role
```sql
SELECT email, name, role
FROM profiles
WHERE email = 'your-email@test.com';
```

### Check User's Shops
```sql
SELECT s.name, s.status, ss.role
FROM shops s
JOIN shop_staff ss ON s.id = ss.shop_id
JOIN profiles p ON ss.user_id = p.id
WHERE p.email = 'your-email@test.com';
```

### Check All Managers for a Shop
```sql
SELECT p.email, p.name, ss.role
FROM profiles p
JOIN shop_staff ss ON p.id = ss.user_id
WHERE ss.shop_id = 'your-shop-id';
```

### Check Shop Status History
```sql
SELECT * FROM shop_status_history
WHERE shop_id = 'your-shop-id'
ORDER BY changed_at DESC;
```

### Check Auth Metadata
```sql
SELECT email, raw_user_meta_data
FROM auth.users
WHERE email = 'your-email@test.com';
```

### Fix Role Mismatch
```sql
-- If profile role doesn't match auth metadata
UPDATE profiles
SET role = 'manager'
WHERE email = 'your-email@test.com';
```

---

## Summary of All Fixed Issues

### 1. expo-linear-gradient Missing ✅
- **Fix**: `npm install expo-linear-gradient`

### 2. Back Button in Notch ✅
- **Fix**: Changed `top: 20` to `top: 60`

### 3. Keyboard Closes After Each Character ✅
- **Fix**: Rewrote BusinessRegistration.jsx without function components in render

### 4. Business Owner Gets Customer Role ✅
- **Fix**: Updated handle_new_user() trigger to respect metadata role

### 5. Manager Dashboard Not Showing ✅
- **Fix**: Updated HomeScreen.jsx to prioritize profile role, not override with shop_staff check

### 6. Can't Create New Manager Accounts ✅
- **Fix**: Added "Create New" tab in AddManagerModal.jsx with full account creation

---

## Current Status: ✅ READY FOR TESTING

All features implemented and ready for end-to-end testing:
- ✅ Business registration with password
- ✅ Professional success screen flow
- ✅ Manager dashboard with status-based UI
- ✅ Shop creation and approval workflow
- ✅ Add managers (both existing and new accounts)
- ✅ Multi-manager permissions
- ✅ Role-based access control
- ✅ Database triggers and RLS policies

**Next Step**: Test the complete flow from registration → shop creation → adding managers → approval
