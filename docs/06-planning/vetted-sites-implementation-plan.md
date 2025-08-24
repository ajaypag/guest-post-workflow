# Vetted Sites - Complete Implementation Plan

## Overview
Build the Vetted Sites feature as a unified view of all qualified domains with user curation capabilities (bookmark/hide) and order creation functionality.

## Phase 1: Database & Schema Changes

### Task 1.1: Schema Analysis & Verification
**Before making ANY changes**

**Sub-tasks:**
1. **Verify Current Schema**
   ```bash
   DATABASE_URL="..." npx tsx -e "
   import { db } from './lib/db/connection';
   import { sql } from 'drizzle-orm';
   
   const columns = await db.execute(sql\`
     SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'bulk_analysis_domains'
     ORDER BY ordinal_position
   \`);
   console.log('Current columns:', columns.rows);
   "
   ```

2. **Check for Existing User Fields**
   - Verify no `user_*` columns already exist
   - Document current column count and types
   - Save schema snapshot for rollback

3. **Validate Foreign Key Targets**
   ```bash
   # Verify users table exists and has correct structure
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'id'
   ```

**Validation Criteria:**
- [ ] Current schema documented
- [ ] No naming conflicts found
- [ ] Foreign key targets confirmed
- [ ] Backup plan documented

### Task 1.2: Create Migration File
**File:** `migrations/0067_add_user_curation_to_bulk_analysis.sql`

```sql
-- Migration 0067: Add user curation fields to bulk_analysis_domains
-- Enables bookmark/hide functionality for vetted sites

-- Add user curation columns
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS user_bookmarked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_bookmarked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS user_hidden_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS user_bookmarked_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS user_hidden_by UUID REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_bookmarked 
ON bulk_analysis_domains(user_bookmarked) WHERE user_bookmarked = true;

CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_hidden 
ON bulk_analysis_domains(user_hidden) WHERE user_hidden = true;

CREATE INDEX IF NOT EXISTS idx_bulk_analysis_user_actions 
ON bulk_analysis_domains(user_bookmarked_by, user_bookmarked, user_hidden);

-- Add comments for documentation
COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked IS 'User has marked this domain as a favorite/bookmark';
COMMENT ON COLUMN bulk_analysis_domains.user_hidden IS 'User has hidden this domain from their view';
COMMENT ON COLUMN bulk_analysis_domains.user_bookmarked_by IS 'User who bookmarked this domain';
COMMENT ON COLUMN bulk_analysis_domains.user_hidden_by IS 'User who hid this domain';
```

**Sub-tasks:**
1. **Create Migration File**
   - Write complete SQL with IF NOT EXISTS guards
   - Include rollback instructions as comments
   - Add performance indexes
   - Document all changes

2. **Test Migration Locally**
   ```bash
   # Run migration
   DATABASE_URL="..." psql -f migrations/0067_add_user_curation_to_bulk_analysis.sql
   
   # Verify columns added
   DATABASE_URL="..." npx tsx -e "/* verification script */"
   
   # Test rollback
   ALTER TABLE bulk_analysis_domains DROP COLUMN user_bookmarked; -- etc
   ```

3. **Update Schema Documentation**
   - Update database schema docs
   - Document new indexes
   - Note performance implications

**Validation Criteria:**
- [ ] Migration runs without errors
- [ ] All columns added with correct types
- [ ] Indexes created successfully
- [ ] Rollback tested and documented
- [ ] Schema docs updated

### Task 1.3: Update TypeScript Schema
**File:** `lib/db/bulkAnalysisSchema.ts`

**Sub-tasks:**
1. **Read Current Schema File**
   ```bash
   # Examine current structure
   cat lib/db/bulkAnalysisSchema.ts | grep -A 20 "export const bulkAnalysisDomains"
   ```

2. **Add New Fields to Drizzle Schema**
   ```typescript
   // Add to existing bulkAnalysisDomains table definition
   userBookmarked: boolean('user_bookmarked').default(false),
   userHidden: boolean('user_hidden').default(false),
   userBookmarkedAt: timestamp('user_bookmarked_at'),
   userHiddenAt: timestamp('user_hidden_at'),
   userBookmarkedBy: uuid('user_bookmarked_by').references(() => users.id),
   userHiddenBy: uuid('user_hidden_by').references(() => users.id),
   ```

3. **Add New Indexes to Schema**
   ```typescript
   // Add to indexes object
   userBookmarkedIdx: index('idx_bulk_analysis_user_bookmarked').on(table.userBookmarked),
   userHiddenIdx: index('idx_bulk_analysis_user_hidden').on(table.userHidden),
   userActionsIdx: index('idx_bulk_analysis_user_actions').on(table.userBookmarkedBy, table.userBookmarked, table.userHidden),
   ```

4. **Full TypeScript Check**
   ```bash
   # Extended TypeScript check
   timeout 600 npx tsc --noEmit --watch
   ```

**Validation Criteria:**
- [ ] Schema compiles without errors
- [ ] All new fields properly typed
- [ ] Index definitions valid
- [ ] No TypeScript warnings
- [ ] 10-minute build passes

## Phase 2: API Development

### Task 2.1: Main Vetted Sites API Endpoint
**File:** `app/api/vetted-sites/route.ts`

**Sub-tasks:**
1. **Create API Route File**
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { AuthServiceServer } from '@/lib/auth-server';
   import { db } from '@/lib/db/connection';
   import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
   import { websites } from '@/lib/db/websiteSchema';
   import { clients } from '@/lib/db/schema';
   import { orderLineItems } from '@/lib/db/orderLineItemSchema';
   
   export async function GET(request: NextRequest) {
     // Implementation here
   }
   ```

2. **Implement Query Logic**
   ```sql
   SELECT 
     -- Core domain data
     bad.id,
     bad.domain,
     bad.normalized_domain,
     bad.client_id,
     bad.project_id,
     bad.qualification_status,
     bad.ai_qualification_reasoning,
     bad.authority_direct,
     bad.authority_related,
     bad.evidence,
     bad.target_page_ids,
     bad.suggested_target_url,
     
     -- User curation
     bad.user_bookmarked,
     bad.user_hidden,
     bad.user_bookmarked_at,
     bad.user_hidden_at,
     
     -- Client info
     c.name as client_name,
     
     -- Metrics (if available)
     w.domain_rating,
     w.total_traffic,
     w.guest_post_cost,
     w.categories,
     
     -- Availability check
     CASE WHEN oli.id IS NOT NULL THEN false ELSE true END as is_available,
     ARRAY_AGG(DISTINCT oli.order_id) FILTER (WHERE oli.id IS NOT NULL) as used_in_orders
     
   FROM bulk_analysis_domains bad
   LEFT JOIN clients c ON bad.client_id = c.id
   LEFT JOIN websites w ON bad.normalized_domain = w.domain
   LEFT JOIN order_line_items oli ON bad.domain = oli.assigned_domain 
     AND oli.status NOT IN ('cancelled', 'refunded')
   
   WHERE bad.qualification_status IN ('qualified', 'high_quality')
     AND (bad.user_hidden = false OR $showHidden = true)
     AND ($clientIds IS NULL OR bad.client_id = ANY($clientIds))
   
   GROUP BY bad.id, c.name, w.domain_rating, w.total_traffic, w.guest_post_cost, w.categories
   ORDER BY 
     bad.user_bookmarked DESC,
     bad.updated_at DESC
   ```

3. **Add Request Validation**
   - Validate query parameters
   - Check user permissions
   - Handle client filtering for different user types

4. **Add Response Formatting**
   ```typescript
   interface VettedSiteResponse {
     data: VettedSite[];
     pagination: {
       page: number;
       limit: number;
       total: number;
       hasMore: boolean;
     };
     meta: {
       totalQualified: number;
       totalBookmarked: number;
       totalHidden: number;
       clientsCount: number;
     };
   }
   ```

**Validation Criteria:**
- [ ] API responds with correct data structure
- [ ] Filtering works for all parameters
- [ ] Permissions respected per user type
- [ ] Performance acceptable (<2s for 1000 domains)
- [ ] Error handling complete

### Task 2.2: User Action API Endpoint
**File:** `app/api/vetted-sites/[domainId]/actions/route.ts`

**Sub-tasks:**
1. **Create Action Endpoint**
   ```typescript
   export async function PATCH(
     request: NextRequest,
     { params }: { params: Promise<{ domainId: string }> }
   ) {
     const { action } = await request.json();
     // Implementation
   }
   ```

2. **Implement Action Logic**
   ```typescript
   switch (action) {
     case 'bookmark':
       await db.update(bulkAnalysisDomains)
         .set({
           userBookmarked: true,
           userBookmarkedAt: new Date(),
           userBookmarkedBy: session.userId
         })
         .where(eq(bulkAnalysisDomains.id, domainId));
       break;
     // ... other actions
   }
   ```

3. **Add Optimistic Updates Support**
   - Return updated domain state
   - Handle concurrent modifications
   - Provide rollback data

**Validation Criteria:**
- [ ] All actions work correctly
- [ ] Optimistic updates supported
- [ ] Concurrent access handled
- [ ] Audit trail maintained

### Task 2.3: API Testing & Documentation
**Sub-tasks:**
1. **Manual Testing**
   ```bash
   # Test main endpoint
   curl "http://localhost:3000/api/vetted-sites?clientId=abc&view=all"
   
   # Test actions
   curl -X PATCH "http://localhost:3000/api/vetted-sites/domain123/actions" \
     -H "Content-Type: application/json" \
     -d '{"action": "bookmark"}'
   ```

2. **Performance Testing**
   - Test with 1000+ domains
   - Measure response times
   - Check database query performance

3. **Error Case Testing**
   - Invalid parameters
   - Permission violations
   - Non-existent domains

**Validation Criteria:**
- [ ] All test cases pass
- [ ] Performance within acceptable limits
- [ ] Error handling comprehensive
- [ ] API documentation complete

## Phase 3: UI Components

### Task 3.1: Main Vetted Sites Page
**File:** `app/vetted-sites/page.tsx`

**Sub-tasks:**
1. **Create Server Component**
   ```typescript
   import { AuthServiceServer } from '@/lib/auth-server';
   import { VettedSitesTable } from './components/VettedSitesTable';
   import { VettedSitesFilters } from './components/VettedSitesFilters';
   
   export default async function VettedSitesPage({ searchParams }) {
     const session = await AuthServiceServer.getSession();
     // Fetch initial data
     // Determine client context
     // Render components
   }
   ```

2. **Implement Server-Side Filtering**
   - Extract search params
   - Determine user context
   - Set default client filter
   - Fetch initial data

3. **Add Error Boundaries**
   - Handle API failures gracefully
   - Provide fallback UI
   - Show meaningful error messages

**Validation Criteria:**
- [ ] Page loads correctly
- [ ] Initial data displayed
- [ ] User context handled properly
- [ ] Error states managed

### Task 3.2: Vetted Sites Table Component
**File:** `app/vetted-sites/components/VettedSitesTable.tsx`

**Sub-tasks:**
1. **Create Base Table Structure**
   ```tsx
   interface VettedSitesTableProps {
     initialData: VettedSite[];
     userType: 'internal' | 'account' | 'client';
     defaultClientId?: string;
   }
   
   export function VettedSitesTable({ initialData, userType, defaultClientId }: VettedSitesTableProps) {
     // Implementation
   }
   ```

2. **Implement Table Headers**
   - Sortable columns
   - Responsive design
   - Context-aware columns (hide client for single-client users)

3. **Implement Row Component**
   ```tsx
   function VettedSiteRow({ domain, onBookmark, onHide, onSelect }) {
     return (
       <tr className="hover:bg-gray-50">
         <td><input type="checkbox" /></td>
         <td>{domain.userBookmarked && '⭐'} {domain.domain}</td>
         <td>{domain.clientName}</td>
         <td>{domain.domainRating || 'N/A'}</td>
         <td>${domain.guestPostCost || 'TBD'}</td>
         <td>{domain.isAvailable ? '✓ Available' : '⚠ Used'}</td>
         <td>
           <button onClick={() => onBookmark(domain.id)}>
             {domain.userBookmarked ? '★' : '☆'}
           </button>
           <button onClick={() => onHide(domain.id)}>×</button>
         </td>
       </tr>
     );
   }
   ```

4. **Add Interaction Handling**
   - Checkbox selection
   - Bookmark/hide actions
   - Sorting
   - Pagination

**Validation Criteria:**
- [ ] Table renders correctly
- [ ] All interactions work
- [ ] Responsive design
- [ ] Accessibility compliant

### Task 3.3: Filter Components
**File:** `app/vetted-sites/components/VettedSitesFilters.tsx`

**Sub-tasks:**
1. **Create Filter Sidebar**
   ```tsx
   export function VettedSitesFilters({ 
     clients, 
     selectedClientIds, 
     onClientChange,
     userType,
     // ... other props
   }) {
     // Implementation
   }
   ```

2. **Implement Client Filter**
   - Multi-select dropdown for agencies
   - Single client for client users
   - "All Clients" option for internal

3. **Implement View Filter**
   - All / Bookmarked / Hidden radio buttons
   - Show counts for each view
   - Update URL on change

4. **Implement Other Filters**
   - Project filter
   - Status filter
   - Metrics range filters

**Validation Criteria:**
- [ ] All filters work correctly
- [ ] URL state synchronized
- [ ] Performance good with many options
- [ ] User type permissions respected

### Task 3.4: Selection & Action Bar
**File:** `app/vetted-sites/components/SelectionBar.tsx`

**Sub-tasks:**
1. **Create Selection Summary**
   ```tsx
   export function SelectionBar({ 
     selectedDomains, 
     onClearSelection,
     onBulkAction 
   }) {
     const totalPrice = selectedDomains.reduce((sum, d) => sum + (d.guestPostCost || 0), 0);
     
     return (
       <div className="bg-blue-50 p-4 border-b">
         <span>{selectedDomains.length} domains selected</span>
         <span>Total: ${totalPrice}</span>
         <button onClick={onClearSelection}>Clear</button>
         <div>
           <button onClick={() => onBulkAction('addToOrder')}>Add to Order ▼</button>
           <button onClick={() => onBulkAction('createOrder')}>Create Order</button>
         </div>
       </div>
     );
   }
   ```

2. **Implement Bulk Actions**
   - Add to existing order (dropdown)
   - Create new order
   - Bulk bookmark/hide
   - Export selected

3. **Add Order Integration (Basic)**
   - Pass selected domains to order creation
   - Maintain selection state during navigation
   - Handle success/error states

**Validation Criteria:**
- [ ] Selection state managed correctly
- [ ] Bulk actions work
- [ ] Order integration functional
- [ ] UI responsive and clear

## Phase 4: Navigation Integration

### Task 4.1: Add to Main Navigation
**File:** `components/Header.tsx` or navigation component

**Sub-tasks:**
1. **Locate Navigation Component**
   ```bash
   find . -name "*.tsx" -exec grep -l "navigation\|nav\|menu" {} \;
   ```

2. **Add Vetted Sites Link**
   ```tsx
   {session.userType === 'internal' && (
     <NavLink href="/vetted-sites">Vetted Sites</NavLink>
   )}
   ```

3. **Add Client Context Links**
   - Add to client detail pages
   - Add to project pages
   - Add to order pages

**Validation Criteria:**
- [ ] Navigation link appears correctly
- [ ] Permissions respected
- [ ] Link styling consistent
- [ ] Context-aware links work

### Task 4.2: Integration with Existing Flows
**Sub-tasks:**
1. **Add to Client Pages**
   ```tsx
   // In client detail page
   <Link href={`/vetted-sites?clientId=${client.id}`}>
     View Vetted Sites ({qualifiedCount})
   </Link>
   ```

2. **Add to Project Pages**
   ```tsx
   // In project page
   <Link href={`/vetted-sites?projectId=${project.id}`}>
     View Project Domains
   </Link>
   ```

3. **Add to Order Pages**
   ```tsx
   // In order detail page
   <Link href={`/vetted-sites?clientId=${order.clientId}`}>
     Add More Domains
   </Link>
   ```

**Validation Criteria:**
- [ ] All integration points working
- [ ] Context passed correctly
- [ ] UI consistent with existing patterns
- [ ] No broken layouts

## Phase 5: Order Creation Flow (Basic)

### Task 5.1: Order Creation Integration
**File:** `app/vetted-sites/components/OrderCreationModal.tsx`

**Sub-tasks:**
1. **Create Modal Component**
   ```tsx
   export function OrderCreationModal({
     selectedDomains,
     isOpen,
     onClose,
     onSuccess
   }) {
     // Basic order creation form
   }
   ```

2. **Implement Basic Order Creation**
   ```typescript
   const createOrderFromDomains = async (domains: VettedSite[], clientId: string) => {
     // Create order
     const orderResponse = await fetch('/api/orders', {
       method: 'POST',
       body: JSON.stringify({
         clientId,
         orderType: 'guest_post'
       })
     });
     
     // Create line items
     const lineItemsResponse = await fetch(`/api/orders/${orderId}/line-items`, {
       method: 'POST',
       body: JSON.stringify({
         items: domains.map(d => ({
           clientId: d.clientId,
           assignedDomain: d.domain,
           targetPageUrl: d.suggestedTargetUrl,
           // ... other fields
         }))
       })
     });
   };
   ```

3. **Add Success/Error Handling**
   - Show creation progress
   - Handle API errors
   - Redirect to order on success

**Validation Criteria:**
- [ ] Orders created successfully
- [ ] Line items added correctly
- [ ] Error handling works
- [ ] User feedback clear

### Task 5.2: Add to Existing Order Flow
**Sub-tasks:**
1. **Create Add to Order Modal**
   ```tsx
   export function AddToOrderModal({
     selectedDomains,
     availableOrders,
     isOpen,
     onClose
   }) {
     // List existing orders
     // Allow selection
     // Add domains to selected order
   }
   ```

2. **Implement Add to Order Logic**
   - Fetch user's active orders
   - Add selected domains as new line items
   - Handle conflicts/duplicates

**Validation Criteria:**
- [ ] Existing orders fetched correctly
- [ ] Domains added successfully
- [ ] Duplicate handling works
- [ ] UI feedback appropriate

## Phase 6: Testing & Documentation

### Task 6.1: Comprehensive Testing
**Sub-tasks:**
1. **Unit Tests**
   - API endpoint tests
   - Component tests
   - Utility function tests

2. **Integration Tests**
   - Full user flow tests
   - Database transaction tests
   - Permission boundary tests

3. **Performance Tests**
   - Large dataset handling
   - Response time validation
   - Memory usage analysis

4. **Manual Testing Checklist**
   - [ ] Internal user can see all clients
   - [ ] Agency user sees only their clients
   - [ ] Client user sees only their domains
   - [ ] Bookmark/hide actions work
   - [ ] Order creation successful
   - [ ] Filtering works correctly
   - [ ] Pagination functions
   - [ ] Mobile responsive

### Task 6.2: Documentation Updates
**Sub-tasks:**
1. **Update API Documentation**
   - Document new endpoints
   - Add request/response examples
   - Update authentication notes

2. **Update User Documentation**
   - Add Vetted Sites user guide
   - Update navigation docs
   - Document permissions model

3. **Update Developer Documentation**
   - Document new database fields
   - Update schema diagrams
   - Add troubleshooting guide

### Task 6.3: Migration Documentation
**Sub-tasks:**
1. **Create Migration Log**
   ```markdown
   # Migration 0067 - User Curation for Bulk Analysis
   
   **Date:** [DATE]
   **Applied to:** Local, Staging, Production
   **Rollback plan:** Available
   **Impact:** None (additive changes only)
   
   ## Changes Made
   - Added 6 new columns to bulk_analysis_domains
   - Added 3 new indexes for performance
   - Updated TypeScript schema
   
   ## Validation Steps
   - [x] Migration runs without errors
   - [x] Indexes created successfully  
   - [x] TypeScript compilation passes
   - [x] API tests pass
   ```

2. **Update Schema Documentation**
   - Add new fields to schema docs
   - Update ER diagrams
   - Document index strategy

## Deployment & Rollout Plan

### Stage 1: Local Development
- [ ] All database changes
- [ ] All API development
- [ ] All UI components
- [ ] Basic testing

### Stage 2: Internal Testing
- [ ] Deploy to staging
- [ ] Internal team testing
- [ ] Performance validation
- [ ] Bug fixes

### Stage 3: Limited Rollout
- [ ] Deploy to production
- [ ] Feature flag enabled for internal users only
- [ ] Monitor performance and errors
- [ ] Gather feedback

### Stage 4: Full Rollout
- [ ] Enable for all user types
- [ ] Monitor adoption metrics
- [ ] Document lessons learned
- [ ] Plan Phase 2 features

## Success Metrics

### Technical Metrics
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Database query time < 100ms
- [ ] Zero data corruption incidents

### User Metrics
- [ ] 80% of users try Vetted Sites within 1 week
- [ ] 50% of orders include domains from Vetted Sites
- [ ] Average time to create order reduced by 30%
- [ ] User satisfaction score > 4.0/5.0

### Business Metrics  
- [ ] 20% increase in domains reused across orders
- [ ] 15% reduction in domain analysis API costs
- [ ] 25% increase in order value (more domains per order)

## Risk Mitigation

### Technical Risks
- **Database migration fails:** Rollback plan prepared
- **Performance degradation:** Indexes and query optimization ready
- **TypeScript errors:** Extended validation at each step

### User Experience Risks
- **Feature too complex:** Simple bookmark/hide design
- **Doesn't fit workflow:** Integration with existing flows
- **Low adoption:** Clear value proposition and training

### Business Risks
- **Increased costs:** Monitor API usage carefully
- **Data inconsistency:** Comprehensive testing plan
- **User pushback:** Gradual rollout with feedback loops

---

This plan provides granular, actionable tasks with clear validation criteria at each step. Each task includes the specific files to create/modify, validation steps, and rollback plans.