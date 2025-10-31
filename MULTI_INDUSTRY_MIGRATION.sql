-- ============================================
-- MULTI-INDUSTRY PLATFORM MIGRATION
-- Transform from barbershop-focused to all-industry booking platform
-- ============================================
--
-- This migration adds support for ALL service industries:
-- - Beauty & Personal Care, Health & Wellness, Professional Services
-- - Home Services, Automotive, Events & Entertainment, and more
--
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING!
-- ⚠️ This is a NON-DESTRUCTIVE migration (adds columns, doesn't break existing data)
-- ============================================

-- ============================================
-- STEP 1: CREATE BUSINESS_CATEGORIES TABLE
-- ============================================
-- Top-level industry categories (Beauty, Health, Professional Services, etc.)

CREATE TABLE IF NOT EXISTS business_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Category Info
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- UI Display
  icon TEXT, -- Icon name or emoji (e.g., "✂️", "💆", "🏠", "🚗")
  color TEXT, -- Hex color for category (e.g., "#FF6B6B")
  display_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_business_categories_active ON business_categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_business_categories_slug ON business_categories(slug);

-- ============================================
-- STEP 2: CREATE BUSINESS_TYPES TABLE
-- ============================================
-- Specific business types within each category (Hair Salon, Massage Therapy, etc.)

CREATE TABLE IF NOT EXISTS business_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to parent category
  category_id UUID NOT NULL REFERENCES business_categories(id) ON DELETE CASCADE,

  -- Type Info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- UI Display
  icon TEXT,
  display_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one slug per category
  UNIQUE(category_id, slug)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_types_category ON business_types(category_id);
CREATE INDEX IF NOT EXISTS idx_business_types_active ON business_types(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_business_types_slug ON business_types(slug);

-- ============================================
-- STEP 3: ADD NEW COLUMNS TO SHOPS TABLE
-- ============================================
-- Add industry classification and flexible booking options

-- Add category and type
ALTER TABLE shops ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES business_categories(id) ON DELETE SET NULL;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_type_id UUID REFERENCES business_types(id) ON DELETE SET NULL;

-- Service delivery options
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_mobile_service BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(6,2) DEFAULT NULL; -- How far they travel
ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepts_walkins BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepts_online_booking BOOLEAN DEFAULT true;

-- Booking configuration
ALTER TABLE shops ADD COLUMN IF NOT EXISTS booking_lead_time_hours INTEGER DEFAULT 1; -- Min hours in advance
ALTER TABLE shops ADD COLUMN IF NOT EXISTS booking_buffer_minutes INTEGER DEFAULT 0; -- Buffer between appointments
ALTER TABLE shops ADD COLUMN IF NOT EXISTS max_advance_booking_days INTEGER DEFAULT 90; -- Max days in advance

-- Policies
ALTER TABLE shops ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS cancellation_hours INTEGER DEFAULT 24; -- Hours before for free cancellation
ALTER TABLE shops ADD COLUMN IF NOT EXISTS no_show_policy TEXT;

-- Additional details
ALTER TABLE shops ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb; -- ["WiFi", "Parking", "Wheelchair Accessible"]
ALTER TABLE shops ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT ARRAY['English']; -- Array of languages
ALTER TABLE shops ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Social media
ALTER TABLE shops ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS twitter_handle TEXT;

-- License/certification (optional)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_licensed BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category_id);
CREATE INDEX IF NOT EXISTS idx_shops_business_type ON shops(business_type_id);
CREATE INDEX IF NOT EXISTS idx_shops_mobile_service ON shops(is_mobile_service);

-- ============================================
-- STEP 4: CREATE SERVICE_CATEGORIES TABLE
-- ============================================
-- Allow businesses to organize their services into categories

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  business_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Category Info
  name TEXT NOT NULL, -- e.g., "Haircuts", "Coloring", "Spa Treatments"
  description TEXT,
  display_order INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_business ON service_categories(business_id);

-- ============================================
-- STEP 5: ENHANCE SERVICES TABLE
-- ============================================
-- Add flexibility for different service types and pricing

-- Link to service category (optional organization)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- Flexible duration (for services with variable time)
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_duration_minutes INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_duration_minutes INTEGER;

-- Service type
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'appointment'
  CHECK (service_type IN ('appointment', 'class', 'consultation', 'package', 'rental'));

-- Group services (classes, workshops)
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_group_service BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 1;
ALTER TABLE services ADD COLUMN IF NOT EXISTS current_bookings INTEGER DEFAULT 0;

-- Pricing options
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_min NUMERIC(10,2); -- For variable pricing
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_max NUMERIC(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC(5,2); -- e.g., 25.00 for 25%

-- Service media
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Display
ALTER TABLE services ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes (removed WHERE is_active = true since that column might not exist in older schemas)
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_group ON services(is_group_service);

-- ============================================
-- STEP 6: ENHANCE BOOKINGS TABLE
-- ============================================
-- Support different booking types and payment tracking

-- Booking type
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'appointment'
  CHECK (booking_type IN ('appointment', 'class', 'consultation', 'package', 'rental'));

-- Recurring bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB; -- {"frequency": "weekly", "days": ["monday", "wednesday"]}
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS parent_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Payment tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'refunded', 'failed'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT; -- "cash", "card", "online"
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_paid NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_paid NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) DEFAULT 0;

-- Cancellation tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2) DEFAULT 0;

-- Additional fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_walkin BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP WITH TIME ZONE;

-- Add no_show status to existing status check
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_recurring ON bookings(is_recurring);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);

-- ============================================
-- STEP 7: ENHANCE PROFILES TABLE
-- ============================================
-- Add customer preferences and location

-- User preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_businesses UUID[] DEFAULT ARRAY[]::UUID[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Location (for "near me" features)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": true,
  "push": true,
  "sms": false,
  "booking_confirmation": true,
  "booking_reminder": true,
  "booking_cancelled": true,
  "new_message": true,
  "promotions": false
}'::jsonb;

-- Customer stats
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_booking_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- STEP 8: SEED BUSINESS CATEGORIES & TYPES
-- ============================================

-- Insert main categories
INSERT INTO business_categories (name, slug, description, icon, color, display_order) VALUES
  ('Beauty & Personal Care', 'beauty-personal-care', 'Hair salons, barbershops, nail salons, spas, and beauty services', '💇', '#FF6B9D', 1),
  ('Health & Wellness', 'health-wellness', 'Massage, fitness, yoga, therapy, and wellness services', '💪', '#4ECDC4', 2),
  ('Professional Services', 'professional-services', 'Consultants, coaches, tutors, and professional expertise', '💼', '#45B7D1', 3),
  ('Home Services', 'home-services', 'Cleaning, repairs, maintenance, and home improvement', '🏠', '#FFA07A', 4),
  ('Automotive', 'automotive', 'Car wash, detailing, maintenance, and repair services', '🚗', '#95E1D3', 5),
  ('Events & Entertainment', 'events-entertainment', 'Photography, DJ services, event planning, and entertainment', '🎉', '#F38181', 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert business types for Beauty & Personal Care
INSERT INTO business_types (category_id, name, slug, description, display_order)
SELECT
  bc.id,
  bt.name,
  bt.slug,
  bt.description,
  bt.display_order
FROM business_categories bc
CROSS JOIN (VALUES
  ('Barbershop', 'barbershop', 'Traditional and modern barbershops for men''s grooming', 1),
  ('Hair Salon', 'hair-salon', 'Full-service hair salons for cuts, color, and styling', 2),
  ('Nail Salon', 'nail-salon', 'Manicures, pedicures, and nail art services', 3),
  ('Spa & Massage', 'spa-massage', 'Day spas, massage therapy, and relaxation services', 4),
  ('Makeup Artist', 'makeup-artist', 'Professional makeup services for events and occasions', 5),
  ('Esthetician', 'esthetician', 'Skincare, facials, and beauty treatments', 6),
  ('Eyebrow & Lash', 'eyebrow-lash', 'Eyebrow threading, waxing, and eyelash extensions', 7),
  ('Tattoo & Piercing', 'tattoo-piercing', 'Tattoo artists and body piercing studios', 8),
  ('Tanning Salon', 'tanning-salon', 'Spray tans and tanning bed services', 9)
) AS bt(name, slug, description, display_order)
WHERE bc.slug = 'beauty-personal-care'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert business types for Health & Wellness
INSERT INTO business_types (category_id, name, slug, description, display_order)
SELECT
  bc.id,
  bt.name,
  bt.slug,
  bt.description,
  bt.display_order
FROM business_categories bc
CROSS JOIN (VALUES
  ('Massage Therapy', 'massage-therapy', 'Therapeutic and relaxation massage services', 1),
  ('Physiotherapy', 'physiotherapy', 'Physical therapy and rehabilitation services', 2),
  ('Chiropractic', 'chiropractic', 'Chiropractic care and spinal adjustments', 3),
  ('Acupuncture', 'acupuncture', 'Traditional Chinese acupuncture and treatment', 4),
  ('Personal Training', 'personal-training', 'One-on-one fitness coaching and training', 5),
  ('Yoga Studio', 'yoga-studio', 'Yoga classes and private sessions', 6),
  ('Pilates Studio', 'pilates-studio', 'Pilates instruction and classes', 7),
  ('Gym & Fitness', 'gym-fitness', 'Fitness centers and workout facilities', 8),
  ('Nutritionist', 'nutritionist', 'Nutrition counseling and meal planning', 9),
  ('Mental Health', 'mental-health', 'Counseling and therapy services', 10)
) AS bt(name, slug, description, display_order)
WHERE bc.slug = 'health-wellness'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert business types for Professional Services
INSERT INTO business_types (category_id, name, slug, description, display_order)
SELECT
  bc.id,
  bt.name,
  bt.slug,
  bt.description,
  bt.display_order
FROM business_categories bc
CROSS JOIN (VALUES
  ('Business Consultant', 'business-consultant', 'Business strategy and consulting services', 1),
  ('Career Coach', 'career-coach', 'Career development and job search coaching', 2),
  ('Life Coach', 'life-coach', 'Personal development and life coaching', 3),
  ('Financial Advisor', 'financial-advisor', 'Financial planning and investment advice', 4),
  ('Legal Services', 'legal-services', 'Lawyer consultations and legal advice', 5),
  ('Accountant', 'accountant', 'Tax preparation and accounting services', 6),
  ('Real Estate Agent', 'real-estate-agent', 'Property viewings and real estate services', 7),
  ('Tutor', 'tutor', 'Academic tutoring and test preparation', 8),
  ('Language Teacher', 'language-teacher', 'Language instruction and conversation practice', 9),
  ('Music Teacher', 'music-teacher', 'Music lessons for all instruments', 10),
  ('Art Instructor', 'art-instructor', 'Art classes and creative instruction', 11)
) AS bt(name, slug, description, display_order)
WHERE bc.slug = 'professional-services'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert business types for Home Services
INSERT INTO business_types (category_id, name, slug, description, display_order)
SELECT
  bc.id,
  bt.name,
  bt.slug,
  bt.description,
  bt.display_order
FROM business_categories bc
CROSS JOIN (VALUES
  ('House Cleaning', 'house-cleaning', 'Residential cleaning and maid services', 1),
  ('Carpet Cleaning', 'carpet-cleaning', 'Professional carpet and upholstery cleaning', 2),
  ('Window Cleaning', 'window-cleaning', 'Window washing and exterior cleaning', 3),
  ('Plumbing', 'plumbing', 'Plumbing repairs and installations', 4),
  ('Electrical', 'electrical', 'Electrical repairs and installations', 5),
  ('HVAC', 'hvac', 'Heating, ventilation, and air conditioning services', 6),
  ('Handyman', 'handyman', 'General repairs and home maintenance', 7),
  ('Appliance Repair', 'appliance-repair', 'Appliance troubleshooting and repair', 8),
  ('Pest Control', 'pest-control', 'Pest extermination and prevention', 9),
  ('Lawn Care', 'lawn-care', 'Lawn mowing and yard maintenance', 10),
  ('Landscaping', 'landscaping', 'Landscape design and installation', 11),
  ('Pool Service', 'pool-service', 'Pool cleaning and maintenance', 12),
  ('Pet Grooming', 'pet-grooming', 'Mobile and in-home pet grooming', 13)
) AS bt(name, slug, description, display_order)
WHERE bc.slug = 'home-services'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert business types for Automotive
INSERT INTO business_types (category_id, name, slug, description, display_order)
SELECT
  bc.id,
  bt.name,
  bt.slug,
  bt.description,
  bt.display_order
FROM business_categories bc
CROSS JOIN (VALUES
  ('Car Wash', 'car-wash', 'Automated and hand car washing', 1),
  ('Auto Detailing', 'auto-detailing', 'Interior and exterior car detailing', 2),
  ('Oil Change', 'oil-change', 'Quick oil change and fluid services', 3),
  ('Tire Shop', 'tire-shop', 'Tire sales, installation, and rotation', 4),
  ('Auto Repair', 'auto-repair', 'General automotive repair and maintenance', 5),
  ('Mobile Mechanic', 'mobile-mechanic', 'On-location vehicle repair services', 6),
  ('Car Inspection', 'car-inspection', 'Vehicle safety and emissions inspections', 7)
) AS bt(name, slug, description, display_order)
WHERE bc.slug = 'automotive'
ON CONFLICT (category_id, slug) DO NOTHING;

-- Insert business types for Events & Entertainment
INSERT INTO business_types (category_id, name, slug, description, display_order)
SELECT
  bc.id,
  bt.name,
  bt.slug,
  bt.description,
  bt.display_order
FROM business_categories bc
CROSS JOIN (VALUES
  ('Photography', 'photography', 'Professional photography services', 1),
  ('Videography', 'videography', 'Video production and cinematography', 2),
  ('DJ Services', 'dj-services', 'Professional DJ and music services', 3),
  ('Event Planner', 'event-planner', 'Event planning and coordination', 4),
  ('Catering', 'catering', 'Food catering for events', 5),
  ('Party Rentals', 'party-rentals', 'Equipment and decor rentals', 6),
  ('Face Painting', 'face-painting', 'Face painting for parties and events', 7),
  ('Balloon Artist', 'balloon-artist', 'Balloon decorations and sculptures', 8),
  ('Entertainer', 'entertainer', 'Party entertainers and performers', 9)
) AS bt(name, slug, description, display_order)
WHERE bc.slug = 'events-entertainment'
ON CONFLICT (category_id, slug) DO NOTHING;

-- ============================================
-- STEP 9: CREATE HELPER FUNCTIONS
-- ============================================

-- Get all active categories with type count
CREATE OR REPLACE FUNCTION get_business_categories()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  icon TEXT,
  color TEXT,
  type_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.name,
    bc.slug,
    bc.description,
    bc.icon,
    bc.color,
    COUNT(bt.id) as type_count
  FROM business_categories bc
  LEFT JOIN business_types bt ON bt.category_id = bc.id AND bt.is_active = true
  WHERE bc.is_active = true
  GROUP BY bc.id, bc.name, bc.slug, bc.description, bc.icon, bc.color
  ORDER BY bc.display_order, bc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get business types for a category
CREATE OR REPLACE FUNCTION get_business_types_by_category(p_category_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  icon TEXT,
  business_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bt.id,
    bt.name,
    bt.slug,
    bt.description,
    bt.icon,
    COUNT(s.id) as business_count
  FROM business_types bt
  LEFT JOIN shops s ON s.business_type_id = bt.id AND (s.is_active IS NULL OR s.is_active = true)
  WHERE bt.category_id = p_category_id AND bt.is_active = true
  GROUP BY bt.id, bt.name, bt.slug, bt.description, bt.icon
  ORDER BY bt.display_order, bt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Search businesses by category, type, or location
CREATE OR REPLACE FUNCTION search_businesses(
  p_category_id UUID DEFAULT NULL,
  p_business_type_id UUID DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  city TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  rating DECIMAL,
  total_reviews INTEGER,
  category_name TEXT,
  business_type_name TEXT,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.description,
    s.address,
    s.city,
    s.logo_url,
    s.cover_image_url,
    s.rating,
    s.total_reviews,
    bc.name as category_name,
    bt.name as business_type_name,
    NULL::NUMERIC as distance_km
  FROM shops s
  LEFT JOIN business_categories bc ON bc.id = s.category_id
  LEFT JOIN business_types bt ON bt.id = s.business_type_id
  WHERE (s.is_active IS NULL OR s.is_active = true)
    AND (s.status IS NULL OR s.status = 'approved') -- Only show approved businesses
    AND (p_category_id IS NULL OR s.category_id = p_category_id)
    AND (p_business_type_id IS NULL OR s.business_type_id = p_business_type_id)
    AND (p_city IS NULL OR s.city ILIKE '%' || p_city || '%')
    AND (p_search_query IS NULL OR
         s.name ILIKE '%' || p_search_query || '%' OR
         s.description ILIKE '%' || p_search_query || '%')
  ORDER BY s.rating DESC, s.total_reviews DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 10: UPDATE EXISTING FUNCTIONS
-- ============================================

-- Update get_shop_details to include category info
DROP FUNCTION IF EXISTS get_shop_details(UUID);
CREATE OR REPLACE FUNCTION get_shop_details(p_shop_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  rating DECIMAL,
  total_reviews INTEGER,
  staff_count BIGINT,
  is_active BOOLEAN,
  category_name TEXT,
  business_type_name TEXT,
  is_mobile_service BOOLEAN,
  accepts_online_booking BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.description,
    s.address,
    s.phone,
    s.logo_url,
    s.cover_image_url,
    s.rating,
    s.total_reviews,
    COUNT(DISTINCT ss.id) as staff_count,
    s.is_active,
    bc.name as category_name,
    bt.name as business_type_name,
    s.is_mobile_service,
    s.accepts_online_booking
  FROM shops s
  LEFT JOIN shop_staff ss ON ss.shop_id = s.id AND (ss.is_active IS NULL OR ss.is_active = true)
  LEFT JOIN business_categories bc ON bc.id = s.category_id
  LEFT JOIN business_types bt ON bt.id = s.business_type_id
  WHERE s.id = p_shop_id
  GROUP BY s.id, bc.name, bt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 11: CREATE TRIGGERS
-- ============================================

-- Auto-update timestamp triggers for new tables
DROP TRIGGER IF EXISTS business_categories_updated_at ON business_categories;
CREATE TRIGGER business_categories_updated_at
  BEFORE UPDATE ON business_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS business_types_updated_at ON business_types;
CREATE TRIGGER business_types_updated_at
  BEFORE UPDATE ON business_types
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS service_categories_updated_at ON service_categories;
CREATE TRIGGER service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- ============================================
-- STEP 12: GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON business_categories TO anon, authenticated;
GRANT SELECT ON business_types TO anon, authenticated;
GRANT SELECT ON service_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON service_categories TO authenticated;

GRANT EXECUTE ON FUNCTION get_business_categories() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_business_types_by_category(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_businesses(UUID, UUID, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- ============================================
-- STEP 13: MIGRATION FOR EXISTING DATA
-- ============================================
-- Set default category/type for existing barbershops

DO $$
DECLARE
  v_category_id UUID;
  v_business_type_id UUID;
BEGIN
  -- Get the Beauty & Personal Care category
  SELECT id INTO v_category_id
  FROM business_categories
  WHERE slug = 'beauty-personal-care';

  -- Get the Barbershop business type
  SELECT id INTO v_business_type_id
  FROM business_types
  WHERE slug = 'barbershop';

  -- Update existing shops without a category
  IF v_category_id IS NOT NULL AND v_business_type_id IS NOT NULL THEN
    UPDATE shops
    SET
      category_id = v_category_id,
      business_type_id = v_business_type_id
    WHERE category_id IS NULL;

    RAISE NOTICE 'Updated % existing shops with barbershop category',
      (SELECT COUNT(*) FROM shops WHERE category_id = v_category_id);
  END IF;
END $$;

-- ============================================
-- STEP 14: VERIFICATION
-- ============================================

SELECT '✅ Multi-industry migration complete!' as status;

-- Check new tables
SELECT 'New tables created:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('business_categories', 'business_types', 'service_categories')
ORDER BY table_name;

-- Check categories
SELECT 'Business categories:' as info;
SELECT COUNT(*) as category_count FROM business_categories WHERE is_active = true;

-- Check types
SELECT 'Business types:' as info;
SELECT COUNT(*) as type_count FROM business_types WHERE is_active = true;

-- Check shops with categories
SELECT 'Shops with categories:' as info;
SELECT COUNT(*) as categorized_count FROM shops WHERE category_id IS NOT NULL;

-- Show category summary
SELECT
  bc.name as category,
  COUNT(DISTINCT bt.id) as types,
  COUNT(DISTINCT s.id) as businesses
FROM business_categories bc
LEFT JOIN business_types bt ON bt.category_id = bc.id
LEFT JOIN shops s ON s.category_id = bc.id
WHERE bc.is_active = true
GROUP BY bc.id, bc.name
ORDER BY bc.display_order;

SELECT '🎉 Your platform now supports ALL industries!' as result;
SELECT '📝 Next: Update your registration UI to let businesses select their category/type' as next_step;
