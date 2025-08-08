# Advertiser Layer - Revised Implementation Plan

## Key Corrections from Feedback

1. **Workflow Creation**: Already exists at row level in bulk analysis ✓
2. **Pricing**: Use retail price from Airtable (most expensive column)
3. **Access Model**: NOT project-based - filter and curate qualified sites only
4. **Order Creation**: Need to handle advertisers without accounts

## Revised Architecture

### 1. Order Creation Flow

#### Option A: Pre-Account Orders (Recommended)
```typescript
// Orders can exist without advertiser accounts
orders {
  id: uuid
  clientId: uuid
  advertiserId: uuid | null  // NULL for prospects
  advertiserEmail: varchar   // Store email for future account creation
  advertiserName: varchar
  advertiserCompany: varchar
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed'
  createdBy: uuid  // Internal user who created order
  shareToken: varchar  // For preview/approval without account
}
```

**Flow:**
1. Internal user creates order for prospect
2. Adds qualified domains from bulk analysis
3. Generates shareable link with token
4. Prospect reviews and approves via link
5. After approval → invite to create account
6. Link order to new advertiser account

#### Option B: Just-in-Time Account Creation
- Force account creation when order is initiated
- Simpler but more friction

### 2. Bulk Analysis Integration

Add "Add to Order" functionality alongside existing "Create Workflow" button:

```tsx
<BulkAnalysisTable>
  {/* Existing row actions */}
  <button onClick={() => onCreateWorkflow(domain)}>
    Create Workflow
  </button>
  
  {/* New order actions */}
  <button onClick={() => onAddToOrder(domain)}>
    Add to Order
  </button>
</BulkAnalysisTable>

{/* Bulk selection actions */}
<BulkActions>
  <button onClick={() => onBulkAddToOrder(selectedDomains)}>
    Add {selectedDomains.length} to Order
  </button>
</BulkActions>
```

### 3. Curated Suggestions System

Instead of giving advertisers access to full projects:

```typescript
// Curated suggestions for advertisers
advertiserSuggestions {
  id: uuid
  advertiserId: uuid
  domainId: uuid  // from bulk_analysis_domains
  suggestedBy: uuid  // internal user
  suggestedAt: timestamp
  reason: text  // Why this domain is good for them
  status: 'pending' | 'accepted' | 'rejected'
  retailPrice: decimal  // From Airtable
  expiresAt: timestamp  // Suggestions can expire
}
```

**Internal Workflow:**
1. Internal team qualifies domains in bulk analysis
2. Manually selects best matches for advertiser
3. Pushes to advertiser's suggestion queue
4. Advertiser sees curated list, not raw project data

### 4. Pricing Integration

```typescript
// Service to get retail pricing
class PricingService {
  async getRetailPrice(domain: string): Promise<number> {
    // 1. Clean domain format
    const cleanDomain = this.cleanDomain(domain);
    
    // 2. Look up in websites table (synced from Airtable)
    const website = await db.query(
      `SELECT guest_post_cost FROM websites 
       WHERE domain = $1 OR domain = $2`,
      [cleanDomain, `www.${cleanDomain}`]
    );
    
    // 3. Return retail price (most expensive)
    return website?.guest_post_cost || 0;
  }
}
```

### 5. Order Lifecycle

```typescript
const ORDER_LIFECYCLE = {
  DRAFT: {
    actions: ['add_domains', 'remove_domains', 'apply_discounts'],
    visibility: 'internal_only'
  },
  SHARED: {
    actions: ['view', 'approve', 'request_changes'],
    visibility: 'public_with_token'
  },
  APPROVED: {
    actions: ['create_account', 'process_payment'],
    visibility: 'advertiser_required'
  },
  PAID: {
    actions: ['create_workflows'],
    visibility: 'full'
  },
  IN_PROGRESS: {
    actions: ['track_workflows'],
    visibility: 'full'
  }
}
```

### 6. Implementation Phases

#### Phase 1: Order Infrastructure (Week 1)
1. Create order tables with nullable advertiserId
2. Add "Add to Order" to bulk analysis
3. Build order builder UI for internal users
4. Implement share token system

#### Phase 2: Suggestion System (Week 2)
1. Create suggestion tables and API
2. Build internal UI to push suggestions
3. Create advertiser view (authenticated or token-based)
4. Implement accept/reject flow

#### Phase 3: Pricing & Discounts (Week 3)
1. Integrate Airtable retail pricing
2. Build volume discount calculator
3. Add discount preview to order builder
4. Create order summary with savings

#### Phase 4: Account & Payment (Week 4)
1. Convert approved orders to accounts
2. Build payment tracking
3. Auto-create workflows on payment
4. Link workflows to order items

#### Phase 5: Advertiser Portal (Week 5)
1. Advertiser dashboard
2. Order history and tracking
3. Workflow progress visibility
4. Basic reporting

## Key Differences from Original Plan

1. **No Direct Project Access**: Advertisers never see raw project data
2. **Suggestion-Based**: Internal team curates and pushes suggestions
3. **Token-First**: Orders can be shared before account creation
4. **Retail Pricing**: Pulled directly from Airtable via websites table
5. **Workflow Creation**: Triggered after payment, not before

## Security Considerations

1. **Data Isolation**: Advertisers only see:
   - Their suggestions
   - Their orders
   - Domains they've paid for
   - Public workflow progress

2. **Price Protection**:
   - Only retail prices sent to advertisers
   - Wholesale prices never exposed in API
   - Markup calculations server-side only

3. **Token Security**:
   - Time-limited share tokens
   - Single-use approval tokens
   - Tokens revoked after account creation

## Open Questions

1. **Multiple Orders**: Can advertisers have multiple active orders?
2. **Order Modification**: Can orders be edited after approval?
3. **Refunds**: How to handle cancellations?
4. **White-label**: Should order emails come from client or PostFlow?
5. **Suggestion Limits**: How many domains to suggest at once?