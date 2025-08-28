# Outline Preferences Implementation Checklist

**Created**: 2025-01-26  
**Updated**: 2025-01-26 (UI COMPLETE)
**Status**: 75% Complete (UI done, workflow integration pending)
**Risk Level**: LOW (simplified to just a text string)  
**Technical Debt Awareness**: HIGH - Multiple hacky implementations exist

## 🔍 Research Summary

### Existing Pattern Analysis
The codebase already has a **keyword preferences** system that we'll mirror:

1. **Storage Location**: `clients.description` field (HACKY - stores as `KEYWORD_PREFS:{json}`)
2. **Type Definitions**: `/types/keywordPreferences.ts`
3. **Integration Point**: `TopicGenerationImproved.tsx` line ~340
4. **Enhancement Function**: `generatePromptEnhancement()` appends to prompts
5. **JSONB Alternative**: `clients.defaultRequirements` field exists but underutilized

### Technical Debt Identified
- ❌ Keyword preferences stored in description field (text parsing hack)
- ❌ No proper database column for preferences
- ❌ Mixed storage patterns (workflow metadata vs client data)
- ⚠️ Must maintain backward compatibility with existing workflows
- ⚠️ Step components have "Clean" versions that must be used

## 🎯 SIMPLIFIED IMPLEMENTATION

### What We Built
A **simple text field** on clients that gets appended to outline prompts.

```typescript
interface OutlinePreferences {
  enabled?: boolean;
  outlineInstructions?: string;  // Text that gets appended to prompts
}
```

## 📋 Implementation Status

### Phase 1: Foundation ✅ COMPLETED
- [x] **1.1 Create Type Definitions**
  - [x] Created `/types/outlinePreferences.ts`
  - [x] Simple `OutlinePreferences` interface (just enabled + text string)
  - [x] `generateOutlineEnhancement()` function that returns the text
  - [x] Storage utilities using `defaultRequirements` field

### Phase 2: API Endpoints ✅ COMPLETED
- [x] **2.1 Storage Functions**
  - [x] `getClientOutlinePreferences()` reads from defaultRequirements
  - [x] `setClientOutlinePreferences()` saves to defaultRequirements
  - [x] Data persists in `defaultRequirements` JSONB field

- [x] **2.2 API Endpoints**
  - [x] `GET /api/clients/[id]/outline-preferences` - retrieves preferences
  - [x] `PUT /api/clients/[id]/outline-preferences` - saves preferences
  - [x] Auth checks for internal users + account owners

### Phase 3: UI Integration ✅ COMPLETED
- [x] **3.1 Client Edit Form**
  - [x] Added to `/app/clients/page.tsx` edit form
  - [x] "Outline Instructions" textarea after Description field
  - [x] FileText icon in label for visual clarity
  - [x] 2000 character limit with counter
  - [x] Placeholder with examples
  - [x] Loads existing preferences when editing
  - [x] Saves to API on form submit

### Phase 4: Workflow Integration (SIMPLE)
- [ ] **4.1 Update DeepResearchStepClean.tsx**
  - [ ] ⚠️ ONLY edit `DeepResearchStepClean.tsx`, NOT `DeepResearchStep.tsx`
  - [ ] Import `getClientOutlinePreferences`, `generateOutlineEnhancement`
  - [ ] Load client's outline preferences
  - [ ] Add checkbox: "☑️ Apply client outline instructions"
  - [ ] If checked, append instructions to the prompt displayed
  - [ ] Show the instructions in a collapsible section

- [ ] **4.2 Update AI Agent Service**
  - [ ] In `agenticOutlineServiceV2.ts` line ~152
  - [ ] Load client preferences
  - [ ] Append to enhanced prompt if enabled
  - [ ] That's it - just concatenate the text

### Phase 5: Testing & Validation
- [ ] **5.1 Unit Tests**
  - [ ] Test preference storage/retrieval
  - [ ] Test prompt enhancement logic
  - [ ] Test competitor exclusion formatting
  - [ ] Test preference merging (client vs URL-specific)

- [ ] **5.2 Integration Tests**
  - [ ] Test with existing workflows
  - [ ] Test with workflows that have no client
  - [ ] Test with malformed preference data
  - [ ] Test UI toggle functionality
  - [ ] Verify no impact on workflows without preferences

- [ ] **5.3 Manual Testing Checklist**
  - [ ] Create client with outline preferences
  - [ ] Start new workflow for that client
  - [ ] Verify preferences appear in outline step
  - [ ] Toggle preferences on/off
  - [ ] Generate outline with preferences
  - [ ] Verify AI agent receives enhanced prompt
  - [ ] Check database for proper storage

### Phase 6: Migration & Deployment
- [ ] **6.1 Data Migration**
  - [ ] Script to migrate keyword preferences from description to defaultRequirements
  - [ ] Add outline preferences structure to existing clients
  - [ ] Backup existing data before migration

- [ ] **6.2 Feature Flags**
  - [ ] Add `OUTLINE_PREFERENCES_ENABLED` flag
  - [ ] Default to false initially
  - [ ] Gradual rollout plan

- [ ] **6.3 Documentation**
  - [ ] Update CLAUDE.md with new feature
  - [ ] Add user guide for outline preferences
  - [ ] Document API endpoints
  - [ ] Add troubleshooting guide

## ⚠️ Critical Integration Points

### Must NOT Break:
1. **Existing workflows** - All current workflows must continue functioning
2. **Topic generation step** - Keyword preferences must remain intact
3. **Outline generation** - Both manual and AI paths must work
4. **Client data** - No corruption of existing client records
5. **Database queries** - JSONB operations must be PostgreSQL compatible

### Known Hazards:
1. **Step components** - Must use `*Clean.tsx` versions only
2. **VARCHAR limits** - Some fields have 100-char limits (not applicable here)
3. **Auto-save race conditions** - Pass data directly to save functions
4. **Null bytes in AI responses** - Must sanitize with `sanitizeForPostgres()`
5. **Session management** - Outline sessions table has complex state tracking

## 🔧 Implementation Details

### Files Created/Modified

1. **Type Definitions**: `/types/outlinePreferences.ts`
   ```typescript
   interface OutlinePreferences {
     enabled?: boolean;
     outlineInstructions?: string;
     version: 1;
     lastUpdated?: Date;
     updatedBy?: string;
   }
   ```

2. **API Routes**: `/app/api/clients/[id]/outline-preferences/route.ts`
   - GET: Retrieves outline preferences
   - PUT: Saves outline preferences with validation

3. **UI Updates**: `/app/clients/page.tsx`
   - Added outline instructions textarea to edit form
   - Loads preferences on edit
   - Saves preferences on submit

### How It Works

1. **Storage**: Uses `clients.defaultRequirements` JSONB field
   ```json
   {
     "outlinePreferences": {
       "version": 1,
       "enabled": true,
       "outlineInstructions": "Never mention competitors X, Y, Z...",
       "lastUpdated": "2025-01-26T...",
       "updatedBy": "user@email.com"
     }
   }
   ```

2. **UI Flow**:
   - Navigate to `/clients`
   - Click edit (pencil icon) on any client
   - Fill in "Outline Instructions" field
   - Save - automatically updates via API

3. **Access Control**:
   - Internal users: Can edit any client
   - Account users: Can only edit their own clients
   - Publishers: No access

## 📊 Success Criteria

- [ ] Zero regression in existing workflows
- [ ] Preferences properly persist across sessions
- [ ] UI is intuitive and doesn't require documentation
- [ ] Both manual and AI outline generation respect preferences
- [ ] Can be toggled on/off per workflow
- [ ] Graceful handling of missing/invalid preferences
- [ ] No performance degradation
- [ ] Audit trail for preference changes

## 🚀 Rollout Plan

1. **Week 1**: Foundation + Backend (Phase 1-2)
2. **Week 2**: UI Components (Phase 3)
3. **Week 3**: Integration + Testing (Phase 4-5)
4. **Week 4**: Migration + Gradual rollout (Phase 6)

## 📝 Notes

- The keyword preferences system is already hacky (storing in description field)
- We should use `defaultRequirements` JSONB field for better structure
- Must maintain backward compatibility during migration
- Consider creating a proper `client_preferences` table in future
- The outline step has both manual and AI paths - both need enhancement
- AI agent path adds extra instructions (lines 152-161 in service)

## 🔄 Rollback Plan

If issues arise:
1. Feature flag can disable UI immediately
2. Preferences ignored if flag disabled
3. Database fields remain but unused
4. No destructive migrations - all additive

---

**Next Steps**: 
1. Review this checklist with team
2. Get approval on storage approach
3. Begin with Phase 1 type definitions
4. Create feature flag infrastructure