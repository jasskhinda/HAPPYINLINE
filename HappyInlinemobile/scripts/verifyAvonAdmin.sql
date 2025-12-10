-- Quick verification: Does Avon Barber Shop have an admin?
-- Run this in Supabase SQL Editor to verify

SELECT
  s.id as shop_id,
  s.name as shop_name,
  s.email as shop_email,
  COUNT(ss.id) as admin_count,
  STRING_AGG(p.name || ' (' || p.email || ')', ', ') as admins
FROM shops s
LEFT JOIN shop_staff ss ON s.id = ss.shop_id AND ss.role IN ('admin', 'manager') AND ss.is_active = true
LEFT JOIN profiles p ON ss.user_id = p.id
WHERE s.name LIKE '%Avon%' OR s.email LIKE '%avon%'
GROUP BY s.id, s.name, s.email;
