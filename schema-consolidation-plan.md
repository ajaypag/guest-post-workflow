# Publisher Schema Consolidation Plan

## 🚨 THE PROBLEM

We have a complete clusterfuck of schema files and migrations:

### Schema Files (3 conflicting versions):
1. `publisherSchemaActual.ts` - Claims to be "actual" 
2. `publisherOfferingsSchemaFixed.ts` - Claims to be "fixed"
3. Files importing from both randomly

### Migration Files (11 overlapping):
```
0020_publisher_crm_clean_slate.sql
0034_publisher_offerings_system.sql
0035_publisher_offerings_system_fixed.sql
0035_publisher_offerings_system_fixed_v2.sql  // WTF v2?
0038_add_missing_publisher_columns.sql
0038_add_missing_publisher_columns_production.sql  // Same number!
0040_add_missing_publisher_offering_columns.sql
0040_add_publisher_fields_to_order_line_items.sql  // Same number again!
0050_connect_orders_to_publishers.sql
0051_publisher_payments_system.sql
0053_fix_publisher_portal_issues.sql
```

## THE CONSOLIDATION STRATEGY

### Step 1: Determine What's Actually in Database
We need to check what migrations have actually been applied:
```sql
SELECT name FROM drizzle_migrations 
WHERE name LIKE '%publisher%' 
ORDER BY executed_at;
```

### Step 2: Map Current State
Based on what's actually in the database, we'll know which schema version is real.

### Step 3: Create Master Schema File
Create ONE definitive schema file: `lib/db/publisherSchema.ts` that matches reality.

### Step 4: Update All Imports
Find and replace all imports to use the single schema.

### Step 5: Clean Up
- Delete conflicting schema files
- Archive unused migration files
- Add comments explaining the consolidation

## Import Analysis

### Files using `publisherSchemaActual.ts`:
- lib/services/publisherOfferingsService.ts
- lib/db/schema.ts
- app/internal/publishers/[id]/page.tsx
- app/internal/publishers/page.tsx
- app/internal/websites/[id]/page.tsx
- app/api/publisher/websites/route.ts

### Files using `publisherOfferingsSchemaFixed.ts`:
- lib/services/publisherClaimingService.ts
- lib/services/publisherOrderService.ts
- lib/services/enhancedOrderPricingService.ts
- app/internal/orders/[orderId]/assign-publishers/page.tsx
- app/api/publisher/dashboard/stats/route.ts
- app/api/publisher/orders/route.ts
- app/api/publishers/offerings/[id]/route.ts
- app/api/publishers/available/route.ts

## Critical Questions to Answer

1. Which migrations have actually been applied?
2. What columns actually exist in each table?
3. Which foreign key relationships are real?
4. What data is currently stored?

## The Fix Process

### Phase 1: Discovery (NOW)
- [ ] Check actual database state
- [ ] Identify which migrations ran
- [ ] Document current table structure

### Phase 2: Consolidation
- [ ] Create single source of truth schema
- [ ] Test it matches database exactly
- [ ] Update all imports

### Phase 3: Cleanup
- [ ] Delete duplicate schemas
- [ ] Archive conflicting migrations
- [ ] Document what happened

### Phase 4: Prevention
- [ ] Add pre-commit hooks to prevent duplicate migrations
- [ ] Add schema validation tests
- [ ] Document schema change process

## Risk Assessment

**High Risk Areas:**
- Order assignment queries (using different schemas)
- Publisher dashboard stats (mixed schemas)
- Website claiming process (relationship confusion)

**Data Loss Risk:**
- LOW if we only consolidate schemas without changing database
- HIGH if we try to "fix" the database structure

## Recommendation

DO NOT try to fix the database structure yet. First:
1. Map what's actually there
2. Create schema that matches reality
3. Fix all code to use consistent schema
4. THEN plan database structure improvements

This is a "stabilize first, improve later" situation.