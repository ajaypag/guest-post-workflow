# Bulk Analysis Project/Campaign Refactor Plan

## Current System Analysis

### Database Schema
The current system uses a flat structure where all domains for a client are stored in `bulk_analysis_domains` table without any grouping mechanism.

#### Main Tables:
1. **bulk_analysis_domains** - Core domain storage
   - Direct relationship to client_id
   - Stores qualification status, workflow info, DataForSEO results
   - Human verification tracking
   - AI qualification data

2. **keyword_analysis_results** - DataForSEO keyword rankings
   - Links to bulk_analysis_domain_id
   - Stores position, search volume, URLs
   - Has analysis_batch_id for incremental updates

3. **keyword_search_history** - Tracks all keyword searches (including zero-results)
   - Prevents re-checking keywords with no results
   - Links to bulk_analysis_domain_id

4. **dataforseo_searched_keywords** - Cache tracking
   - Tracks which keywords have been searched per domain
   - Used for API cost optimization

### Current Features Inventory

#### 1. Domain Management
- Add domains via CSV or manual input
- Duplicate detection within client
- Domain qualification (pending/high_quality/average_quality/disqualified)
- Notes and manual qualification

#### 2. Keyword Analysis
- Manual keyword entry per domain
- DataForSEO integration for ranking data
- Smart caching to reduce API costs
- Zero-result detection
- Results count display
- Incremental keyword analysis

#### 3. Qualification Process
- AI qualification with reasoning
- Human verification tracking
- Manual qualification override
- Confirm status buttons for human review
- Qualification status badges

#### 4. Workflow Integration
- Create workflow from qualified domain
- Track workflow creation
- Link to workflow editor

#### 5. UI Features
- Bulk analysis table with pagination
- Expandable rows for detailed view
- Guided review flow
- Keyword tag filtering (toggleable)
- Ahrefs button integration
- Export functionality
- Tutorial/help system

### Components Affected by Project Refactor

#### Frontend Components:
1. `/app/clients/[id]/bulk-analysis/page.tsx` - Main page
2. `/components/BulkAnalysisTable.tsx` - Domain table display
3. `/components/GuidedTriageFlow.tsx` - Guided review interface
4. `/components/BulkAnalysisResultsModal.tsx` - DataForSEO results
5. `/components/BulkAnalysisTutorial.tsx` - Help system

#### API Routes:
1. `/api/clients/[id]/bulk-analysis/route.ts` - GET/POST domains
2. `/api/clients/[id]/bulk-analysis/[domainId]/route.ts` - Update domain
3. `/api/clients/[id]/bulk-analysis/analyze-dataforseo/route.ts` - Keyword analysis
4. `/api/clients/[id]/bulk-analysis/ai-qualify/route.ts` - AI qualification
5. `/api/clients/[id]/bulk-analysis/bulk/route.ts` - Bulk operations
6. `/api/clients/[id]/bulk-analysis/check/route.ts` - Duplicate checking
7. `/api/clients/[id]/bulk-analysis/export/route.ts` - Export data
8. `/api/clients/[id]/bulk-analysis/refresh/route.ts` - Refresh domains

#### Services:
1. `/lib/db/bulkAnalysisService.ts` - Core business logic
2. `/lib/services/dataForSeoService.ts` - DataForSEO integration
3. `/lib/services/dataForSeoCacheService.ts` - Caching logic

#### Database:
1. `/lib/db/bulkAnalysisSchema.ts` - Schema definitions
2. Migration endpoints in `/app/api/admin/`

## Proposed Project-Based Architecture

### New Database Schema

#### 1. New Table: `bulk_analysis_projects`
```sql
CREATE TABLE bulk_analysis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, archived
  
  -- Project-level settings
  default_keywords JSONB DEFAULT '[]', -- Keywords to use for all domains
  location_code INTEGER DEFAULT 2840,
  language_code VARCHAR(10) DEFAULT 'en',
  
  -- Statistics (denormalized for performance)
  total_domains INTEGER DEFAULT 0,
  qualified_domains INTEGER DEFAULT 0,
  disqualified_domains INTEGER DEFAULT 0,
  workflows_created INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  UNIQUE(client_id, name) -- Prevent duplicate project names per client
);
```

#### 2. Update: `bulk_analysis_domains`
Add project reference:
```sql
ALTER TABLE bulk_analysis_domains ADD COLUMN project_id UUID REFERENCES bulk_analysis_projects(id) ON DELETE CASCADE;
ALTER TABLE bulk_analysis_domains ADD COLUMN is_duplicate_from_project UUID REFERENCES bulk_analysis_projects(id);
```

#### 3. New Table: `project_duplicate_tracking`
Track domains that appear in multiple projects:
```sql
CREATE TABLE project_duplicate_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  original_project_id UUID NOT NULL REFERENCES bulk_analysis_projects(id),
  duplicate_project_id UUID NOT NULL REFERENCES bulk_analysis_projects(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(domain, original_project_id, duplicate_project_id)
);
```

### Key Design Decisions

#### 1. Project Isolation vs Sharing
- **Domains**: Each domain belongs to ONE project (no sharing)
- **Keyword Data**: Can be shared across projects for same client
- **Duplicate Handling**: Track but allow duplicates with warning

#### 2. Migration Strategy
- Add project_id as nullable initially
- Create "Default Project" for each client with existing domains
- Gradually migrate features to be project-aware

#### 3. API Structure
Change from:
```
/api/clients/[id]/bulk-analysis/...
```

To:
```
/api/clients/[id]/projects/[projectId]/bulk-analysis/...
```

With backward compatibility layer.

### Implementation Phases

#### Phase 1: Database & Core Infrastructure
1. Create new tables
2. Add project_id to existing tables
3. Create migration for existing data
4. Update schema types

#### Phase 2: API Layer Updates
1. Create project CRUD endpoints
2. Update existing endpoints to be project-aware
3. Add backward compatibility layer
4. Update services to handle project context

#### Phase 3: UI Updates
1. Add project selector/creator
2. Update bulk analysis page to show project context
3. Add project overview/dashboard
4. Update all components to be project-aware

#### Phase 4: Advanced Features
1. Cross-project duplicate detection
2. Project-level analytics
3. Project templates
4. Bulk project operations

### Potential Breaking Points

#### Critical Areas to Test:
1. **DataForSEO Caching** - Ensure cache sharing works across projects
2. **Keyword Search History** - Must work with project context
3. **AI Qualification** - Needs project context for better decisions
4. **Export Functionality** - Must include project info
5. **Workflow Creation** - Should link to project
6. **Duplicate Detection** - Now needs cross-project awareness

#### Data Integrity Concerns:
1. Orphaned domains without projects
2. Cache invalidation across projects
3. Keyword history fragmentation
4. Statistical accuracy with duplicates

### Rollback Plan
1. Keep all existing columns/tables
2. Use feature flags for new UI
3. Dual-write to both schemas initially
4. Test thoroughly before removing old code

### Benefits of Project Organization
1. **Better Organization** - Clear separation of campaigns
2. **Historical Tracking** - See how projects performed over time  
3. **Team Collaboration** - Assign projects to team members
4. **Duplicate Management** - Know when domains appear in multiple projects
5. **Cost Tracking** - API costs per project
6. **Templates** - Reuse successful project configurations

### Next Steps
1. Review and approve this plan
2. Create detailed migration scripts
3. Build project management UI mockups
4. Implement Phase 1 with careful testing
5. Gradual rollout with feature flags