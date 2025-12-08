-- ============================================
-- ADD SUBSCRIPTION BILLING TO SHOPS
-- ============================================
-- This adds subscription plan tracking and billing to shops table
-- Pricing: Individual $25/mo, Team $75/mo, Enterprise $99/mo
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
-- CREATE BILLING_HISTORY TABLE
-- ============================================
-- Track all billing events for shops

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
-- HELPER FUNCTION: Check if shop is on paid plan
-- ============================================

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

-- ============================================
-- HELPER FUNCTION: Get staff limit for shop's plan
-- ============================================

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

-- ============================================
-- SET TRIAL PERIOD FOR EXISTING SHOPS
-- ============================================
-- Give existing shops a 7-day trial

UPDATE shops
SET
  subscription_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '7 days',
  subscription_plan = 'solo' -- Default to solo plan
WHERE subscription_status IS NULL;

-- ============================================
-- VERIFY SCHEMA
-- ============================================

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
  'stripe_subscription_id',
  'trial_ends_at'
)
ORDER BY column_name;
