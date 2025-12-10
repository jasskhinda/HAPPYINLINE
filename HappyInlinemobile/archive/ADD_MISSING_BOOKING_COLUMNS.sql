-- ============================================
-- Add Missing Columns to bookings Table
-- ============================================
-- This adds columns without dropping existing bookings
-- Safe to run - preserves your existing 2 bookings!
-- ============================================

-- 1. Add booking_id column (human-readable ID like BK-20251007-A1B2C3)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_id TEXT;

-- 2. Add manager tracking columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES profiles(id);

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id);

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 3. Add notes columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS barber_notes TEXT;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 4. Generate booking_id for existing bookings that have NULL
-- Format: BK-YYYYMMDD-XXXXXX
UPDATE bookings
SET booking_id = 'BK-' || TO_CHAR(COALESCE(created_at, NOW()), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6))
WHERE booking_id IS NULL;

-- 5. Make booking_id NOT NULL and UNIQUE now that all rows have values
ALTER TABLE bookings
ALTER COLUMN booking_id SET NOT NULL;

ALTER TABLE bookings
ADD CONSTRAINT bookings_booking_id_unique UNIQUE (booking_id);

-- 6. Create index for fast booking_id lookup (customer shows at store)
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);

-- ============================================
-- Create Functions and Triggers
-- ============================================

-- 7. Function to generate unique booking_id
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_booking_id TEXT;
  counter INT := 0;
BEGIN
  date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  LOOP
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    new_booking_id := 'BK-' || date_part || '-' || random_part;
    
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_id = new_booking_id) THEN
      RETURN new_booking_id;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Failed to generate unique booking ID after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger function to auto-generate booking_id on insert
CREATE OR REPLACE FUNCTION set_booking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_id IS NULL OR NEW.booking_id = '' THEN
    NEW.booking_id := generate_booking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_set_booking_id ON bookings;

CREATE TRIGGER trigger_set_booking_id
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_id();

-- 10. Trigger for auto-updating confirmed_at timestamp
CREATE OR REPLACE FUNCTION set_booking_confirmation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_confirmed_by_manager changes from false/null to true
  IF NEW.is_confirmed_by_manager = TRUE AND (OLD.is_confirmed_by_manager = FALSE OR OLD.is_confirmed_by_manager IS NULL) THEN
    NEW.confirmed_at = NOW();
    NEW.status = 'confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_confirmation ON bookings;

CREATE TRIGGER trigger_booking_confirmation
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_confirmation_timestamp();

-- 11. Trigger for auto-updating completed_at timestamp
CREATE OR REPLACE FUNCTION set_booking_completion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_completion ON bookings;

CREATE TRIGGER trigger_booking_completion
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_completion_timestamp();

-- ============================================
-- Verification Queries
-- ============================================

-- Check all columns now exist
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;

-- Check your 2 bookings now have booking_id
SELECT 
  id, 
  booking_id,
  customer_id,
  barber_id,
  status, 
  appointment_date,
  appointment_time,
  created_at
FROM bookings 
ORDER BY created_at DESC;

-- Check triggers are created
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'bookings'
ORDER BY trigger_name;

-- Check functions exist
SELECT 
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%booking%'
ORDER BY routine_name;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS! Missing columns added to bookings table';
  RAISE NOTICE '✅ Triggers and functions created';
  RAISE NOTICE '✅ Your existing 2 bookings are preserved';
  RAISE NOTICE '📋 Next step: Run FIX_MANAGER_RLS_BOOKINGS.sql to allow managers to see bookings';
END $$;
