-- See ALL shops in database and who owns them
SELECT
  s.id,
  s.name,
  s.email as shop_email,
  s.status,
  s.is_active,
  s.created_at,
  ss.role as staff_role,
  p.email as staff_email,
  p.name as staff_name
FROM shops s
LEFT JOIN shop_staff ss ON s.id = ss.shop_id
LEFT JOIN profiles p ON ss.user_id = p.id
ORDER BY s.created_at DESC;
