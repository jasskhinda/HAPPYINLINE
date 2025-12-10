# 🔥 CRITICAL: booking_id Column Missing!

## Error Discovered

```
ERROR: 42703: column "booking_id" does not exist
```

This means the `CREATE_BOOKINGS_TABLE.sql` script was **never fully executed** or the `booking_id` column was **never added** to your bookings table.

---

## What This Means

Your bookings table exists and has 2 bookings, but it's **missing critical columns** that the app expects:

### Expected Structure:
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,  ← MISSING!
  customer_id UUID,
  barber_id UUID,
  services JSONB,
  appointment_date DATE,
  appointment_time TIME,
  total_amount DECIMAL,
  status TEXT DEFAULT 'pending',
  is_confirmed_by_manager BOOLEAN,
  confirmed_by UUID,
  confirmed_at TIMESTAMP,
  completed_by UUID,
  completed_at TIMESTAMP,
  customer_notes TEXT,
  barber_notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### What You Likely Have:
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  customer_id UUID,
  barber_id UUID,
  services JSONB,
  appointment_date DATE,
  appointment_time TIME,
  total_amount DECIMAL,
  status TEXT,
  is_confirmed_by_manager BOOLEAN,
  customer_notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

Missing columns:
- ❌ `booking_id` (human-readable ID like BK-20251007-A1B2C3)
- ❌ `confirmed_by` (manager who confirmed)
- ❌ `confirmed_at` (confirmation timestamp)
- ❌ `completed_by` (manager who completed)
- ❌ `completed_at` (completion timestamp)
- ❌ `barber_notes` (manager/barber notes)
- ❌ `cancellation_reason` (why cancelled)

---

## Step 1: Check What Columns You Have

Run this SQL query in Supabase SQL Editor:

**File:** `CHECK_BOOKINGS_TABLE_STRUCTURE.sql`

```sql
-- List ALL columns in bookings table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;
```

This will show you exactly what columns exist.

---

## Step 2: Add Missing Columns

After checking your current structure, run this SQL to **add the missing columns** without dropping your existing data:

**File:** `ADD_MISSING_BOOKING_COLUMNS.sql`

```sql
-- ============================================
-- Add Missing Columns to bookings Table
-- ============================================
-- This adds columns without dropping existing bookings

-- 1. Add booking_id column (human-readable ID)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_id TEXT UNIQUE;

-- 2. Add manager tracking columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES profiles(id);

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id);

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 3. Add notes columns
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS barber_notes TEXT;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 4. Generate booking_id for existing bookings (NULL right now)
-- Format: BK-YYYYMMDD-XXXXXX
UPDATE bookings
SET booking_id = 'BK-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))
WHERE booking_id IS NULL;

-- 5. Make booking_id NOT NULL now that all rows have values
ALTER TABLE bookings
ALTER COLUMN booking_id SET NOT NULL;

-- 6. Create function to generate booking_id
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_booking_id TEXT;
  counter INT := 0;
BEGIN
  date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  LOOP
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
    new_booking_id := 'BK-' || date_part || '-' || random_part;
    
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_id = new_booking_id) THEN
      RETURN new_booking_id;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Failed to generate unique booking ID after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger function to auto-generate booking_id on insert
CREATE OR REPLACE FUNCTION set_booking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_id IS NULL OR NEW.booking_id = '' THEN
    NEW.booking_id := generate_booking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_set_booking_id ON bookings;

CREATE TRIGGER trigger_set_booking_id
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_id();

-- 9. Create trigger for auto-updating confirmed_at
CREATE OR REPLACE FUNCTION set_booking_confirmation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_confirmed_by_manager = TRUE AND (OLD.is_confirmed_by_manager = FALSE OR OLD.is_confirmed_by_manager IS NULL) THEN
    NEW.confirmed_at = NOW();
    NEW.status = 'confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_confirmation ON bookings;

CREATE TRIGGER trigger_booking_confirmation
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_confirmation_timestamp();

-- 10. Create trigger for auto-updating completed_at
CREATE OR REPLACE FUNCTION set_booking_completion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.status IS NULL) THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_completion ON bookings;

CREATE TRIGGER trigger_booking_completion
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_completion_timestamp();

-- ============================================
-- Verification
-- ============================================

-- Check columns now exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- Check bookings now have booking_id
SELECT id, booking_id, status, appointment_date 
FROM bookings 
ORDER BY created_at DESC;

-- Check triggers exist
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'bookings';
```

---

## Step 3: Fix RLS Policies

After adding the columns, you still need to fix the RLS policies for managers to see bookings.

Run: **`FIX_MANAGER_RLS_BOOKINGS.sql`**

---

## Step 4: Verify Everything Works

After running both SQL scripts:

1. **Check bookings in Supabase Table Editor:**
   - Should see `booking_id` column with values like "BK-20251005-A7F3E9"
   - All your existing 2 bookings should be intact

2. **Restart your app**

3. **Log in as manager**

4. **Check console logs:**
   ```
   📊 Query result: { dataCount: 2 }
   ✅ Bookings loaded: { pending: 2 }
   ```

5. **Check HomeScreen:**
   - Should see urgent notifications
   - Should see pending appointments count

6. **Check BookingManagementScreen:**
   - Pending tab should show 2 bookings
   - Each booking should display booking_id

---

## Why This Happened

The `CREATE_BOOKINGS_TABLE.sql` file contains the complete table structure with all columns and triggers. However, it seems:

1. Either the script was never run
2. Or an older version of the bookings table was created
3. Or the table was created manually without all columns

The app code expects these columns:
- `BarberInfoScreen.jsx` tries to display `booking_id` in the success alert
- `BookingManagementScreen.jsx` tries to show `booking_id` for each booking
- `confirmBooking()` tries to set `confirmed_by` and `confirmed_at`
- `completeBooking()` tries to set `completed_by` and `completed_at`

---

## Summary

**Problem:** bookings table is missing critical columns  
**Solution:** Run `ADD_MISSING_BOOKING_COLUMNS.sql` to add them  
**Then:** Run `FIX_MANAGER_RLS_BOOKINGS.sql` to fix RLS policies  
**Result:** Managers can see and manage all bookings  

**Order of execution:**
1. ✅ Run `CHECK_BOOKINGS_TABLE_STRUCTURE.sql` (check what you have)
2. ✅ Run `ADD_MISSING_BOOKING_COLUMNS.sql` (add missing columns)
3. ✅ Run `FIX_MANAGER_RLS_BOOKINGS.sql` (fix manager access)
4. ✅ Restart app and test

Your existing 2 bookings will be preserved!
