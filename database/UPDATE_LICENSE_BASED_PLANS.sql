-- ============================================================================
-- LICENSE-BASED PRICING MODEL UPDATE
-- ============================================================================
-- This migration updates the subscription plan system to a license-based model
--
-- OLD PLANS:
--   - solo: $25/month (1 provider)
--   - team: $75/month (3-7 providers)
--   - enterprise: $99/month (unlimited providers)
--
-- NEW PLANS:
--   - starter: $74.99/month (3-4 licenses)
--   - professional: $99.99/month (5-9 licenses)
--   - enterprise: $149.99/month (10-14 licenses)
--
-- ============================================================================

-- Step 1: Update the CHECK constraint to allow new plan names
ALTER TABLE shops
DROP CONSTRAINT IF EXISTS shops_subscription_plan_check;

ALTER TABLE shops
ADD CONSTRAINT shops_subscription_plan_check
CHECK (subscription_plan IN ('solo', 'team', 'enterprise', 'starter', 'professional'));

-- Step 2: Add new columns for license management
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS license_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_licenses INTEGER DEFAULT 0;

-- Step 3: Set max_licenses based on existing plans (for migration)
UPDATE shops
SET
  max_licenses = CASE subscription_plan
    WHEN 'solo' THEN 1
    WHEN 'team' THEN 7
    WHEN 'enterprise' THEN 999  -- Effectively unlimited
    WHEN 'starter' THEN 4
    WHEN 'professional' THEN 9
    ELSE 0
  END,
  license_count = (
    SELECT COUNT(*)
    FROM shop_staff
    WHERE shop_staff.shop_id = shops.id
    -- Count all staff/providers (owners don't need licenses)
    AND shop_staff.role IN ('staff', 'manager', 'provider')
  )
WHERE subscription_plan IS NOT NULL;

-- Step 4: Create helper function to get license limits
CREATE OR REPLACE FUNCTION get_license_limit(plan_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE plan_name
    WHEN 'starter' THEN 4
    WHEN 'professional' THEN 9
    WHEN 'enterprise' THEN 14
    -- Legacy plans (for backwards compatibility)
    WHEN 'solo' THEN 1
    WHEN 'team' THEN 7
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create helper function to get plan price
CREATE OR REPLACE FUNCTION get_plan_price(plan_name TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE plan_name
    WHEN 'starter' THEN 74.99
    WHEN 'professional' THEN 99.99
    WHEN 'enterprise' THEN 149.99
    -- Legacy plans (for backwards compatibility)
    WHEN 'solo' THEN 25.00
    WHEN 'team' THEN 75.00
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create function to check if shop can add more staff
CREATE OR REPLACE FUNCTION can_add_staff(shop_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_license_count INTEGER;
  max_allowed INTEGER;
  plan_name TEXT;
BEGIN
  SELECT subscription_plan, license_count
  INTO plan_name, current_license_count
  FROM shops
  WHERE id = shop_uuid;

  max_allowed := get_license_limit(plan_name);

  RETURN current_license_count < max_allowed;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to update license_count when staff is added/removed
CREATE OR REPLACE FUNCTION update_shop_license_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.shop_id IS NOT NULL THEN
    UPDATE shops
    SET license_count = license_count + 1
    WHERE id = NEW.shop_id;
  ELSIF TG_OP = 'DELETE' AND OLD.shop_id IS NOT NULL THEN
    UPDATE shops
    SET license_count = license_count - 1
    WHERE id = OLD.shop_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If shop_id changed (staff moved to different shop)
    IF OLD.shop_id IS DISTINCT FROM NEW.shop_id THEN
      IF OLD.shop_id IS NOT NULL THEN
        UPDATE shops SET license_count = license_count - 1 WHERE id = OLD.shop_id;
      END IF;
      IF NEW.shop_id IS NOT NULL THEN
        UPDATE shops SET license_count = license_count + 1 WHERE id = NEW.shop_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_license_count_trigger ON shop_staff;
CREATE TRIGGER update_license_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON shop_staff
FOR EACH ROW
EXECUTE FUNCTION update_shop_license_count();

-- Step 8: Add comments for documentation
COMMENT ON COLUMN shops.license_count IS 'Current number of active staff members (licenses in use)';
COMMENT ON COLUMN shops.max_licenses IS 'Maximum number of licenses allowed for this plan';
COMMENT ON FUNCTION get_license_limit(TEXT) IS 'Returns the maximum number of licenses for a given plan';
COMMENT ON FUNCTION get_plan_price(TEXT) IS 'Returns the monthly price for a given plan';
COMMENT ON FUNCTION can_add_staff(UUID) IS 'Checks if a shop can add more staff based on their license limit';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration worked:
--
-- 1. Check all shops have license data:
-- SELECT id, name, subscription_plan, license_count, max_licenses
-- FROM shops
-- ORDER BY created_at DESC;
--
-- 2. Test license limit function:
-- SELECT
--   subscription_plan,
--   get_license_limit(subscription_plan) as max_licenses,
--   get_plan_price(subscription_plan) as monthly_price
-- FROM shops
-- WHERE subscription_plan IS NOT NULL
-- GROUP BY subscription_plan;
--
-- 3. Check if shop can add staff:
-- SELECT
--   name,
--   subscription_plan,
--   license_count,
--   max_licenses,
--   can_add_staff(id) as can_add_more
-- FROM shops
-- WHERE subscription_plan IS NOT NULL;
-- ============================================================================
