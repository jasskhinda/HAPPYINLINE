-- ================================================================
-- ADD DESCRIPTION COLUMN TO shop_services TABLE
-- ================================================================
-- This migration adds the 'description' column to shop_services
-- to support custom service descriptions for all industries
-- ================================================================

-- Add description column to shop_services
ALTER TABLE shop_services
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN shop_services.description IS 'Brief description of the service (max 100 characters recommended)';

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shop_services'
ORDER BY ordinal_position;
