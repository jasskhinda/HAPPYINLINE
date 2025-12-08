-- Update business category icons from emojis to professional icon names
-- These will be used with Ionicons in the app

UPDATE business_categories SET icon = 'cut-outline' WHERE name = 'Beauty & Personal Care';
UPDATE business_categories SET icon = 'fitness-outline' WHERE name = 'Health & Wellness';
UPDATE business_categories SET icon = 'briefcase-outline' WHERE name = 'Professional Services';
UPDATE business_categories SET icon = 'home-outline' WHERE name = 'Home Services';
UPDATE business_categories SET icon = 'car-outline' WHERE name = 'Automotive';
UPDATE business_categories SET icon = 'gift-outline' WHERE name = 'Events & Entertainment';

-- Verify the updates
SELECT id, name, icon FROM business_categories ORDER BY name;
