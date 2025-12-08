-- =====================================================
-- ADD SERVICE PROVIDERS JUNCTION TABLE
-- =====================================================
-- This allows many-to-many relationship between services and providers
-- A service can have multiple providers, and a provider can offer multiple services
-- =====================================================

-- Create service_providers junction table
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a provider can only be assigned once per service
  UNIQUE(service_id, provider_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_providers_service_id ON public.service_providers(service_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_provider_id ON public.service_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_shop_id ON public.service_providers(shop_id);

-- Enable RLS
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view service providers for their shop or shops they're associated with
CREATE POLICY "Users can view service providers for accessible shops"
  ON public.service_providers
  FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM public.user_shops WHERE user_id = auth.uid()
      UNION
      SELECT exclusive_shop_id FROM public.profiles WHERE id = auth.uid() AND exclusive_shop_id IS NOT NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: Shop owners, managers, and admins can insert service providers
CREATE POLICY "Authorized users can insert service providers"
  ON public.service_providers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_shops
      WHERE shop_id = service_providers.shop_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: Shop owners, managers, and admins can update service providers
CREATE POLICY "Authorized users can update service providers"
  ON public.service_providers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_shops
      WHERE shop_id = service_providers.shop_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: Shop owners, managers, and admins can delete service providers
CREATE POLICY "Authorized users can delete service providers"
  ON public.service_providers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_shops
      WHERE shop_id = service_providers.shop_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_service_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_service_providers_updated_at();

-- Verify table was created
SELECT 'service_providers table created successfully!' AS status;
