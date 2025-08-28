# Vetted Sites "In Use" Status Redesign

## Current State Issues

1. **Binary blocking**: Domains marked as "In Use" are completely unselectable
2. **No context**: Users don't know WHO is using it or for WHAT purpose
3. **Over-restrictive**: Prevents valid reuse scenarios (same domain, different brand/campaign)
4. **Confusing with filters**: When filtered by client, "In Use" still blocks selection even if it's used by a different client

## Real-World Use Cases

### Valid Reuse Scenarios:
- **Different brands**: Client A used domain for Brand X, now wants it for Brand Y
- **Time-separated campaigns**: Same brand wants to reuse a domain after 6+ months
- **Different target pages**: Same domain, but linking to different content
- **Cross-account sharing**: Internal team knows certain domains work well for multiple accounts

### Invalid Reuse Scenarios:
- **Duplicate active orders**: Same domain, same brand, orders still in progress
- **Too frequent reuse**: Same brand using domain multiple times in short period (spam risk)

## Proposed Redesign

### Core Principle: Inform, Don't Block

Transform "In Use" from a blocker to an informational tool that helps users make informed decisions.

### Implementation Options

#### Option 1: Rich Usage Details (Recommended)

**UI Changes:**
```typescript
interface DomainUsageInfo {
  lineItems: Array<{
    clientName: string;
    brandName: string;
    orderId: string;
    orderDate: Date;
    status: 'in_progress' | 'delivered' | 'cancelled';
    targetUrl: string;
  }>;
  lastUsedDaysAgo: number;
  totalUsageCount: number;
  usageByCurrentClient: number;
  usageByCurrentBrand: number;
}
```

**Display Format:**
```
ranktracker.com
✓ Selectable
⚠️ Usage History (click to expand):
  - Last used 14 days ago
  - Total uses: 3 (1 by your account)
  
[Expanded View]
Recent Usage:
• Client: Linkio Sales | Order #1234 (Jan 15, 2024) | Status: Delivered
• Client: Another Brand | Order #5678 (Dec 1, 2023) | Status: Delivered
```

#### Option 2: Smart Warning System

**Warning Levels:**
- 🟢 **Green**: No recent usage or different account (fully available)
- 🟡 **Yellow**: Used by your account >30 days ago (caution)
- 🟠 **Orange**: Used by your account <30 days ago (warning)
- 🔴 **Red**: Currently in active order for same brand (strong warning)

**Implementation:**
```typescript
const getUsageWarningLevel = (domain: Domain, currentFilters: Filters) => {
  const usageInLast30Days = domain.lineItems.filter(
    item => item.createdAt > thirtyDaysAgo && item.clientId === currentFilters.clientId
  );
  
  if (usageInLast30Days.length > 0) {
    return { level: 'orange', message: 'Recently used by this client' };
  }
  // ... more logic
};
```

#### Option 3: Contextual Availability

Instead of global "In Use", show availability relative to current context:

```typescript
// When filtered by client "Linkio Sales"
availabilityStatus: 
  - "Available for Linkio Sales" ✓
  - "Used by Linkio Sales (14 days ago)" ⚠️
  - "In active order for Linkio Sales" ❌

// When no filter
availabilityStatus:
  - "In use (3 active orders)" ℹ️
```

### Database Changes Needed

1. **Enhance the activeLineItemsCount query** to return more details:
```sql
-- Instead of just COUNT, return rich data
SELECT 
  oli.client_id,
  c.name as client_name,
  oli.order_id,
  oli.created_at,
  oli.status,
  oli.target_page_url
FROM order_line_items oli
JOIN clients c ON oli.client_id = c.id
WHERE oli.assigned_domain = [domain]
ORDER BY oli.created_at DESC
LIMIT 5
```

2. **Add computed fields** for quick access:
- `lastUsedAt`: Timestamp of most recent usage
- `usageCount`: Total number of times used
- `activeOrderCount`: Current in-progress orders

### API Changes

**Current API Response:**
```json
{
  "domain": "ranktracker.com",
  "activeLineItemsCount": 3
}
```

**Enhanced API Response:**
```json
{
  "domain": "ranktracker.com",
  "usage": {
    "total": 3,
    "active": 1,
    "byCurrentClient": 1,
    "lastUsedAt": "2024-01-15T10:00:00Z",
    "recentLineItems": [
      {
        "clientId": "xxx",
        "clientName": "Linkio Sales",
        "orderId": "yyy",
        "status": "delivered",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ]
  },
  "availability": {
    "isSelectable": true,
    "warningLevel": "yellow",
    "warningMessage": "Used by your account 14 days ago"
  }
}
```

### UI Component Changes

```typescript
// VettedSitesTable.tsx
const DomainUsageIndicator = ({ domain, filters }) => {
  const { usage, availability } = domain;
  
  if (!usage.total) {
    return <Badge color="green">Available</Badge>;
  }
  
  return (
    <Popover>
      <PopoverTrigger>
        <Badge color={availability.warningLevel}>
          {usage.active > 0 ? `In Use (${usage.active})` : `Previously Used (${usage.total})`}
        </Badge>
      </PopoverTrigger>
      <PopoverContent>
        <UsageHistory lineItems={usage.recentLineItems} />
      </PopoverContent>
    </Popover>
  );
};
```

## Migration Path

### Phase 1: Data Collection (1 day)
- Update queries to fetch rich usage data
- Keep existing UI but add data to responses

### Phase 2: UI Enhancement (2 days)
- Add popover/tooltip with usage details
- Keep domains selectable but show warnings
- Add "View Usage History" link

### Phase 3: Smart Warnings (1 day)
- Implement warning level logic
- Add user preferences for warning thresholds
- Track dismissal of warnings

### Phase 4: Analytics (ongoing)
- Track when users select despite warnings
- Monitor reuse patterns
- Adjust warning logic based on outcomes

## Benefits

1. **Better UX**: Users understand WHY something is marked as in use
2. **Flexibility**: Allows valid reuse scenarios while warning about risky ones
3. **Transparency**: Full visibility into domain usage history
4. **Learning**: System can learn what reuse patterns work vs cause issues

## Risks & Mitigations

**Risk**: Users ignore warnings and create problematic duplicates
**Mitigation**: 
- Track warning dismissals
- Require confirmation for high-risk selections
- Show consequences ("This may affect SEO ranking")

**Risk**: Performance impact from fetching detailed usage data
**Mitigation**:
- Paginate usage history
- Cache usage data
- Only fetch details on hover/expand

## Success Metrics

- Reduction in support tickets about "can't select domain"
- Increase in successful order completions
- Decrease in problematic duplicate usage
- User satisfaction with transparency

## Next Steps

1. Get stakeholder buy-in on approach
2. Implement Phase 1 (data collection)
3. Create UI mockups for Phase 2
4. Set up analytics tracking
5. Plan rollout strategy