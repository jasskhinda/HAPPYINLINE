-- QUICK FIX: Add yomek19737@hh7f.com as manager to their shop

INSERT INTO shop_staff (shop_id, user_id, role)
SELECT
  s.id as shop_id,
  p.id as user_id,
  'manager' as role
FROM shops s
CROSS JOIN profiles p
WHERE s.email = 'yomek19737@hh7f.com'
  AND p.email = 'yomek19737@hh7f.com'
  AND NOT EXISTS (
    SELECT 1 FROM shop_staff ss
    WHERE ss.shop_id = s.id
    AND ss.user_id = p.id
  );
