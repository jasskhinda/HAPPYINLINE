-- ============================================
-- COMPLETE FIX FOR SHOP_SERVICES TABLE
-- ============================================
-- This adds all necessary columns for custom services
-- while maintaining backward compatibility with catalog services

-- 1. Add name column for custom service names
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Add price column for direct pricing
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS price NUMERIC;

-- 3. Add duration column (in minutes)
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;

-- 4. Make service_id nullable (not all services come from catalog)
ALTER TABLE public.shop_services
ALTER COLUMN service_id DROP NOT NULL;

-- 5. Make custom_price nullable
ALTER TABLE public.shop_services
ALTER COLUMN custom_price DROP NOT NULL;

-- 6. Add helpful comments
COMMENT ON COLUMN public.shop_services.name IS 'Custom service name (for shops that create their own services)';
COMMENT ON COLUMN public.shop_services.price IS 'Service price';
COMMENT ON COLUMN public.shop_services.duration IS 'Service duration in minutes';
COMMENT ON COLUMN public.shop_services.service_id IS 'Reference to services catalog (nullable for custom services)';
COMMENT ON COLUMN public.shop_services.custom_price IS 'Legacy: Custom price override (use price column instead)';

-- 7. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'shop_services'
ORDER BY ordinal_position;
