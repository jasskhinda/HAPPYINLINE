-- =====================================================
-- SERVICE_PROVIDERS TABLE - PRODUCTION SETUP
-- =====================================================
-- This script creates/updates the service_providers junction table
-- to properly link shop_services (per-shop services) with providers
--
-- IMPORTANT: This table links:
--   - shop_services.id (shop-specific services) - NOT services.id (global catalog)
--   - auth.users.id (provider user) - same as shop_staff.user_id
--   - shops.id (the shop)
--
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Step 1: Check if table exists and has old schema
DO $$
DECLARE
    column_exists BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'service_providers'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if old column exists (service_id instead of shop_service_id)
        SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'service_providers'
            AND column_name = 'service_id'
        ) INTO column_exists;

        IF column_exists THEN
            RAISE NOTICE 'Found old schema with service_id column - will migrate';
        ELSE
            RAISE NOTICE 'Table exists with correct schema';
        END IF;
    ELSE
        RAISE NOTICE 'Table does not exist - will create fresh';
    END IF;
END $$;

-- Step 2: Drop old table if it exists (fresh start is safest)
DROP TABLE IF EXISTS public.service_providers CASCADE;

-- Step 3: Create service_providers junction table with correct schema
CREATE TABLE public.service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References shop_services.id (shop-specific services, NOT global catalog)
    shop_service_id UUID NOT NULL REFERENCES public.shop_services(id) ON DELETE CASCADE,

    -- References auth.users.id (the provider's user account)
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- References shops.id (for RLS and querying)
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure a provider can only be assigned once per service
    CONSTRAINT service_providers_unique_assignment UNIQUE(shop_service_id, provider_id)
);

-- Step 4: Add indexes for performance
CREATE INDEX idx_service_providers_shop_service_id ON public.service_providers(shop_service_id);
CREATE INDEX idx_service_providers_provider_id ON public.service_providers(provider_id);
CREATE INDEX idx_service_providers_shop_id ON public.service_providers(shop_id);

-- Composite index for common query pattern
CREATE INDEX idx_service_providers_shop_provider ON public.service_providers(shop_id, provider_id);

-- Step 5: Enable RLS
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies

-- Policy: Users can view service providers for shops they have access to
CREATE POLICY "service_providers_select_policy"
    ON public.service_providers
    FOR SELECT
    USING (
        -- Shop owner
        EXISTS (
            SELECT 1 FROM public.shops
            WHERE id = service_providers.shop_id
            AND created_by = auth.uid()
        )
        OR
        -- Shop staff member
        EXISTS (
            SELECT 1 FROM public.shop_staff
            WHERE shop_id = service_providers.shop_id
            AND user_id = auth.uid()
            AND is_active = true
        )
        OR
        -- Customer linked to shop (for booking flow)
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND exclusive_shop_id = service_providers.shop_id
        )
        OR
        -- Super admin
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Policy: Shop owners and authorized staff can insert
CREATE POLICY "service_providers_insert_policy"
    ON public.service_providers
    FOR INSERT
    WITH CHECK (
        -- Shop owner
        EXISTS (
            SELECT 1 FROM public.shops
            WHERE id = service_providers.shop_id
            AND created_by = auth.uid()
        )
        OR
        -- Shop admin/manager
        EXISTS (
            SELECT 1 FROM public.shop_staff
            WHERE shop_id = service_providers.shop_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager', 'admin')
            AND is_active = true
        )
        OR
        -- Super admin
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Policy: Shop owners and authorized staff can update
CREATE POLICY "service_providers_update_policy"
    ON public.service_providers
    FOR UPDATE
    USING (
        -- Shop owner
        EXISTS (
            SELECT 1 FROM public.shops
            WHERE id = service_providers.shop_id
            AND created_by = auth.uid()
        )
        OR
        -- Shop admin/manager
        EXISTS (
            SELECT 1 FROM public.shop_staff
            WHERE shop_id = service_providers.shop_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager', 'admin')
            AND is_active = true
        )
        OR
        -- Super admin
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Policy: Shop owners and authorized staff can delete
CREATE POLICY "service_providers_delete_policy"
    ON public.service_providers
    FOR DELETE
    USING (
        -- Shop owner
        EXISTS (
            SELECT 1 FROM public.shops
            WHERE id = service_providers.shop_id
            AND created_by = auth.uid()
        )
        OR
        -- Shop admin/manager
        EXISTS (
            SELECT 1 FROM public.shop_staff
            WHERE shop_id = service_providers.shop_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager', 'admin')
            AND is_active = true
        )
        OR
        -- Super admin
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Step 7: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_service_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_service_providers_updated_at ON public.service_providers;
CREATE TRIGGER set_service_providers_updated_at
    BEFORE UPDATE ON public.service_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_service_providers_updated_at();

-- Step 8: Add comments for documentation
COMMENT ON TABLE public.service_providers IS 'Junction table linking shop services to providers who can perform them';
COMMENT ON COLUMN public.service_providers.shop_service_id IS 'References shop_services.id - the specific service at this shop';
COMMENT ON COLUMN public.service_providers.provider_id IS 'References auth.users.id - the provider who can perform this service';
COMMENT ON COLUMN public.service_providers.shop_id IS 'References shops.id - redundant for RLS performance';

-- Step 9: Verification queries
SELECT 'Table created successfully' AS status;

-- Show table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'service_providers'
ORDER BY ordinal_position;

-- Show constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'service_providers'
AND tc.table_schema = 'public';

-- Show indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'service_providers'
AND schemaname = 'public';

-- Show RLS policies
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'service_providers'
AND schemaname = 'public';

-- =====================================================
-- USAGE EXAMPLES (for reference)
-- =====================================================

/*
-- Assign a provider to a service:
INSERT INTO service_providers (shop_id, shop_service_id, provider_id)
VALUES (
    'shop-uuid-here',
    'shop-service-uuid-here',  -- from shop_services.id
    'provider-user-uuid-here'  -- from auth.users.id / shop_staff.user_id
);

-- Get all providers for a specific service:
SELECT
    sp.id,
    sp.provider_id,
    p.name as provider_name,
    p.profile_image
FROM service_providers sp
JOIN profiles p ON p.id = sp.provider_id
WHERE sp.shop_service_id = 'service-uuid-here';

-- Get all services a provider can perform:
SELECT
    ss.id,
    ss.name,
    ss.price,
    ss.duration
FROM service_providers sp
JOIN shop_services ss ON ss.id = sp.shop_service_id
WHERE sp.provider_id = 'provider-uuid-here'
AND sp.shop_id = 'shop-uuid-here';

-- Get providers who can perform ALL selected services:
WITH service_counts AS (
    SELECT
        provider_id,
        COUNT(*) as service_count
    FROM service_providers
    WHERE shop_id = 'shop-uuid-here'
    AND shop_service_id IN ('service1-uuid', 'service2-uuid')
    GROUP BY provider_id
)
SELECT p.id, p.name
FROM service_counts sc
JOIN profiles p ON p.id = sc.provider_id
WHERE sc.service_count = 2;  -- Must match number of services selected
*/

SELECT 'Service Providers table setup complete!' AS result;
