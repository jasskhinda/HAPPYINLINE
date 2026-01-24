-- =====================================================
-- ADD SHOP FEATURES - Per-day Hours & Announcements
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add operating_hours column (JSONB for per-day hours)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT NULL;

-- Add announcement column for shop banner/notices
ALTER TABLE shops ADD COLUMN IF NOT EXISTS announcement TEXT DEFAULT NULL;

-- Example of operating_hours structure:
-- {
--   "Monday": { "open": "09:00", "close": "18:00", "closed": false },
--   "Tuesday": { "open": "09:00", "close": "18:00", "closed": false },
--   "Wednesday": { "open": "09:00", "close": "18:00", "closed": false },
--   "Thursday": { "open": "09:00", "close": "18:00", "closed": false },
--   "Friday": { "open": "09:00", "close": "18:00", "closed": false },
--   "Saturday": { "open": "10:00", "close": "16:00", "closed": false },
--   "Sunday": { "open": null, "close": null, "closed": true }
-- }

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN ('operating_hours', 'announcement');

SELECT 'Columns added successfully!' as result;
