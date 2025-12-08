-- =====================================================
-- UPDATE SUBSCRIPTION PLAN CONSTRAINT
-- Run this in Supabase SQL Editor to add 'basic' plan
-- =====================================================

-- Step 1: First, check what values currently exist in the table
SELECT DISTINCT subscription_plan, COUNT(*) as count
FROM shops
GROUP BY subscription_plan;

-- Step 2: Update any NULL or invalid subscription_plan values to 'starter'
-- (You can change 'starter' to any valid plan you prefer as the default)
UPDATE shops
SET subscription_plan = 'starter'
WHERE subscription_plan IS NULL
   OR subscription_plan NOT IN ('basic', 'starter', 'professional', 'enterprise', 'unlimited');

-- Step 3: Drop the existing constraint
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_subscription_plan_check;

-- Step 4: Add new constraint with all plans including 'basic'
ALTER TABLE shops ADD CONSTRAINT shops_subscription_plan_check
CHECK (subscription_plan IN ('basic', 'starter', 'professional', 'enterprise', 'unlimited'));

-- Step 5: Verify the constraint was updated
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'shops'::regclass
AND conname = 'shops_subscription_plan_check';

-- Step 6: Verify all shops have valid subscription plans
SELECT id, name, subscription_plan FROM shops;
