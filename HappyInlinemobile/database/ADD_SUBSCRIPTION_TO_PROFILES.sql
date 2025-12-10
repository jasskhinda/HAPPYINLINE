-- =====================================================
-- ADD SUBSCRIPTION FIELDS TO PROFILES TABLE
-- =====================================================
-- This migrates subscription data from shops to profiles
-- Subscription belongs to the OWNER, not the shop
-- Owner can have multiple shops using their license pool
-- =====================================================

-- Step 1: Add subscription fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'; -- none, active, cancelled, refunded
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS refund_eligible_until TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_licenses INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method_brand TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_category_id UUID DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_business_type_id UUID DEFAULT NULL;

-- Step 2: Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Step 3: Migrate existing subscription data from shops to profiles
-- The shops table has: subscription_plan, subscription_status, stripe_subscription_id
-- Other fields (max_licenses, etc.) will use defaults from the plan
UPDATE profiles p
SET
  subscription_plan = s.subscription_plan,
  subscription_status = CASE
    WHEN s.subscription_status = 'trial' THEN 'active'
    WHEN s.subscription_status = 'canceled' THEN 'cancelled'
    ELSE COALESCE(s.subscription_status, 'active')
  END,
  subscription_start_date = s.subscription_starts_at,
  next_billing_date = s.subscription_current_period_end,
  stripe_subscription_id = s.stripe_subscription_id,
  -- Set max_licenses based on plan (since shops don't have this column)
  max_licenses = CASE
    WHEN s.subscription_plan = 'basic' THEN 2
    WHEN s.subscription_plan = 'starter' THEN 5
    WHEN s.subscription_plan = 'professional' THEN 10
    WHEN s.subscription_plan = 'enterprise' THEN 25
    WHEN s.subscription_plan = 'unlimited' THEN 999
    WHEN s.subscription_plan = 'solo' THEN 2
    WHEN s.subscription_plan = 'team' THEN 10
    ELSE 2
  END,
  -- Set monthly_amount based on plan
  monthly_amount = CASE
    WHEN s.subscription_plan = 'basic' THEN 24.99
    WHEN s.subscription_plan = 'starter' THEN 74.99
    WHEN s.subscription_plan = 'professional' THEN 99.99
    WHEN s.subscription_plan = 'enterprise' THEN 149.99
    WHEN s.subscription_plan = 'unlimited' THEN 199.00
    WHEN s.subscription_plan = 'solo' THEN 24.99
    WHEN s.subscription_plan = 'team' THEN 99.99
    ELSE 24.99
  END
FROM shops s
WHERE s.created_by = p.id
  AND s.subscription_plan IS NOT NULL
  AND (p.subscription_plan IS NULL OR p.subscription_plan = '');

-- Step 4: Verify migration
SELECT
  p.id,
  p.name,
  p.email,
  p.role,
  p.subscription_plan,
  p.subscription_status,
  p.max_licenses,
  p.monthly_amount,
  p.stripe_subscription_id
FROM profiles p
WHERE p.subscription_plan IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- =====================================================
-- IMPORTANT: Run this SQL in Supabase SQL Editor
-- After running, the subscription data will be on profiles
-- The app code will then read/write subscription to profiles
-- =====================================================
