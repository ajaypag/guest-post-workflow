# Order Groups Migration Guide

## Overview
This migration adds support for linking order groups to bulk analysis projects, which is required for Phase 2 of the order system implementation.

## Migration Details

### Schema Changes
The migration adds the following to the `order_groups` table:
- `bulk_analysis_project_id` (UUID, nullable) - References `bulk_analysis_projects(id)`
- Index: `idx_order_groups_analysis` on `bulk_analysis_project_id`

### Running the Migration

#### Option 1: Web Interface (Recommended)
1. Navigate to `/admin/order-groups-migration`
2. Review the migration steps
3. Click "Run Migration"
4. Verify all steps complete successfully

#### Option 2: Manual SQL
```sql
-- Add column
ALTER TABLE order_groups
ADD COLUMN bulk_analysis_project_id UUID
REFERENCES bulk_analysis_projects(id);

-- Create index
CREATE INDEX idx_order_groups_analysis 
ON order_groups(bulk_analysis_project_id);
```

## Verification
After running the migration, verify:
1. Column exists with correct type
2. Foreign key constraint is in place
3. Index is created
4. Existing order groups are not affected

## Rollback
If needed, you can rollback:
```sql
-- Drop index
DROP INDEX IF EXISTS idx_order_groups_analysis;

-- Drop column (this will also drop the foreign key)
ALTER TABLE order_groups 
DROP COLUMN IF EXISTS bulk_analysis_project_id;
```

## Impact
- No downtime required
- Safe to run multiple times (idempotent)
- Existing order groups will have NULL values for the new column
- New order groups can be linked to bulk analysis projects