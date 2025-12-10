-- ============================================
-- INSERT SAMPLE REVIEWS - For Testing
-- ============================================
-- Use this to add sample reviews to test the reviews system
-- Replace UUIDs with actual IDs from your database
-- ============================================

-- First, get your barber and customer IDs
-- Run this to see available barbers:
SELECT id, name, email, role FROM profiles WHERE role = 'barber';

-- Run this to see available customers:
SELECT id, name, email, role FROM profiles WHERE role = 'customer';

-- ============================================
-- SAMPLE REVIEWS - Copy IDs from above
-- ============================================

-- Example: Add reviews for a barber
-- Replace 'BARBER_ID_HERE' and 'CUSTOMER_ID_HERE' with actual UUIDs

INSERT INTO reviews (barber_id, customer_id, customer_name, rating, review_text, services)
VALUES
  (
    'BARBER_ID_HERE'::7a4bf470-d369-44db-8dab-df620b521217,  -- Replace with actual barber UUID
    'CUSTOMER_ID_HERE'::aac0b13e-e6dc-4d8c-9509-d07e1f49140c,  -- Replace with actual customer UUID
    'John Smith',  -- Customer name
    5.0,  -- Rating (1-5)
    'Excellent service! The haircut was exactly what I wanted. Very professional and friendly. Will definitely come back!',
    ARRAY['Haircut', 'Beard Trim']  -- Services reviewed
  ),

-- ============================================
-- QUICK TEMPLATE - Copy and Edit
-- ============================================

/*
INSERT INTO reviews (barber_id, customer_id, customer_name, rating, review_text, services)
VALUES (
  'BARBER_UUID'::UUID,
  'CUSTOMER_UUID'::UUID,
  'Customer Name',
  5.0,
  'Review text here...',
  ARRAY['Service1', 'Service2']
);
*/

-- ============================================
-- VERIFY INSERTED REVIEWS
-- ============================================

-- Check all reviews
SELECT 
  r.id,
  r.customer_name,
  r.rating,
  r.review_text,
  r.services,
  r.created_at,
  p.name as barber_name
FROM reviews r
JOIN profiles p ON p.id = r.barber_id
ORDER BY r.created_at DESC;

-- Check barber's updated rating
SELECT 
  name,
  email,
  rating,
  total_reviews
FROM profiles
WHERE role = 'barber';

-- ============================================
-- DELETE TEST REVIEWS (if needed)
-- ============================================

/*
-- Delete all reviews for a specific barber
DELETE FROM reviews WHERE barber_id = 'BARBER_UUID'::UUID;

-- Delete a specific review
DELETE FROM reviews WHERE id = 'REVIEW_UUID'::UUID;

-- Delete all reviews (careful!)
DELETE FROM reviews;
*/
