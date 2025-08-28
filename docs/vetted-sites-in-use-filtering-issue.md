# Vetted Sites "In Use" Filtering Issue

## Problem Statement
When filtering vetted sites by a specific client (e.g., `clientId=3092fbcc-9205-4ad8-a869-91f938f9e3ca`), domains are incorrectly shown as "In Use" even when they're not being used by that specific client. The `activeLineItemsCount` checks ALL orders across ALL clients, not just the filtered client.

### Example
- URL: `http://localhost:3003/vetted-sites?clientId=3092fbcc-9205-4ad8-a869-91f938f9e3ca&accountId=0567a86d-b298-4035-b19a-46a2e93e11f1&available=false&page=1`
- Shows domains like `ranktracker.com`, `publicmediasolution.com`, `thecontentauthority.com` as "In Use"
- These domains are NOT actually in use for this specific client

## Root Cause
The `activeLineItemsCount` calculation in both `/app/vetted-sites/page.tsx` and `/app/api/vetted-sites/route.ts` uses a SQL subquery that counts line items globally:

```sql
SELECT COUNT(*)::int 
FROM order_line_items 
WHERE assigned_domain = [domain] 
AND status IN ('approved', 'invoiced', 'in_progress', 'delivered')
```

This query doesn't filter by `clientId` or `accountId`, so it counts usage across ALL clients.

## Attempted Solution #1: Dynamic SQL with IIFE

### Approach
Used an Immediately Invoked Function Expression (IIFE) to dynamically build the SQL WHERE clause based on filters:

```typescript
activeLineItemsCount: (() => {
  let whereClause = `
    WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain} 
    AND ${orderLineItems.status} IN ('approved', 'invoiced', 'in_progress', 'delivered')
  `;
  
  if (filters.clientId && filters.clientId.length > 0) {
    whereClause += ` AND ${orderLineItems.clientId} IN (${sql.raw(filters.clientId.map(id => `'${id}'`).join(','))})`;
  } 
  else if (filters.accountId && filters.accountId.length > 0) {
    whereClause += ` AND ${orderLineItems.clientId} IN (
      SELECT id FROM ${clients} 
      WHERE ${clients.accountId} IN (${sql.raw(filters.accountId.map(id => `'${id}'`).join(','))})
    )`;
  }
  
  return sql<number>`(
    SELECT COUNT(*)::int 
    FROM ${orderLineItems} 
    ${sql.raw(whereClause)}
  )`;
})()
```

### Result
❌ **FAILED** - Caused SQL syntax errors: `error: syntax error at or near "["`

### Why it Failed
Drizzle ORM's `sql` template tag doesn't support JavaScript template literal interpolation the way I attempted. The table references like `${orderLineItems}` inside the string weren't being properly resolved to their SQL equivalents.

## Attempted Solution #2: Conditional SQL Expressions

### Approach (API route)
Tried building a base query string and conditionally appending filters:

```typescript
activeLineItemsCount: (() => {
  let baseQuery = `
    SELECT COUNT(*)::int
    FROM ${orderLineItems}
    WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
    AND ${orderLineItems.status} != 'cancelled'
  `;
  
  if (filters.clientId && filters.clientId.length > 0) {
    baseQuery += ` AND ${orderLineItems.clientId} IN (${sql.raw(filters.clientId.map(id => `'${id}'`).join(','))})`;
  }
  
  return sql<number>`COALESCE((${sql.raw(baseQuery)}), 0)`;
})()
```

### Result
❌ **FAILED** - Same SQL syntax errors

### Why it Failed
Same issue - mixing JavaScript string concatenation with Drizzle's SQL template tag syntax doesn't work as expected.

## Why These Solutions Don't Work

The core issue is that Drizzle ORM's `sql` template tag:
1. Expects table references to be passed directly as template variables
2. Doesn't support dynamic SQL generation through string concatenation
3. Can't mix `sql.raw()` with table references inside strings

## Potential Solutions to Explore

### Solution 1: Conditional SQL using Drizzle's Native Methods
Instead of string concatenation, use Drizzle's conditional query building:

```typescript
// Build conditions array
const lineItemConditions = [
  eq(orderLineItems.assignedDomain, bulkAnalysisDomains.domain),
  inArray(orderLineItems.status, ['approved', 'invoiced', 'in_progress', 'delivered'])
];

if (filters.clientId?.length > 0) {
  lineItemConditions.push(inArray(orderLineItems.clientId, filters.clientId));
}

// Use in subquery - but this is complex with Drizzle's current API
```

### Solution 2: Multiple Pre-defined SQL Queries
Define separate SQL queries for each scenario:

```typescript
const getActiveLineItemsCount = () => {
  if (filters.clientId && filters.clientId.length > 0) {
    return sql<number>`(
      SELECT COUNT(*)::int 
      FROM order_line_items 
      WHERE assigned_domain = ${bulkAnalysisDomains.domain}
      AND status IN ('approved', 'invoiced', 'in_progress', 'delivered')
      AND client_id = ANY(${filters.clientId})
    )`;
  } else if (filters.accountId && filters.accountId.length > 0) {
    return sql<number>`(
      SELECT COUNT(*)::int 
      FROM order_line_items oli
      JOIN clients c ON oli.client_id = c.id
      WHERE oli.assigned_domain = ${bulkAnalysisDomains.domain}
      AND oli.status IN ('approved', 'invoiced', 'in_progress', 'delivered')
      AND c.account_id = ANY(${filters.accountId})
    )`;
  } else {
    return sql<number>`(
      SELECT COUNT(*)::int 
      FROM order_line_items 
      WHERE assigned_domain = ${bulkAnalysisDomains.domain}
      AND status IN ('approved', 'invoiced', 'in_progress', 'delivered')
    )`;
  }
};

// Then use it in the select
activeLineItemsCount: getActiveLineItemsCount()
```

### Solution 3: Post-Processing Approach
1. Fetch all line items separately after the main query
2. Filter them in JavaScript based on clientId/accountId
3. Update the counts in the result set

### Solution 4: Database View or Function
Create a PostgreSQL function that handles the conditional logic:

```sql
CREATE FUNCTION count_active_line_items(
  p_domain TEXT,
  p_client_ids UUID[] DEFAULT NULL,
  p_account_ids UUID[] DEFAULT NULL
) RETURNS INTEGER AS $$
BEGIN
  -- Implementation with conditional logic
END;
$$ LANGUAGE plpgsql;
```

## ✅ SOLUTION IMPLEMENTED

### Solution 2: Multiple Pre-defined SQL Queries (WORKING)

Successfully implemented conditional SQL queries based on the active filters:

```typescript
activeLineItemsCount: filters.clientId && filters.clientId.length > 0
  ? sql<number>`(
      SELECT COUNT(*)::int 
      FROM ${orderLineItems} 
      WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain} 
      AND ${orderLineItems.status} IN ('approved', 'invoiced', 'in_progress', 'delivered')
      AND ${orderLineItems.clientId} IN (${sql.join(filters.clientId.map(id => sql`${id}::uuid`), sql`,`)})
    )`
  : filters.accountId && filters.accountId.length > 0
  ? sql<number>`(
      SELECT COUNT(*)::int 
      FROM ${orderLineItems} oli
      INNER JOIN ${clients} c ON oli.client_id = c.id
      WHERE oli.assigned_domain = ${bulkAnalysisDomains.domain} 
      AND oli.status IN ('approved', 'invoiced', 'in_progress', 'delivered')
      AND c.account_id IN (${sql.join(filters.accountId.map(id => sql`${id}::uuid`), sql`,`)})
    )`
  : sql<number>`(
      SELECT COUNT(*)::int 
      FROM ${orderLineItems} 
      WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain} 
      AND ${orderLineItems.status} IN ('approved', 'invoiced', 'in_progress', 'delivered')
    )`
```

### Key Implementation Details

1. **Ternary conditions** to choose the right query based on filters
2. **sql.join()** to properly format arrays for PostgreSQL IN clauses
3. **Type casting** with `::uuid` for proper PostgreSQL type handling
4. **Separate queries** for clientId vs accountId filtering (accountId requires a JOIN)

### Verification

The "In Use" status now correctly shows:
- Only domains used by the specific filtered client when `clientId` is set
- Only domains used by clients under the filtered account when `accountId` is set
- All domains in use across all clients when no filter is applied

## Next Steps

1. **Add tests** to verify the filtering works correctly
2. **Monitor performance** - the JOIN for account filtering might be slower on large datasets
3. **Consider indexing** `order_line_items.client_id` and `clients.account_id` for better query performance

## Lessons Learned

1. **Drizzle ORM Limitations**: The `sql` template tag has strict requirements about how SQL is constructed
2. **Type Safety vs Flexibility**: Drizzle prioritizes type safety, which limits dynamic SQL generation
3. **Testing Importance**: Need to test SQL changes thoroughly before deploying
4. **Rollback Strategy**: Always have a quick rollback plan when modifying critical queries

## Related Files

- `/app/vetted-sites/page.tsx` - Server component with main query
- `/app/api/vetted-sites/route.ts` - API endpoint with similar query
- `/lib/db/orderLineItemSchema.ts` - Order line items schema
- `/lib/db/bulkAnalysisSchema.ts` - Bulk analysis domains schema