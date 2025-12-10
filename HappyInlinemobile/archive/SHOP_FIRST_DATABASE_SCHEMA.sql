-- ============================================
-- COMPLETE SHOP-FIRST DATABASE REDESIGN
-- Transform single barber → Multiple shop platform
-- ============================================
-- 
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING!
--
-- NEW ARCHITECTURE:
-- 1. Shops are the primary entity
-- 2. Users have roles within shops (admin, manager, barber)
-- 3. Services belong to shops
-- 4. Bookings are shop-centric
-- 5. Reviews are for shops (not individual barbers)
-- ============================================

-- ============================================
-- STEP 1: CREATE PROFILES TABLE (FROM AUTH)
-- ============================================
-- This table stores user information linked to auth.users

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User Information
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Profile Image
  profile_image TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  
  -- Platform Admin (for platform owners, not shop admins)
  is_platform_admin BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for automatic profile creation when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 2: CREATE SHOPS TABLE (PRIMARY ENTITY)
-- ============================================

CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Shop Information
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Contact Information
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  
  -- Shop Images
  logo_url TEXT,
  cover_image_url TEXT,
  gallery_images TEXT[], -- Array of image URLs
  
  -- Business Details
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "09:00", "close": "17:00", "closed": false},
    "sunday": {"open": "10:00", "close": "16:00", "closed": false}
  }'::jsonb,
  
  -- Location (for map/search features)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Shop Ratings & Stats
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Platform verification
  
  -- Owner (who created the shop)
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE SHOP_STAFF TABLE
-- ============================================
-- This table manages who works at which shop and their role

CREATE TABLE IF NOT EXISTS shop_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role within THIS shop (not global role)
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'barber')),
  -- admin: Full control over shop
  -- manager: Manage bookings, staff, services
  -- barber: View assigned bookings, update status
  
  -- Barber-specific data
  bio TEXT,
  specialties TEXT[], -- Array of specialty names like ["Haircut", "Beard Trim"]
  experience_years INTEGER,
  
  -- Barber rating (within this shop)
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  invited_by UUID REFERENCES profiles(id),
  hired_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one user can only have one role per shop
  UNIQUE(shop_id, user_id)
);

-- ============================================
-- STEP 4: CREATE SERVICES TABLE (SHOP-OWNED)
-- ============================================

CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  category TEXT, -- "Hair", "Beard", "Styling", etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 5: CREATE BOOKINGS TABLE (SHOP-CENTRIC)
-- ============================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Optional!
  services JSONB NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  total_amount DECIMAL(10, 2) NOT NULL,
  customer_notes TEXT,
  shop_rating DECIMAL(3, 2),
  shop_review TEXT,
  barber_rating DECIMAL(3, 2),
  barber_review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 6: CREATE SHOP_REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS shop_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Review Content
  rating DECIMAL(3, 2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_text TEXT,
  
  -- Optional: Rate specific barber
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  barber_rating DECIMAL(3, 2),
  
  -- Services received (for context)
  services JSONB,
  
  -- Helpful votes
  helpful_count INTEGER DEFAULT 0,
  
  -- Status
  is_visible BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One review per booking
  UNIQUE(booking_id)
);

-- ============================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- Shops
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_shops_rating ON shops(rating DESC);
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city);

-- Shop Staff
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop ON shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_user ON shop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_role ON shop_staff(role);
CREATE INDEX IF NOT EXISTS idx_shop_staff_active ON shop_staff(is_active);

-- Services
CREATE INDEX IF NOT EXISTS idx_services_shop ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_shop ON bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON shop_reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON shop_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_barber ON shop_reviews(barber_id);

-- ============================================
-- STEP 8: CREATE HELPER FUNCTIONS
-- ============================================

-- Get user's role in a specific shop
CREATE OR REPLACE FUNCTION get_user_role_in_shop(p_user_id UUID, p_shop_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM shop_staff 
    WHERE user_id = p_user_id 
      AND shop_id = p_shop_id 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all shops where user is staff
CREATE OR REPLACE FUNCTION get_user_shops(p_user_id UUID)
RETURNS TABLE (
  shop_id UUID,
  shop_name TEXT,
  shop_logo TEXT,
  user_role TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.logo_url,
    ss.role,
    ss.is_active
  FROM shops s
  INNER JOIN shop_staff ss ON ss.shop_id = s.id
  WHERE ss.user_id = p_user_id 
    AND s.is_active = true
  ORDER BY ss.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get shop details with staff count
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
  is_active BOOLEAN
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
    s.is_active
  FROM shops s
  LEFT JOIN shop_staff ss ON ss.shop_id = s.id AND ss.is_active = true
  WHERE s.id = p_shop_id
  GROUP BY s.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get shop barbers
CREATE OR REPLACE FUNCTION get_shop_barbers(p_shop_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  profile_image TEXT,
  bio TEXT,
  specialties TEXT[],
  rating DECIMAL,
  total_reviews INTEGER,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.user_id,
    p.name,
    p.profile_image,
    ss.bio,
    ss.specialties,
    ss.rating,
    ss.total_reviews,
    ss.is_available
  FROM shop_staff ss
  INNER JOIN profiles p ON p.id = ss.user_id
  WHERE ss.shop_id = p_shop_id 
    AND ss.role = 'barber'
    AND ss.is_active = true
  ORDER BY ss.rating DESC, ss.total_reviews DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update shop rating (after new review)
CREATE OR REPLACE FUNCTION update_shop_rating(p_shop_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating DECIMAL;
  review_count INTEGER;
BEGIN
  SELECT 
    AVG(rating),
    COUNT(*)
  INTO avg_rating, review_count
  FROM shop_reviews
  WHERE shop_id = p_shop_id AND is_visible = true;
  
  UPDATE shops
  SET 
    rating = COALESCE(avg_rating, 0),
    total_reviews = review_count
  WHERE id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: CREATE TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Shops
DROP TRIGGER IF EXISTS shops_updated_at ON shops;
CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Shop Staff
DROP TRIGGER IF EXISTS shop_staff_updated_at ON shop_staff;
CREATE TRIGGER shop_staff_updated_at
  BEFORE UPDATE ON shop_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Services
DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Reviews
DROP TRIGGER IF EXISTS reviews_updated_at ON shop_reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON shop_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Auto-update shop rating after review
CREATE OR REPLACE FUNCTION trigger_update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_shop_rating(NEW.shop_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_review_update_rating ON shop_reviews;
CREATE TRIGGER after_review_update_rating
  AFTER INSERT OR UPDATE ON shop_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_shop_rating();

-- ============================================
-- STEP 10: CREATE INITIAL DATA (OPTIONAL)
-- ============================================

-- This section creates a default shop if you have a user account
-- You can skip this and create shops via the app instead

DO $$
DECLARE
  default_shop_id UUID;
  platform_admin_id UUID;
  admin_user_id UUID;
BEGIN
  -- Check if there's a user in auth.users
  SELECT id INTO admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Check if profile exists, create if not
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_user_id) THEN
      INSERT INTO profiles (id, name, email, is_platform_admin)
      SELECT id, COALESCE(email, 'Admin'), email, true
      FROM auth.users
      WHERE id = admin_user_id;
    ELSE
      -- Just mark as platform admin
      UPDATE profiles SET is_platform_admin = true WHERE id = admin_user_id;
    END IF;
    
    platform_admin_id := admin_user_id;
    
    -- Create default shop
    INSERT INTO shops (
      id,
      name,
      description,
      address,
      phone,
      email,
      business_hours,
      is_active,
      is_verified,
      created_by,
      rating,
      total_reviews
    ) VALUES (
      gen_random_uuid(),
      'Premium Barbershop', -- Change this to your shop name
      'Your trusted barber shop - migrated from single shop setup',
      '123 Main Street, City, State', -- Update address
      '+1234567890', -- Update phone
      'shop@example.com', -- Update email
      '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "18:00", "closed": false},
        "saturday": {"open": "09:00", "close": "17:00", "closed": false},
        "sunday": {"closed": true}
      }'::jsonb,
      true,
      true,
      platform_admin_id,
      0,
      0
    )
    RETURNING id INTO default_shop_id;
    
    -- Add platform admin as shop admin
    INSERT INTO shop_staff (shop_id, user_id, role, is_active)
    VALUES (default_shop_id, platform_admin_id, 'admin', true)
    ON CONFLICT (shop_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Created default shop with ID: %', default_shop_id;
    RAISE NOTICE 'Platform admin: %', platform_admin_id;
  ELSE
    RAISE NOTICE 'No users found. Shop creation skipped. Create shops via the app after signing up!';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Shop creation skipped (this is OK for fresh database): %', SQLERRM;
END $$;

-- ============================================
-- STEP 11: GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON shops TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON shops TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_reviews TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_user_role_in_shop(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_shops(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shop_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shop_barbers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_shop_rating(UUID) TO authenticated;

-- ============================================
-- STEP 12: VERIFICATION
-- ============================================

SELECT '✅ Database schema created!' as status;

-- Check tables
SELECT 'Tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'shops', 'shop_staff', 'services', 'bookings', 'shop_reviews')
ORDER BY table_name;

-- Check if shops exist
SELECT 'Shops in database:' as info;
SELECT COUNT(*) as shop_count FROM shops;

-- Check if users exist
SELECT 'Users in database:' as info;
SELECT COUNT(*) as user_count FROM profiles;

-- Check functions
SELECT 'Functions created:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%shop%';

SELECT '🎉 Shop-first database ready!' as result;
SELECT '📝 Next: Run SHOP_FIRST_RLS_POLICIES.sql' as next_step;