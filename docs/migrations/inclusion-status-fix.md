# Inclusion Status Fix Migration

## Overview
This migration fixes a critical issue where line items have NULL `inclusion_status`, causing UI/backend mismatch and breaking invoicing/metrics.

## Problem
- Line items with NULL inclusion_status show as "included" in UI but have no backend value
- This breaks:
  - Invoice generation (items not properly counted)
  - Metrics tracking (included items not tracked)
  - User experience (confusing dropdown behavior)

## Solution
Set all NULL inclusion_status values to 'included' by default for better UX and functionality.

## Migration Steps

### For Local Development
1. Migration is already applied if you ran the local setup
2. Verify at: http://localhost:3000/admin/fix-inclusion-status

### For Production Deployment

#### Step 1: Deploy Code Changes
Deploy the branch with these files:
- `/app/api/admin/fix-inclusion-status/route.ts` - Migration API
- `/app/admin/fix-inclusion-status/page.tsx` - Admin UI
- `/components/orders/LineItemsReviewTable.tsx` - Frontend fix
- `/app/api/orders/[id]/line-items/route.ts` - API default fix
- `/app/api/orders/[id]/line-items/[lineItemId]/route.ts` - Update fix

#### Step 2: Run Migration
1. Navigate to `/admin/fix-inclusion-status` (internal access required)
2. Click "Refresh Status" to see current state
3. Click "Run Dry Run" to preview changes
4. Review the items that will be updated
5. Click "Apply Migration" to update database
6. Verify all items show "0 needs fix"

#### Step 3: Verify
- Check order review pages show correct inclusion status
- Test creating new line items (should default to 'included')
- Verify invoices generate correctly with included items

## Database Changes

### Line Items Table
```sql
-- Updates metadata JSONB field
UPDATE order_line_items
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{inclusionStatus}',
  '"included"'::jsonb
)
WHERE metadata->>'inclusionStatus' IS NULL;
```

### Site Submissions Table (if exists)
```sql
UPDATE order_site_submissions
SET inclusion_status = 'included'
WHERE inclusion_status IS NULL;

ALTER TABLE order_site_submissions 
ALTER COLUMN inclusion_status SET DEFAULT 'included';
```

## Code Changes

### Frontend
- `LineItemsReviewTable.tsx`: Default to 'included' when undefined
- Consistent display logic across all views

### Backend
- Line item creation: Auto-set inclusionStatus to 'included'
- Line item updates: Preserve inclusion status, default to 'included' if not set

## Rollback Plan
If issues occur, the migration includes a rollback endpoint:
- DELETE `/api/admin/fix-inclusion-status` - Removes inclusion status from recently updated items
- Only affects items updated in last 24 hours
- Use with extreme caution

## Success Criteria
- [ ] All line items have non-NULL inclusion_status
- [ ] Order review pages show correct dropdowns
- [ ] New line items default to 'included'
- [ ] Invoices properly count included items
- [ ] Metrics track included items correctly

## Notes
- This is a one-time migration
- Safe to run multiple times (idempotent)
- Affects all orders, not just specific ones
- Production data will be preserved, only NULL values updated