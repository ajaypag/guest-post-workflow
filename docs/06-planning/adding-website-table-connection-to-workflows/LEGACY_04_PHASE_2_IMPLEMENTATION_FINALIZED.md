# Phase 2 Implementation Plan - FINALIZED

**Date**: 2025-08-29  
**Status**: Ready for Implementation  
**Approach**: Core functionality first, wizard deferred to final phase

---

## 📋 PHASE 2 CORE IMPLEMENTATION

### **Step 2.1: Add Database Column**
**Action**: Add `website_id` column to workflows table
```sql
ALTER TABLE workflows ADD COLUMN website_id UUID REFERENCES websites(id);
```
- **Type**: Direct foreign key (following `targetPageId` pattern)
- **Requirement**: Required for NEW workflows (enforces data integrity)
- **Migration**: Safe - existing workflows unaffected

### **Step 2.2: Build WebsiteSelector Component**
**Action**: Create searchable dropdown component
```typescript
<WebsiteSelector
  websites={websites}  // 956 websites from database
  onSelect={(website) => {
    // Set both for compatibility
    onChange({
      websiteId: website.id,      // NEW: UUID connection
      domain: website.domain,      // LEGACY: backward compatibility
      websiteData: website         // CACHE: metadata
    })
  }}
/>
```

**Features**:
- Search/filter 956 websites
- Display: Name, domain, DA, traffic, publisher, price
- Clean dropdown UI matching existing patterns
- **NO manual entry** (enforcing data integrity)

### **Step 2.3: Update Domain Selection Step**
**Action**: Replace text input in `DomainSelectionStepClean.tsx`
- Remove `SavedField` text input
- Add `WebsiteSelector` component
- Update data structure to include `websiteId`
- Populate workflow's `website_id` column on save

### **Step 2.4: Update Critical Systems**

#### **Dashboard** (`WorkflowListEnhanced.tsx`):
```typescript
// Line 673 - Update display
<p className="text-gray-900 font-medium">
  {workflow.website?.name || workflow.targetDomain || 'Not selected'}
</p>
```

#### **API Endpoints**:
```typescript
// Enhanced response with website data
{
  targetDomain: workflow.targetDomain,  // Keep for compatibility
  website: workflow.website ? {
    id: workflow.website.id,
    name: workflow.website.name,
    domainAuthority: workflow.website.domainAuthority,
    // ... other metadata
  } : null
}
```

---

## 🚫 DEFERRED TO FINAL PHASE

### **"Add Website" Wizard**
- **When**: User searches for website not in system
- **Solution**: Repackage existing `/internal/websites/new` functionality
- **Implementation**: Modal/wizard within workflow context
- **Components**: Website info → Publisher → Offering (all required)
- **Timeline**: Will implement based on your specific guidance in final phase

**For Now**: If website not found → Show message "Please contact admin to add this website"

---

## ✅ SUCCESS CRITERIA FOR PHASE 2

- [ ] `website_id` column added to workflows table
- [ ] WebsiteSelector component working with 956 websites
- [ ] Domain selection step using new component
- [ ] Dashboard showing website names for new workflows
- [ ] APIs returning website metadata when available
- [ ] Data integrity enforced (no orphan domains)
- [ ] Existing workflows unaffected

---

## 🎯 NEXT STEPS

**Ready to proceed with**:
1. Database migration (add column)
2. WebsiteSelector component development
3. Integration with domain selection step
4. System updates (dashboard, APIs)

**Waiting for your guidance on**:
- Add Website wizard (deferred to final phase)

---

Is this plan approved? Should I proceed to the next phase explanation?