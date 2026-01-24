-- ============================================
-- ADD DISPLAY_ORDER COLUMN TO SHOP_SERVICES TABLE
-- ============================================
-- This adds the 'display_order' column for drag-and-drop reordering of services
-- Run this in the Supabase SQL Editor

-- 1. Add display_order column with default value 0
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. Initialize existing services with sequential order based on name
-- This gives each shop's services an initial order
WITH numbered_services AS (
  SELECT id, shop_id, ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY name) as rn
  FROM public.shop_services
)
UPDATE public.shop_services ss
SET display_order = ns.rn
FROM numbered_services ns
WHERE ss.id = ns.id;

-- 3. Add a comment to describe the column
COMMENT ON COLUMN public.shop_services.display_order IS 'Display order for drag-and-drop sorting (lower numbers appear first)';

-- 4. Create an index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_shop_services_display_order ON public.shop_services (shop_id, display_order);

-- 5. Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'shop_services'
ORDER BY ordinal_position;
