-- ============================================
-- DATABASE MIGRATIONS FOR COMPLETE SHOP SYSTEM
-- Run this AFTER the initial schema is created
-- ============================================

-- ============================================
-- MIGRATION 1: Add Banner Image to Shops
-- ============================================
-- Add banner_image_url column (separate from cover/logo)
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

COMMENT ON COLUMN shops.banner_image_url IS 'Banner image displayed at top of shop details page';
COMMENT ON COLUMN shops.logo_url IS 'Logo image for shop cards and lists';
COMMENT ON COLUMN shops.cover_image_url IS 'Cover image for shop profile';

-- ============================================
-- MIGRATION 2: Add Image Support to Services
-- ============================================
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS icon_url TEXT;

COMMENT ON COLUMN services.image_url IS 'Main service image';
COMMENT ON COLUMN services.icon_url IS 'Service icon for compact displays';

-- Update existing services to have default category if needed
UPDATE services SET category = 'General' WHERE category IS NULL OR category = '';

-- ============================================
-- MIGRATION 3: Create Shop Invitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS shop_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Shop reference
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Invitee information
  invitee_email TEXT NOT NULL,
  invitee_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- user_id is NULL until they accept (if they don't have account yet)
  
  -- Role being offered
  role TEXT NOT NULL CHECK (role IN ('manager', 'barber')),
  -- Note: 'admin' role cannot be invited, only transferred
  
  -- Invitation status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Sent, awaiting response
    'accepted',   -- User accepted
    'declined',   -- User declined
    'cancelled',  -- Admin cancelled before acceptance
    'expired'     -- Expired due to time limit
  )),
  
  -- Who sent the invitation
  invited_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Optional message
  message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for invitation queries
CREATE INDEX IF NOT EXISTS idx_invitations_email ON shop_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON shop_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_shop ON shop_invitations(shop_id);
CREATE INDEX IF NOT EXISTS idx_invitations_user ON shop_invitations(invitee_user_id);

-- Prevent duplicate pending invitations using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation 
ON shop_invitations(shop_id, invitee_email) 
WHERE status = 'pending';

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_invitation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    NEW.responded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invitations_status_change ON shop_invitations;
CREATE TRIGGER invitations_status_change
  BEFORE UPDATE ON shop_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_timestamp();

-- ============================================
-- MIGRATION 4: Add Service Duration Minutes Alias
-- ============================================
-- The schema uses 'duration' but UI might use 'duration_minutes'
-- Add an alias or ensure consistency

-- If UI uses duration_minutes, rename the column:
-- ALTER TABLE services RENAME COLUMN duration TO duration_minutes;

-- OR add a generated column (PostgreSQL 12+):
-- ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER GENERATED ALWAYS AS (duration) STORED;

-- For now, we'll keep 'duration' and ensure UI uses this field name

COMMENT ON COLUMN services.duration IS 'Service duration in minutes';

-- ============================================
-- MIGRATION 5: Add Metadata to Shop Staff
-- ============================================
-- Enhance shop_staff table with invitation tracking
ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES shop_invitations(id) ON DELETE SET NULL;

COMMENT ON COLUMN shop_staff.invitation_id IS 'Links to the invitation that resulted in this staff member';

-- ============================================
-- MIGRATION 6: Helper Functions for Invitations
-- ============================================

-- Get pending invitations for a user (by email or user_id)
CREATE OR REPLACE FUNCTION get_user_invitations(p_email TEXT DEFAULT NULL, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  invitation_id UUID,
  shop_id UUID,
  shop_name TEXT,
  shop_logo TEXT,
  role TEXT,
  status TEXT,
  invited_by_name TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.shop_id,
    s.name,
    s.logo_url,
    i.role,
    i.status,
    p.name as invited_by_name,
    i.message,
    i.created_at,
    i.expires_at
  FROM shop_invitations i
  INNER JOIN shops s ON s.id = i.shop_id
  INNER JOIN profiles p ON p.id = i.invited_by
  WHERE (p_email IS NOT NULL AND i.invitee_email = p_email)
     OR (p_user_id IS NOT NULL AND i.invitee_user_id = p_user_id)
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Accept invitation (creates shop_staff record)
CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID, p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  shop_id UUID
) AS $$
DECLARE
  v_invitation RECORD;
  v_shop_id UUID;
  v_role TEXT;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM shop_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or expired', NULL::UUID;
    RETURN;
  END IF;
  
  v_shop_id := v_invitation.shop_id;
  v_role := v_invitation.role;
  
  -- Check if user already has a role in this shop
  IF EXISTS (
    SELECT 1 FROM shop_staff 
    WHERE shop_id = v_shop_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'You already have a role in this shop', v_shop_id;
    RETURN;
  END IF;
  
  -- Add user to shop staff
  INSERT INTO shop_staff (
    shop_id,
    user_id,
    role,
    is_active,
    invited_by,
    invitation_id
  ) VALUES (
    v_shop_id,
    p_user_id,
    v_role,
    true,
    v_invitation.invited_by,
    p_invitation_id
  );
  
  -- Update invitation status
  UPDATE shop_invitations
  SET 
    status = 'accepted',
    invitee_user_id = p_user_id,
    responded_at = NOW()
  WHERE id = p_invitation_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT, v_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decline invitation
CREATE OR REPLACE FUNCTION decline_invitation(p_invitation_id UUID, p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM shop_invitations
  WHERE id = p_invitation_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found';
    RETURN;
  END IF;
  
  -- Update invitation status
  UPDATE shop_invitations
  SET 
    status = 'declined',
    invitee_user_id = p_user_id,
    responded_at = NOW()
  WHERE id = p_invitation_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel invitation (admin/manager only)
CREATE OR REPLACE FUNCTION cancel_invitation(p_invitation_id UUID, p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_invitation RECORD;
  v_user_role TEXT;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM shop_invitations
  WHERE id = p_invitation_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already processed';
    RETURN;
  END IF;
  
  -- Check if user has permission (admin or manager of this shop)
  SELECT role INTO v_user_role
  FROM shop_staff
  WHERE shop_id = v_invitation.shop_id
    AND user_id = p_user_id
    AND role IN ('admin', 'manager');
  
  IF v_user_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'You do not have permission to cancel this invitation';
    RETURN;
  END IF;
  
  -- Cancel invitation
  UPDATE shop_invitations
  SET status = 'cancelled'
  WHERE id = p_invitation_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-expire old invitations (run periodically)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE shop_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION 7: Grant Permissions
-- ============================================

-- Grant access to invitations table
GRANT SELECT, INSERT, UPDATE ON shop_invitations TO authenticated;

-- Grant execute permissions on invitation functions
GRANT EXECUTE ON FUNCTION get_user_invitations(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_invitations() TO authenticated;

-- ============================================
-- MIGRATION 8: Verification
-- ============================================

SELECT '✅ Migrations completed!' as status;

-- Check new columns
SELECT 'New shop columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shops' 
  AND column_name IN ('banner_image_url', 'logo_url', 'cover_image_url')
ORDER BY column_name;

SELECT 'New service columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'services' 
  AND column_name IN ('image_url', 'icon_url')
ORDER BY column_name;

-- Check invitations table
SELECT 'Invitations table:' as info;
SELECT COUNT(*) as invitation_count FROM shop_invitations;

-- Check functions
SELECT 'Invitation functions:' as info;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%invitation%';

SELECT '🎉 All migrations applied successfully!' as result;
SELECT '📝 Next: Update UI to use new fields' as next_step;
