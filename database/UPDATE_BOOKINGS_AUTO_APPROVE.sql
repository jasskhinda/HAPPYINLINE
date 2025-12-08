-- =====================================================
-- UPDATE BOOKINGS FOR AUTO-APPROVAL
-- =====================================================
-- Changes booking status default to 'confirmed' for auto-approval
-- Note: bookings.barber_id already exists and will be used as provider_id
-- =====================================================

-- Update default status to 'confirmed' for auto-approval
ALTER TABLE public.bookings
ALTER COLUMN status SET DEFAULT 'confirmed';

-- Add comment to explain barber_id usage
COMMENT ON COLUMN public.bookings.barber_id IS 'The service provider assigned to this booking (supports all industries, not just barbers)';

-- Verify changes
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND table_schema = 'public'
  AND column_name IN ('barber_id', 'status');
