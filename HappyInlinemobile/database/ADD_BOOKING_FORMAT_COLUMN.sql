-- ================================================================
-- ADD BOOKING_FORMAT COLUMN TO BOOKINGS TABLE
-- ================================================================
-- This column tracks whether a booking is for in-person or online service
-- ================================================================

-- Add booking_format column if it doesn't exist
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_format TEXT DEFAULT 'in_person'
CHECK (booking_format IN ('in_person', 'online'));

-- Add meeting_link column for online bookings (optional - provider can add later)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add comment
COMMENT ON COLUMN public.bookings.booking_format IS 'Type of booking: in_person or online';
COMMENT ON COLUMN public.bookings.meeting_link IS 'Meeting link for online bookings (e.g., Zoom, Google Meet)';

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('booking_format', 'meeting_link');
