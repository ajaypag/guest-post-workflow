# WORKFLOWS Website Connection - Implementation Plan

**SCOPE**: WORKFLOWS ONLY - NOT ORDERS  
**Date**: 2025-08-29  
**Status**: Approved and Ready for Implementation  
**What we're building**: Replace manual domain text input in WORKFLOW creation with website selector

---

## ✅ PHASE 1: SYSTEM AUDIT (COMPLETE)
- Found **94 FILES** with domain references (2.1x more than initial 44 estimate)
- Identified major systems: 30 step components, 37 APIs, 12 services, 8 UI components
- Verified workflow snapshots protect existing workflows
- Full file list documented in `COMPLETE_FILE_LIST.md`

---

## 📋 PHASE 2: WORKFLOWS WEBSITE CONNECTION

### ✅ **Step 2.1: Add website_id to WORKFLOWS Table** (COMPLETE - 2025-08-29)
```sql
-- THIS IS FOR WORKFLOWS, NOT ORDERS
ALTER TABLE workflows 
ADD COLUMN website_id UUID REFERENCES websites(id);
```
- ✅ Added to **workflows** table (NOT orders table)
- ✅ Direct foreign key to websites table
- ✅ Migration 0078 applied successfully
- ✅ Schema updated in lib/db/schema.ts
- ✅ Required for NEW workflows only (existing workflows protected by snapshots)

### ✅ **Step 2.2: WebsiteSelector Component for WORKFLOW Creation** (COMPLETE - 2025-08-29)
```typescript
<WebsiteSelector
  websites={websites}  // 956 websites via API
  onSelect={(website) => {
    onChange({
      websiteId: website.id,
      domain: website.domain,
      websiteData: website  // Cache for UI display
    });
  }}
/>
```
- ✅ Created components/ui/WebsiteSelector.tsx
- ✅ Search by name, domain, company, or category
- ✅ Display website metadata (DA, traffic, categories, quality)
- ✅ No manual entry (enforcing data integrity)
- ✅ Rich UI with loading states and empty states

### ✅ **Step 2.3: API Endpoint Created** (COMPLETE - 2025-08-29)
- ✅ Created `/api/websites/workflow-selector/route.ts`
- ✅ Returns all websites with guest post capability
- ✅ Cached responses for performance (10 min cache)
- ✅ Ordered by quality and domain rating

### ✅ **Step 2.4: Update WORKFLOW Domain Selection Step** (COMPLETE - 2025-08-29)
- ✅ Updated `DomainSelectionStepClean.tsx` (WORKFLOW step component)
- ✅ Replaced manual text input with `WebsiteSelector`
- ✅ Stores `website_id`, `domain`, and `websiteData` in outputs
- ✅ Backward compatible - accepts either websiteId or domain
- ✅ This is step 0 of WORKFLOW creation process

### 🔄 **Step 2.5: Update Database Services** (IN PROGRESS)
- Need to update workflowService.ts to handle website_id
- Add website JOINs to workflow queries
- Maintain backward compatibility for existing workflows

---

## 🔧 PHASE 3: UPDATE ALL 94 WORKFLOW DOMAIN REFERENCES

### **Step 3.1: Update 30 Workflow Step Components**
**See `COMPLETE_FILE_LIST.md` for all 30 files**

Includes:
- 2 Domain Selection steps (primary update location)
- 28 steps that read `domainSelectionStep.outputs.domain`
- All Clean and Legacy versions
- Publisher steps, Link steps, Content steps, etc.

**Update Pattern for Each Step**:
```typescript
// OLD CODE (what exists now)
const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
const guestPostSite = domainSelectionStep?.outputs?.domain || '[Guest Post Site]';

// NEW CODE WITH FALLBACK
const domainSelectionStep = workflow.steps.find(s => s.id === 'domain-selection');
const websiteId = domainSelectionStep?.outputs?.websiteId;
const domain = domainSelectionStep?.outputs?.domain; // Fallback

let guestPostSite = domain || '[Guest Post Site]'; 
let websiteData = null;

if (websiteId) {
  // NEW: Get rich website data
  const website = await getWebsite(websiteId);
  guestPostSite = website.name || website.domain;
  websiteData = website; // DA, traffic, publisher info, etc.
} else {
  // LEGACY: Use domain string
  console.log('Using legacy domain:', domain);
}
```

### **Step 3.2: Update 12 Backend Services**
**See `COMPLETE_FILE_LIST.md` for all 12 files**

Includes:
- 5 Core workflow services
- 7 AI agent services (semantic audit, article generation, etc.)
- All need website connection updates

### **Step 3.3: Update 8 UI/Dashboard Components**
**See `COMPLETE_FILE_LIST.md` for all 8 files**

Key updates:
- **WorkflowListEnhanced.tsx** (Line 673 - critical dashboard display)
- Workflow display pages
- Order integration components
- Migration pages

### **Step 3.4: Update 37 API Endpoints**
**See `COMPLETE_FILE_LIST.md` for all 37 files**

Categories:
- 8 Core workflow APIs
- 9 AI generation APIs
- 14 Content processing APIs
- 2 Link processing APIs
- 4 Other/utility APIs

**API Response Enhancement**:
```typescript
// Add website data to API responses
{
  ...workflow,
  targetDomain: workflow.targetDomain, // Keep for compatibility
  website: workflow.website_id ? {
    id: workflow.website_id,
    name: website.name,
    domain: website.domain,
    domainAuthority: website.domainAuthority,
    monthlyTraffic: website.monthlyTraffic
  } : null
}
```

---

## 🔍 PHASE 4: INVESTIGATE & PLAN

### **Step 4.1: Understand How ORDERS Connect to Websites**
**Current State**: ORDERS use bulk analysis (separate from workflows)
- Orders → OrderLineItems → `assignedDomainId` → BulkAnalysisDomains
- This is NOT what we're building (we're doing workflows)
- May need future reconciliation

### **Step 4.2: Publisher Contact Investigation**
**Two workflow steps that will eventually need publisher info**:
1. **PublisherPreApprovalStep** - Currently manual entry
2. **PublicationOutreachStep** - Gets from pre-approval
**Status**: Deferred until offering selection implemented

---

## 🎯 PHASE 5: OFFERING INTEGRATION (DEFERRED)

### **Planning Required Before Implementation**:
1. Map all pricing dependencies in order system
2. Understand impact on existing price fields
3. Design offering selection UI
4. Plan price immutability system
5. Design publisher contact integration

### **Gradual Implementation Approach**:
- First: Get website connection working (Phases 2-3)
- Then: Plan offering selection carefully
- Finally: Implement with full understanding of impacts

---

## 🎨 PHASE 6: UI/UX ENHANCEMENTS

### **Dashboard Enrichment**:
- Website badges with DA scores
- Traffic indicators
- Publisher info display
- Category tags

### **Advanced Filtering**:
- Filter workflows by website
- Filter by DA range
- Filter by traffic volume
- Search by website name

---

## 🚀 PHASE 7: WEBSITE MANAGEMENT (DEFERRED)

### **Add Website Wizard**
- When website not found in selector
- Repackage existing `/internal/websites/new` as inline wizard
- **Status**: Awaiting your specific guidance

---

## 📊 SUMMARY: WHAT WE'RE ACTUALLY BUILDING

### **Core Implementation (Phases 2-3)**:
1. Add `website_id` to WORKFLOWS table
2. Build WebsiteSelector component
3. Update ALL 94 FILES that reference workflow domains:
   - 30 workflow step components
   - 12 backend services
   - 8 UI display components
   - 37 API endpoints
   - 7 database/utility files

### **This is the ACTUAL WORK**:
- **Phase 2**: Build the connection (1 week)
- **Phase 3**: Update 94 FILES (2-3 weeks) ← MASSIVE UNDERTAKING
- **Phase 4+**: Future enhancements

**Full file list**: See `COMPLETE_FILE_LIST.md` for every single file path

---

## ✅ SUCCESS CRITERIA

- [ ] Website selector working for new workflows
- [ ] All 30 workflow steps updated with fallbacks
- [ ] All 12 backend services handle website connections
- [ ] Dashboard shows website names instead of domains
- [ ] APIs return website metadata
- [ ] Existing workflows completely unaffected
- [ ] No manual domain entry (data integrity enforced)

---

## 🎯 NEXT ACTION

Begin Phase 2:
1. Create database migration
2. Build WebsiteSelector component
3. Update DomainSelectionStepClean
4. Then move to Phase 3: UPDATE ALL 94 FILES (see COMPLETE_FILE_LIST.md)