-- =====================================================
-- FIX RLS POLICIES FOR PAYMENT TABLES
-- =====================================================
-- Run this in Supabase SQL Editor to fix the INSERT policies
-- =====================================================

-- Drop the old INSERT policies (they may not exist, ignore errors)
DROP POLICY IF EXISTS "Service role can insert payment history" ON payment_history;
DROP POLICY IF EXISTS "Service role can insert subscription events" ON subscription_events;
DROP POLICY IF EXISTS "Users can insert own payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can insert own subscription events" ON subscription_events;

-- Create new INSERT policies that allow authenticated users to insert their own records
CREATE POLICY "Users can insert own payment history"
  ON payment_history FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can insert own subscription events"
  ON subscription_events FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('payment_history', 'subscription_events');
