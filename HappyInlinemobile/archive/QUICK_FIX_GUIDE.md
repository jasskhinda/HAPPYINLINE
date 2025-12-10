# Quick Fix Guide

## The file got corrupted. Use this instead:

**File:** `CLEAN_RLS_FIX.sql`

## What to do:

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire content from `CLEAN_RLS_FIX.sql`
3. Paste into SQL Editor
4. Click RUN
5. Restart your app

## This fixes:

✅ Customers can view their bookings  
✅ Customers can create bookings  
✅ Barbers can view their assigned bookings  
✅ Managers can view ALL bookings  
✅ No "permission denied for table users" error  

## Does NOT query auth.users table
## Simple, clean, works for everyone
