-- ============================================
-- ADD SHOP OPERATING HOURS AND MANUAL STATUS
-- ============================================
-- This migration adds support for:
-- 1. Shop operating hours (days + times)
-- 2. Manual open/closed toggle for admins/managers
-- 3. Helper functions to check if shop is currently open

-- ============================================
-- 1. ADD NEW COLUMNS TO SHOPS TABLE
-- ============================================

-- Add columns for shop operating status
ALTER TABLE shops 
  ADD COLUMN IF NOT EXISTS operating_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday"]',
  ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS is_manually_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Update existing shops to have default values
UPDATE shops 
SET 
  operating_days = '["monday","tuesday","wednesday","thursday","friday","saturday"]',
  opening_time = '09:00:00',
  closing_time = '18:00:00',
  is_manually_closed = false
WHERE operating_days IS NULL OR opening_time IS NULL;

COMMENT ON COLUMN shops.operating_days IS 'Array of days shop is open: ["monday", "tuesday", ...]';
COMMENT ON COLUMN shops.opening_time IS 'Daily opening time (same for all operating days)';
COMMENT ON COLUMN shops.closing_time IS 'Daily closing time (same for all operating days)';
COMMENT ON COLUMN shops.is_manually_closed IS 'Admin/Manager can manually close shop (overrides schedule)';

-- ============================================
-- 2. CREATE FUNCTION TO CHECK IF SHOP IS OPEN
-- ============================================

CREATE OR REPLACE FUNCTION is_shop_open(
  p_shop_id UUID,
  p_check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_operating_days JSONB;
  v_opening_time TIME;
  v_closing_time TIME;
  v_is_manually_closed BOOLEAN;
  v_current_day TEXT;
  v_current_time TIME;
  v_is_operating_day BOOLEAN;
BEGIN
  -- Get shop data
  SELECT 
    operating_days, 
    opening_time, 
    closing_time, 
    is_manually_closed
  INTO 
    v_operating_days,
    v_opening_time,
    v_closing_time,
    v_is_manually_closed
  FROM shops
  WHERE id = p_shop_id AND is_active = true;

  -- Shop not found or inactive
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Manual override - shop is closed
  IF v_is_manually_closed THEN
    RETURN false;
  END IF;

  -- Get current day and time
  v_current_day := LOWER(TO_CHAR(p_check_time, 'Day'));
  v_current_day := TRIM(v_current_day); -- Remove spaces
  v_current_time := p_check_time::TIME;

  -- Check if current day is in operating days
  v_is_operating_day := v_operating_days ? v_current_day;

  IF NOT v_is_operating_day THEN
    RETURN false;
  END IF;

  -- Check if current time is within operating hours
  IF v_current_time >= v_opening_time AND v_current_time <= v_closing_time THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

COMMENT ON FUNCTION is_shop_open IS 'Check if shop is currently open based on schedule and manual status';

-- ============================================
-- 3. CREATE VIEW FOR SHOP STATUS
-- ============================================

CREATE OR REPLACE VIEW shop_status_view AS
SELECT 
  id,
  name,
  operating_days,
  opening_time,
  closing_time,
  is_manually_closed,
  is_active,
  is_shop_open(id) AS is_currently_open,
  CASE 
    WHEN NOT is_active THEN 'Inactive'
    WHEN is_manually_closed THEN 'Manually Closed'
    WHEN is_shop_open(id) THEN 'Open'
    ELSE 'Closed'
  END AS status_text
FROM shops;

COMMENT ON VIEW shop_status_view IS 'Real-time shop status with open/closed information';

-- ============================================
-- 4. UPDATE RLS POLICIES FOR MANUAL CLOSE TOGGLE
-- ============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Shop staff can toggle manual close status" ON shops;

-- Allow shop admins and managers to toggle is_manually_closed
CREATE POLICY "Shop staff can toggle manual close status"
  ON shops
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shop_staff
      WHERE shop_staff.shop_id = shops.id
        AND shop_staff.user_id = auth.uid()
        AND shop_staff.role IN ('admin', 'manager')
        AND shop_staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shop_staff
      WHERE shop_staff.shop_id = shops.id
        AND shop_staff.user_id = auth.uid()
        AND shop_staff.role IN ('admin', 'manager')
        AND shop_staff.is_active = true
    )
  );

-- ============================================
-- 5. EXAMPLE QUERIES
-- ============================================

-- Get all shops with their current status
-- SELECT * FROM shop_status_view;

-- Get only currently open shops
-- SELECT * FROM shop_status_view WHERE is_currently_open = true;

-- Manually close a shop (admin/manager)
-- UPDATE shops SET is_manually_closed = true WHERE id = 'shop-uuid';

-- Reopen a manually closed shop
-- UPDATE shops SET is_manually_closed = false WHERE id = 'shop-uuid';

-- Update shop operating hours
-- UPDATE shops 
-- SET 
--   operating_days = '["monday","tuesday","wednesday","thursday","friday"]',
--   opening_time = '10:00:00',
--   closing_time = '20:00:00'
-- WHERE id = 'shop-uuid';

-- ============================================
-- 6. UPDATE get_shop_details FUNCTION
-- ============================================
-- This ensures the function returns the new fields

DROP FUNCTION IF EXISTS get_shop_details(UUID);

CREATE OR REPLACE FUNCTION get_shop_details(p_shop_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  rating DECIMAL,
  total_reviews INTEGER,
  staff_count BIGINT,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  operating_days JSONB,
  opening_time TIME,
  closing_time TIME,
  is_manually_closed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.address,
    s.city,
    s.phone,
    s.logo_url,
    s.cover_image_url,
    s.rating,
    s.total_reviews,
    COUNT(DISTINCT ss.id) as staff_count,
    s.is_active,
    s.is_verified,
    s.operating_days,
    s.opening_time,
    s.closing_time,
    s.is_manually_closed
  FROM shops s
  LEFT JOIN shop_staff ss ON ss.shop_id = s.id AND ss.is_active = true
  WHERE s.id = p_shop_id
  GROUP BY s.id, s.name, s.description, s.address, s.city, s.phone, 
           s.logo_url, s.cover_image_url, s.rating, s.total_reviews, 
           s.is_active, s.is_verified, s.operating_days, s.opening_time, 
           s.closing_time, s.is_manually_closed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_shop_details IS 'Get detailed shop information including operating hours and manual status';

COMMIT;
