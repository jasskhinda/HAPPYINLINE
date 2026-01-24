-- Add timezone column to shops table for Google Calendar integration
-- This makes timezone configurable per shop for future-proof calendar syncing

-- Add timezone column with default to America/Indiana/Indianapolis (Eastern Time)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Indiana/Indianapolis';

-- Common US timezones for reference:
-- America/New_York (Eastern)
-- America/Indiana/Indianapolis (Eastern - Indiana)
-- America/Chicago (Central)
-- America/Denver (Mountain)
-- America/Phoenix (Arizona - no DST)
-- America/Los_Angeles (Pacific)
-- America/Anchorage (Alaska)
-- Pacific/Honolulu (Hawaii)

-- Update existing shops to use Eastern timezone (Indianapolis)
UPDATE shops SET timezone = 'America/Indiana/Indianapolis' WHERE timezone IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN shops.timezone IS 'IANA timezone identifier for the shop location, used for Google Calendar integration';
