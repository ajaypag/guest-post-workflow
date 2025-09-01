# MASTER PLAN: ManyReach V3 Email Extraction System

## Overview
This is the definitive plan for the ManyReach V3 email parsing system. All previous documents should be considered drafts - this is the source of truth.

## Context & Objectives

### What We're Building
- AI system that extracts publisher information from email trails
- Email trails contain our original outreach + publisher replies
- AI must distinguish between our emails and publisher replies
- Extract only publisher information, ignore our outreach content
- Create draft records for human review before final import

### Key Insight: Email Trail Context
- Dataset includes BOTH our outreach emails AND publisher responses
- AI must be smart about extracting publisher info from replies, not our pitches
- Example: If we sent "Hi, we're LinkIO..." and they replied "We're TechBlog Media...", extract TechBlog Media

## Database Architecture (Current Status)

### Table 1: Publishers (Primary Contact Info) ✅ EXTRACTING
**Purpose**: Core publisher business information and contact details  
**Extract From**: Publisher's reply emails, signatures, business info they provide
**Status**: ✅ Currently extracting all key fields

**Fields Being Extracted**:
- `email` - Publisher's business email (from their reply, not our outreach)
- `contactName` - Person's name (single field, full name)
- `companyName` - Publisher's business name
- `phone` - Publisher's business phone (if they provide it)
- `paymentEmail` - Separate payment email if different from main email
- `paymentMethod` - PayPal, wire, check (if they mention preferred method)
- `internalNotes` - Anything AI thinks internal team should know for review
- `confidenceScore` - AI's confidence in extraction (0.00-1.00)

**System-Managed Fields** (Don't Extract):
- `emailVerified` - System email verification process
- `status` - Always `'pending'` for imports
- `accountStatus` - Always `'shadow'` for email imports  
- `source` - Always `'manyreach'` for this integration
- `createdAt/updatedAt` - System timestamps

**Technical Debt Fields** (Wrong Table - TO BE MIGRATED):
- ❌ `contentGuidelines` → Should be in offerings table
- ❌ `prohibitedTopics` → Should be in offerings table  
- ❌ `turnaroundTime` → Should be in offerings table

### Table 2: Websites (Domain & Properties) ✅ EXTRACTING + ENHANCED
**Purpose**: Website information, metrics, and content restrictions  
**Extract From**: Domains mentioned, website stats, content policies
**Status**: ✅ Extracting with ENHANCED features (multiple selection, suggested niches)

**Fields Being Extracted**:
- `domain` - The website URL (normalized automatically)
- `niche` - Specific topics (array, at least 1 required)
- `categories` - Broad classification (array, at least 1 required)
- `websiteType` - Blog, News, Magazine, etc. (array, at least 1 required)
- `suggestedNewNiches` - ✨ NEW: Niches not in our database (for continuous improvement)
- `restrictions` - Forbidden niches, content requirements, link policies
- `totalTraffic` - Monthly traffic if mentioned
- `domainRating` - DR/DA if mentioned
- `internalNotes` - Any relevant notes

**System-Managed** (Don't extract):
- Metrics (DR, traffic) - populated by other systems
- Status fields - legacy Airtable fields

### Table 3: Publisher Offerings (Services & Pricing) ❌ NOT YET IMPLEMENTED
**Purpose**: Services offered, pricing, requirements, availability  
**Extract From**: Service descriptions, pricing info, content requirements
**Status**: ⚠️ Currently stored in extraction metadata, not as separate table

**Should Extract** (not yet implemented):
- Service type (guest post, link insertion, etc.)
- Base pricing per service
- Turnaround time
- Content requirements
- DoFollow/NoFollow policy
- Word count limits

### Table 4: Pricing Rules (Complex Pricing Logic) ❌ NOT YET IMPLEMENTED
**Purpose**: Bulk discounts, niche surcharges, conditional pricing  
**Extract From**: Complex pricing patterns in emails
**Status**: ⚠️ Basic pricing captured in key quotes, not structured

**Should Extract** (not yet implemented):
- Bulk discount tiers
- Niche-specific surcharges
- Casino/CBD upcharges
- Package deals

### Table 5: Publisher-Website Relationships ❌ NOT YET IMPLEMENTED
**Purpose**: Links publishers to websites they manage  
**Logic**: Many-to-many relationship with offering-specific details
**Status**: ⚠️ Currently stored as array in publisher data, not relational

**Should Create** (not yet implemented):
- Publisher ID → Website ID mappings
- Relationship type (owner, manager, broker)
- Offering-specific details per relationship

## AI Extraction Approach (V3.1 - Single-Phase with Dynamic Metadata)

### ✅ IMPLEMENTED: Single-Phase Extraction (o3-2025-04-16)
Extract publisher information and analyze websites in one pass:
- Publisher contact details (name, email, company)
- Payment information and methods
- Pricing and requirements
- List of domains they manage
- Website categorization using web search
- Distinguish publisher replies from our outreach

### ✅ NEW FEATURES (Implemented 2025-09-01)
1. **Dynamic Metadata Loading**
   - Loads all niches, categories, and website types from database
   - Currently: 84 niches, 18 categories, 10 website types
   - Updates automatically as database evolves
   - No hardcoded lists in prompts

2. **Multiple Selection Support**
   - AI can select MULTIPLE categories per website
   - AI can select MULTIPLE niches per website
   - AI can select MULTIPLE website types per website
   - More accurate categorization

3. **Suggested New Niches Field**
   - New field: `suggestedNewNiches`
   - AI identifies relevant niches not in our database
   - Purple-highlighted in UI for easy identification
   - These should be reviewed and added to database

### Core Principles
1. **Single-phase extraction** - Combined email parsing and website analysis
2. **Dynamic configuration** - No hardcoded lists, pulls from database
3. **Multiple categorization** - Websites can belong to multiple categories/niches
4. **Continuous improvement** - Suggested niches help expand our taxonomy
2. **Real content analysis** - Visit websites instead of guessing
3. **Trust AI reasoning** - Let AI figure out context and mappings
4. **Email trail awareness** - Extract only from publisher replies
5. **Confidence-based** - Provide scores for quality control

### What AI Needs for Each Field
1. **Definition** - What the field represents  
2. **Examples** - Good vs bad examples of data
3. **Constraints** - Required/optional, data types, format requirements
4. **Context** - Business purpose and how it's used
5. **Email trail guidance** - Extract from publisher replies, not our emails

### What AI Doesn't Need
- ❌ Step-by-step extraction priorities
- ❌ Complex confidence scoring formulas  
- ❌ Arbitrary rules about where to look first
- ❌ Over-engineered validation logic

## Dynamic Data Injection Solution

### Problem
Niche, category, and website type lists change frequently as new publishers are added. Hardcoding these lists in extraction prompts becomes outdated quickly.

### Solution: Runtime Prompt Generation
- **Class**: `ManyReachPromptGenerator` queries live database
- **Caching**: 1-hour cache for performance optimization
- **Templates**: Use placeholders like `{{NICHE_LIST}}`, `{{CATEGORY_COUNT}}`
- **Implementation**: `/lib/services/manyreach/promptGenerator.ts`
- **Documentation**: `/docs/06-planning/dynamic-data-injection-solution.md`

### Benefits
1. Always uses current data from database
2. No manual maintenance of lists
3. Simple implementation with caching
4. Can migrate to scheduled generation later if needed

## Technical Debt Cleanup Plan

### Fields in Wrong Tables (To Be Migrated)
```
publishers.contentGuidelines → publisherOfferings.contentGuidelines
publishers.prohibitedTopics → publisherOfferings.prohibitedTopics  
publishers.turnaroundTime → publisherOfferings.turnaroundDays
```

### Migration Strategy
1. **Phase 1**: Build extraction for correct table structure
2. **Phase 2**: Create migration script to move misplaced fields
3. **Phase 3**: Update application code to use correct tables
4. **Phase 4**: Remove fields from wrong tables
5. **Ensure**: No breaking changes to current application during migration

## Implementation Architecture

### Services Created
1. **ManyReachPromptGenerator** (`/lib/services/manyreach/promptGenerator.ts`)
   - Dynamically injects current database values into prompts
   - 1-hour cache for performance
   - Template-based system

2. **WebsiteAnalyzerAgent** (`/lib/services/manyreach/websiteAnalyzerAgent.ts`)
   - Uses o3-mini model with webSearchTool
   - Visits websites to analyze actual content
   - Maps content to standardized lists

3. **ManyReachExtractionServiceV3** (`/lib/services/manyreach/extractionServiceV3.ts`)
   - Phase 1: GPT-4 extracts from emails
   - Phase 2: o3-mini analyzes websites
   - Complete pipeline with error handling

### Implementation Plan

### Step 1: Complete Table Analysis
- [x] Publishers table - fields documented
- [x] Websites table - fields documented with required status
- [ ] PublisherOfferings table - remaining analysis
- [ ] Relationships tables - remaining analysis

### Step 2: Create Clean Extraction Guidelines
- [ ] Publishers table (corrected fields only)
- [ ] Websites table (actual schema)
- [ ] Offerings table (actual schema + migrated fields)
- [ ] Pricing rules table (actual schema)  
- [ ] Relationships table (actual schema)

### Step 3: Build Comprehensive Prompt
- [ ] Combine all table guidelines into single prompt
- [ ] Include email trail context and examples
- [ ] Add confidence scoring and quality flags
- [ ] Test against real email samples

### Step 4: Technical Debt Migration
- [ ] Create migration scripts for misplaced fields
- [ ] Update application code to use correct tables
- [ ] Test thoroughly to ensure no breaking changes
- [ ] Deploy migration safely

## Quality Requirements

### High Confidence Extraction (0.8-1.0)
- Clear business information provided
- Distinguishable publisher reply content
- Complete contact details available
- Specific service/pricing information

### Medium Confidence Extraction (0.5-0.79) 
- Some information unclear or missing
- Mixed email trail context
- Partial business details
- Requires human review

### Low Confidence Extraction (0.0-0.49)
- Very little clear information
- Mostly our outreach content
- Generic or auto-reply responses
- Flag for manual processing

## Table Implementation Summary

| Table | Status | What's Extracted | What's Missing |
|-------|--------|-----------------|----------------|
| **1. Publishers** | ✅ Working | email, name, company, phone, payment methods | paymentEmail (if different) |
| **2. Websites** | ✅ Enhanced | domain, categories, niches, types, restrictions, suggested niches | Auto-populated metrics |
| **3. Offerings** | ❌ Not Started | - | Service types, pricing, turnaround |
| **4. Pricing Rules** | ❌ Not Started | - | Bulk discounts, surcharges |
| **5. Relationships** | ❌ Not Started | - | Publisher-website mappings |

**Current Approach**: Tables 1 & 2 are extracted into drafts. Pricing info is captured in `extractionMetadata.keyQuotes` for human review rather than structured extraction.

## Implementation Status (Updated 2025-09-01)

### ✅ Phase 1: Core Email Import (COMPLETE)
- ManyReach API integration
- Basic email parsing with GPT-4
- Draft creation system
- UI for review and editing

### ✅ Phase 2: Enhanced Extraction (COMPLETE)
- o3-2025-04-16 model with web search
- Single-phase extraction (email + website analysis)
- Proper content extraction from agent responses
- Publisher email extraction fixed

### ✅ Phase 3: Dynamic Metadata (COMPLETE - 2025-09-01)
- Dynamic loading of niches/categories/types from database
- Multiple selection support for all categorization fields
- Suggested new niches field for continuous improvement
- UI updates to display and edit suggested niches

### 🔄 Phase 4: Production Refinement (IN PROGRESS)
- [ ] Add process to review and add suggested niches to database
- [ ] Implement bulk operations for draft approval
- [ ] Add confidence-based auto-approval thresholds
- [ ] Create monitoring dashboard for extraction quality

## Files Modified

### Core Services
- `/lib/services/emailParserV3Simplified.ts` - Main extraction service
- `/lib/services/websiteMetadataService.ts` - Dynamic metadata loading
- `/lib/agents/emailParserV3Agent.ts` - Agent configuration with dynamic prompts
- `/lib/services/manyReachImportV3.ts` - Import orchestration

### UI Components
- `/app/admin/manyreach-import/page.tsx` - Admin interface with suggested niches display

### Database Scripts
- `/scripts/get-all-niches-from-db.ts` - Utility to fetch current metadata

## Next Steps

1. **Immediate**: Test with more email samples to refine extraction
2. **Then**: Build admin tool to review and add suggested niches
3. **Then**: Implement bulk approval workflows
4. **Finally**: Create quality monitoring dashboard

---

**This document is the single source of truth for the ManyReach V3 extraction system. Version 3.1 includes dynamic metadata support.**