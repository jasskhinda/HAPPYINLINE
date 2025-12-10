-- Add missing columns to shop_services table for custom services
-- This allows shops to create their own services without requiring a services catalog

-- Add name column for custom service names
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add price column (rename custom_price to price for consistency, or keep both)
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS price NUMERIC;

-- Make service_id nullable since custom services won't have a service_id
ALTER TABLE public.shop_services
ALTER COLUMN service_id DROP NOT NULL;

-- Make custom_price nullable
ALTER TABLE public.shop_services
ALTER COLUMN custom_price DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN public.shop_services.name IS 'Custom service name (for shops that create their own services)';
COMMENT ON COLUMN public.shop_services.price IS 'Service price';
COMMENT ON COLUMN public.shop_services.service_id IS 'Reference to services catalog (nullable for custom services)';
