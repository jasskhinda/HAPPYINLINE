-- Verify the migration completed successfully

-- Check profiles table for home shop lock columns
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

-- Check if billing_history table was created
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'billing_history'
) as billing_table_exists;

-- Check sample data from shops
SELECT
  id,
  name,
  subscription_plan,
  subscription_status,
  trial_ends_at
FROM shops
LIMIT 3;
