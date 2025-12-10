-- ============================================
-- REVIEWS TABLE - For Customer Reviews of Barbers
-- ============================================

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating DECIMAL(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  services TEXT[], -- Array of service names reviewed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS reviews_barber_id_idx ON reviews(barber_id);
CREATE INDEX IF NOT EXISTS reviews_customer_id_idx ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at DESC);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR REVIEWS
-- ============================================

-- Everyone can read reviews (public)
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

-- Only the customer who wrote the review can update it
CREATE POLICY "Customers can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = customer_id);

-- Only the customer who wrote the review can delete it
CREATE POLICY "Customers can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = customer_id);

-- Authenticated users can insert reviews
CREATE POLICY "Authenticated users can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- ============================================
-- FUNCTION TO UPDATE BARBER RATING
-- ============================================

-- This function automatically updates the barber's rating and total_reviews
-- whenever a review is added, updated, or deleted
CREATE OR REPLACE FUNCTION update_barber_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate new average rating and total reviews for the barber
  UPDATE profiles
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE barber_id = COALESCE(NEW.barber_id, OLD.barber_id)
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE barber_id = COALESCE(NEW.barber_id, OLD.barber_id)
    )
  WHERE id = COALESCE(NEW.barber_id, OLD.barber_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic rating updates
DROP TRIGGER IF EXISTS update_barber_rating_on_insert ON reviews;
DROP TRIGGER IF EXISTS update_barber_rating_on_update ON reviews;
DROP TRIGGER IF EXISTS update_barber_rating_on_delete ON reviews;

CREATE TRIGGER update_barber_rating_on_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_rating();

CREATE TRIGGER update_barber_rating_on_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_rating();

CREATE TRIGGER update_barber_rating_on_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_barber_rating();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Example: Add sample reviews
-- Replace UUIDs with actual barber_id and customer_id from your profiles table
/*
INSERT INTO reviews (barber_id, customer_id, customer_name, rating, review_text, services)
VALUES
  (
    'barber-uuid-here',
    'customer-uuid-here',
    'John Smith',
    5.0,
    'Excellent service! The haircut was exactly what I wanted.',
    ARRAY['Haircut', 'Beard Trim']
  ),
  (
    'barber-uuid-here',
    'customer-uuid-here',
    'Mike Johnson',
    4.0,
    'Great experience. Professional and skilled barber.',
    ARRAY['Haircut']
  );
*/

-- ============================================
-- VERIFY TABLE CREATION
-- ============================================

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reviews'
ORDER BY ordinal_position;

-- Check indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'reviews';

-- Check RLS policies
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'reviews';

SELECT '✅ Reviews table created successfully!' as status;
SELECT 'Triggers set up to auto-update barber ratings' as info;
