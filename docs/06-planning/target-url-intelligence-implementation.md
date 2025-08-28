# Target URL Intelligence Implementation Plan

## Overview
Extension of the Brand Intelligence system to create specific briefs for individual target URLs, allowing more granular and relevant content generation for large businesses with multiple products/services.

## Current State Analysis

### Existing Brand Intelligence System
- **Purpose**: Creates comprehensive brand brief for entire business
- **Process**: 3-phase (Research → Client Input → Brief Generation)
- **Seed URL**: Client's main website
- **Storage**: `client_brand_intelligence` table
- **Integration**: Currently NOT integrated in workflow (will be implemented as part of this work)

### Problem to Solve
Large businesses with many products/services need specific intelligence for different target pages, not just generic brand-level information.

## Implementation Strategy

### Core Concept
**Literally copy the Brand Intelligence system but seed with target URL instead of main website**

Key changes:
1. **Seed URL**: Use `targetPage.url` instead of `client.website`
2. **Research Prompt**: Focus on "this specific product/service page" instead of "this business"
3. **Storage**: Per target page instead of per client
4. **Hierarchy**: Target URL Intelligence > Brand Intelligence > None

## Phase 1: Database Infrastructure

### New Table Schema
```sql
-- Migration: 0073_target_page_intelligence.sql
CREATE TABLE target_page_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES target_pages(id) ON DELETE CASCADE,
  
  -- Research phase (identical to brand intelligence)
  research_session_id VARCHAR(255),
  research_status VARCHAR(50) NOT NULL DEFAULT 'idle',
  research_started_at TIMESTAMP,
  research_completed_at TIMESTAMP,
  research_output JSONB, -- Same structure as brand intelligence
  
  -- Client input phase
  client_input TEXT,
  client_input_at TIMESTAMP,
  
  -- Brief generation phase
  brief_session_id VARCHAR(255),
  brief_status VARCHAR(50) NOT NULL DEFAULT 'idle',
  brief_generated_at TIMESTAMP,
  final_brief TEXT,
  
  -- Metadata
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(target_page_id) -- One intelligence per target page
);

-- Indexes for performance (same as brand intelligence)
CREATE INDEX idx_target_page_intelligence_client_id ON target_page_intelligence(client_id);
CREATE INDEX idx_target_page_intelligence_target_page_id ON target_page_intelligence(target_page_id);
CREATE INDEX idx_target_page_intelligence_research_status ON target_page_intelligence(research_status);
CREATE INDEX idx_target_page_intelligence_brief_status ON target_page_intelligence(brief_status);
```

### Files to Create
1. `/lib/db/targetPageIntelligenceSchema.ts` - Database schema definition
2. `/migrations/0073_target_page_intelligence.sql` - Database migration

## Phase 2: Backend Services

### Service Class
**File**: `/lib/services/targetPageIntelligenceService.ts`

Copy `brandIntelligenceService.ts` with MINIMAL modifications:
```typescript
// Change research prompt from:
const researchPrompt = `
You're a researcher tasked with researching everything about this business...
Website: ${clientWebsite}
`;

// To (minimal change - just focus on specific page instead of business):
const researchPrompt = `
You're a researcher tasked with researching everything about this specific product/service. You're empowered to look at the target page and related pages on the same site to understand the specific offering comprehensively.

The purpose of your task is to build a comprehensive overview of this specific product/service so that as we write content, we'll have full knowledge about this particular offering.

You have two tasks:
1. Create the analysis and document it
2. Find the gaps in your analysis - things that should be available about this product/service that you weren't able to find

Target URL: ${targetUrl}
`;
```

Note: Keep the rest of the prompt structure IDENTICAL to brand intelligence (same JSON output format, etc.)

### API Routes
Create folder: `/app/api/target-pages/[id]/intelligence/`

Routes to create (exact copies from brand intelligence):
- `latest/route.ts` - Get existing intelligence
- `start-research/route.ts` - Initiate research
- `submit-input/route.ts` - Submit client input
- `generate-brief/route.ts` - Generate final brief
- `status/route.ts` - Check status
- `brief/route.ts` - PATCH endpoint for editing brief (same as brand)

## Phase 3: UI Components

### Component Structure
**File**: `/components/ui/TargetPageIntelligenceGenerator.tsx`

Copy `BrandIntelligenceGenerator.tsx` with prop changes:
```typescript
interface TargetPageIntelligenceGeneratorProps {
  targetPageId: string;  // Instead of clientId
  targetUrl: string;     // For display
  clientId: string;      // Still needed for context
  onComplete?: (brief: string) => void;
  userType?: string;
}
```

## Phase 4: UI Integration Points

### 1. Brand & Content Tab (`/app/clients/[id]/page.tsx`)

Add new card after Brand Intelligence card:
```typescript
{/* Target Page Intelligence Card - Place after Brand Intelligence */}
<div className="bg-white rounded-lg shadow">
  <div className="p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Page Intelligence</h3>
        <p className="text-gray-600 text-sm">
          Deep research and briefs for specific product/service pages
        </p>
      </div>
      {targetPageIntelligences.length > 0 && (
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          {targetPageIntelligences.length} briefs
        </span>
      )}
    </div>
    
    {/* List of pages with intelligence */}
    {targetPageIntelligences.length > 0 && (
      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {targetPageIntelligences.map(intel => (
          <div key={intel.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{intel.targetUrl}</preference>
              <p className="text-xs text-gray-500">Generated {formatDate(intel.createdAt)}</p>
            </div>
            <Link
              href={`/clients/${clientId}/target-page-intelligence/${intel.targetPageId}`}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View Brief
            </Link>
          </div>
        ))}
      </div>
    )}
    
    {/* Generate new button */}
    <button
      onClick={() => setShowTargetPageSelector(true)}
      className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center"
    >
      <Plus className="w-4 h-4 mr-2" />
      Generate for Target Page
    </button>
  </div>
</div>

{/* Target Page Selector Modal */}
{showTargetPageSelector && (
  <TargetPageSelectorModal
    clientId={clientId}
    targetPages={targetPages}
    onSelect={(targetPageId) => {
      router.push(`/clients/${clientId}/target-page-intelligence/${targetPageId}`);
    }}
    onClose={() => setShowTargetPageSelector(false)}
  />
)}
```

### 2. Target Pages Tab (`/app/clients/[id]/page.tsx`)

Add Intelligence as third section alongside Keywords and Description:
```typescript
{/* Inside each target page card, after Description Section */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* Keywords Section - existing */}
  <div className="space-y-2">
    {/* ... existing keywords code ... */}
  </div>

  {/* Description Section - existing */}
  <div className="space-y-2">
    {/* ... existing description code ... */}
  </div>

  {/* Intelligence Section - NEW */}
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Intelligence</h4>
    </div>
    <div className="min-h-[60px] flex items-center justify-center">
      {page.hasIntelligence ? (
        <div className="w-full">
          <Link
            href={`/clients/${client.id}/target-page-intelligence/${page.id}`}
            className="block w-full px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors text-center"
          >
            View Brief
          </Link>
          <p className="text-xs text-gray-500 text-center mt-1">
            Last updated {formatDate(page.intelligenceUpdatedAt)}
          </p>
        </div>
      ) : (
        <Link
          href={`/clients/${client.id}/target-page-intelligence/${page.id}`}
          className="block w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors text-center"
        >
          Generate Intelligence
        </Link>
      )}
    </div>
  </div>
</div>
```

### 3. URL Structure

Following the established pattern:
- **Brand Intelligence**: `/clients/[id]/brand-intelligence` (existing)
- **Target Page Intelligence**: `/clients/[id]/target-page-intelligence/[targetPageId]` (new)

### 4. New Page Component

Create `/app/clients/[id]/target-page-intelligence/[targetPageId]/page.tsx`:
```typescript
export default function TargetPageIntelligencePage() {
  const params = useParams();
  const clientId = params.id as string;
  const targetPageId = params.targetPageId as string;
  
  // Similar structure to brand-intelligence/page.tsx
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back navigation */}
          <Link
            href={`/clients/${clientId}?tab=brand`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Client
          </Link>
          
          {/* Main content */}
          <TargetPageIntelligenceGenerator
            clientId={clientId}
            targetPageId={targetPageId}
            userType={userType}
          />
        </div>
      </div>
    </AuthWrapper>
  );
}
```

## Phase 5: Workflow Integration

### DeepResearchStepClean.tsx Updates

```typescript
// Add state for both brand and target intelligence
const [brandIntelligence, setBrandIntelligence] = useState<string>('');
const [targetPageIntelligence, setTargetPageIntelligence] = useState<string>('');
const [intelligenceType, setIntelligenceType] = useState<'none' | 'brand' | 'target'>('none');

// Load intelligence with proper hierarchy
useEffect(() => {
  const loadIntelligence = async () => {
    // 1. Check for target page in workflow metadata (siteSelectionId is the field used)
    const targetPageId = workflow.metadata?.siteSelectionId;
    
    if (targetPageId) {
      // Try to load target URL intelligence
      const targetResponse = await fetch(`/api/target-pages/${targetPageId}/intelligence/latest`);
      if (targetResponse.ok) {
        const targetData = await targetResponse.json();
        if (targetData.session?.finalBrief) {
          intelligenceContent = targetData.session.finalBrief;
          intelligenceType = 'target';
        }
      }
    }
    
    // 2. Fall back to brand intelligence if no target URL intelligence
    if (!intelligenceContent && workflow.metadata?.clientId) {
      const brandResponse = await fetch(`/api/clients/${workflow.metadata.clientId}/brand-intelligence/latest`);
      if (brandResponse.ok) {
        const brandData = await brandResponse.json();
        if (brandData.session?.finalBrief) {
          intelligenceContent = brandData.session.finalBrief;
          intelligenceType = 'brand';
        }
      }
    }
    
    setIntelligence(intelligenceContent);
    setIntelligenceType(intelligenceType);
  };
  
  loadIntelligence();
}, [workflow.metadata]);

// Update prompt generation
const outlinePrompt = researchPreferences && applyPreferences 
  ? baseOutlinePrompt + generateOutlineEnhancement(
      researchPreferences, 
      workflow.metadata?.targetPageUrl,
      intelligence // Will use target URL intelligence if available, brand if not
    )
  : baseOutlinePrompt;
```

### UI Indicators in Workflow
```typescript
{/* Show which intelligence is being used */}
{intelligenceType === 'target' && (
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
    <p className="text-sm font-medium text-purple-900">
      🎯 Using Target URL Intelligence for this specific page
    </p>
  </div>
)}

{intelligenceType === 'brand' && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
    <p className="text-sm font-medium text-blue-900">
      🏢 Using Brand Intelligence (no target URL brief available)
    </p>
  </div>
)}
```

## Phase 6: Implementation Order

### Step 1: Backend Foundation (Day 1)
1. Create database migration
2. Create schema file
3. Copy and adapt service class
4. Create API routes

### Step 2: UI Components (Day 2)
1. Copy and adapt TargetUrlIntelligenceGenerator component
2. Add to Brand & Content tab
3. Add to Target Pages tab
4. Create modal for target URL selection

### Step 3: Integration (Day 3)
1. Update DeepResearchStepClean.tsx
2. Test hierarchy (target > brand > none)
3. Add loading states and error handling
4. Test with real workflows

## Phase 7: Testing Strategy

### Test Scenarios
1. **No Intelligence**: Workflow with no brand or target intelligence
2. **Brand Only**: Workflow with brand intelligence but no target
3. **Target Only**: Workflow with target intelligence but no brand
4. **Both Available**: Verify target takes priority
5. **Error Cases**: Failed API calls, incomplete briefs

### Test Workflows
- Use existing workflow: `8f4669aa-4aef-4cfe-9ccf-2118387ea2af`
- Client: Vanta (`156d153f-59d0-49e6-8b41-884445511c8d`)
- Create test target pages with different intelligence states

## Technical Decisions

### Why Copy Instead of Abstraction?
1. **Simplicity**: Easier to maintain separate systems
2. **Flexibility**: Can diverge features in future
3. **Speed**: Faster to implement
4. **Independence**: Changes to one don't affect other

### Data Structure Decisions
1. **One intelligence per target page**: Simpler than versioning
2. **JSONB for research output**: Flexible schema
3. **Same 3-phase process**: Familiar UX
4. **Separate tables**: Clear separation of concerns

## Future Enhancements (Not Phase 1)

1. **Inheritance System**: Target briefs could inherit from brand brief
2. **Versioning**: Multiple briefs per target page
3. **Comparison View**: See brand vs target intelligence side by side
4. **Bulk Generation**: Generate for multiple target URLs at once
5. **Auto-refresh**: Periodic updates to intelligence
6. **Template System**: Different brief templates for different page types

## Migration Considerations

### Database Migration Order
1. Run migration to create table
2. No data migration needed (new feature)
3. Add feature flag if gradual rollout needed

### Backward Compatibility
- All existing workflows continue to work
- Brand intelligence remains unchanged
- New intelligence is additive, not breaking

## Success Metrics

1. **Adoption**: % of workflows using target URL intelligence
2. **Quality**: Improved outline relevance scores
3. **Efficiency**: Time saved in content creation
4. **Coverage**: % of target pages with intelligence

## Notes & Reminders

- Keep research prompts focused on SPECIFIC page, not entire site
- Maintain same 3-phase UX for consistency
- Always show which intelligence type is being used
- Test with large businesses that have diverse products
- Consider rate limits for API calls (multiple target URLs)

## Status Tracking

- [x] Database migration created (0073_target_page_intelligence.sql) ✅
- [x] Schema file created (targetPageIntelligenceSchema.ts) ✅
- [x] Service class adapted (targetPageIntelligenceService.ts) ✅
- [x] API routes created (/api/target-pages/[id]/intelligence/*) ✅
- [x] UI component created (TargetPageIntelligenceGenerator.tsx) ✅
- [x] Target Page Intelligence page created (/app/clients/[id]/target-page-intelligence/[targetPageId]/page.tsx) ✅
- [x] Brand tab integration (new card below Brand Intelligence) ✅
- [x] Pages tab integration (third section with Keywords/Description) ✅
- [x] Workflow integration (both brand and target intelligence) ✅
- [x] Full TypeScript compilation passing ✅
- [x] All 47 implementation tasks completed ✅

## Implementation Summary

### What We're Building
1. **Exact copy of Brand Intelligence** but for individual target pages
2. **Minimal changes**: Just the seed URL and research prompt focus
3. **Same 3-phase process**: Research → Input → Brief
4. **Proper UI integration**: Following established patterns, not random buttons
5. **Smart hierarchy in workflows**: Target Page > Brand > None

### Key URLs
- Brand Intelligence: `/clients/[id]/brand-intelligence`
- Target Page Intelligence: `/clients/[id]/target-page-intelligence/[targetPageId]`

### Main Files to Create
1. Database: `0073_target_page_intelligence.sql`
2. Schema: `/lib/db/targetPageIntelligenceSchema.ts`
3. Service: `/lib/services/targetPageIntelligenceService.ts`
4. Component: `/components/ui/TargetPageIntelligenceGenerator.tsx`
5. Page: `/app/clients/[id]/target-page-intelligence/[targetPageId]/page.tsx`
6. API folder: `/app/api/target-pages/[id]/intelligence/`

Last Updated: 2025-08-27