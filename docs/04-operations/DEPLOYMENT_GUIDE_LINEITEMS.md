# LineItems Migration Deployment Guide

## Overview
This guide outlines the deployment process for migrating from the dual order system (orderGroups + lineItems) to a unified lineItems-only system.

## Pre-Deployment Checklist

- [ ] All code changes merged to production branch
- [ ] Database backup created
- [ ] Rollback plan reviewed
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment window

## Deployment Steps

### Phase 1: Code Deployment (Zero Downtime)

1. **Deploy new code** with feature flags enabled:
   ```bash
   # The code is backward compatible
   # Orders with existing orderGroups will continue to work
   # New orders will use lineItems only
   ```

2. **Verify application health**:
   - Check that existing orders still display
   - Create a test order to verify lineItems creation
   - Monitor error logs for any issues

### Phase 2: Database Migration

1. **Connect to production database**

2. **Run migration script**:
   ```sql
   -- First, verify the migration will work
   BEGIN;
   \i migrations/0055_fix_order_line_items_schema.sql
   -- Check for errors
   ROLLBACK; -- or COMMIT if successful
   
   -- Then run the production migration
   BEGIN;
   \i migrations/0056_production_lineitems_migration.sql
   -- Verify migrated data
   SELECT COUNT(*) FROM order_line_items WHERE metadata->>'migrated_from_group' IS NOT NULL;
   COMMIT;
   ```

3. **Verify migration**:
   ```sql
   -- Check that lineItems were created for existing orders
   SELECT o.id, COUNT(oli.id) as line_item_count
   FROM orders o
   LEFT JOIN order_line_items oli ON oli.order_id = o.id
   GROUP BY o.id
   HAVING COUNT(oli.id) > 0;
   ```

### Phase 3: Validation

1. **Test order creation**:
   - Create new order as internal user
   - Create new order as account user
   - Verify lineItems are created, not orderGroups

2. **Test existing orders**:
   - View orders list
   - View order details
   - Check that migrated orders display correctly

3. **Test order workflow**:
   - Submit an order
   - Confirm an order (internal)
   - Generate invoice
   - Mark as paid

### Phase 4: Monitoring

Monitor for 24-48 hours:
- Error rates
- Order creation success rate
- Page load times
- Database query performance

## Rollback Plan

If critical issues occur:

1. **Immediate rollback** (within 1 hour):
   ```bash
   # Deploy previous version of code
   git checkout <previous-version>
   # Deploy
   ```

2. **Database rollback** (if needed):
   ```sql
   BEGIN;
   \i migrations/0056_rollback_lineitems.sql
   COMMIT;
   ```

## Post-Deployment Cleanup (After 1 Week)

Once system is stable:

1. **Remove orderGroups code**:
   - Delete `/app/api/orders/[id]/groups/*` endpoints
   - Remove orderGroups imports and components
   - Clean up migration conditionals

2. **Archive orderGroups tables**:
   ```sql
   -- Create backup
   CREATE TABLE order_groups_archive AS SELECT * FROM order_groups;
   CREATE TABLE order_site_selections_archive AS SELECT * FROM order_site_selections;
   
   -- Drop original tables (after verification)
   DROP TABLE order_site_selections CASCADE;
   DROP TABLE order_groups CASCADE;
   ```

## Success Criteria

- [ ] All new orders use lineItems
- [ ] Existing orders migrated successfully
- [ ] No increase in error rates
- [ ] Order workflow functioning normally
- [ ] Performance metrics stable or improved

## Contact

For issues during deployment:
- Primary: [Your Name]
- Backup: [Backup Contact]
- Escalation: [Manager/Lead]

## Notes

- The migration is designed to be safe with minimal risk
- The system can operate in hybrid mode indefinitely if needed
- OrderGroups are disabled but not deleted, allowing for rollback
- All changes are backward compatible