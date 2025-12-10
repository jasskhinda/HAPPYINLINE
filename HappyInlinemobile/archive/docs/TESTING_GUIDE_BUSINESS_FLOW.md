# Testing Guide: New Business Registration Flow

## ✅ Database Migration Complete
The SQL migration has been run successfully. All new columns and tables are in place.

---

## 🧪 Test Steps

### Test 1: Business Owner Registration

1. **Open App** → Should see WelcomeScreen with Happy Inline branding
2. **Click** "I Own a Business"
3. **Step 1 - Introduction:**
   - See professional intro screen with benefits
   - ✅ Manage bookings effortlessly
   - ✅ Accept payments online
   - ✅ Build your client base
   - ✅ Free 30-day trial
   - Click "Get Started"

4. **Step 2 - Registration Form:**
   - Fill in:
     - Business Email: `test@barbershop.com`
     - Your Name: `John Smith`
     - Business Name: `John's Barber Shop`
     - Password: `test1234` (min 6 chars)
     - Confirm Password: `test1234`
   - **Test password validation:**
     - Try less than 6 chars → Should show error
     - Try non-matching passwords → Should show error
   - Click "Continue"

5. **Step 3 - Review Screen:**
   - Should show:
     - Business Name: John's Barber Shop
     - Owner Name: John Smith
     - Business Email: test@barbershop.com
     - Info note: "This email will be your login username"
   - Click "Create Account"

6. **Success:**
   - Should see Toast: "Registration Successful! Please sign in to set up your shop"
   - Should redirect to WelcomeScreen after 1.5 seconds

---

### Test 2: Login After Registration

1. **From WelcomeScreen**, click "Sign In"
2. **Enter email:** `test@barbershop.com`
3. **Click Continue**
4. **Check email** for OTP code
5. **Enter OTP** in app
6. **Should redirect to MainScreen** (manager view)

---

### Test 3: Create Shop (Full Setup)

1. **From MainScreen**, navigate to "Create Shop"
   - (You may need to add this navigation - it should be accessible to managers)

2. **Fill Shop Information:**
   - **Shop Images:**
     - Upload Logo (square)
     - Upload Cover Image (4:3)

   - **Basic Info:**
     - Shop Name: `John's Barber Shop`
     - Description: `Premium barbershop in downtown`
     - Address: `123 Main St`
     - City: `Los Angeles`
     - State: `CA`
     - Zip Code: `90001`
     - Phone: `(555) 123-4567`
     - Email: `test@barbershop.com`

   - **Operating Hours:**
     - Days: Mon-Sat
     - Opening: 9:00 AM
     - Closing: 6:00 PM

   - **Add Managers:**
     - Add yourself or other managers

   - **Add Barbers:**
     - Add at least 1 barber

   - **Add Services:**
     - Haircut - $30
     - Beard Trim - $20
     - Hot Towel Shave - $40

3. **Click "Create Shop"**
   - Should see success alert: "Your shop is ready. Now submit it for review to go live!"
   - Click "Continue"

4. **Should navigate to ShopReviewSubmission screen**

---

### Test 4: Review & Submit Screen

**Expected UI:**
- ✅ Green checkmark icon (120px circle)
- Title: "Your Shop is Ready!"
- Subtitle: "Review your shop details before submitting for approval"

**Shop Info Card:**
- Shop name: John's Barber Shop
- Address: 123 Main St, Los Angeles, CA
- Phone: (555) 123-4567
- Email: test@barbershop.com

**Stats:**
- 🔵 2 Services
- 🟣 1+ Barbers
- 🟠 1+ Managers

**What Happens Next:**
1. Submission Review (24-48 hours)
2. Approval Notification
3. Go Live!

**Buttons:**
- "Edit Shop" (outline button) → Goes back to edit
- "Submit for Review" (primary button, red/pink)

**Test:**
1. Click "Edit Shop" → Should go back to CreateShop screen
2. Click "Submit for Review"
3. Should see confirmation dialog
4. Click "Submit"

---

### Test 5: Pending Review Screen

**After submission, should see:**

**UI:**
- ⏰ Clock icon (orange/yellow circle, 120px)
- Title: "Review in Progress"
- Subtitle: "Your shop 'John's Barber Shop' is being reviewed by our team"

**Info Cards (3 cards):**
1. **Review Time**
   - Icon: ⏰
   - "Typically 24-48 hours. We'll notify you as soon as we're done!"

2. **You'll Be Notified**
   - Icon: 🔔
   - "We'll send you a notification once approved or if we need changes"

3. **Continue Editing**
   - Icon: ✏️
   - "You can still edit your shop details while waiting for approval"

**What We Review Checklist:**
- ✅ Business information accuracy
- ✅ Service offerings and pricing
- ✅ Shop images and branding
- ✅ Operating hours and location

**Buttons:**
- "Go to Dashboard" (primary)
- "Check Status" (secondary with refresh icon)

**Test Pull-to-Refresh:**
- Pull down → Should refresh and check shop status

---

### Test 6: Super Admin Approval (Manual Database Test)

Since we haven't built the super admin UI yet, test this manually in Supabase:

#### Approve Shop:
```sql
UPDATE shops
SET
  status = 'approved',
  reviewed_at = NOW(),
  reviewed_by = (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
WHERE name = 'John''s Barber Shop';
```

**Then in app:**
- Pull down to refresh on ShopPendingReview screen
- Should auto-redirect to MainScreen
- Shop should now be live and visible to customers!

---

#### Reject Shop:
```sql
UPDATE shops
SET
  status = 'rejected',
  rejection_reason = 'Please provide a valid business license number and update your cover photo to show the actual storefront.',
  reviewed_at = NOW(),
  reviewed_by = (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
WHERE name = 'John''s Barber Shop';
```

**Then in app:**
- Pull down to refresh
- Should see:
  - ❌ Red X icon
  - Title: "Shop Not Approved"
  - Subtitle: "Your shop submission needs some changes"
  - **Rejection Reason Card** (red background):
    - Shows: "Please provide a valid business license number and update your cover photo to show the actual storefront."

  - **What to Do Next:**
    1. Review the feedback above carefully
    2. Make the necessary changes to your shop
    3. Resubmit your shop for review

  - **Buttons:**
    - "Edit Shop & Resubmit" (primary)
    - "Go to Dashboard" (secondary)

**Test Resubmit:**
1. Click "Edit Shop & Resubmit"
2. Should go to EditShop screen (if exists)
3. Make changes
4. Resubmit
5. Status should change back to 'pending_review'

---

### Test 7: Check Audit Log

In Supabase, verify status history is being logged:

```sql
SELECT
  sh.*,
  p.name as changed_by_name
FROM shop_status_history sh
LEFT JOIN profiles p ON sh.changed_by = p.id
WHERE shop_id = (SELECT id FROM shops WHERE name = 'John''s Barber Shop')
ORDER BY created_at DESC;
```

**Should show:**
- draft → pending_review (when submitted)
- pending_review → approved (when you approved)
- approved → rejected (if you rejected)
- rejected → pending_review (if they resubmitted)

---

## 🐛 Known Issues to Watch For

### Issue 1: CreateShop Navigation
**Problem:** Managers might not have a way to navigate to CreateShop screen
**Fix:** Check MainScreen/ManagerDashboard has "Create Shop" button

### Issue 2: Existing Shops Without Status
**Problem:** Existing shops in database don't have status field
**Fix:** Run this SQL to set them to 'approved':
```sql
UPDATE shops
SET status = 'approved'
WHERE status IS NULL;
```

### Issue 3: EditShop Screen Doesn't Exist
**Problem:** "Edit Shop & Resubmit" button tries to navigate to EditShop
**Fix:** Either:
- Create EditShop screen, OR
- Navigate to CreateShopScreen with pre-filled data, OR
- Navigate to ShopSettings screen

---

## ✅ Success Criteria

The flow is working correctly if:

1. ✅ Business owner can register with password (no keyboard bugs)
2. ✅ Registration creates account and redirects to login
3. ✅ After login, manager can create shop
4. ✅ Shop is created with status='draft'
5. ✅ After shop creation, navigates to ShopReviewSubmission
6. ✅ Submit button updates status to 'pending_review'
7. ✅ Navigates to ShopPendingReview screen
8. ✅ Pull-to-refresh checks status
9. ✅ When approved (manually), auto-redirects to MainScreen
10. ✅ When rejected (manually), shows rejection reason
11. ✅ Status changes are logged in shop_status_history
12. ✅ RLS policies work (customers only see approved shops)

---

## 📱 Test on Physical Device

**Recommended:**
- Test entire flow on physical device
- Check keyboard behavior (should not close after each character)
- Check image uploads work
- Check all screens look good on different screen sizes
- Test pull-to-refresh gesture

---

## 🚀 Next Steps After Testing

Once this flow is working:

1. **Build Super Admin Dashboard:**
   - Screen to view pending shops (use `pending_shop_reviews` view)
   - Approve button
   - Reject button with reason input modal
   - Show shop details for review

2. **Add Notifications:**
   - Push notification when approved
   - Push notification when rejected
   - Email notifications (optional)

3. **Add EditShop Screen:**
   - Allow managers to edit shop while pending
   - Allow them to fix issues after rejection

4. **Add Shop Status Indicator:**
   - Show status badge in manager dashboard
   - "Draft", "Pending Review", "Approved", "Rejected"
