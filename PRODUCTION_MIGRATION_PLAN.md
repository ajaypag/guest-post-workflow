# Production Migration Plan

## Current Status
- **Branch**: bug-fixing  
- **Commits ahead of main**: 116 commits
- **New migrations**: 27 migration files

## Migration Files to Execute (In Order)

### Phase 1: Line Items Schema Fix (CRITICAL)
These migrations fix the line_item_changes table schema issues:

1. **0055_fix_order_line_items_schema.sql** - Base schema fixes
2. **0056_production_lineitems_migration.sql** - Production line items migration  
   *(Note: 0056_rollback_lineitems.sql is a rollback script, not for forward migration)*
3. **0057 Series** - Line item changes table fixes:
   - 0057a_add_order_id_column.sql
   - 0057b_add_change_type_column.sql  
   - 0057c_add_previous_value_column.sql
   - 0057d_add_metadata_columns.sql
   - 0057e_drop_old_columns.sql
   - 0057f_add_indexes_and_constraints.sql
4. **0058_update_line_item_changes_schema.sql** - Final schema updates
5. **0059_fix_line_item_changes_columns.sql** - Column fixes

### Phase 2: Feature Additions
New features and functionality:

6. **0060_add_target_url_matching.sql** - AI-powered target URL matching
7. **0061_fix_inclusion_status_defaults.sql** - Fix NULL inclusion_status defaults
8. **0062_add_workflow_completion_tracking.sql** - Workflow tracking
9. **0063_add_workflow_assignment_tracking.sql** - Assignment tracking
10. **0064_add_publisher_coordination_fields.sql** - Publisher fields
11. **0065_add_order_completion_tracking.sql** - Order completion
12. **0066_populate_workflow_assignments.sql** - Populate assignments (DATA MIGRATION)
13. **0067_add_order_delivery_fields.sql** - Delivery tracking

### Phase 3: Brand Intelligence System
New brand intelligence features:

14. **0068_add_client_brand_intelligence.sql** - Core brand intelligence table
15. **0069_add_brand_intelligence_metadata.sql** - Metadata JSONB field for structured data

### Phase 4: Bug Fixes
16. **0070_fix_project_tags_to_urls.sql** - Fix project tags relationship

## Pre-Migration Checklist

- [ ] **Backup production database**
- [ ] Test migrations on staging/development copy
- [ ] Check for any table locks or long-running transactions
- [ ] Verify application can be put in maintenance mode
- [ ] Confirm rollback plan for each migration

## Migration Execution Order

### Critical Order Dependencies:
1. **0057 series MUST run in alphabetical order** (a→b→c→d→e→f)
2. **0066 depends on 0063** (populate assignments needs assignment tracking table)
3. **0069 depends on 0068** (metadata field needs brand intelligence table)

## Rollback Scripts Available:
- **0056_rollback_lineitems.sql** - Can rollback line items migration if needed

## Risk Assessment

### High Risk:
- **0056_production_lineitems_migration.sql** - Major data migration from order_groups to line_items
- **0057e_drop_old_columns.sql** - Drops columns (irreversible without backup)
- **0066_populate_workflow_assignments.sql** - Data population that modifies existing records

### Medium Risk:
- Schema changes that add constraints (0057f, 0059)
- Default value changes (0061)

### Low Risk:
- New table additions (0060, 0062, 0063, 0064, 0065, 0067, 0068, 0069)
- Adding columns to existing tables

## Recommended Execution Strategy

1. **Test Environment First**
   - Run all migrations on a production database copy
   - Verify application functionality with migrated schema
   - Test rollback procedures

2. **Production Execution**
   - Schedule maintenance window (estimate: 30-60 minutes)
   - Execute migrations in phases with validation between each:
     - Phase 1: Line items (0055-0059)
     - Validate application
     - Phase 2: Features (0060-0067)
     - Validate application
     - Phase 3: Brand Intelligence (0068-0069)
     - Validate application
     - Phase 4: Bug fixes (0070)

3. **Post-Migration Validation**
   - Run application health checks
   - Verify critical workflows:
     - Order creation/editing
     - Line items management
     - Brand intelligence functionality
   - Monitor error logs for 24 hours

## Notes

- Many of the 0057 variants appear to be different attempts at the same migration
- Consider consolidating 0057a-f into a single migration if not already applied
- The 0066 migration populates data - ensure it's idempotent or only runs once