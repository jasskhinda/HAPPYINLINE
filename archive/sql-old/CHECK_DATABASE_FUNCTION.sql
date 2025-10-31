-- Check if get_user_shops function exists
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_user_shops'
AND routine_schema = 'public';

-- If it doesn't exist, we need to create it!
-- Or we can test it directly:

-- Test the function with your user ID
SELECT * FROM get_user_shops((SELECT id FROM profiles WHERE email = 'yomek19737@hh7f.com'));
