-- Verify the duration column exists in shop_services table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'shop_services'
  AND column_name = 'duration';
