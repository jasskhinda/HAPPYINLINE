-- ============================================
-- UPDATE get_shop_details FUNCTION
-- Add operating hours and manual status fields
-- ============================================

-- Drop and recreate the function with new fields
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
