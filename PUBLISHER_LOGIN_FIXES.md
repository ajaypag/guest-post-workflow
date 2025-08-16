# Publisher Login System Fixes
## Date: 2025-08-16

### Issues Identified and Fixed:

#### 1. SQL FILTER Syntax Error
**Issue**: PostgreSQL version doesn't support FILTER clause in aggregation
**File**: `/app/api/publisher/orders/route.ts`
**Fix**: Changed from FILTER syntax to CASE WHEN conditional aggregation

```sql
-- OLD (not working)
COUNT(*) FILTER (WHERE publisher_status = 'completed')

-- NEW (working)
SUM(CASE WHEN publisher_status = 'completed' THEN 1 ELSE 0 END)
```

#### 2. Missing earning_type Column Reference
**Issue**: Code referenced non-existent `earning_type` column in publisher_earnings table
**File**: `/app/api/publisher/orders/route.ts` (line 92-96)
**Fix**: Removed the earning_type condition from the JOIN

```typescript
-- OLD
.leftJoin(
  publisherEarnings,
  and(
    eq(publisherEarnings.orderLineItemId, orderLineItems.id),
    eq(publisherEarnings.earningType, 'order_completion')  // This column doesn't exist
  )
)

-- NEW
.leftJoin(
  publisherEarnings,
  eq(publisherEarnings.orderLineItemId, orderLineItems.id)
)
```

#### 3. Missing offering_name Column
**Issue**: Code expected `offering_name` column in publisher_offerings table but it didn't exist
**Table**: `publisher_offerings`
**Fix**: Added the missing column

```sql
ALTER TABLE publisher_offerings 
ADD COLUMN IF NOT EXISTS offering_name VARCHAR(255);
```

#### 4. Missing request parameter in GET function
**Issue**: TypeScript compilation error - GET function missing required NextRequest parameter
**File**: `/app/api/admin/migrations/connect-orders-to-publishers/route.ts`
**Fix**: Added NextRequest parameter to GET function signature

### Production Migration Script Needed:

```sql
-- 1. Add offering_name column to publisher_offerings
ALTER TABLE publisher_offerings 
ADD COLUMN IF NOT EXISTS offering_name VARCHAR(255);

-- Note: The FILTER syntax fix is a code change only, no database migration needed
-- Note: The earning_type removal is a code change only, no database migration needed
```

### Files Changed:
1. `/app/api/publisher/orders/route.ts` - Fixed SQL syntax and removed earning_type reference
2. `/app/api/admin/migrations/connect-orders-to-publishers/route.ts` - Added missing request parameter

### Testing Status:
- [x] Publisher account creation (direct DB insert)
- [x] Publisher login authentication
- [ ] Publisher dashboard access
- [ ] Publisher orders listing
- [ ] Full end-to-end flow