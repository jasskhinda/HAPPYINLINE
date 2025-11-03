-- Add duration column to shop_services table
ALTER TABLE public.shop_services
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;

-- Add comment
COMMENT ON COLUMN public.shop_services.duration IS 'Service duration in minutes';
