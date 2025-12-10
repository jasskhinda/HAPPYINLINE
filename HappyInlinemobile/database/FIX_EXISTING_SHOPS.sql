-- Fix existing shops to have proper subscription data

-- Update existing shops with trial plan and trial end date
UPDATE shops
SET
  subscription_plan = 'solo',
  subscription_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '7 days'
WHERE subscription_plan IS NULL OR trial_ends_at IS NULL;

-- Verify the update
SELECT
  name,
  subscription_plan,
  subscription_status,
  trial_ends_at
FROM shops
ORDER BY created_at DESC;
