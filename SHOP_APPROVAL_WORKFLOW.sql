-- =====================================================
-- SHOP APPROVAL WORKFLOW SCHEMA
-- =====================================================
-- This adds the necessary fields for the shop approval process
-- where business owners register, complete shop setup, submit for review,
-- and super admin approves or rejects with feedback.

-- 1. Add status and approval fields to shops table
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'suspended')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);

-- 2. Add comment to explain status values
COMMENT ON COLUMN shops.status IS 'draft: Shop being set up by owner | pending_review: Submitted for admin review | approved: Live and visible to customers | rejected: Rejected with feedback | suspended: Temporarily disabled by admin';

-- 3. Create index for querying shops by status
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_pending_review ON shops(status) WHERE status = 'pending_review';

-- 4. Create a table to track shop status history (audit log)
CREATE TABLE IF NOT EXISTS shop_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create index for status history
CREATE INDEX IF NOT EXISTS idx_shop_status_history_shop_id ON shop_status_history(shop_id);

-- 6. Create function to log status changes
CREATE OR REPLACE FUNCTION log_shop_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO shop_status_history (shop_id, previous_status, new_status, changed_by, change_reason)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.reviewed_by,
      CASE
        WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
        ELSE NULL
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to automatically log status changes
DROP TRIGGER IF EXISTS trg_shop_status_change ON shops;
CREATE TRIGGER trg_shop_status_change
  AFTER UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION log_shop_status_change();

-- 8. Update RLS policies for shop visibility based on status

-- Drop existing select policy if exists
DROP POLICY IF EXISTS "shops_select_policy" ON shops;

-- Shops are visible to:
-- - Super admins (all shops regardless of status)
-- - Shop staff (their own shop regardless of status)
-- - Customers (only approved shops)
CREATE POLICY "shops_select_policy" ON shops
  FOR SELECT
  USING (
    -- Super admin can see all shops
    (
      auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'super_admin'
      )
    )
    OR
    -- Shop staff can see their own shop
    (
      id IN (
        SELECT shop_id FROM shop_staff WHERE user_id = auth.uid()
      )
    )
    OR
    -- Customers can only see approved shops
    (
      status = 'approved'
      AND
      auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'customer'
      )
    )
    OR
    -- Guest users (not logged in) can only see approved shops
    (
      status = 'approved'
      AND
      auth.uid() IS NULL
    )
  );

-- 9. Allow super admins to update shop status
DROP POLICY IF EXISTS "super_admin_update_shop_status" ON shops;
CREATE POLICY "super_admin_update_shop_status" ON shops
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );

-- 10. Allow shop managers to submit for review (update status from draft to pending_review)
DROP POLICY IF EXISTS "manager_submit_for_review" ON shops;
CREATE POLICY "manager_submit_for_review" ON shops
  FOR UPDATE
  USING (
    id IN (
      SELECT shop_id
      FROM shop_staff
      WHERE user_id = auth.uid()
      AND role = 'manager'
    )
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    id IN (
      SELECT shop_id
      FROM shop_staff
      WHERE user_id = auth.uid()
      AND role = 'manager'
    )
    AND status IN ('draft', 'pending_review', 'rejected')
  );

-- 11. RLS for shop_status_history
ALTER TABLE shop_status_history ENABLE ROW LEVEL SECURITY;

-- Super admins and shop managers can view status history
DROP POLICY IF EXISTS "shop_status_history_select" ON shop_status_history;
CREATE POLICY "shop_status_history_select" ON shop_status_history
  FOR SELECT
  USING (
    -- Super admin can see all history
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
    OR
    -- Shop staff can see their shop's history
    shop_id IN (
      SELECT shop_id FROM shop_staff WHERE user_id = auth.uid()
    )
  );

-- 12. Create a view for pending shop reviews (super admin dashboard)
CREATE OR REPLACE VIEW pending_shop_reviews AS
SELECT
  s.id,
  s.name AS shop_name,
  s.address,
  s.phone,
  s.submitted_for_review_at,
  p.name AS owner_name,
  p.email AS owner_email,
  ss.user_id AS owner_id
FROM shops s
JOIN shop_staff ss ON s.id = ss.shop_id AND ss.role = 'manager'
JOIN profiles p ON ss.user_id = p.id
WHERE s.status = 'pending_review'
ORDER BY s.submitted_for_review_at ASC;

-- 13. Grant access to the view
GRANT SELECT ON pending_shop_reviews TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check shops table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN ('status', 'rejection_reason', 'submitted_for_review_at', 'reviewed_at', 'reviewed_by')
ORDER BY ordinal_position;

-- Check if status history table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'shop_status_history'
);

COMMENT ON TABLE shop_status_history IS 'Audit log of all shop status changes for compliance and tracking';
COMMENT ON VIEW pending_shop_reviews IS 'Super admin dashboard view showing shops pending review with owner info';
