-- =====================================================
-- CREATE PAYMENT HISTORY AND SUBSCRIPTION EVENTS TABLES
-- =====================================================
-- These tables track payment history and subscription events
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
  payment_type TEXT NOT NULL, -- 'subscription', 'upgrade', 'refund'
  plan_name TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  description TEXT,
  receipt_url TEXT,
  refund_id TEXT,
  refund_amount DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create subscription_events table
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'refunded', 'renewed'
  from_plan TEXT,
  to_plan TEXT,
  amount DECIMAL(10,2),
  stripe_event_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_history_shop_id ON payment_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_owner_id ON payment_history(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_events_shop_id ON subscription_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_owner_id ON subscription_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for payment_history
-- Owners can view their own payment history
CREATE POLICY "Owners can view own payment history"
  ON payment_history FOR SELECT
  USING (owner_id = auth.uid() OR shop_id IN (
    SELECT id FROM shops WHERE created_by = auth.uid()
  ));

-- Users can insert their own payment history
CREATE POLICY "Users can insert own payment history"
  ON payment_history FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Step 6: Create RLS policies for subscription_events
-- Owners can view their own subscription events
CREATE POLICY "Owners can view own subscription events"
  ON subscription_events FOR SELECT
  USING (owner_id = auth.uid() OR shop_id IN (
    SELECT id FROM shops WHERE created_by = auth.uid()
  ));

-- Users can insert their own subscription events
CREATE POLICY "Users can insert own subscription events"
  ON subscription_events FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Step 7: Verify tables created
SELECT 'payment_history' as table_name, COUNT(*) as row_count FROM payment_history
UNION ALL
SELECT 'subscription_events' as table_name, COUNT(*) as row_count FROM subscription_events;

-- =====================================================
-- IMPORTANT: Run this SQL in Supabase SQL Editor
-- =====================================================
