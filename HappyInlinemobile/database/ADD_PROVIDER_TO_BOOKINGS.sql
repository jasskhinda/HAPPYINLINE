-- =====================================================
-- ADD PROVIDER TO BOOKINGS TABLE
-- =====================================================
-- Adds provider_id column to track which provider is assigned to each booking
-- Also updates status default to 'confirmed' for auto-approval
-- =====================================================

-- Add provider_id column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for provider queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);

-- Update default status to 'confirmed' for auto-approval
ALTER TABLE public.bookings
ALTER COLUMN status SET DEFAULT 'confirmed';

-- Update the check constraint to ensure valid statuses
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

-- Add comment to explain provider_id
COMMENT ON COLUMN public.bookings.provider_id IS 'The service provider assigned to this booking';

-- Verify changes
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND table_schema = 'public'
  AND column_name IN ('provider_id', 'status');
