-- ============================================
-- FIX: Allow customers to cancel their bookings
-- ============================================
-- Problem: Customers can only update bookings with status='pending'
-- Solution: Allow customers to cancel (set status='cancelled') their own bookings
-- regardless of current status (pending, confirmed, etc.)

-- Drop existing policy
DROP POLICY IF EXISTS "bookings_update" ON bookings;

-- Create new policy with cancellation support
CREATE POLICY "bookings_update"
ON bookings FOR UPDATE
TO authenticated
USING (
  -- Managers/Admins can update any booking
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  -- Customers can update their own bookings (for rescheduling pending, or cancelling any)
  customer_id = get_current_user_profile_id()
  OR
  -- Barbers can update their assigned bookings
  barber_id = get_current_user_profile_id()
)
WITH CHECK (
  -- Managers/Admins can make any changes
  get_current_user_role() IN ('manager', 'admin', 'super_admin')
  OR
  -- Customers can only:
  -- 1. Cancel their own bookings (set status to 'cancelled')
  -- 2. Reschedule pending bookings (update date/time when status is 'pending')
  (
    customer_id = get_current_user_profile_id() 
    AND (
      -- Allow cancellation regardless of current status
      status = 'cancelled'
      OR
      -- Allow rescheduling only for pending bookings
      (status = 'pending')
    )
  )
  OR
  -- Barbers can update their assigned bookings
  barber_id = get_current_user_profile_id()
);

-- Verification query - Check if policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookings' 
AND policyname = 'bookings_update';
