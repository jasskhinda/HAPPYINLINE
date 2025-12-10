-- ============================================
-- Quick Update: Set Rating & Reviews for Barbers
-- ============================================

-- 1. View current barbers with ratings
SELECT 
  name,
  email,
  role,
  rating,
  total_reviews,
  is_active
FROM profiles
WHERE role = 'barber'
ORDER BY name;

-- 2. Update ALL barbers with sample ratings
-- This gives each barber a random-ish rating between 4.0-5.0
UPDATE profiles
SET 
  rating = 4.5,
  total_reviews = 12
WHERE role = 'barber';

-- 3. Or update specific barber by email
-- Example: Give Bhavyansh a 4.8 rating with 25 reviews
/*
UPDATE profiles
SET 
  rating = 4.8,
  total_reviews = 25,
  bio = 'Professional barber with 5 years experience'
WHERE email = 'bhavyansh2018@gmail.com';
*/

-- 4. Update multiple barbers with different ratings
/*
-- Barber 1: Excellent rating
UPDATE profiles
SET rating = 4.9, total_reviews = 50
WHERE email = 'barber1@example.com';

-- Barber 2: Good rating  
UPDATE profiles
SET rating = 4.5, total_reviews = 30
WHERE email = 'barber2@example.com';

-- Barber 3: Average rating
UPDATE profiles
SET rating = 4.2, total_reviews = 18
WHERE email = 'barber3@example.com';
*/

-- 5. Verify the updates
SELECT 
  name,
  email,
  rating,
  total_reviews,
  CASE 
    WHEN rating >= 4.8 THEN '⭐⭐⭐⭐⭐ Excellent'
    WHEN rating >= 4.5 THEN '⭐⭐⭐⭐☆ Great'
    WHEN rating >= 4.0 THEN '⭐⭐⭐⭐ Good'
    WHEN rating >= 3.5 THEN '⭐⭐⭐ Fair'
    ELSE '⭐⭐ Needs Improvement'
  END as rating_display
FROM profiles
WHERE role = 'barber'
ORDER BY rating DESC, total_reviews DESC;

-- ============================================
-- EXPLANATION
-- ============================================
-- Rating scale: 0.0 to 5.0 (decimal)
-- Total reviews: Any positive integer
-- 
-- These values are now properly fetched by:
-- - fetchBarbers() in auth.js
-- - Displayed in BarberLayout.jsx with stars
-- ============================================

SELECT '✅ Now reload your app to see ratings!' as status;
