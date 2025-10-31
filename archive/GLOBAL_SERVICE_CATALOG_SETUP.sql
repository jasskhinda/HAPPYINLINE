-- ============================================
-- GLOBAL SERVICE CATALOG SYSTEM
-- ============================================
-- Services are shared globally
-- Each shop links to services with custom pricing
-- ============================================

-- ============================================
-- 1. UPDATE SERVICES TABLE (Global Catalog)
-- ============================================
-- Remove shop_id, price - make it global

-- First, backup existing data if needed
-- CREATE TABLE services_backup AS SELECT * FROM services;

-- Drop old services table and recreate
DROP TABLE IF EXISTS services CASCADE;

CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_duration INTEGER NOT NULL, -- in minutes
  category TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name) -- Prevent duplicate service names
);

-- Index for fast lookups
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_name ON services(name);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view services
CREATE POLICY "Anyone can view services"
ON services FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create services
CREATE POLICY "Authenticated users can create services"
ON services FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Policy: Creators can update their services
CREATE POLICY "Creators can update services"
ON services FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- ============================================
-- 2. CREATE SHOP_SERVICES TABLE (Linking)
-- ============================================
-- Links services to shops with custom pricing

CREATE TABLE IF NOT EXISTS shop_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  custom_price NUMERIC(10, 2) NOT NULL, -- Shop's custom price
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, service_id) -- One service per shop
);

-- Indexes for performance
CREATE INDEX idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX idx_shop_services_service_id ON shop_services(service_id);

-- Enable RLS
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view shop services
CREATE POLICY "Anyone can view shop services"
ON shop_services FOR SELECT
TO authenticated
USING (true);

-- Policy: Shop staff can manage their shop's services
CREATE POLICY "Shop staff can manage services"
ON shop_services FOR ALL
TO authenticated
USING (
  shop_id IN (
    SELECT shop_id FROM shop_staff 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  shop_id IN (
    SELECT shop_id FROM shop_staff 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- ============================================
-- 3. UPDATE BOOKINGS TABLE (if needed)
-- ============================================
-- Bookings should reference shop_services, not services directly

-- Check if bookings table has service_id column
DO $$
BEGIN
  -- Add shop_service_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'shop_service_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN shop_service_id UUID REFERENCES shop_services(id);
  END IF;
END $$;

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function: Get all available services (global catalog)
CREATE OR REPLACE FUNCTION get_all_services()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  default_duration INTEGER,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    name,
    description,
    default_duration,
    category,
    image_url,
    created_at
  FROM services
  ORDER BY category, name;
$$;

-- Function: Get services for a specific shop (with custom prices)
CREATE OR REPLACE FUNCTION get_shop_services(p_shop_id UUID)
RETURNS TABLE (
  id UUID,
  service_id UUID,
  name TEXT,
  description TEXT,
  duration INTEGER,
  category TEXT,
  image_url TEXT,
  custom_price NUMERIC,
  is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ss.id,
    s.id as service_id,
    s.name,
    s.description,
    s.default_duration as duration,
    s.category,
    s.image_url,
    ss.custom_price,
    ss.is_active
  FROM shop_services ss
  INNER JOIN services s ON s.id = ss.service_id
  WHERE ss.shop_id = p_shop_id
  AND ss.is_active = true
  ORDER BY s.category, s.name;
$$;

-- Function: Get services NOT yet added by a shop
CREATE OR REPLACE FUNCTION get_available_services_for_shop(p_shop_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  default_duration INTEGER,
  category TEXT,
  image_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    s.id,
    s.name,
    s.description,
    s.default_duration,
    s.category,
    s.image_url
  FROM services s
  WHERE s.id NOT IN (
    SELECT service_id 
    FROM shop_services 
    WHERE shop_id = p_shop_id
  )
  ORDER BY s.category, s.name;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_services() TO authenticated;
GRANT EXECUTE ON FUNCTION get_shop_services(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_services_for_shop(UUID) TO authenticated;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Update updated_at on services
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_services_updated_at ON services;
CREATE TRIGGER trigger_update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_services_updated_at();

-- Update updated_at on shop_services
CREATE OR REPLACE FUNCTION update_shop_services_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shop_services_updated_at ON shop_services;
CREATE TRIGGER trigger_update_shop_services_updated_at
BEFORE UPDATE ON shop_services
FOR EACH ROW
EXECUTE FUNCTION update_shop_services_updated_at();

-- ============================================
-- 6. SAMPLE DATA (Optional)
-- ============================================

-- Add some common services to get started
INSERT INTO services (name, description, default_duration, category, created_by)
VALUES
  ('Haircut', 'Classic men''s haircut with styling', 30, 'Hair', auth.uid()),
  ('Buzz Cut', 'Clean buzz cut with clippers', 15, 'Hair', auth.uid()),
  ('Fade Haircut', 'Modern fade haircut (low, mid, or high)', 45, 'Hair', auth.uid()),
  ('Beard Trim', 'Beard shaping and trimming', 20, 'Beard', auth.uid()),
  ('Clean Shave', 'Traditional straight razor shave', 25, 'Beard', auth.uid()),
  ('Haircut + Beard', 'Complete haircut with beard trim', 45, 'Combo', auth.uid())
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- View all services in global catalog
SELECT * FROM services ORDER BY category, name;

-- View shop_services structure
SELECT * FROM shop_services LIMIT 5;

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%service%' 
AND routine_schema = 'public';

-- ============================================
-- USAGE EXAMPLES
-- ============================================

/*
-- Get all services in global catalog
SELECT * FROM get_all_services();

-- Get services for a specific shop
SELECT * FROM get_shop_services('your-shop-id-here');

-- Get services available to add to a shop
SELECT * FROM get_available_services_for_shop('your-shop-id-here');

-- Add existing service to shop
INSERT INTO shop_services (shop_id, service_id, custom_price)
VALUES ('your-shop-id', 'service-id', 25.00);

-- Create new service and add to shop
WITH new_service AS (
  INSERT INTO services (name, description, default_duration, category, created_by)
  VALUES ('New Service', 'Description', 30, 'Category', auth.uid())
  RETURNING id
)
INSERT INTO shop_services (shop_id, service_id, custom_price)
SELECT 'your-shop-id', id, 30.00 FROM new_service;
*/

-- ============================================
-- SUMMARY
-- ============================================
-- ✅ services table - Global catalog
-- ✅ shop_services table - Shop-specific pricing
-- ✅ Helper functions created
-- ✅ RLS policies set
-- ✅ Triggers for updated_at
-- ✅ Sample data added
-- ============================================
