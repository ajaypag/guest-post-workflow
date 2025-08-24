# Marketing Branch Database Migration Strategy

## Overview
**Branch**: marketing (92 commits ahead of main)  
**Date**: 2025-08-23  
**Purpose**: Document all database migrations needed for production deployment

## Critical Migrations Summary

### Order of Execution (IMPORTANT)

1. **Migration 0056**: Production LineItems Migration
2. **Migration 0057**: Line Item Changes Schema Fix  
3. **Migration 0060**: Target URL Matching
4. **Migration 0061**: Inclusion Status Defaults
5. **Migration 0067**: User Curation for Bulk Analysis

## Migration Details

### 1. Migration 0056: Production LineItems Migration
**Impact**: Core system change from orderGroups to lineItems  
**Tables Affected**: `order_line_items`  
**New Columns Added**:
- assigned_at, assigned_by
- service_fee (default: 7900)
- final_price, client_review_status, client_reviewed_at
- delivery_notes, client_review_notes
- added_at, added_by_user_id
- modified_at, modified_by
- cancelled_at, cancelled_by, cancellation_reason
- display_order, version

**Indexes Created**:
- line_items_order_id_idx
- line_items_client_id_idx
- line_items_status_idx
- line_items_assigned_domain_idx

**Data Migration**: Automatically migrates existing orderGroups to lineItems

### 2. Migration 0057: Line Item Changes Schema
**Impact**: Audit trail for line item modifications  
**Tables Affected**: `line_item_changes`  
**Columns Added**:
- order_id (FK to orders)
- change_type (VARCHAR 50)
- previous_value, new_value (JSONB)
- batch_id, metadata (JSONB)

**Indexes Created**:
- idx_line_item_changes_order_id
- idx_line_item_changes_change_type
- idx_line_item_changes_batch_id

### 3. Migration 0060: Target URL Matching
**Impact**: AI-powered target URL suggestions  
**Tables Affected**: `bulk_analysis_domains`  
**Columns Added**:
- suggested_target_url (TEXT)
- target_match_data (JSONB)
- target_matched_at (TIMESTAMP)

**Indexes Created**:
- idx_bulk_domains_suggested_target
- idx_bulk_domains_target_matched_at

### 4. Migration 0061: Inclusion Status Defaults
**Impact**: Data integrity for domain filtering  
**Tables Affected**: `bulk_analysis_domains`  
**Changes**:
- Set default 'included' for inclusion_status
- Update NULL values to 'included'
- Make column NOT NULL

### 5. Migration 0067: User Curation
**Impact**: Bookmark/hide functionality  
**Tables Affected**: `bulk_analysis_domains`  
**Columns Added**:
- user_bookmarked, user_hidden (BOOLEAN)
- user_bookmarked_at, user_hidden_at (TIMESTAMP)
- user_bookmarked_by, user_hidden_by (UUID, FK to users)

**Indexes Created**:
- idx_bulk_analysis_user_bookmarked
- idx_bulk_analysis_user_hidden
- idx_bulk_analysis_user_actions
- idx_bulk_analysis_user_activity

## Deployment Instructions

### Step 1: Backup Production Database
```bash
pg_dump -U [user] -h [host] -d [database] > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Consolidated Migration
```bash
psql -U [user] -h [host] -d [database] -f migrations/consolidated_marketing_branch_migrations.sql
```

### Step 3: Verify Migration Success
```sql
-- Check all migrations applied
SELECT name, applied_at FROM migrations 
WHERE name IN (
    '0056_production_lineitems_migration',
    '0057_line_item_changes_schema_fix',
    '0060_add_target_url_matching',
    '0061_fix_inclusion_status_defaults',
    '0067_add_user_curation_to_bulk_analysis'
)
ORDER BY applied_at;

-- Verify data migration
SELECT 
    (SELECT COUNT(*) FROM order_line_items) as line_items_count,
    (SELECT COUNT(*) FROM bulk_analysis_domains WHERE suggested_target_url IS NOT NULL) as domains_with_suggestions,
    (SELECT COUNT(*) FROM migrations) as total_migrations;
```

### Step 4: Deploy Code
```bash
# Deploy marketing branch code
git checkout marketing
npm install
npm run build
# Deploy to production
```

## Rollback Plan

If issues occur, use the rollback section in the consolidated migration script:

```sql
-- Remove all migration changes
-- See ROLLBACK INSTRUCTIONS section in consolidated_marketing_branch_migrations.sql
```

## Key Features Enabled

After successful migration:

1. **LineItems System**: Full order management with line-level granularity
2. **Audit Trail**: Complete change tracking for line items
3. **AI Target Matching**: Automated target URL suggestions
4. **User Personalization**: Bookmark/hide domains per user
5. **Data Integrity**: Proper defaults and constraints

## Testing Requirements

### Critical Tests
1. External user order creation (zaid@ppcmasterminds.com)
2. Target URL automation with fallback
3. Order viewing and management
4. Bookmark/hide functionality
5. Line item change tracking

### Performance Tests
1. Query performance with new indexes
2. Bulk operations on line items
3. User curation filtering speed

## Notes

- The consolidated migration script includes automatic data migration from orderGroups to lineItems
- All migrations are idempotent (safe to run multiple times)
- Migration tracking table prevents duplicate execution
- Each migration includes verification queries

## Files Created

1. `/migrations/consolidated_marketing_branch_migrations.sql` - Main migration script
2. `/docs/migration-strategy-marketing-branch.md` - This documentation

---

**Status**: Ready for deployment review  
**Prepared by**: Claude Code Assistant  
**Date**: 2025-08-23