-- =====================================================
-- SQL HELPERS FOR TESTING BUSINESS REGISTRATION FLOW
-- =====================================================

-- 1. Fix any existing shops that don't have status
-- (Set them to 'approved' so they show up for customers)
UPDATE shops
SET status = 'approved'
WHERE status IS NULL;

-- =====================================================
-- MANUAL APPROVAL/REJECTION (until Super Admin UI is built)
-- =====================================================

-- 2. VIEW PENDING SHOPS
-- Use this to see shops waiting for approval
SELECT * FROM pending_shop_reviews;

-- Or more detailed:
SELECT
  s.id,
  s.name AS shop_name,
  s.status,
  s.submitted_for_review_at,
  s.created_at,
  p.name AS owner_name,
  p.email AS owner_email
FROM shops s
JOIN shop_staff ss ON s.id = ss.shop_id AND ss.role = 'manager'
JOIN profiles p ON ss.user_id = p.id
WHERE s.status = 'pending_review'
ORDER BY s.submitted_for_review_at DESC;

-- 3. APPROVE A SHOP
-- Replace 'Shop Name Here' with actual shop name
UPDATE shops
SET
  status = 'approved',
  reviewed_at = NOW(),
  reviewed_by = (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
WHERE name = 'Shop Name Here'
AND status = 'pending_review';

-- Example:
-- UPDATE shops SET status = 'approved', reviewed_at = NOW(), reviewed_by = (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1) WHERE name = 'John''s Barber Shop';

-- 4. REJECT A SHOP (with reason)
-- Replace 'Shop Name Here' and 'Rejection reason here' with actual values
UPDATE shops
SET
  status = 'rejected',
  rejection_reason = 'Rejection reason here',
  reviewed_at = NOW(),
  reviewed_by = (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
WHERE name = 'Shop Name Here'
AND status = 'pending_review';

-- Example rejection reasons:
-- 'Please provide a valid business license number and update your cover photo to show the actual storefront.'
-- 'The shop address could not be verified. Please provide a valid street address.'
-- 'Service pricing seems incorrect. Please review and update your service prices.'

-- 5. VIEW SHOP STATUS HISTORY (Audit Log)
-- Replace 'Shop Name Here' with actual shop name
SELECT
  sh.created_at,
  sh.previous_status,
  sh.new_status,
  sh.change_reason,
  p.name as changed_by_name,
  p.role as changed_by_role
FROM shop_status_history sh
LEFT JOIN profiles p ON sh.changed_by = p.id
WHERE shop_id = (SELECT id FROM shops WHERE name = 'Shop Name Here' LIMIT 1)
ORDER BY sh.created_at DESC;

-- 6. VIEW ALL SHOPS WITH STATUS
SELECT
  id,
  name,
  status,
  rejection_reason,
  submitted_for_review_at,
  reviewed_at,
  created_at
FROM shops
ORDER BY created_at DESC;

-- 7. RESET A SHOP TO DRAFT (for testing resubmission)
-- Replace 'Shop Name Here' with actual shop name
UPDATE shops
SET
  status = 'draft',
  rejection_reason = NULL,
  submitted_for_review_at = NULL,
  reviewed_at = NULL,
  reviewed_by = NULL
WHERE name = 'Shop Name Here';

-- 8. CHECK SUPER ADMIN ACCOUNT
-- Make sure you have a super admin account to test with
SELECT id, name, email, role
FROM profiles
WHERE role = 'super_admin';

-- If you don't have one, create it:
-- (Replace with your actual user ID and info)
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';

-- 9. DELETE TEST SHOP (cleanup)
-- Replace 'Shop Name Here' with actual shop name
-- WARNING: This will delete the shop and all related data
DELETE FROM shops WHERE name = 'Shop Name Here';

-- 10. VIEW SHOP DETAILS (including owner)
SELECT
  s.id,
  s.name AS shop_name,
  s.status,
  s.address,
  s.city,
  s.state,
  s.phone,
  s.email,
  s.submitted_for_review_at,
  s.reviewed_at,
  s.rejection_reason,
  p.name AS owner_name,
  p.email AS owner_email,
  p.role AS owner_role
FROM shops s
JOIN shop_staff ss ON s.id = ss.shop_id AND ss.role = 'manager'
JOIN profiles p ON ss.user_id = p.id
WHERE s.name LIKE '%Shop Name%'
ORDER BY s.created_at DESC;

-- =====================================================
-- USEFUL QUERIES FOR DEBUGGING
-- =====================================================

-- 11. Find shops by email
SELECT s.*, p.email as owner_email
FROM shops s
JOIN shop_staff ss ON s.id = ss.shop_id
JOIN profiles p ON ss.user_id = p.id
WHERE p.email = 'owner@email.com';

-- 12. Check if RLS policies are working
-- (Run this as different users to test)
SELECT
  id,
  name,
  status,
  CASE
    WHEN status = 'approved' THEN 'Visible to all'
    WHEN status = 'pending_review' THEN 'Visible to owner and super admin only'
    WHEN status = 'draft' THEN 'Visible to owner only'
    WHEN status = 'rejected' THEN 'Visible to owner and super admin only'
  END as visibility
FROM shops;

-- 13. Count shops by status
SELECT
  status,
  COUNT(*) as count
FROM shops
GROUP BY status
ORDER BY status;

-- =====================================================
-- QUICK TESTING WORKFLOW
-- =====================================================

/*
STEP 1: Register business in app
  - Use BusinessRegistration screen
  - Create account with password

STEP 2: Login and create shop
  - Login with email/OTP
  - Complete shop setup
  - Submit for review

STEP 3: Check pending shops
  SELECT * FROM pending_shop_reviews;

STEP 4: Approve or reject
  -- Approve:
  UPDATE shops SET status = 'approved', reviewed_at = NOW() WHERE name = 'Shop Name';

  -- Reject:
  UPDATE shops SET status = 'rejected', rejection_reason = 'Reason here', reviewed_at = NOW() WHERE name = 'Shop Name';

STEP 5: Refresh app to see result
  - Pull down on ShopPendingReview screen
  - Should see approval or rejection

STEP 6: Check audit log
  SELECT * FROM shop_status_history WHERE shop_id = 'shop-id-here';
*/
