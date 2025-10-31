-- ============================================
-- GLOBAL SERVICE CATALOG SETUP
-- ============================================
-- Run this in Supabase SQL Editor
-- This creates a shared service catalog where:
-- 1. services = global catalog (all shops can see/use)
-- 2. shop_services = links shops to services with custom pricing
-- ============================================

-- ============================================
-- STEP 1: Backup existing data
-- ============================================
CREATE TABLE IF NOT EXISTS services_backup AS 
SELECT * FROM services;

-- ============================================
-- STEP 2: Recreate services table (GLOBAL)
-- ============================================
DROP TABLE IF EXISTS services CASCADE;

CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_duration INTEGER NOT NULL DEFAULT 30,
  category TEXT,
  image_url TEXT,
  icon_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_name ON services(name);

-- RLS Policies
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services"
ON services FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can create services"
ON services FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can update their services"
ON services FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- ============================================
-- STEP 3: Create shop_services table
-- ============================================
CREATE TABLE IF NOT EXISTS shop_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  custom_price NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, service_id)
);

-- Indexes
CREATE INDEX idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX idx_shop_services_service_id ON shop_services(service_id);

-- RLS Policies
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop services"
ON shop_services FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Shop staff can manage their shop services"
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
-- STEP 4: Add some default services
-- ============================================
INSERT INTO services (name, description, default_duration, category, created_by)
SELECT 
  'Haircut', 
  'Classic men''s haircut', 
  30, 
  'Hair',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Haircut');

INSERT INTO services (name, description, default_duration, category, created_by)
SELECT 
  'Beard Trim', 
  'Professional beard trimming and shaping', 
  20, 
  'Beard',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Beard Trim');

INSERT INTO services (name, description, default_duration, category, created_by)
SELECT 
  'Fade Haircut', 
  'Modern fade haircut', 
  45, 
  'Hair',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Fade Haircut');

INSERT INTO services (name, description, default_duration, category, created_by)
SELECT 
  'Clean Shave', 
  'Traditional straight razor shave', 
  25, 
  'Beard',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Clean Shave');

-- ============================================
-- STEP 5: Migrate old data (if needed)
-- ============================================
-- Migrate unique services from backup to global catalog
INSERT INTO services (name, description, default_duration, category, image_url, created_by)
SELECT DISTINCT ON (name)
  name,
  description,
  duration as default_duration,
  category,
  image_url,
  (SELECT id FROM auth.users LIMIT 1)
FROM services_backup
WHERE name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Migrate shop-service relationships to shop_services
INSERT INTO shop_services (shop_id, service_id, custom_price, is_active)
SELECT 
  sb.shop_id,
  s.id as service_id,
  sb.price as custom_price,
  sb.is_active
FROM services_backup sb
INNER JOIN services s ON s.name = sb.name
WHERE sb.shop_id IS NOT NULL
ON CONFLICT (shop_id, service_id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check tables
SELECT 'Global Services' as table_name, COUNT(*) as count FROM services
UNION ALL
SELECT 'Shop Services', COUNT(*) FROM shop_services;

-- ============================================
-- DONE! ✅
-- ============================================
