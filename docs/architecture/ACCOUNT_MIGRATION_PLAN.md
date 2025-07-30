# Advertiser to Account Migration Plan

## Overview
Simple migration to rename "advertisers" to "accounts" and implement selective transparency features. No complex multi-tenant infrastructure needed.

## Current State
- `advertisers` table with login credentials
- Advertisers see limited dashboard at `/advertiser/*`
- Internal users have full access via `/login`
- Orders linked to advertisers via `advertiser_id`

## Target State
- `accounts` table (renamed from advertisers)
- Accounts see curated operational data at `/account/*`
- Internal users unchanged
- OutreachLabs has an account for their own orders

## Migration Steps

### Phase 1: Database Migration

```sql
-- 1. Rename advertisers table to accounts
ALTER TABLE advertisers RENAME TO accounts;

-- 2. Rename all advertiser_id columns
ALTER TABLE orders RENAME COLUMN advertiser_id TO account_id;
ALTER TABLE advertiser_order_access RENAME COLUMN advertiser_id TO account_id;

-- 3. Rename advertiser_order_access table
ALTER TABLE advertiser_order_access RENAME TO account_order_access;

-- 4. Update indexes
ALTER INDEX idx_advertisers_email RENAME TO idx_accounts_email;
ALTER INDEX idx_advertisers_status RENAME TO idx_accounts_status;
ALTER INDEX idx_advertisers_client RENAME TO idx_accounts_client;

-- 5. Create OutreachLabs account
INSERT INTO accounts (
  id, email, password, contact_name, company_name, 
  status, email_verified, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'accounts@outreachlabs.com',
  '$2a$10$...', -- Hashed password
  'OutreachLabs Team',
  'OutreachLabs',
  'active',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
```

### Phase 2: Code Changes

#### A. Schema Updates
1. Rename `advertiserSchema.ts` → `accountSchema.ts`
2. Update all type definitions: `Advertiser` → `Account`
3. Update table references: `advertisers` → `accounts`

#### B. Route Updates
1. Move `/app/advertiser/*` → `/app/account/*`
2. Update all route imports and links
3. Update navigation components

#### C. Authentication Updates
```typescript
// Update /api/auth/login/route.ts
const account = await db.query.accounts.findFirst({
  where: eq(accounts.email, email.toLowerCase()),
});

if (account) {
  session.userType = 'account'; // Changed from 'advertiser'
}
```

#### D. Component Permission Updates

**BulkAnalysisTable.tsx**
```typescript
// Add permission checks
const canCreateAnalysis = session.userType === 'internal';
const visibleDomains = session.userType === 'account' 
  ? filterDomainsByAccountOrders(domains, session.userId)
  : domains;

// Hide creation buttons for accounts
{canCreateAnalysis && (
  <Button onClick={handleNewAnalysis}>New Analysis</Button>
)}
```

**WorkflowList.tsx**
```typescript
// Filter workflows for accounts
const workflows = session.userType === 'account'
  ? await getWorkflowsForAccountOrders(session.userId)
  : await getAllWorkflows();

// Hide internal fields
const visibleFields = session.userType === 'account'
  ? ['title', 'status', 'progress', 'content_preview']
  : allFields;
```

### Phase 3: API Filtering

#### Update Bulk Analysis API
```typescript
// /api/bulk-analysis/domains/route.ts
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  
  if (session.userType === 'account') {
    // Join with orders to filter domains
    const domains = await db
      .select()
      .from(bulkAnalysisDomains)
      .innerJoin(orderItems, /* domains used in account's orders */)
      .where(eq(orders.accountId, session.userId));
  } else {
    // Internal users see all
    const domains = await db.query.bulkAnalysisDomains.findMany();
  }
}
```

#### Update Workflow API
```typescript
// /api/workflows/route.ts
if (session.userType === 'account') {
  // Only return workflows linked to their orders
  const workflows = await db.query.workflows.findMany({
    where: inArray(workflows.orderItemId, accountOrderItemIds),
    columns: {
      // Exclude internal fields
      agentState: false,
      sessionMetadata: false,
    }
  });
}
```

### Phase 4: UI Polish

1. **Account Dashboard Updates**
   - Add workflow progress widgets
   - Show domain analysis summaries
   - Improve order tracking visualization

2. **Add "View Mode" Indicators**
   - "Read Only" badges on filtered content
   - Clear visual distinction for account view
   - Help tooltips explaining limited access

3. **Navigation Updates**
   - Buyer-appropriate menu items
   - Hide internal-only features
   - Add "Behind the Scenes" section

### Phase 5: Testing & Deployment

1. **Test Migration Script**
   - Backup database
   - Run migration in staging
   - Verify data integrity

2. **Test Account Experience**
   - Create test account
   - Verify filtered data views
   - Test order creation flow
   - Confirm no access to internal tools

3. **Test OutreachLabs Account**
   - Create order as OutreachLabs
   - Verify same limitations as other accounts
   - No special treatment

4. **Deploy**
   - Run migration during low-traffic period
   - Monitor for errors
   - Have rollback plan ready

## Rollback Plan

If issues arise:
```sql
-- Reverse the migration
ALTER TABLE accounts RENAME TO advertisers;
ALTER TABLE orders RENAME COLUMN account_id TO advertiser_id;
-- etc...
```

Keep code backup of old advertiser routes and schemas until stable.

## Success Criteria

- [ ] All existing advertiser accounts work as accounts
- [ ] Accounts see filtered operational data
- [ ] Internal team workflow unchanged
- [ ] OutreachLabs account has no special privileges
- [ ] No data loss during migration
- [ ] Performance unchanged or improved

## Timeline

- Phase 1-2: 1 day (Database + Core Code)
- Phase 3: 1 day (API Filtering)
- Phase 4: 2 days (UI Polish)
- Phase 5: 1 day (Testing & Deployment)

Total: ~5 days to complete migration