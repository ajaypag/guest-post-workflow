# Vetted Sites Request Fulfillment - Implementation Research

## Current Requirements from User Feedback

### Core Functionality Needed
Based on user feedback for `/internal/vetted-sites/requests/[id]` page:

1. **Confirm Request Action** - Similar to order confirmation
2. **Target URL Data Validation**
   - Check if target URLs have keyword data
   - Check if target URLs have description data
   - Determine which brand/client each URL belongs to
3. **Generate Missing Data** - If keywords/descriptions missing, provide button to generate
4. **Create Bulk Analysis Projects** - One project per brand/client in the request
5. **Link Projects to Request** - Show created projects with links on the request detail page

## Research Tasks

### TASK 1: Study Order Confirmation Pattern
**File to research**: `/app/orders/[id]/internal/page.tsx`

#### What to extract:
1. How `confirmOrder` function works
2. How it checks target page statuses (`checkTargetPageStatuses`)
3. How it generates keywords for pages (`generateKeywordsForSelected`)
4. How it creates bulk analysis projects (number based on clients/brands)
5. How it tracks which projects were created
6. UI patterns for showing progress/status

#### Key code sections to study:
- `handleConfirmOrder` function
- `checkTargetPageStatuses` function  
- `generateKeywordsForSelected` function
- Target page status display UI
- Project creation and linking logic

### TASK 2: Study Bulk Analysis Project Creation
**File to research**: `/app/api/orders/[id]/confirm/route.ts`

#### What to extract:
1. How projects are created per client
2. How target pages are linked to projects
3. How keywords are used for auto-apply
4. How the project naming works
5. How to track project creation back to source (order/request)

#### Key patterns:
- One project per unique client/brand
- Project naming convention
- Target page ID collection
- Tags and metadata for tracking

### TASK 3: Study Target Page Management
**Files to research**: 
- `/app/api/target-pages/[id]/route.ts`
- `/app/api/target-pages/[id]/generate-keywords/route.ts`
- `/lib/services/keywordGenerationService.ts`

#### What to extract:
1. How target pages are fetched by URL
2. How to check if keywords/descriptions exist
3. How keyword generation works
4. How to create target pages if they don't exist
5. Client association logic

### TASK 4: Study Client/Brand Detection
**Files to research**:
- `/lib/db/clientService.ts`
- `/app/api/clients/route.ts`

#### What to extract:
1. How to parse domain from URL
2. How to find or create clients
3. How to handle multiple brands in one request
4. Duplicate detection logic

### TASK 5: Study UI Components
**Files to research**:
- `/components/orders/TargetPageSelector.tsx`
- `/components/orders/ChangeBulkAnalysisProject.tsx`

#### What to extract:
1. How target page status is displayed
2. How missing data warnings are shown
3. How project links are displayed
4. Progress indicators and loading states

## Implementation Plan

### Phase 1: Data Architecture
1. Add fields to track project creation in vetted_sites_requests
2. Create junction tables for request → projects relationship
3. Add tracking for target page statuses

### Phase 2: Target URL Processing
1. Parse target URLs to identify brands/clients
2. Check or create target pages in database
3. Validate keyword and description data exists
4. Group by client for project creation

### Phase 3: Project Creation Flow
1. Add "Confirm Request" button (only for approved requests)
2. Check all target pages have required data
3. If missing, show "Generate Keywords" button
4. Once ready, create one project per brand
5. Link projects back to request

### Phase 4: UI Updates
1. Show target URL status checklist
2. Display generated projects with links
3. Add progress indicators during processing
4. Show completion status

## Key Differences from Orders

### Orders System:
- Line items already have assigned clients
- Target pages pre-exist from order creation
- Projects created on order confirmation
- One project per order group

### Vetted Sites Requests:
- Target URLs need client assignment
- Target pages may not exist yet
- Projects created after approval + data validation
- One project per unique brand/domain

## Required API Endpoints

### New Endpoints Needed:
```typescript
// Check target page statuses for a request
GET /api/vetted-sites/requests/[id]/target-status

// Generate keywords for request target pages  
POST /api/vetted-sites/requests/[id]/generate-keywords

// Create projects from approved request
POST /api/vetted-sites/requests/[id]/create-projects

// Link existing project to request
POST /api/vetted-sites/requests/[id]/link-project
```

### Existing Endpoints to Reuse:
```typescript
// Target page management
GET  /api/target-pages/by-url?url=
POST /api/target-pages/[id]/generate-keywords
POST /api/target-pages/[id]/generate-description

// Client management  
GET  /api/clients
POST /api/clients

// Bulk analysis projects
POST /api/bulk-analysis/projects
```

## Database Schema Updates

### Add to vetted_sites_requests:
```sql
ALTER TABLE vetted_sites_requests ADD COLUMN
  confirmed_at TIMESTAMP,
  confirmed_by UUID REFERENCES users(id),
  projects_created INTEGER DEFAULT 0,
  target_pages_checked BOOLEAN DEFAULT FALSE;
```

### New junction table:
```sql
CREATE TABLE vetted_request_projects (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES vetted_sites_requests(id),
  project_id UUID REFERENCES bulk_analysis_projects(id),
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Success Criteria

1. ✅ Internal user can see target URL status (has keywords/description)
2. ✅ Can generate missing keywords with one click
3. ✅ Can create projects after data validation
4. ✅ Projects are properly linked to request
5. ✅ Can navigate to created projects
6. ✅ Request status updates to "fulfilled" after project creation

## Next Steps

1. Research the identified files thoroughly
2. Create detailed implementation plan based on findings
3. Build incrementally following the orders pattern
4. Test each component before moving to next
5. Ensure proper error handling and loading states