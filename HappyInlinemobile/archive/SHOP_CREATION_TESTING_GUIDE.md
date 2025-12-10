# Shop Creation Flow - Testing Guide

## Pre-Testing Setup

### 1. Run RLS Policy Fix in Supabase
**CRITICAL**: Before testing, run this SQL in your Supabase SQL Editor:

```sql
-- File: FIX_SHOP_STAFF_INSERT_POLICY.sql

-- Drop old policy
DROP POLICY IF EXISTS "Users can insert shop_staff for shops they create" ON shop_staff;

-- Create new policy that allows shop creator to add themselves as admin
CREATE POLICY "Shop creator can add themselves as admin"
ON shop_staff
FOR INSERT
WITH CHECK (
  role = 'admin' AND
  EXISTS (
    SELECT 1 FROM shops
    WHERE shops.id = shop_staff.shop_id
    AND shops.created_by = auth.uid()
  )
);

-- Also allow admins to add other staff
CREATE POLICY "Shop admins can add staff"
ON shop_staff
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shop_staff AS admin_check
    WHERE admin_check.shop_id = shop_staff.shop_id
    AND admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  )
);
```

### 2. Ensure You Have Test Users
You need at least 2-3 other user accounts (with phone/email) to add as managers and barbers.

**Create test users:**
1. Sign up with different phone numbers
2. Complete their profiles (add name)
3. Note their email/phone for searching

---

## Testing Steps

### Step 1: Navigate to Create Shop
1. Open app and log in
2. From HomeScreen, tap "Create Your First Shop" button
3. Should see CreateShopScreen with form

### Step 2: Fill Basic Information
Fill in the following fields:
- **Shop Name**: "Elite Barber Studio" (required)
- **Description**: "Premium grooming services" (required, 20+ chars)
- **Address**: "123 Main Street, Suite 100" (required, 10+ chars)
- **City**: "New York" (required)
- **Phone**: "555-123-4567" (required)
- **Email**: "elite@barbershop.com" (optional)

**Expected**: 
- No errors shown
- All fields accept input
- Character count updates for description

### Step 3: Add Shop Image
1. Scroll to "Shop Image" section
2. Tap the placeholder (dashed border box with camera icon)
3. Select an image from your gallery
4. **Expected**: Image preview shows with "Change Image" button

**Skip Test**: Try proceeding without image - should work (optional field)

### Step 4: Add Managers
1. Scroll to "Managers" section
2. Should see "No managers added" empty state
3. Tap "Add Manager" button
4. Modal should open with search field
5. Enter email/phone of a test user (e.g., "testuser1@example.com")
6. Tap search button
7. **Expected**: User appears in search results with avatar and details
8. Tap on the user to select (checkmark should appear)
9. Tap "Add Manager" button
10. **Expected**: Modal closes, manager appears in list with:
    - Avatar (first letter of name)
    - Full name
    - Email/phone
    - Red X button to remove
11. Try adding another manager (repeat steps)
12. Try removing a manager (tap red X)

**Validation Test**: 
- Don't add any managers and try to create shop
- Should see error: "Please add at least 1 manager"

### Step 5: Add Barbers
1. Scroll to "Barbers" section
2. Should see "No barbers added" empty state
3. Tap "Add Barber" button
4. Modal should open with search field
5. Search for a different test user
6. Select and add the barber
7. **Expected**: Barber appears in list (similar to manager display)
8. Try adding multiple barbers
9. Try removing a barber (tap red X)

**Duplicate Test**:
- Try searching for a user already added as manager
- Should NOT appear in search results (filtered out)

**Validation Test**: 
- Don't add any barbers and try to create shop
- Should see error: "Please add at least 1 barber"

### Step 6: Add Services
1. Scroll to "Services" section
2. Should see "No services added" empty state
3. Tap "Add Service" button
4. Modal should open with service form
5. Fill in service details:
   - Tap icon placeholder to add service icon (optional)
   - **Name**: "Haircut" (required)
   - **Description**: "Classic men's haircut" (optional)
   - **Price**: "25" (required, must be > 0)
   - **Duration**: "30" (required, must be > 0)
6. Tap "Add Service" button
7. **Expected**: Modal closes, service appears in list showing:
   - Service icon or placeholder
   - Service name
   - Price and duration (e.g., "$25 • 30 min")
   - Red X button to remove

**Add More Services**:
- "Beard Trim" - $15, 15 min
- "Hair & Beard Combo" - $35, 45 min
- "Hot Towel Shave" - $30, 30 min

**Validation Tests**:
- Try adding service without name → should see error
- Try adding service with price = "0" → should see error  
- Try adding service with price = "abc" → should see error
- Try adding service without duration → should see error

**Remove Test**:
- Remove a service (tap red X)
- Should disappear from list immediately

### Step 7: Create Shop
1. Ensure you have:
   - ✅ Basic info filled
   - ✅ At least 1 manager added
   - ✅ At least 1 barber added
   - ✅ At least 1 service added
2. Scroll to bottom and tap "Create Shop" button
3. **Expected Loading State**:
   - Button shows loading spinner
   - Button is disabled
4. **Expected Success**:
   - Alert/Toast appears: "Shop created successfully with X managers, Y barbers, and Z services!"
   - Navigate to HomeScreen
   - New shop appears in the list

### Step 8: Verify Database Records
Go to Supabase Dashboard and check:

**Shops Table**:
```sql
SELECT * FROM shops ORDER BY created_at DESC LIMIT 1;
```
- Should show your new shop with all details
- `created_by` should be your user ID

**Shop_Staff Table**:
```sql
SELECT * FROM shop_staff 
WHERE shop_id = 'YOUR_SHOP_ID' 
ORDER BY role;
```
- Should show YOU as admin (role='admin')
- Should show all added managers (role='manager')
- Should show all added barbers (role='barber')
- Total count = 1 + managers.length + barbers.length

**Services Table**:
```sql
SELECT * FROM services 
WHERE shop_id = 'YOUR_SHOP_ID';
```
- Should show all added services
- Each with name, price, duration_minutes
- icon_url if you added icons

---

## Error Scenarios to Test

### 1. Network Errors
- Turn off wifi/data during creation
- Should see error message: "Failed to create shop"
- Should not navigate away

### 2. Duplicate Staff
- Try adding same user as both manager and barber
- Second modal should filter out the user
- Should not appear in search results

### 3. Invalid Search
- Search for non-existent email/phone
- Should show: "No users found with that email or phone number"

### 4. Validation Errors
- Try creating with missing fields
- Should show red error messages below each section
- Should NOT proceed to creation

### 5. Empty States
- Remove all managers → empty state should reappear
- Remove all barbers → empty state should reappear
- Remove all services → empty state should reappear

---

## Expected Visual Results

### Empty States:
```
┌─────────────────────────────┐
│  Managers *                 │
│  ┌─────────────────────────┐│
│  │ 🚶 No managers added    ││
│  │ Add at least 1 manager  ││
│  │ to continue             ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

### With Data:
```
┌─────────────────────────────┐
│  Managers *      [+ Add]    │
│  ┌─────────────────────────┐│
│  │ [JD] John Doe          X││
│  │      john@email.com     ││
│  ├─────────────────────────┤│
│  │ [JS] Jane Smith        X││
│  │      jane@email.com     ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

### Service List:
```
┌─────────────────────────────┐
│  Services *      [+ Add]    │
│  ┌─────────────────────────┐│
│  │ [✂️] Haircut           X││
│  │      $25 • 30 min       ││
│  ├─────────────────────────┤│
│  │ [💈] Beard Trim        X││
│  │      $15 • 15 min       ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

---

## Performance Expectations

### Modal Opening:
- Should be instant (<100ms)
- Smooth slide-up animation

### Search:
- Should complete within 1-2 seconds
- Loading indicator visible during search
- Results appear smoothly

### Image Picker:
- Should open device gallery instantly
- Image preview updates immediately after selection

### Shop Creation:
- Should complete within 3-5 seconds (depends on network)
- Loading indicator visible
- Success message immediate after completion

---

## Common Issues & Solutions

### Issue: "Row level security policy violation"
**Solution**: Run the FIX_SHOP_STAFF_INSERT_POLICY.sql file

### Issue: Search returns no results
**Solution**: 
- Ensure test users exist in profiles table
- Check spelling of email/phone
- Verify test users have completed profile setup

### Issue: Image not showing
**Solution**:
- Check permissions granted for media library
- Try different image format (JPEG, PNG)
- Check image file size (should be reasonable)

### Issue: Modal not opening
**Solution**:
- Check console for errors
- Verify import paths for modal components
- Ensure state variables initialized correctly

### Issue: Can't remove staff/service
**Solution**:
- Check handler functions are wired correctly
- Verify array index being passed correctly
- Check console for errors

---

## Success Criteria

✅ **All these should work:**
1. Form accepts all input without errors
2. Image picker opens and selects images
3. Manager search finds existing users
4. Barber search finds existing users
5. Services can be added with all fields
6. Can remove any added item before creation
7. Validation prevents creation with missing data
8. Validation shows specific error messages
9. Shop creation completes successfully
10. Database records created correctly
11. User navigates to HomeScreen after creation
12. New shop appears in shop list

---

## Next Testing Phase

After basic creation works:
1. Test editing shops (when ShopManagementScreen is built)
2. Test role-based permissions (manager vs admin access)
3. Test booking flow with new services
4. Test multiple shops switching
5. Test staff receiving notifications
6. End-to-end flow: create shop → add services → book appointment

---

## Reporting Issues

When reporting issues, include:
1. **Step number** where error occurred
2. **Expected behavior** vs **actual behavior**
3. **Error messages** from console
4. **Screenshots** of the issue
5. **Device info** (iOS/Android, version)
6. **Network condition** (wifi/mobile/offline)

---

## Ready to Test!

You now have:
- ✅ Complete shop creation UI
- ✅ Three functional modals (Manager, Barber, Service)
- ✅ Comprehensive validation
- ✅ Visual feedback for all actions
- ✅ Database integration ready

**Start by running the RLS policy fix, then follow the testing steps above!** 🚀
