# Domain Bank API Design

## Core Concept
Real-time domain inventory system that shows current metrics/pricing, not historical snapshots.

## API Endpoint: `/api/domain-bank`

### Primary Endpoint
```typescript
GET /api/domain-bank
```

### Query Parameters
```typescript
{
  // Filtering
  clientId?: string;              // Filter by client
  projectId?: string;             // Filter by project  
  targetPageId?: string;          // Filter by target URL
  qualificationStatus?: string[]; // ['qualified', 'high_quality']
  availability?: 'all' | 'available' | 'used';
  
  // Metrics filters (applied to real-time data)
  drMin?: number;
  drMax?: number;
  trafficMin?: number;
  trafficMax?: number;
  priceMin?: number;
  priceMax?: number;
  
  // Categories/Types
  categories?: string[];
  niches?: string[];
  types?: string[];
  
  // Pagination & Sorting
  page?: number;
  limit?: number;
  sortBy?: 'domain' | 'dr' | 'traffic' | 'price' | 'qualification_date';
  sortOrder?: 'asc' | 'desc';
  
  // Data freshness
  refreshMetrics?: boolean;  // Force refresh from external APIs
  maxAge?: number;           // Max age of metrics in hours (default: 24)
}
```

### Response Structure
```typescript
{
  data: DomainBankItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  meta: {
    metricsUpdatedAt: string;  // When metrics were last refreshed
    pricingSource: 'cached' | 'live' | 'estimated';
    missingMetricsCount: number;
  };
}

interface DomainBankItem {
  // Core identification
  id: string;                    // bulk_analysis_domain.id
  domain: string;
  normalizedDomain: string;
  
  // Qualification context
  client: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
    addedAt: string;              // project_added_at
    originalProjectId?: string;   // If moved between projects
  };
  targetPages: {
    id: string;
    url: string;
    keywords: string[];
    isSelected: boolean;          // selected_target_page_id match
  }[];
  
  // Qualification data
  qualification: {
    status: 'qualified' | 'high_quality' | 'disqualified' | 'review_needed' | null;
    reasoning: string;
    topicScope: 'head_terms' | 'long_tail' | 'mixed' | null;
    topicReasoning: string;
    authorityDirect: 'low' | 'moderate' | 'high' | null;
    authorityRelated: 'low' | 'moderate' | 'high' | null;
    overlapStatus: 'direct' | 'related' | 'both' | 'none' | null;
    evidence: {
      directCount: number;
      directMedianPosition: number | null;
      relatedCount: number;
      relatedMedianPosition: number | null;
    };
    qualifiedAt: string;
    wasManuallyQualified: boolean;
    manuallyQualifiedBy?: string;
    manuallyQualifiedAt?: string;
    wasHumanVerified: boolean;
    humanVerifiedBy?: string;
    humanVerifiedAt?: string;
  };
  
  // DataForSEO analysis
  dataforseo: {
    status: 'pending' | 'analyzing' | 'analyzed' | 'failed' | null;
    keywordsFound: number;
    searchedKeywords: string[];
    resultsCount: number;
    totalApiCalls: number;
    lastAnalyzed: string | null;
    hasResults: boolean;
  };
  
  // Real-time metrics (from websites table or API)
  metrics: {
    dr: number | null;
    traffic: number | null;
    categories: string[];
    niches: string[];
    types: string[];
    lastUpdated: string;
    source: 'websites_table' | 'api_fresh' | 'airtable_metadata' | 'not_available';
    // From airtable_metadata if available
    airtableData?: {
      dr?: number;
      traffic?: number;
      price?: number;
      lastSynced?: string;
    };
  };
  
  // Real-time pricing
  pricing: {
    guestPost: number | null;      // Current price in cents
    linkInsertion: number | null;
    turnaroundDays: number | null;
    source: 'publisher_offering' | 'websites_table' | 'airtable' | 'estimated' | 'not_available';
    confidence: 'exact' | 'estimated' | 'unknown';
    lastUpdated: string;
  };
  
  // Content workflow status
  workflow: {
    hasWorkflow: boolean;
    workflowId?: string;
    workflowCreatedAt?: string;
    workflowStatus?: 'draft' | 'in_progress' | 'review' | 'completed' | 'published';
    publishedUrl?: string;
  };
  
  // Target URL matching (AI-powered)
  targetMatching: {
    suggestedTargetUrl?: string;
    targetMatchData?: {
      target_analysis: Array<{
        target_url: string;
        match_quality: 'excellent' | 'good' | 'moderate' | 'poor';
        evidence: {
          direct_count: number;
          related_count: number;
        };
        reasoning: string;
      }>;
      best_match?: string;
      match_confidence?: number;
    };
    targetMatchedAt?: string;
  };
  
  // Duplicate handling
  duplicates: {
    isDuplicate: boolean;
    duplicateOf?: string;         // ID of the original domain
    duplicateResolution?: 'keep_both' | 'keep_original' | 'keep_duplicate' | 'merge';
    resolvedBy?: string;
    resolvedAt?: string;
    resolutionMetadata?: any;
  };
  
  // Availability status
  availability: {
    isAvailable: boolean;
    usedInOrders: string[];  // Order IDs where this domain is used
    lastUsedAt: string | null;
    reservedUntil: string | null;
    blockedReason: string | null;
  };
  
  // Usage statistics
  stats: {
    timesSuggested: number;
    timesAccepted: number;
    timesRejected: number;
    lastSuggestedAt: string | null;
    performanceScore: number | null;
    keywordCount: number;          // From keyword_count column
  };
  
  // Audit trail
  audit: {
    createdAt: string;
    updatedAt: string;
    checkedBy?: string;            // Manual check user
    checkedAt?: string;
    notes?: string;                // Internal notes
  };
}
```

## Data Fetching Strategy

### Three-Layer Architecture

#### Layer 1: Database Query
```sql
SELECT 
  -- Core domain data
  bad.id,
  bad.domain,
  bad.normalized_domain,
  bad.client_id,
  bad.project_id,
  bad.project_added_at,
  bad.original_project_id,
  bad.target_page_ids,
  bad.selected_target_page_id,
  
  -- Qualification data
  bad.qualification_status,
  bad.ai_qualification_reasoning,
  bad.topic_scope,
  bad.topic_reasoning,
  bad.authority_direct,
  bad.authority_related,
  bad.overlap_status,
  bad.evidence,
  bad.ai_qualified_at,
  bad.was_manually_qualified,
  bad.manually_qualified_by,
  bad.manually_qualified_at,
  bad.was_human_verified,
  bad.human_verified_by,
  bad.human_verified_at,
  
  -- DataForSEO tracking
  bad.dataforseo_status,
  bad.dataforseo_keywords_found,
  bad.dataforseo_searched_keywords,
  bad.dataforseo_results_count,
  bad.dataforseo_total_api_calls,
  bad.dataforseo_last_analyzed,
  bad.has_dataforseo_results,
  
  -- Workflow tracking
  bad.has_workflow,
  bad.workflow_id,
  bad.workflow_created_at,
  
  -- Target matching
  bad.suggested_target_url,
  bad.target_match_data,
  bad.target_matched_at,
  
  -- Duplicate handling
  bad.duplicate_of,
  bad.duplicate_resolution,
  bad.duplicate_resolved_by,
  bad.duplicate_resolved_at,
  bad.resolution_metadata,
  
  -- Airtable legacy data
  bad.airtable_metadata,
  bad.airtable_last_synced,
  
  -- Audit fields
  bad.keyword_count,
  bad.checked_by,
  bad.checked_at,
  bad.notes,
  bad.created_at,
  bad.updated_at,
  
  -- Website metrics (if available)
  w.domain_rating,
  w.total_traffic,
  w.guest_post_cost,
  w.categories,
  w.niche,
  w.website_type,
  w.updated_at as metrics_updated_at,
  
  -- Publisher offerings (if available)
  po.price_cents as offering_price,
  po.turnaround_days,
  po.type as offering_type,
  
  -- Workflow status (if exists)
  wf.status as workflow_status,
  wf.published_url,
  
  -- Availability check
  CASE 
    WHEN oli.id IS NOT NULL THEN false 
    ELSE true 
  END as is_available,
  
  -- Usage in orders
  ARRAY_AGG(DISTINCT oli.order_id) FILTER (WHERE oli.id IS NOT NULL) as used_in_orders
  
FROM bulk_analysis_domains bad
LEFT JOIN websites w ON bad.normalized_domain = w.domain
LEFT JOIN publisher_offerings po ON w.id = po.website_id AND po.is_active = true
LEFT JOIN workflows wf ON bad.workflow_id = wf.id
LEFT JOIN order_line_items oli ON bad.domain = oli.assigned_domain 
  AND oli.status NOT IN ('cancelled', 'refunded')
  
WHERE bad.client_id = ? 
  AND bad.qualification_status IN ('qualified', 'high_quality')
  
GROUP BY 
  bad.id, w.domain_rating, w.total_traffic, w.guest_post_cost, 
  w.categories, w.niche, w.website_type, w.updated_at,
  po.price_cents, po.turnaround_days, po.type,
  wf.status, wf.published_url
```

#### Layer 2: Cache Check
- Check Redis/memory cache for recent metrics (< 24 hours old)
- Key: `domain_metrics:{normalized_domain}`
- TTL: 24 hours

#### Layer 3: API Enrichment
For domains missing metrics or with stale data:

```typescript
async function enrichDomainMetrics(domains: string[]): Promise<MetricsMap> {
  // Batch domains for efficiency
  const batches = chunk(domains, 10);
  
  for (const batch of batches) {
    // Call DataForSEO or similar API
    const metrics = await fetchMetricsFromAPI(batch);
    
    // Update websites table for future use
    await updateWebsitesTable(metrics);
    
    // Update cache
    await updateMetricsCache(metrics);
  }
  
  return metrics;
}
```

## Availability Tracking

### Real-time Availability Check
```typescript
async function checkDomainAvailability(domainIds: string[]): Promise<AvailabilityMap> {
  // Check current usage in orders
  const used = await db.query(`
    SELECT DISTINCT assigned_domain_id, order_id, status
    FROM order_line_items
    WHERE assigned_domain_id = ANY($1)
      AND status NOT IN ('cancelled', 'refunded')
  `, [domainIds]);
  
  // Check reservations (if implemented)
  const reserved = await db.query(`
    SELECT domain_id, reserved_until
    FROM domain_reservations
    WHERE domain_id = ANY($1)
      AND reserved_until > NOW()
  `, [domainIds]);
  
  return buildAvailabilityMap(used, reserved);
}
```

## Caching Strategy

### Multi-Level Cache
1. **Request Cache** (5 minutes)
   - Cache full API responses for identical queries
   - Key: Hash of query parameters

2. **Domain Metrics Cache** (24 hours)
   - Cache individual domain metrics
   - Key: `domain_metrics:{normalized_domain}`

3. **Qualification Cache** (7 days)
   - Cache qualification data (changes less frequently)
   - Key: `domain_qual:{domain_id}`

## Implementation Phases

### Phase 1: Basic Read-Only API
- Query bulk_analysis_domains
- JOIN with websites for available metrics
- Basic filtering and pagination
- Return what's in database

### Phase 2: Real-time Enrichment
- Add API integration for missing metrics
- Implement caching layer
- Update websites table with fresh data

### Phase 3: Advanced Features
- Reservation system
- Usage tracking
- Performance scoring
- Bulk selection endpoints

## Additional Endpoints

### Domain Selection
```typescript
POST /api/domain-bank/select
Body: {
  domainIds: string[];
  action: 'create_order' | 'add_to_order' | 'reserve';
  orderId?: string;  // If adding to existing
  clientId: string;
}
```

### Refresh Metrics
```typescript
POST /api/domain-bank/refresh-metrics
Body: {
  domainIds: string[];
  force: boolean;  // Skip cache
}
```

### Export Domains
```typescript
GET /api/domain-bank/export
Query: {
  format: 'csv' | 'json' | 'xlsx';
  ...filtering params
}
```

## Error Handling

### Graceful Degradation
- If API enrichment fails → Show database data with warning
- If pricing unavailable → Show "Contact for pricing"
- If metrics stale → Show with "Last updated X days ago" badge

### Rate Limiting
- Implement per-user rate limits for API enrichment
- Queue requests if hitting external API limits
- Return partial results with status indicators

## Security Considerations

### Access Control
```typescript
// Internal users: Full access
if (user.type === 'internal') {
  // Show all domains, all metrics, wholesale prices
}

// External users: Filtered access
if (user.type === 'account') {
  // Only their client's domains
  // Only qualified domains
  // No wholesale prices
  // No internal notes
}
```

### Data Filtering
- Remove sensitive fields for external users
- Validate client ownership before showing data
- Audit log for bulk exports

## Performance Optimizations

### Database
- Indexes on all filter columns
- Materialized view for common queries
- Partition by client_id for large datasets

### API
- Parallel processing for enrichment
- Batch API calls
- Progressive loading (return cached first, enrich async)

### Frontend
- Virtual scrolling for large lists
- Lazy load metrics on demand
- Optimistic UI updates