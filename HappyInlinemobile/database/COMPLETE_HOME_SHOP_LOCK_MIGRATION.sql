-- ============================================
-- COMPLETE HOME SHOP LOCK + SUBSCRIPTION MIGRATION
-- ============================================
-- This migration adds:
-- 1. Subscription billing to shops
-- 2. Home Shop Lock (customers bound to one shop via QR)
-- 3. Signup source tracking
-- ============================================

-- ============================================
-- PART 1: ADD SUBSCRIPTION FIELDS TO SHOPS
-- ============================================

-- Add subscription fields to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_plan TEXT
  CHECK (subscription_plan IN ('solo', 'team', 'enterprise'));

ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial'
  CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'paused'));

-- Stripe integration
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

-- Billing dates
ALTER TABLE shops ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_canceled_at TIMESTAMP WITH TIME ZONE;

-- Plan limits (for enforcement)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS max_staff_members INTEGER; -- NULL = unlimited

-- Payment tracking
ALTER TABLE shops ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC(10,2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shops_subscription_plan ON shops(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_shops_subscription_status ON shops(subscription_status);
CREATE INDEX IF NOT EXISTS idx_shops_stripe_customer ON shops(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_shops_trial_ends ON shops(trial_ends_at);

-- ============================================
-- PART 2: ADD HOME SHOP LOCK TO PROFILES
-- ============================================

-- Add home shop ID (customers are locked to this shop)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;

-- Track how they signed up
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_source TEXT
  CHECK (signup_source IN ('direct', 'qr_code', 'shop_invite', 'referral'));

-- When they were locked to their home shop
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_shop_locked_at TIMESTAMP WITH TIME ZONE;

-- Create index for home shop lookups
CREATE INDEX IF NOT EXISTS idx_profiles_home_shop ON profiles(home_shop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_signup_source ON profiles(signup_source);

-- ============================================
-- PART 3: CREATE BILLING_HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'refund', 'failed_payment', 'plan_change')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Stripe details
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  failure_reason TEXT,

  -- Period this payment covers
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,

  -- Plan at time of payment
  plan_name TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_history_shop ON billing_history(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_stripe_invoice ON billing_history(stripe_invoice_id);

-- ============================================
-- PART 4: HELPER FUNCTIONS
-- ============================================

-- Check if shop subscription is active
CREATE OR REPLACE FUNCTION is_shop_subscription_active(shop_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shops
    WHERE id = shop_uuid
    AND subscription_status IN ('trial', 'active')
    AND (trial_ends_at IS NULL OR trial_ends_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get staff limit for shop's plan
CREATE OR REPLACE FUNCTION get_shop_staff_limit(shop_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  plan TEXT;
BEGIN
  SELECT subscription_plan INTO plan
  FROM shops
  WHERE id = shop_uuid;

  CASE plan
    WHEN 'solo' THEN RETURN 1;
    WHEN 'team' THEN RETURN 7;
    WHEN 'enterprise' THEN RETURN NULL; -- Unlimited
    ELSE RETURN 1; -- Default to solo limits
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if customer is locked to a home shop
CREATE OR REPLACE FUNCTION is_customer_locked(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_uuid
    AND home_shop_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer's home shop
CREATE OR REPLACE FUNCTION get_customer_home_shop(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  shop_uuid UUID;
BEGIN
  SELECT home_shop_id INTO shop_uuid
  FROM profiles
  WHERE id = user_uuid;

  RETURN shop_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: UPDATE EXISTING DATA
-- ============================================

-- Give existing shops a 7-day trial on solo plan
UPDATE shops
SET
  subscription_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '7 days',
  subscription_plan = COALESCE(subscription_plan, 'solo')
WHERE subscription_status IS NULL OR trial_ends_at IS NULL;

-- Set signup_source for existing users
UPDATE profiles
SET signup_source = 'direct'
WHERE signup_source IS NULL;

-- ============================================
-- PART 6: VERIFY MIGRATION
-- ============================================

-- Check shops table columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN (
  'subscription_plan',
  'subscription_status',
  'stripe_customer_id',
  'trial_ends_at'
)
ORDER BY column_name;

-- Check profiles table columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'home_shop_id',
  'signup_source',
  'home_shop_locked_at'
)
ORDER BY column_name;

-- Check billing_history table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'billing_history';

-- Show sample data
SELECT
  id,
  name,
  subscription_plan,
  subscription_status,
  trial_ends_at
FROM shops
LIMIT 5;

SELECT
  id,
  name,
  email,
  role,
  home_shop_id,
  signup_source
FROM profiles
WHERE role = 'customer'
LIMIT 5;
