-- Fix service_providers foreign key to reference shop_services instead of services
-- This is needed because providers are assigned to shop-specific services, not global templates

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.service_providers
DROP CONSTRAINT IF EXISTS service_providers_service_id_fkey;

-- Step 2: Rename service_id to shop_service_id for clarity
ALTER TABLE public.service_providers
RENAME COLUMN service_id TO shop_service_id;

-- Step 3: Add new foreign key constraint to shop_services
ALTER TABLE public.service_providers
ADD CONSTRAINT service_providers_shop_service_id_fkey
FOREIGN KEY (shop_service_id) REFERENCES public.shop_services(id) ON DELETE CASCADE;

-- Step 4: Update unique constraint
ALTER TABLE public.service_providers
DROP CONSTRAINT IF EXISTS service_providers_service_id_provider_id_key;

ALTER TABLE public.service_providers
ADD CONSTRAINT service_providers_shop_service_id_provider_id_key
UNIQUE (shop_service_id, provider_id);

-- Step 5: Update index
DROP INDEX IF EXISTS idx_service_providers_service_id;
CREATE INDEX IF NOT EXISTS idx_service_providers_shop_service_id
ON public.service_providers(shop_service_id);
