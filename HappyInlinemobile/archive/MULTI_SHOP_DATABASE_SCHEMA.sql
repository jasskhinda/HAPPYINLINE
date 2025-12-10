-- ============================================
-- MULTI-SHOP BARBER APP - DATABASE SCHEMA
-- Transform single barber to multi-shop platform
-- ============================================
-- 
-- This script will:
-- 1. Create new `shops` table
-- 2. Add shop_id to existing tables
-- 3. Update relationships for multi-shop support
-- 4. Preserve existing data while adding shop structure
-- 5. Add new role management for shop-based permissions
--
-- ⚠️ BACKUP YOUR DATA BEFORE RUNNING THIS!
-- ============================================

-- ============================================
-- 1. CREATE SHOPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Shop owner (who created the shop)
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Shop branding
  logo_url TEXT,
  cover_image_url TEXT,
  
  -- Business details
  business_hours JSONB, -- {"monday": {"open": "09:00", "close": "18:00", "closed": false}, ...}
  services_offered UUID[], -- Array of service IDs this shop offers
  
  -- Location (for future map features)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Admin verification
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREATE SHOP_MEMBERS TABLE (Join table)
-- ============================================
-- This handles the many-to-many relationship between users and shops

CREATE TABLE IF NOT EXISTS shop_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role within this specific shop
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'barber', 'staff')),
  
  -- Permissions within shop
  permissions JSONB DEFAULT '{}', -- {"can_manage_bookings": true, "can_edit_services": false, ...}
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES profiles(id), -- Who invited this member
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one role per user per shop
  UNIQUE(shop_id, user_id)
);

-- ============================================
-- 3. ADD SHOP_ID TO EXISTING TABLES
-- ============================================

-- Add shop_id to services (each shop can have different services/prices)
ALTER TABLE services ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;

-- Add shop_id to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;

-- Add shop_id to reviews (if reviews table exists)
-- ALTER TABLE reviews ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;

-- ============================================
-- 4. UPDATE PROFILES TABLE FOR GLOBAL ROLES
-- ============================================

-- Add global role (separate from shop-specific roles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS global_role TEXT DEFAULT 'customer' 
  CHECK (global_role IN ('customer', 'platform_admin', 'super_admin'));

-- Update existing role to global_role
UPDATE profiles SET global_role = 
  CASE 
    WHEN role IN ('admin', 'super_admin') THEN 'platform_admin'
    ELSE 'customer'
  END
WHERE global_role IS NULL;

-- ============================================
-- 5. CREATE SHOP SERVICES TABLE
-- ============================================
-- Allow shops to customize services and pricing

CREATE TABLE IF NOT EXISTS shop_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Service details
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL, -- Duration in minutes
  
  -- Optional: Reference to global service template
  global_service_id UUID REFERENCES services(id),
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  
  -- Barbers who can perform this service
  available_barbers UUID[] DEFAULT '{}', -- Array of profile IDs
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique service names per shop
  UNIQUE(shop_id, name)
);

-- ============================================
-- 6. CREATE BARBER AVAILABILITY TABLE
-- ============================================
-- Track when barbers are available at each shop

CREATE TABLE IF NOT EXISTS barber_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Availability schedule
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure no overlapping schedules for same barber at same shop
  UNIQUE(barber_id, shop_id, day_of_week, start_time)
);

-- ============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Shops
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude);

-- Shop Members
CREATE INDEX IF NOT EXISTS idx_shop_members_shop_id ON shop_members(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_members_user_id ON shop_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_members_role ON shop_members(role);

-- Shop Services
CREATE INDEX IF NOT EXISTS idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_active ON shop_services(is_active);

-- Barber Availability
CREATE INDEX IF NOT EXISTS idx_barber_availability_barber ON barber_availability(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_availability_shop ON barber_availability(shop_id);

-- Updated existing tables
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON bookings(shop_id);

-- ============================================
-- 8. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get user's role in a specific shop
CREATE OR REPLACE FUNCTION get_user_shop_role(user_id UUID, shop_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM shop_members 
    WHERE user_id = user_id AND shop_id = shop_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access shop data
CREATE OR REPLACE FUNCTION can_user_access_shop(user_id UUID, shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Platform admins can access any shop
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND global_role IN ('platform_admin', 'super_admin')
  ) THEN
    RETURN true;
  END IF;
  
  -- Shop members can access their shop
  IF EXISTS (
    SELECT 1 FROM shop_members 
    WHERE user_id = user_id AND shop_id = shop_id AND is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all shops for a user
CREATE OR REPLACE FUNCTION get_user_shops(user_id UUID)
RETURNS TABLE (
  shop_id UUID,
  shop_name TEXT,
  user_role TEXT,
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shop_id,
    s.name as shop_name,
    sm.role as user_role,
    (s.owner_id = user_id) as is_owner
  FROM shops s
  JOIN shop_members sm ON sm.shop_id = s.id
  WHERE sm.user_id = user_id AND sm.is_active = true AND s.is_active = true
  ORDER BY is_owner DESC, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. ADD TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_shop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_updated_at();

DROP TRIGGER IF EXISTS update_shop_services_updated_at ON shop_services;
CREATE TRIGGER update_shop_services_updated_at
  BEFORE UPDATE ON shop_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-add shop owner as owner member
CREATE OR REPLACE FUNCTION add_shop_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shop_members (shop_id, user_id, role, permissions)
  VALUES (
    NEW.id, 
    NEW.owner_id, 
    'owner',
    '{"can_manage_bookings": true, "can_edit_services": true, "can_manage_staff": true, "can_edit_shop": true}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS add_shop_owner_trigger ON shops;
CREATE TRIGGER add_shop_owner_trigger
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION add_shop_owner_as_member();

-- ============================================
-- 10. SAMPLE DATA MIGRATION
-- ============================================

-- Create a default shop for existing data
DO $$
DECLARE
  default_shop_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get the admin/super_admin user
  SELECT id INTO admin_user_id 
  FROM profiles 
  WHERE role IN ('admin', 'super_admin') OR email = 'smokygaming171@gmail.com'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Create default shop
    INSERT INTO shops (
      id,
      name,
      description,
      owner_id,
      address,
      phone,
      business_hours,
      is_verified
    ) VALUES (
      gen_random_uuid(),
      'Main Barber Shop',
      'Original barber shop - migrated from single-shop setup',
      admin_user_id,
      '123 Main Street',
      '+1234567890',
      '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "18:00", "closed": false},
        "saturday": {"open": "09:00", "close": "17:00", "closed": false},
        "sunday": {"open": "10:00", "close": "16:00", "closed": false}
      }'::jsonb,
      true
    )
    RETURNING id INTO default_shop_id;
    
    -- Migrate existing services to default shop
    UPDATE services 
    SET shop_id = default_shop_id 
    WHERE shop_id IS NULL;
    
    -- Migrate existing bookings to default shop
    UPDATE bookings 
    SET shop_id = default_shop_id 
    WHERE shop_id IS NULL;
    
    -- Add existing barbers to default shop
    INSERT INTO shop_members (shop_id, user_id, role, permissions)
    SELECT 
      default_shop_id,
      id,
      'barber',
      '{"can_manage_bookings": false, "can_edit_services": false, "can_manage_staff": false}'::jsonb
    FROM profiles 
    WHERE role = 'barber'
    ON CONFLICT (shop_id, user_id) DO NOTHING;
    
    -- Add existing managers to default shop
    INSERT INTO shop_members (shop_id, user_id, role, permissions)
    SELECT 
      default_shop_id,
      id,
      'manager',
      '{"can_manage_bookings": true, "can_edit_services": true, "can_manage_staff": true}'::jsonb
    FROM profiles 
    WHERE role = 'manager'
    ON CONFLICT (shop_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Created default shop with ID: %', default_shop_id;
  END IF;
END $$;

-- ============================================
-- 11. VERIFICATION QUERIES
-- ============================================

-- Check created tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shops', 'shop_members', 'shop_services', 'barber_availability');

-- Check default shop
SELECT id, name, owner_id, is_active FROM shops LIMIT 5;

-- Check shop members
SELECT 
  sm.shop_id,
  s.name as shop_name,
  sm.user_id,
  p.name as user_name,
  sm.role
FROM shop_members sm
JOIN shops s ON s.id = sm.shop_id
JOIN profiles p ON p.id = sm.user_id
ORDER BY s.name, sm.role;

-- Check migrated data
SELECT 'Services with shop_id:' as info, COUNT(*) as count FROM services WHERE shop_id IS NOT NULL;
SELECT 'Bookings with shop_id:' as info, COUNT(*) as count FROM bookings WHERE shop_id IS NOT NULL;

SELECT '✅ Multi-shop database schema created successfully!' as result;
SELECT '📝 Next: Update RLS policies for shop-based access control' as next_step;

-- ============================================
-- NOTES FOR FRONTEND INTEGRATION
-- ============================================

/*
KEY CHANGES FOR FRONTEND:

1. USER AUTHENTICATION:
   - Users remain global (can belong to multiple shops)
   - Shop selection required after login
   - Role is now per-shop basis

2. SHOP SELECTION:
   - Add shop picker/switcher component
   - Store current_shop_id in app state
   - Filter all data by current shop

3. NEW API ENDPOINTS NEEDED:
   - getUserShops(userId) - Get shops user belongs to
   - createShop(shopData) - Create new shop
   - inviteUserToShop(shopId, email, role) - Invite staff
   - getShopServices(shopId) - Get services for specific shop
   - getShopBarbers(shopId) - Get barbers for specific shop

4. BOOKING FLOW:
   - Shop selection (if user belongs to multiple)
   - Service selection (from shop's services)
   - Barber selection (optional, from shop's barbers)
   - Date/time selection (based on shop hours & barber availability)

5. ROLE-BASED UI:
   - customers: Can book services, rate, view own bookings
   - barbers: Can see assigned bookings, update status
   - managers: Can see all shop bookings, manage staff
   - owners: Full shop control + invite staff
   - platform_admin: Can see all shops, verify shops
*/