-- ============================================
-- Check and Update Barber Services & Ratings
-- ============================================

-- 1. View current barbers with their data
SELECT 
  id,
  name,
  email,
  role,
  specialties,
  rating,
  total_reviews,
  is_active
FROM profiles
WHERE role = 'barber'
ORDER BY name;

-- 2. View all available services
SELECT 
  id,
  name,
  description,
  price,
  duration
FROM services
ORDER BY name;

-- 3. Example: Add services to a barber
-- Replace 'barber-email@example.com' with actual barber email
-- Replace the UUIDs with actual service IDs from step 2 above

-- First, get service IDs (copy these)
SELECT id, name FROM services;

-- Then update barber with service IDs
-- Example: If you have services with IDs 'service-id-1', 'service-id-2'
/*
UPDATE profiles
SET specialties = ARRAY[
  'service-id-1'::UUID,
  'service-id-2'::UUID,
  'service-id-3'::UUID
]
WHERE email = 'barber-email@example.com' AND role = 'barber';
*/

-- 4. Example: Update barber rating and reviews
/*
UPDATE profiles
SET 
  rating = 4.5,
  total_reviews = 10
WHERE email = 'barber-email@example.com' AND role = 'barber';
*/

-- 5. Verify the update
SELECT 
  name,
  email,
  specialties,
  rating,
  total_reviews,
  (SELECT ARRAY_AGG(s.name) 
   FROM services s 
   WHERE s.id = ANY(profiles.specialties)
  ) as service_names
FROM profiles
WHERE role = 'barber'
ORDER BY name;

-- ============================================
-- Quick Setup for Manager (Bhavyansh)
-- ============================================

-- If you want to add Bhavyansh as a barber instead of manager,
-- or add another barber, use these examples:

-- Get all service IDs first
SELECT 
  id,
  name,
  'UUID(''' || id || ''')' as uuid_format
FROM services;

-- Example: Update Bhavyansh to be a barber with all services
/*
UPDATE profiles
SET 
  role = 'barber',
  specialties = (SELECT ARRAY_AGG(id) FROM services),
  rating = 4.8,
  total_reviews = 25,
  bio = 'Professional barber with 5 years experience'
WHERE email = 'bhavyansh2018@gmail.com';
*/

-- Or create a new barber profile
/*
INSERT INTO profiles (
  id,
  email,
  name,
  role,
  phone,
  bio,
  specialties,
  rating,
  total_reviews,
  is_active,
  onboarding_completed
)
VALUES (
  gen_random_uuid(),
  'barber@example.com',
  'John Doe',
  'barber',
  '1234567890',
  'Expert barber specializing in modern cuts',
  (SELECT ARRAY_AGG(id) FROM services LIMIT 3), -- Add first 3 services
  4.5,
  15,
  true,
  true
);
*/

-- ============================================
-- Test Query: See how data will appear in app
-- ============================================
SELECT 
  p.id,
  p.name as barber_name,
  p.email,
  p.rating,
  p.total_reviews,
  COALESCE(
    (SELECT ARRAY_AGG(s.name ORDER BY s.name)
     FROM services s 
     WHERE s.id = ANY(p.specialties)
    ),
    ARRAY['No services yet']
  ) as services
FROM profiles p
WHERE p.role = 'barber' AND p.is_active = true
ORDER BY p.name;
