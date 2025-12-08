-- =====================================================
-- UPDATE SUBSCRIPTION PRICING - 3 DAY TRIAL
-- =====================================================
-- Updates subscription plans to match new pricing:
-- - Starter: $24.99/mo (1-2 providers)
-- - Professional: $74.99/mo (3-9 providers)
-- - Enterprise: $149.99/mo (10-14 providers)
-- - 3-day free trial (was 7 days)
-- =====================================================

-- Update subscription plan check constraint
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_subscription_plan_check;
ALTER TABLE shops ADD CONSTRAINT shops_subscription_plan_check
  CHECK (subscription_plan IN ('starter', 'professional', 'enterprise'));

-- Update max provider limits based on new tiers
CREATE OR REPLACE FUNCTION get_shop_provider_limit(shop_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  plan TEXT;
BEGIN
  SELECT subscription_plan INTO plan
  FROM shops
  WHERE id = shop_uuid;

  CASE plan
    WHEN 'starter' THEN RETURN 2;       -- 1-2 providers
    WHEN 'professional' THEN RETURN 9;  -- 3-9 providers
    WHEN 'enterprise' THEN RETURN 14;   -- 10-14 providers
    ELSE RETURN 2; -- Default to starter limits
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add payment method fields
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_method_brand TEXT; -- visa, mastercard, etc

-- Add trial tracking
ALTER TABLE shops ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

-- Update existing shops to have 3-day trial from now
UPDATE shops
SET
  trial_ends_at = NOW() + INTERVAL '3 days',
  trial_started_at = NOW()
WHERE subscription_status = 'trial'
  AND trial_ends_at IS NULL;

-- Create index for payment method lookups
CREATE INDEX IF NOT EXISTS idx_shops_payment_method ON shops(stripe_payment_method_id);

-- =====================================================
-- STRIPE PRICE IDS (To be updated after creating in Stripe Dashboard)
-- =====================================================
-- Store Stripe Price IDs in a configuration table

CREATE TABLE IF NOT EXISTS stripe_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT UNIQUE NOT NULL CHECK (plan_name IN ('starter', 'professional', 'enterprise')),
  price_id TEXT NOT NULL, -- Stripe Price ID (price_xxx)
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  interval TEXT DEFAULT 'month',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert placeholder price IDs (UPDATE THESE AFTER CREATING IN STRIPE)
INSERT INTO stripe_prices (plan_name, price_id, amount_cents) VALUES
  ('starter', 'price_starter_placeholder', 2499),      -- $24.99
  ('professional', 'price_professional_placeholder', 7499), -- $74.99
  ('enterprise', 'price_enterprise_placeholder', 14999)  -- $149.99
ON CONFLICT (plan_name) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents;

-- =====================================================
-- HELPER FUNCTION: Get Stripe Price ID for Plan
-- =====================================================

CREATE OR REPLACE FUNCTION get_stripe_price_id(plan_name_input TEXT)
RETURNS TEXT AS $$
DECLARE
  price_id_result TEXT;
BEGIN
  SELECT price_id INTO price_id_result
  FROM stripe_prices
  WHERE plan_name = plan_name_input;

  RETURN price_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Check if trial has expired
-- =====================================================

CREATE OR REPLACE FUNCTION is_trial_expired(shop_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
  sub_status TEXT;
BEGIN
  SELECT trial_ends_at, subscription_status
  INTO trial_end, sub_status
  FROM shops
  WHERE id = shop_uuid;

  -- If subscription is active (paid), trial doesn't matter
  IF sub_status = 'active' THEN
    RETURN FALSE;
  END IF;

  -- If no trial end date, consider expired
  IF trial_end IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if current time is past trial end
  RETURN NOW() > trial_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFY UPDATES
-- =====================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN (
  'subscription_plan',
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_payment_method_id',
  'payment_method_last4',
  'payment_method_brand',
  'trial_started_at',
  'trial_ends_at'
)
ORDER BY column_name;

SELECT * FROM stripe_prices;
