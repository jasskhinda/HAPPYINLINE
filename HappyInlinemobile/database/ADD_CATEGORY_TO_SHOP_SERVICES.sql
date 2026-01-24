-- ============================================
-- ADD CATEGORY COLUMN TO SHOP_SERVICES TABLE
-- ============================================
-- This adds the 'category' column needed for organizing services
-- Run this in the Supabase SQL Editor

-- 1. Add category column with default value 'General'
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- 2. Update any NULL categories to 'General'
UPDATE public.shop_services
SET category = 'General'
WHERE category IS NULL;

-- 3. Add a comment to describe the column
COMMENT ON COLUMN public.shop_services.category IS 'Service category for grouping (e.g., Haircuts, Styling, Color)';

-- 4. Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'shop_services'
ORDER BY ordinal_position;
