-- Script to check migration status in production database
-- Run this against production to see which migrations have been applied

-- Check if migrations table exists and show applied migrations
SELECT 
    name as migration_name,
    applied_at,
    CASE 
        WHEN name LIKE '005%' THEN 'Line Items Schema'
        WHEN name LIKE '006%' THEN 'Features'
        WHEN name = '0068%' THEN 'Brand Intelligence'
        WHEN name = '0069%' THEN 'Brand Intelligence Metadata'
        WHEN name = '0070%' THEN 'Bug Fixes'
        ELSE 'Other'
    END as category
FROM migrations
WHERE name >= '0055'
ORDER BY name;

-- Check if critical tables exist
SELECT 
    'client_brand_intelligence' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_brand_intelligence'
    ) as exists;

-- Check if metadata column exists on client_brand_intelligence
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'client_brand_intelligence'
AND column_name = 'metadata';

-- Check line_item_changes schema
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'line_item_changes'
ORDER BY ordinal_position;

-- Count data in key tables
SELECT 
    'orders' as table_name,
    COUNT(*) as row_count
FROM orders
UNION ALL
SELECT 
    'order_line_items' as table_name,
    COUNT(*) as row_count
FROM order_line_items
UNION ALL
SELECT 
    'client_brand_intelligence' as table_name,
    COUNT(*) as row_count
FROM client_brand_intelligence;