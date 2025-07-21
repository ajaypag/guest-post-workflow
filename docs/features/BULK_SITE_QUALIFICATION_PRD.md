# Bulk Site Qualification PRD

**Feature**: Bulk Guest Post Site Qualification  
**Status**: Planning  
**Created**: 2025-01-21  
**Author**: AI Assistant with User

## Executive Summary

Enable users to qualify large lists of potential guest post sites against client target pages in bulk, reducing the manual effort of one-by-one site qualification while identifying the most relevant opportunities.

## Problem Statement

Current workflow requires users to qualify guest post sites individually, which is:
- Time-consuming for large lists (100+ sites)
- Expensive when checking keyword rankings for thousands of keywords
- Difficult to identify which sites are most relevant to which client pages
- No systematic way to bulk import from existing sources (Airtable)

## Solution Overview

Build a flexible bulk qualification module that:
1. Accepts multiple sites via paste or Airtable import
2. Clusters keywords to reduce API costs
3. Checks relevance against all client target pages
4. Scores and maps sites to most relevant target pages
5. Exports qualified sites back to client portal

## Key Insights & Decisions

### Current State Analysis
- **Keywords**: Stored as strings per target page (not per client)
- **No clustering**: Keywords are comma-separated strings
- **Bulk patterns**: Already exist for keyword generation and status updates
- **Export**: Infrastructure exists for CSV/Excel export

### Topical Clustering Insight
- **Problem**: Clients may have 50+ target pages × 20+ keywords = 1000+ keyword checks
- **Solution**: Cluster keywords by topic, check top terms per cluster
- **Benefit**: 80% cost reduction while maintaining accuracy

### Data Flow Architecture
1. **Input**: Guest post sites (manual or Airtable)
2. **Processing**: Keyword clustering → Ranking checks → Relevance scoring
3. **Output**: Qualified sites mapped to target pages

## User Stories

### Primary User: SEO Manager
- **As an** SEO manager
- **I want to** qualify 100+ guest post sites at once
- **So that I** can quickly identify the best opportunities for each client

### Secondary User: Content Strategist
- **As a** content strategist
- **I want to** see which sites match which target pages
- **So that I** can plan content appropriately

## Technical Requirements

### Data Model Extensions

```typescript
// New: Keyword Clusters
interface KeywordCluster {
  id: string;
  targetPageId: string;
  clusterName: string;
  keywords: string[];
  representativeKeywords: string[]; // Top 3-5 for API checks
  createdAt: Date;
}

// New: Bulk Qualification Job
interface QualificationJob {
  id: string;
  clientId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sites: QualificationSite[];
  settings: {
    checkMethod: 'ahrefs_urls' | 'dataforseo_api';
    minRelevanceScore: number;
    checkDepth: 'representative' | 'all'; // For cost control
  };
  results?: QualificationResults;
  createdAt: Date;
  completedAt?: Date;
}

// New: Site being qualified
interface QualificationSite {
  url: string;
  domain: string;
  source: 'manual' | 'airtable';
  airtableId?: string;
}

// New: Qualification Results
interface QualificationResults {
  qualifiedSites: Array<{
    site: QualificationSite;
    overallScore: number;
    targetPageMatches: Array<{
      targetPageId: string;
      relevanceScore: number;
      matchedClusters: string[];
      topRankings: Array<{
        keyword: string;
        position: number;
      }>;
    }>;
  }>;
}
```

### API Endpoints

```typescript
// Keyword clustering
POST /api/keywords/cluster
  - Auto-cluster keywords for a client's target pages
  - Uses NLP/embeddings to group similar keywords

// Bulk qualification
POST /api/qualification/jobs
  - Create new bulk qualification job
  - Accepts sites list or Airtable query

GET /api/qualification/jobs/:id
  - Check job status and results

// Airtable integration
GET /api/airtable/sites
  - Query available sites from Airtable
  - Filters by status, tags, etc.
```

### Ranking Check Strategy

1. **Clustering Phase**
   - Group keywords by semantic similarity
   - Identify 3-5 representative keywords per cluster
   - Store cluster mappings

2. **Checking Phase**
   - For cost-conscious: Check only representative keywords
   - For thorough: Check all keywords with rate limiting
   - Cache results for 30 days

3. **Scoring Algorithm**
   ```
   relevanceScore = (
     0.4 × topicalMatch +      // Keyword cluster overlap
     0.3 × rankingStrength +   // Average position in SERPs
     0.2 × coverageDepth +     // How many clusters matched
     0.1 × domainAuthority     // Optional DA/DR metric
   )
   ```

## UI/UX Requirements

### Input Screen
```
┌─────────────────────────────────────┐
│ Bulk Site Qualification             │
├─────────────────────────────────────┤
│ Client: [Dropdown]                  │
│                                     │
│ Input Method:                       │
│ ○ Paste URLs (one per line)        │
│ ○ Import from Airtable              │
│                                     │
│ [Paste area / Airtable filters]    │
│                                     │
│ Checking Method:                    │
│ ○ Generate Ahrefs URLs (manual)     │
│ ○ DataForSEO API (automatic)        │
│                                     │
│ Cost Optimization:                  │
│ ○ Check representative keywords     │
│ ○ Check all keywords                │
│                                     │
│ [Start Qualification]               │
└─────────────────────────────────────┘
```

### Results Screen
```
┌─────────────────────────────────────┐
│ Qualification Results               │
├─────────────────────────────────────┤
│ ✓ 37/100 sites qualified           │
│                                     │
│ Top Matches:                        │
│ ┌─────────────────────────────────┐ │
│ │ example.com         Score: 92%  │ │
│ │ Best for: /seo-guide (87%)      │ │
│ │          /keywords (72%)        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Add to Client] [Export] [Details] │
└─────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Keyword Clustering (Week 1)
- [ ] Design clustering algorithm
- [ ] Build cluster management UI
- [ ] Create representative keyword selection

### Phase 2: Basic Bulk Input (Week 2)
- [ ] Manual paste interface
- [ ] Basic relevance scoring
- [ ] Results display

### Phase 3: API Integration (Week 3)
- [ ] DataForSEO integration
- [ ] Airtable connection
- [ ] Progress tracking

### Phase 4: Advanced Features (Week 4)
- [ ] Export to client portal
- [ ] Saved qualification templates
- [ ] Historical tracking

## Success Metrics

1. **Efficiency**: 90% reduction in time to qualify 100 sites
2. **Cost**: 80% reduction in API costs via clustering
3. **Accuracy**: 85% agreement with manual qualification
4. **Adoption**: 50% of users using bulk vs individual

## Open Questions

1. Should we store historical qualification results?
2. How often should keyword clusters be refreshed?
3. Should we integrate with other ranking APIs beyond DataForSEO?
4. What's the minimum relevance score for auto-qualification?

## Next Steps

1. Review PRD with stakeholders
2. Finalize clustering algorithm approach
3. Create detailed technical design
4. Begin Phase 1 implementation