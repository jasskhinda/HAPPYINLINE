-- =====================================================
-- CLEAR TEST DATA FOR PRODUCTION LAUNCH
-- =====================================================
-- Run this BEFORE switching to live Stripe keys
-- This clears all test subscription data so new users start fresh
-- =====================================================

-- 1. Clear all Stripe-related data from profiles (test subscriptions)
UPDATE profiles SET
  subscription_plan = NULL,
  subscription_status = NULL,
  subscription_start_date = NULL,
  subscription_end_date = NULL,
  next_billing_date = NULL,
  refund_eligible_until = NULL,
  monthly_amount = NULL,
  max_licenses = NULL,
  license_count = 0,
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  payment_method_last4 = NULL,
  payment_method_brand = NULL
WHERE stripe_subscription_id IS NOT NULL
   OR stripe_customer_id IS NOT NULL
   OR subscription_plan IS NOT NULL;

-- 2. Clear test payment history (if table exists)
DELETE FROM payment_history WHERE id IS NOT NULL;

-- 3. Clear test subscription events (if table exists)
DELETE FROM subscription_events WHERE id IS NOT NULL;

-- 4. Optional: Delete all test shops (uncomment if you want clean slate)
-- DELETE FROM shop_staff;
-- DELETE FROM bookings;
-- DELETE FROM shops;

-- 5. Optional: Delete all test profiles except super_admin (uncomment if needed)
-- DELETE FROM profiles WHERE role != 'super_admin';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check profiles are cleared
SELECT
  COUNT(*) as total_profiles,
  COUNT(stripe_subscription_id) as with_stripe_sub,
  COUNT(subscription_plan) as with_plan
FROM profiles;

-- Should show: total_profiles = X, with_stripe_sub = 0, with_plan = 0
