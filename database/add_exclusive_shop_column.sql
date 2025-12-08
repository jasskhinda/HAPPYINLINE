-- Add exclusive_shop_id column to profiles table
-- This column stores the shop ID that an exclusive customer is bound to
-- NULL means the customer is a regular customer who can browse all shops
-- Non-NULL means the customer is exclusive to that specific shop

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS exclusive_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;

-- Add index for faster lookups of exclusive customers by shop
CREATE INDEX IF NOT EXISTS idx_profiles_exclusive_shop_id ON profiles(exclusive_shop_id);

-- Add comment to column
COMMENT ON COLUMN profiles.exclusive_shop_id IS 'Shop ID for exclusive customers. NULL = regular customer, Non-NULL = customer exclusive to that shop';
