-- Quick verification that all new shop columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'shops'
AND column_name IN ('status', 'rejection_reason', 'submitted_for_review_at', 'reviewed_at', 'reviewed_by')
ORDER BY column_name;

-- Also check what the current status values are for existing shops
SELECT id, name, status, created_at
FROM shops
ORDER BY created_at DESC
LIMIT 10;
