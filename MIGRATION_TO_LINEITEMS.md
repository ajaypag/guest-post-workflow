# Migration from OrderGroups to LineItems System

## Migration Status
- **Start Date**: 2025-08-18
- **Target**: Complete removal of orderGroups system
- **Current State**: Phase 1 - Analysis and Initial Changes

## Critical Files Tracking

### Components Using OrderGroups (Must Update)
1. `/components/OrdersTableMultiClient.tsx` - Uses orderGroups for display
2. `/components/orders/OrderSiteReviewTableV2.tsx` - Dual mode with useLineItems flag
3. `/app/orders/[id]/internal/page.tsx` - Has both orderGroups and lineItems logic
4. `/app/orders/[id]/review/page.tsx` - Fetches orderGroups for site submissions
5. `/app/orders/[id]/edit/page.tsx` - Creates/edits orderGroups
6. `/app/account/orders/[id]/status/page.tsx` - Displays orderGroups

### API Endpoints Using OrderGroups (Must Replace)
1. `/api/orders/[id]/groups/*` - All group-related endpoints
2. `/api/orders/[id]/order-groups/*` - Alternative group endpoints
3. `/api/orders/route.ts` - Creates orderGroups on order creation
4. `/api/orders/[id]/route.ts` - Updates orderGroups

### Database Tables to Remove
1. `order_groups` - Main orderGroups table
2. `order_site_selections` - Site selections for groups
3. Foreign key: `orders.orderGroups` relationship

## Phase 1: Make LineItems Primary (LOCAL TESTING)

### Tasks Completed
- [x] Document all orderGroups dependencies
- [x] Create database backup (implied - local dev)
- [x] Force useLineItems=true everywhere
  - Modified `/lib/config/featureFlags.ts` - Set enableLineItemsSystem=true
  - Modified `/components/orders/OrderSiteReviewTableV2.tsx` - Set useLineItems=true
  - Modified `/app/api/orders/[id]/invoice/route.ts` - Force useLineItems=true
- [x] Fix database schema mismatch
  - Created migration 0055_fix_order_line_items_schema.sql
  - Added missing columns: added_by, assigned_by, service_fee, etc.
  - Applied migration successfully
- [ ] Test basic order flow

### Known Issues to Fix
- Order creation still creates orderGroups
- Site review expects orderGroups data
- Bulk analysis tied to orderGroups

## Phase 2: Fix Breaking Functionality

### Completed
- [x] **Database Schema**: Fixed missing columns in order_line_items table
- [x] **Order Service**: Modified getOrderGroups to return empty array during migration
- [x] **Order Confirmation**: Updated to allow orders without groups

### Priority Fixes Needed
1. **Order Creation**: ✅ Orders now create without orderGroups 
2. **Order Display**: OrdersTableMultiClient handles missing orderGroups gracefully
3. **Site Review**: Need to convert workflow to lineItems
4. **Bulk Analysis**: Need to relink to lineItems system

## Phase 3: Cleanup

### Code to Remove
- All `/api/orders/[id]/groups/*` endpoints
- OrderGroups components
- Database tables (via migration script)

## Database Migration Scripts

### Script 1: Add Missing LineItems Columns
```sql
-- To be created based on testing needs
```

### Script 2: Remove OrderGroups Tables
```sql
-- DANGER: Only run after full migration
-- DROP TABLE IF EXISTS order_site_selections CASCADE;
-- DROP TABLE IF EXISTS order_groups CASCADE;
```

## Testing Checklist

- [ ] Create new order (lineItems only)
- [ ] View order list
- [ ] View order details
- [ ] Site review workflow
- [ ] Bulk analysis integration
- [ ] Publisher assignment
- [ ] Payment flow
- [ ] Order completion

## Production Deployment Plan

1. Deploy code with feature flag
2. Test on staging
3. Run migration scripts
4. Monitor for errors
5. Remove feature flag

## Rollback Plan

If issues arise:
1. Revert code deployment
2. Keep database tables (no data loss)
3. Re-enable orderGroups code