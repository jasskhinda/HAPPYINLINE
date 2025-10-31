-- ============================================
-- BOOKINGS/APPOINTMENTS TABLE
-- ============================================
-- Stores all customer bookings with barbers
-- Tracks status, confirmation, and completion
-- ============================================

-- Drop existing table if recreating
-- DROP TABLE IF EXISTS bookings CASCADE;

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique Booking ID (Human-readable, like McDonald's order ID)
  booking_id TEXT UNIQUE NOT NULL, -- Format: BK-20251004-A1B2C3 (BK-YYYYMMDD-6chars)
  
  -- User References
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Booking Details
  services JSONB NOT NULL, -- Array of service objects: [{id, name, price, description}]
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Status Management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  -- pending: Just created, waiting for manager confirmation
  -- confirmed: Manager/admin confirmed the appointment
  -- completed: Service completed successfully (customer can rate)
  -- cancelled: Customer or manager cancelled
  -- no_show: Customer didn't show up
  
  -- Manager Confirmation
  is_confirmed_by_manager BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES profiles(id), -- Manager/admin who confirmed
  confirmed_at TIMESTAMP,
  
  -- Completion Tracking
  completed_by UUID REFERENCES profiles(id), -- Manager/admin who marked complete
  completed_at TIMESTAMP,
  
  -- Notes and Metadata
  customer_notes TEXT, -- Special requests from customer
  barber_notes TEXT, -- Notes from barber/manager
  cancellation_reason TEXT, -- Why it was cancelled
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FUNCTION: Generate Unique Booking ID
-- ============================================

CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_booking_id TEXT;
  counter INT := 0;
BEGIN
  -- Get date part: YYYYMMDD
  date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Loop until we find a unique ID
  LOOP
    -- Generate 6 random alphanumeric characters (uppercase)
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    
    -- Combine: BK-YYYYMMDD-RANDOM6
    new_booking_id := 'BK-' || date_part || '-' || random_part;
    
    -- Check if this ID already exists
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_id = new_booking_id) THEN
      RETURN new_booking_id;
    END IF;
    
    -- Safety counter to prevent infinite loop (very unlikely to happen)
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Failed to generate unique booking ID after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-generate booking_id on insert
-- ============================================

CREATE OR REPLACE FUNCTION set_booking_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if booking_id is NULL or empty
  IF NEW.booking_id IS NULL OR NEW.booking_id = '' THEN
    NEW.booking_id := generate_booking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_id
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_id();

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Index for booking_id lookup (customer shows this at store)
CREATE UNIQUE INDEX idx_bookings_booking_id ON bookings(booking_id);

-- Index for customer bookings lookup
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);

-- Index for barber bookings lookup
CREATE INDEX idx_bookings_barber_id ON bookings(barber_id);

-- Index for date-based queries (upcoming/past)
CREATE INDEX idx_bookings_appointment_date ON bookings(appointment_date);

-- Index for status filtering
CREATE INDEX idx_bookings_status ON bookings(status);

-- Composite index for upcoming bookings query
CREATE INDEX idx_bookings_customer_upcoming ON bookings(customer_id, appointment_date, status);

-- Composite index for barber schedule
CREATE INDEX idx_bookings_barber_date ON bookings(barber_id, appointment_date, status);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bookings_timestamp
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_bookings_updated_at();

-- ============================================
-- TRIGGER: Auto-set confirmation timestamp
-- ============================================

CREATE OR REPLACE FUNCTION set_booking_confirmation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_confirmed_by_manager changes from false to true
  IF NEW.is_confirmed_by_manager = TRUE AND OLD.is_confirmed_by_manager = FALSE THEN
    NEW.confirmed_at = NOW();
    NEW.status = 'confirmed'; -- Auto-update status to confirmed
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_confirmation
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_confirmation_timestamp();

-- ============================================
-- TRIGGER: Auto-set completion timestamp
-- ============================================

CREATE OR REPLACE FUNCTION set_booking_completion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_completion
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_completion_timestamp();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own bookings
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = customer_id);

-- Policy: Barbers can view their bookings
CREATE POLICY "Barbers can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = barber_id);

-- Policy: Managers and admins can view all bookings
CREATE POLICY "Managers and admins view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);

-- Policy: Customers can create bookings
CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (
  auth.uid() = customer_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'customer'
  )
);

-- Policy: Customers can update their own bookings (reschedule, cancel)
CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Policy: Barbers can update their bookings (add notes, mark complete)
CREATE POLICY "Barbers can update own bookings"
ON bookings FOR UPDATE
USING (auth.uid() = barber_id)
WITH CHECK (auth.uid() = barber_id);

-- Policy: Managers and admins can update any booking
CREATE POLICY "Managers and admins can update all bookings"
ON bookings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);

-- Policy: Only managers/admins can delete bookings
CREATE POLICY "Managers and admins can delete bookings"
ON bookings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin', 'super_admin')
  )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get upcoming bookings for a user
CREATE OR REPLACE FUNCTION get_upcoming_bookings(user_id UUID)
RETURNS TABLE (
  booking_uuid UUID,
  booking_id TEXT,
  customer_name TEXT,
  barber_name TEXT,
  appointment_date DATE,
  appointment_time TIME,
  services JSONB,
  total_amount DECIMAL,
  status TEXT,
  is_confirmed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_uuid,
    b.booking_id,
    cp.name as customer_name,
    bp.name as barber_name,
    b.appointment_date,
    b.appointment_time,
    b.services,
    b.total_amount,
    b.status,
    b.is_confirmed_by_manager as is_confirmed
  FROM bookings b
  JOIN profiles cp ON cp.id = b.customer_id
  JOIN profiles bp ON bp.id = b.barber_id
  WHERE (b.customer_id = user_id OR b.barber_id = user_id)
  AND b.appointment_date >= CURRENT_DATE
  AND b.status NOT IN ('cancelled', 'completed')
  ORDER BY b.appointment_date ASC, b.appointment_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get past bookings for a user
CREATE OR REPLACE FUNCTION get_past_bookings(user_id UUID)
RETURNS TABLE (
  booking_uuid UUID,
  booking_id TEXT,
  customer_name TEXT,
  barber_name TEXT,
  appointment_date DATE,
  appointment_time TIME,
  services JSONB,
  total_amount DECIMAL,
  status TEXT,
  can_rate BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_uuid,
    b.booking_id,
    cp.name as customer_name,
    bp.name as barber_name,
    b.appointment_date,
    b.appointment_time,
    b.services,
    b.total_amount,
    b.status,
    (b.status = 'completed') as can_rate
  FROM bookings b
  JOIN profiles cp ON cp.id = b.customer_id
  JOIN profiles bp ON bp.id = b.barber_id
  WHERE (b.customer_id = user_id OR b.barber_id = user_id)
  AND (
    b.appointment_date < CURRENT_DATE 
    OR b.status IN ('cancelled', 'completed', 'no_show')
  )
  ORDER BY b.appointment_date DESC, b.appointment_time DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE QUERIES (for testing)
-- ============================================

/*
-- Get all bookings for a customer
SELECT * FROM bookings WHERE customer_id = 'CUSTOMER_UUID';

-- Get upcoming bookings
SELECT * FROM get_upcoming_bookings('USER_UUID');

-- Get past bookings
SELECT * FROM get_past_bookings('USER_UUID');

-- Manager confirms a booking
UPDATE bookings
SET is_confirmed_by_manager = TRUE,
    confirmed_by = 'MANAGER_UUID'
WHERE id = 'BOOKING_UUID';

-- Mark booking as completed
UPDATE bookings
SET status = 'completed',
    completed_by = 'MANAGER_UUID'
WHERE id = 'BOOKING_UUID';

-- Customer cancels booking
UPDATE bookings
SET status = 'cancelled',
    cancellation_reason = 'Changed my mind'
WHERE id = 'BOOKING_UUID'
AND customer_id = auth.uid();

-- Reschedule booking
UPDATE bookings
SET appointment_date = '2025-10-15',
    appointment_time = '14:00:00'
WHERE id = 'BOOKING_UUID'
AND customer_id = auth.uid();
*/

-- ============================================
-- NOTES
-- ============================================

/*
BOOKING ID FORMAT:
- Pattern: BK-YYYYMMDD-XXXXXX
- Example: BK-20251004-A7F3E9
- BK = Booking prefix
- YYYYMMDD = Date of booking creation
- XXXXXX = 6 random alphanumeric characters (uppercase)
- Auto-generated on insert
- Guaranteed unique
- Customer shows this at store visit (like McDonald's order ID)

BOOKING STATUS FLOW:
1. pending → Customer creates booking (default)
2. confirmed → Manager confirms the booking
3. completed → Manager marks as completed (customer can rate)
4. cancelled → Customer or manager cancels
5. no_show → Customer didn't show up (no rating allowed)

UI TAG DISPLAY:
- Upcoming Tab:
  * "Confirmed" if is_confirmed_by_manager = true
  * "Unconfirmed" if is_confirmed_by_manager = false
  * Show reschedule + cancel buttons
  * Display Booking ID prominently (BK-YYYYMMDD-XXXXXX)

- Past Tab:
  * "Completed" if status = 'completed' (show "Rate Service" button)
  * "Passed" if status = 'no_show' or date < today (no rate button)
  * "Cancelled" if status = 'cancelled' (no rate button)
  * No reschedule/cancel buttons
  * Display Booking ID for reference

CUSTOMER STORE VISIT:
- Customer shows booking_id at store: "BK-20251004-A7F3E9"
- Manager searches by booking_id to find appointment
- Confirms identity and marks as completed

SERVICES STORAGE:
Stored as JSONB array:
[
  {
    "id": "uuid",
    "name": "Haircut",
    "price": 15,
    "description": "Professional haircut"
  },
  {
    "id": "uuid",
    "name": "Shave",
    "price": 10,
    "description": "Clean shave"
  }
]
*/
