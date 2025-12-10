-- =====================================================
-- PAYMENT TRACKING SYSTEM FOR HAPPY INLINE
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add payment/subscription fields to shops table (if not exists)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pending';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10,2);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_method_brand TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS refund_eligible_until TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS max_licenses INTEGER DEFAULT 2;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS license_count INTEGER DEFAULT 0;

-- 2. Create payment_history table for tracking all payments
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL, -- 'succeeded', 'pending', 'failed', 'refunded'
    payment_type TEXT NOT NULL, -- 'subscription', 'upgrade', 'one_time'
    plan_name TEXT,
    description TEXT,
    receipt_url TEXT,
    failure_reason TEXT,
    refund_id TEXT,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create subscription_events table for tracking subscription lifecycle
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'created', 'activated', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'payment_failed', 'refunded'
    from_plan TEXT,
    to_plan TEXT,
    amount DECIMAL(10,2),
    stripe_event_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_history_shop_id ON payment_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_shop_id ON subscription_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_shops_subscription_status ON shops(subscription_status);
CREATE INDEX IF NOT EXISTS idx_shops_stripe_customer_id ON shops(stripe_customer_id);

-- 5. Create RLS policies for payment_history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Super admins can see all payment history
CREATE POLICY "Super admins can view all payment history"
ON payment_history FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Shop owners can see their own payment history
CREATE POLICY "Shop owners can view their payment history"
ON payment_history FOR SELECT
TO authenticated
USING (
    shop_id IN (
        SELECT id FROM shops WHERE created_by = auth.uid()
    )
);

-- 6. Create RLS policies for subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Super admins can see all subscription events
CREATE POLICY "Super admins can view all subscription events"
ON subscription_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Shop owners can see their own subscription events
CREATE POLICY "Shop owners can view their subscription events"
ON subscription_events FOR SELECT
TO authenticated
USING (
    shop_id IN (
        SELECT id FROM shops WHERE created_by = auth.uid()
    )
);

-- 7. Function to get payment statistics for super admin dashboard
CREATE OR REPLACE FUNCTION get_payment_stats()
RETURNS TABLE (
    total_revenue DECIMAL,
    monthly_revenue DECIMAL,
    active_subscriptions BIGINT,
    pending_payments BIGINT,
    total_refunds DECIMAL,
    avg_subscription_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN ph.status = 'succeeded' THEN ph.amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN ph.status = 'succeeded' AND ph.created_at >= DATE_TRUNC('month', NOW()) THEN ph.amount ELSE 0 END), 0) as monthly_revenue,
        (SELECT COUNT(*) FROM shops WHERE subscription_status = 'active')::BIGINT as active_subscriptions,
        (SELECT COUNT(*) FROM shops WHERE subscription_status = 'pending')::BIGINT as pending_payments,
        COALESCE(SUM(CASE WHEN ph.status = 'refunded' THEN ph.refund_amount ELSE 0 END), 0) as total_refunds,
        COALESCE(AVG(CASE WHEN ph.status = 'succeeded' THEN ph.amount END), 0) as avg_subscription_value
    FROM payment_history ph;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to record a payment
CREATE OR REPLACE FUNCTION record_payment(
    p_shop_id UUID,
    p_amount DECIMAL,
    p_status TEXT,
    p_payment_type TEXT,
    p_plan_name TEXT,
    p_stripe_payment_intent_id TEXT DEFAULT NULL,
    p_stripe_invoice_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_receipt_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    payment_id UUID;
BEGIN
    INSERT INTO payment_history (
        shop_id, amount, status, payment_type, plan_name,
        stripe_payment_intent_id, stripe_invoice_id,
        description, receipt_url, metadata
    ) VALUES (
        p_shop_id, p_amount, p_status, p_payment_type, p_plan_name,
        p_stripe_payment_intent_id, p_stripe_invoice_id,
        p_description, p_receipt_url, p_metadata
    )
    RETURNING id INTO payment_id;

    RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to record subscription event
CREATE OR REPLACE FUNCTION record_subscription_event(
    p_shop_id UUID,
    p_event_type TEXT,
    p_from_plan TEXT DEFAULT NULL,
    p_to_plan TEXT DEFAULT NULL,
    p_amount DECIMAL DEFAULT NULL,
    p_stripe_event_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO subscription_events (
        shop_id, event_type, from_plan, to_plan,
        amount, stripe_event_id, details
    ) VALUES (
        p_shop_id, p_event_type, p_from_plan, p_to_plan,
        p_amount, p_stripe_event_id, p_details
    )
    RETURNING id INTO event_id;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to update shop subscription status
CREATE OR REPLACE FUNCTION update_shop_subscription(
    p_shop_id UUID,
    p_stripe_customer_id TEXT,
    p_stripe_subscription_id TEXT,
    p_subscription_plan TEXT,
    p_subscription_status TEXT,
    p_monthly_amount DECIMAL,
    p_payment_method_last4 TEXT DEFAULT NULL,
    p_payment_method_brand TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    max_lic INTEGER;
BEGIN
    -- Determine max licenses based on plan
    max_lic := CASE p_subscription_plan
        WHEN 'basic' THEN 2
        WHEN 'starter' THEN 4
        WHEN 'professional' THEN 9
        WHEN 'enterprise' THEN 14
        WHEN 'unlimited' THEN 9999
        ELSE 2
    END;

    UPDATE shops SET
        stripe_customer_id = p_stripe_customer_id,
        stripe_subscription_id = p_stripe_subscription_id,
        subscription_plan = p_subscription_plan,
        subscription_status = p_subscription_status,
        monthly_amount = p_monthly_amount,
        max_licenses = max_lic,
        payment_method_last4 = p_payment_method_last4,
        payment_method_brand = p_payment_method_brand,
        subscription_start_date = CASE WHEN p_subscription_status = 'active' THEN NOW() ELSE subscription_start_date END,
        next_billing_date = CASE WHEN p_subscription_status = 'active' THEN NOW() + INTERVAL '1 month' ELSE next_billing_date END,
        refund_eligible_until = CASE WHEN p_subscription_status = 'active' THEN NOW() + INTERVAL '7 days' ELSE refund_eligible_until END,
        updated_at = NOW()
    WHERE id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. View for admin payment dashboard
CREATE OR REPLACE VIEW admin_payment_overview AS
SELECT
    s.id as shop_id,
    s.name as shop_name,
    s.email as shop_email,
    s.subscription_plan,
    s.subscription_status,
    s.monthly_amount,
    s.subscription_start_date,
    s.next_billing_date,
    s.refund_eligible_until,
    s.payment_method_brand,
    s.payment_method_last4,
    s.max_licenses,
    s.license_count,
    p.name as owner_name,
    p.email as owner_email,
    c.name as category_name,
    (SELECT COUNT(*) FROM payment_history ph WHERE ph.shop_id = s.id AND ph.status = 'succeeded') as total_payments,
    (SELECT COALESCE(SUM(ph.amount), 0) FROM payment_history ph WHERE ph.shop_id = s.id AND ph.status = 'succeeded') as total_paid
FROM shops s
LEFT JOIN profiles p ON s.created_by = p.id
LEFT JOIN categories c ON s.category_id = c.id
ORDER BY s.created_at DESC;

-- Grant access to the view
GRANT SELECT ON admin_payment_overview TO authenticated;

COMMENT ON TABLE payment_history IS 'Tracks all payment transactions for shops';
COMMENT ON TABLE subscription_events IS 'Tracks subscription lifecycle events';
COMMENT ON VIEW admin_payment_overview IS 'Admin dashboard view for payment tracking';
