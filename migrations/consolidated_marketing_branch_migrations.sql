-- ============================================================================
-- CONSOLIDATED DATABASE MIGRATIONS FROM MARKETING BRANCH
-- Branch: marketing (92 commits ahead of main)
-- Date: 2025-08-23
-- 
-- This script contains all database migrations needed to sync production
-- database with the marketing branch changes.
-- 
-- MIGRATION ORDER:
-- 1. Migration 0056: LineItems System Migration
-- 2. Migration 0057: Line Item Changes Schema Fix
-- 3. Migration 0060: Target URL Matching
-- 4. Migration 0061: Inclusion Status Defaults Fix
-- 5. Migration 0067: User Curation for Bulk Analysis
-- ============================================================================

-- Create migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MIGRATION 0056: PRODUCTION LINEITEMS MIGRATION
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = '0056_production_lineitems_migration') THEN
        RAISE NOTICE 'Running Migration 0056: Production LineItems Migration...';
        
        -- Step 1: Ensure order_line_items table has all required columns
        ALTER TABLE order_line_items 
        ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS assigned_by UUID,
        ADD COLUMN IF NOT EXISTS service_fee INTEGER DEFAULT 7900,
        ADD COLUMN IF NOT EXISTS final_price INTEGER,
        ADD COLUMN IF NOT EXISTS client_review_status VARCHAR(20),
        ADD COLUMN IF NOT EXISTS client_reviewed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS client_review_notes TEXT,
        ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
        ADD COLUMN IF NOT EXISTS added_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS added_by_user_id UUID,
        ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS modified_by UUID,
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS cancelled_by UUID,
        ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
        ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

        -- Step 2: Create indexes if they don't exist
        CREATE INDEX IF NOT EXISTS line_items_order_id_idx ON order_line_items(order_id);
        CREATE INDEX IF NOT EXISTS line_items_client_id_idx ON order_line_items(client_id);
        CREATE INDEX IF NOT EXISTS line_items_status_idx ON order_line_items(status);
        CREATE INDEX IF NOT EXISTS line_items_assigned_domain_idx ON order_line_items(assigned_domain_id);

        -- Record migration
        INSERT INTO migrations (name) VALUES ('0056_production_lineitems_migration');
        RAISE NOTICE 'Migration 0056 completed successfully';
    ELSE
        RAISE NOTICE 'Migration 0056 already applied, skipping...';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 0057: LINE_ITEM_CHANGES SCHEMA FIX
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = '0057_line_item_changes_schema_fix') THEN
        RAISE NOTICE 'Running Migration 0057: Line Item Changes Schema Fix...';
        
        -- Add missing columns to line_item_changes
        ALTER TABLE line_item_changes
        ADD COLUMN IF NOT EXISTS order_id UUID,
        ADD COLUMN IF NOT EXISTS change_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS previous_value JSONB,
        ADD COLUMN IF NOT EXISTS new_value JSONB,
        ADD COLUMN IF NOT EXISTS batch_id UUID,
        ADD COLUMN IF NOT EXISTS metadata JSONB;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_line_item_changes_order_id ON line_item_changes(order_id);
        CREATE INDEX IF NOT EXISTS idx_line_item_changes_change_type ON line_item_changes(change_type);
        CREATE INDEX IF NOT EXISTS idx_line_item_changes_batch_id ON line_item_changes(batch_id) WHERE batch_id IS NOT NULL;

        -- Add foreign key constraint
        ALTER TABLE line_item_changes 
        DROP CONSTRAINT IF EXISTS fk_line_item_changes_order_id;
        
        ALTER TABLE line_item_changes 
        ADD CONSTRAINT fk_line_item_changes_order_id 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

        -- Record migration
        INSERT INTO migrations (name) VALUES ('0057_line_item_changes_schema_fix');
        RAISE NOTICE 'Migration 0057 completed successfully';
    ELSE
        RAISE NOTICE 'Migration 0057 already applied, skipping...';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 0060: ADD TARGET URL MATCHING
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = '0060_add_target_url_matching') THEN
        RAISE NOTICE 'Running Migration 0060: Add Target URL Matching...';
        
        -- Add target URL matching columns to bulk_analysis_domains table
        ALTER TABLE bulk_analysis_domains 
        ADD COLUMN IF NOT EXISTS suggested_target_url TEXT,
        ADD COLUMN IF NOT EXISTS target_match_data JSONB,
        ADD COLUMN IF NOT EXISTS target_matched_at TIMESTAMP;

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_bulk_domains_suggested_target 
        ON bulk_analysis_domains(suggested_target_url) 
        WHERE suggested_target_url IS NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_bulk_domains_target_matched_at 
        ON bulk_analysis_domains(target_matched_at) 
        WHERE target_matched_at IS NOT NULL;

        -- Add documentation comments
        COMMENT ON COLUMN bulk_analysis_domains.suggested_target_url IS 'AI-suggested best target URL for this domain';
        COMMENT ON COLUMN bulk_analysis_domains.target_match_data IS 'Full AI target URL analysis results with match quality and evidence';
        COMMENT ON COLUMN bulk_analysis_domains.target_matched_at IS 'Timestamp when target URL matching was last performed';

        -- Record migration
        INSERT INTO migrations (name) VALUES ('0060_add_target_url_matching');
        RAISE NOTICE 'Migration 0060 completed successfully';
    ELSE
        RAISE NOTICE 'Migration 0060 already applied, skipping...';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 0061: FIX INCLUSION STATUS DEFAULTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = '0061_fix_inclusion_status_defaults') THEN
        RAISE NOTICE 'Running Migration 0061: Fix Inclusion Status Defaults...';
        
        -- Fix bulk_analysis_domains inclusion_status default
        ALTER TABLE bulk_analysis_domains 
        ALTER COLUMN inclusion_status SET DEFAULT 'included';

        -- Update any NULL values to 'included'
        UPDATE bulk_analysis_domains 
        SET inclusion_status = 'included' 
        WHERE inclusion_status IS NULL;

        -- Ensure inclusion_status is NOT NULL with proper default
        ALTER TABLE bulk_analysis_domains 
        ALTER COLUMN inclusion_status SET NOT NULL;

        -- Record migration
        INSERT INTO migrations (name) VALUES ('0061_fix_inclusion_status_defaults');
        RAISE NOTICE 'Migration 0061 completed successfully';
    ELSE
        RAISE NOTICE 'Migration 0061 already applied, skipping...';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION 0067: ADD USER CURATION TO BULK ANALYSIS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = '0067_add_user_curation_to_bulk_analysis') THEN
        RAISE NOTICE 'Running Migration 0067: Add User Curation to Bulk Analysis...';
        
        -- Add user curation columns to bulk_analysis_domains table
        ALTER TABLE bulk_analysis_domains 
        ADD COLUMN IF NOT EXISTS user_bookmarked BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS user_hidden BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS user_bookmarked_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS user_hidden_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS user_bookmarked_by UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS user_hidden_by UUID REFERENCES users(id);

        -- Create performance indexes
        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_bookmarked 
        ON bulk_analysis_domains(user_bookmarked) 
        WHERE user_bookmarked = true;

        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_hidden 
        ON bulk_analysis_domains(user_hidden) 
        WHERE user_hidden = true;

        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_actions 
        ON bulk_analysis_domains(user_bookmarked_by, user_bookmarked, user_hidden);

        CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_activity
        ON bulk_analysis_domains(user_bookmarked_at, user_hidden_at)
        WHERE user_bookmarked_at IS NOT NULL OR user_hidden_at IS NOT NULL;

        -- Add documentation comments
        COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked IS 'User has marked this domain as a favorite/bookmark for easy finding';
        COMMENT ON COLUMN bulk_analysis_domains.user_hidden IS 'User has hidden this domain from their default view to reduce clutter';
        COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked_by IS 'User ID who bookmarked this domain';
        COMMENT ON COLUMN bulk_analysis_domains.user_hidden_by IS 'User ID who hid this domain';
        COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked_at IS 'Timestamp when domain was bookmarked';
        COMMENT ON COLUMN bulk_analysis_domains.user_hidden_at IS 'Timestamp when domain was hidden';

        -- Record migration
        INSERT INTO migrations (name) VALUES ('0067_add_user_curation_to_bulk_analysis');
        RAISE NOTICE 'Migration 0067 completed successfully';
    ELSE
        RAISE NOTICE 'Migration 0067 already applied, skipping...';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION DATA: ORDER GROUPS TO LINE ITEMS
-- ============================================================================

DO $$
DECLARE
    order_rec RECORD;
    group_rec RECORD;
    selection_rec RECORD;
    line_item_id UUID;
    display_order_counter INTEGER;
    migration_count INTEGER := 0;
BEGIN
    -- Only run if we haven't done the data migration yet
    IF NOT EXISTS (SELECT 1 FROM migrations WHERE name = '0056_data_migration_ordergroups_to_lineitems') THEN
        RAISE NOTICE 'Running OrderGroups to LineItems data migration...';
        
        -- Find orders with orderGroups but no lineItems
        FOR order_rec IN 
            SELECT DISTINCT o.id 
            FROM orders o
            INNER JOIN order_groups og ON og.order_id = o.id
            LEFT JOIN order_line_items oli ON oli.order_id = o.id
            WHERE oli.id IS NULL
        LOOP
            display_order_counter := 0;
            
            -- Process each orderGroup
            FOR group_rec IN 
                SELECT * FROM order_groups 
                WHERE order_id = order_rec.id
                ORDER BY created_at
            LOOP
                -- Create lineItems based on orderGroup's link count
                FOR i IN 1..COALESCE(group_rec.link_count, 1) LOOP
                    line_item_id := gen_random_uuid();
                    
                    -- Try to get a matching site selection with domain info
                    SELECT 
                        oss.*,
                        bad.domain as domain_name
                    INTO selection_rec
                    FROM order_site_selections oss
                    LEFT JOIN bulk_analysis_domains bad ON bad.id = oss.domain_id
                    WHERE oss.order_group_id = group_rec.id
                    LIMIT 1 OFFSET (i - 1);
                    
                    -- Insert line item
                    INSERT INTO order_line_items (
                        id,
                        order_id,
                        client_id,
                        target_page_url,
                        anchor_text,
                        status,
                        assigned_domain_id,
                        assigned_domain,
                        estimated_price,
                        wholesale_price,
                        service_fee,
                        added_at,
                        added_by_user_id,
                        display_order,
                        metadata
                    ) VALUES (
                        line_item_id,
                        order_rec.id,
                        group_rec.client_id,
                        CASE 
                            WHEN group_rec.target_pages IS NOT NULL 
                            AND jsonb_array_length(group_rec.target_pages) > 0 
                            THEN (group_rec.target_pages->(i-1))->>'url'
                            ELSE NULL 
                        END,
                        CASE 
                            WHEN group_rec.anchor_texts IS NOT NULL 
                            AND jsonb_array_length(group_rec.anchor_texts) > 0 
                            THEN (group_rec.anchor_texts->(i-1))->>'text'
                            ELSE NULL 
                        END,
                        COALESCE(selection_rec.status, 'pending'),
                        selection_rec.domain_id,
                        selection_rec.domain_name,
                        selection_rec.price,
                        selection_rec.price - 7900,
                        7900,
                        COALESCE(group_rec.created_at, NOW()),
                        group_rec.created_by,
                        display_order_counter,
                        jsonb_build_object(
                            'migrated_from_group', group_rec.id,
                            'original_group_data', to_jsonb(group_rec)
                        )
                    );
                    
                    display_order_counter := display_order_counter + 1;
                    migration_count := migration_count + 1;
                END LOOP;
            END LOOP;
        END LOOP;
        
        -- Record data migration
        INSERT INTO migrations (name) VALUES ('0056_data_migration_ordergroups_to_lineitems');
        RAISE NOTICE 'Data migration completed. Migrated % line items', migration_count;
    ELSE
        RAISE NOTICE 'OrderGroups to LineItems data migration already completed, skipping...';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check migration status
SELECT 'Applied Migrations:' as info;
SELECT name, applied_at FROM migrations ORDER BY applied_at DESC;

-- Verify order_line_items schema
SELECT 'Order Line Items Schema Verification:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'order_line_items' 
  AND column_name IN ('assigned_at', 'service_fee', 'added_at', 'display_order', 'version')
ORDER BY column_name;

-- Verify bulk_analysis_domains schema for target matching
SELECT 'Target URL Matching Schema Verification:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bulk_analysis_domains' 
  AND column_name IN ('suggested_target_url', 'target_match_data', 'target_matched_at')
ORDER BY column_name;

-- Verify user curation columns
SELECT 'User Curation Schema Verification:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bulk_analysis_domains' 
  AND column_name LIKE 'user_%'
ORDER BY column_name;

-- Check line_item_changes schema
SELECT 'Line Item Changes Schema Verification:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'line_item_changes' 
  AND column_name IN ('order_id', 'change_type', 'previous_value', 'batch_id')
ORDER BY column_name;

-- Summary statistics
SELECT 'Migration Summary:' as info;
SELECT 
    (SELECT COUNT(*) FROM order_line_items) as total_line_items,
    (SELECT COUNT(*) FROM order_groups) as total_order_groups,
    (SELECT COUNT(*) FROM bulk_analysis_domains WHERE suggested_target_url IS NOT NULL) as domains_with_target_match,
    (SELECT COUNT(*) FROM bulk_analysis_domains WHERE user_bookmarked = true) as bookmarked_domains,
    (SELECT COUNT(*) FROM migrations) as applied_migrations;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- ============================================================================

/*
-- TO ROLLBACK ALL MIGRATIONS:

-- 1. Remove user curation columns
ALTER TABLE bulk_analysis_domains 
DROP COLUMN IF EXISTS user_bookmarked CASCADE,
DROP COLUMN IF EXISTS user_hidden CASCADE,
DROP COLUMN IF EXISTS user_bookmarked_at CASCADE,
DROP COLUMN IF EXISTS user_hidden_at CASCADE,
DROP COLUMN IF EXISTS user_bookmarked_by CASCADE,
DROP COLUMN IF EXISTS user_hidden_by CASCADE;

-- 2. Remove target URL matching columns
ALTER TABLE bulk_analysis_domains 
DROP COLUMN IF EXISTS suggested_target_url CASCADE,
DROP COLUMN IF EXISTS target_match_data CASCADE,
DROP COLUMN IF EXISTS target_matched_at CASCADE;

-- 3. Remove line_item_changes columns
ALTER TABLE line_item_changes
DROP COLUMN IF EXISTS order_id CASCADE,
DROP COLUMN IF EXISTS change_type CASCADE,
DROP COLUMN IF EXISTS previous_value CASCADE,
DROP COLUMN IF EXISTS batch_id CASCADE,
DROP COLUMN IF EXISTS metadata CASCADE;

-- 4. Remove migrations records
DELETE FROM migrations WHERE name IN (
    '0056_production_lineitems_migration',
    '0057_line_item_changes_schema_fix',
    '0060_add_target_url_matching',
    '0061_fix_inclusion_status_defaults',
    '0067_add_user_curation_to_bulk_analysis',
    '0056_data_migration_ordergroups_to_lineitems'
);

*/