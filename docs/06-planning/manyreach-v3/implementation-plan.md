# ManyReach V3 Implementation Plan
## Draft-Based Publisher Import System

### Executive Summary
Simplified approach focusing on importing ManyReach data as **drafts** for human review, maintaining full audit trail to original emails. No auto-approval, no complex confidence scoring - just clean data import with editing capabilities.

---

## 🎯 Core Objectives

1. **Import & Cache** - Pull data from ManyReach API, store locally to minimize API calls
2. **Draft Everything** - All imported data creates draft records, nothing auto-approved
3. **Preserve Context** - Link every draft to its source email for auditing
4. **Enable Editing** - Clean UI for reviewing and refining drafts before approval
5. **Bulk Operations** - Handle hundreds of publisher responses efficiently

---

## 📊 Current State Analysis

### What We Can Reuse ✅

#### 1. ManyReach API Integration
- **Location**: `lib/services/manyReachPollingService.ts`
- **Reusable**:
  - API authentication setup
  - Campaign polling logic (`pollCampaignForReplies`)
  - Prospect message fetching (`getProspectMessages`)
  - Basic error handling
- **Changes Needed**: 
  - Remove auto-approval logic
  - Simplify confidence scoring
  - Add better caching

#### 2. Email Storage Infrastructure
- **Tables**: `email_processing_logs`
- **Reusable**:
  - Schema for storing raw emails
  - Indexing strategy
  - Thread tracking
- **Changes Needed**:
  - Add `draft_id` reference field
  - Simplify status values (just: `imported`, `processed`, `archived`)

#### 3. AI Parsing Service
- **Location**: `lib/services/emailParserService.ts`
- **Reusable**:
  - OpenAI integration
  - Basic extraction prompts
- **Changes Needed**:
  - Simplify to single-pass extraction
  - Remove confidence scoring complexity
  - Focus on data extraction, not qualification

### What We Need to Change 🔄

#### 1. Remove Shadow Publisher Concept
- **Current**: Complex shadow publisher system with auto-migration
- **New**: Direct draft creation in main tables with `status: 'draft'`

#### 2. Simplify Processing Pipeline
- **Current**: Multi-stage parsing → confidence scoring → auto-approval
- **New**: Import → Parse → Create drafts → Manual review

#### 3. Add Draft Management UI
- **New Components Needed**:
  - `/internal/manyreach/import` - Import dashboard
  - `/internal/manyreach/drafts` - Draft review queue
  - `/internal/manyreach/emails` - Email viewer with draft links

---

## 🏗️ Proposed Architecture

### Data Flow
```
ManyReach API → Local Cache → AI Parser → Draft Records → Review UI → Approved Records
                     ↓                           ↓
              email_processing_logs    draft_publishers/websites/offerings
```

### Database Schema Changes

#### 1. Modify `email_processing_logs`
```sql
ALTER TABLE email_processing_logs ADD COLUMN draft_publisher_id UUID;
ALTER TABLE email_processing_logs ADD COLUMN draft_status VARCHAR(50) DEFAULT 'unprocessed';
-- draft_status: unprocessed, draft_created, approved, rejected, archived
```

#### 2. Add Draft Tables
```sql
-- Draft publishers table
CREATE TABLE draft_publishers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES email_processing_logs(id),
  
  -- Publisher data (same as publishers table)
  email VARCHAR(255),
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  
  -- Draft metadata
  status VARCHAR(50) DEFAULT 'draft', -- draft, approved, rejected
  edited_fields JSONB DEFAULT '{}', -- Track what was manually edited
  review_notes TEXT,
  
  -- Approval tracking
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  approved_publisher_id UUID REFERENCES publishers(id), -- Link to real record once approved
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Draft websites table
CREATE TABLE draft_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_publisher_id UUID REFERENCES draft_publishers(id),
  
  -- Website data
  domain VARCHAR(255),
  categories TEXT[],
  total_traffic INTEGER,
  domain_rating INTEGER,
  
  -- Draft metadata
  status VARCHAR(50) DEFAULT 'draft',
  edited_fields JSONB DEFAULT '{}',
  
  -- Link to real record once approved
  approved_website_id UUID REFERENCES websites(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Draft offerings table  
CREATE TABLE draft_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_publisher_id UUID REFERENCES draft_publishers(id),
  draft_website_id UUID REFERENCES draft_websites(id),
  
  -- Offering data
  offering_type VARCHAR(50),
  base_price DECIMAL(10,2),
  currency VARCHAR(10),
  turnaround_days INTEGER,
  
  -- Draft metadata
  status VARCHAR(50) DEFAULT 'draft',
  edited_fields JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Implementation Components

### 1. Import Service (`lib/services/manyReachImportService.ts`)
```typescript
class ManyReachImportService {
  // Fetch and cache emails from ManyReach
  async importCampaignEmails(campaignId: string): Promise<ImportResult>
  
  // Process cached emails into drafts
  async processEmailsToDrafts(emailIds: string[]): Promise<DraftResult>
  
  // Get import status and stats
  async getImportStatus(): Promise<ImportStatus>
}
```

### 2. Draft Management Service (`lib/services/draftManagementService.ts`)
```typescript
class DraftManagementService {
  // Create draft records from parsed email
  async createDrafts(emailId: string, parsedData: any): Promise<DraftSet>
  
  // Update draft with edits
  async updateDraft(draftId: string, updates: any): Promise<Draft>
  
  // Approve draft and create real records
  async approveDraft(draftId: string, userId: string): Promise<ApprovalResult>
  
  // Bulk operations
  async bulkApprove(draftIds: string[]): Promise<BulkResult>
}
```

### 3. UI Components

#### Import Dashboard (`/internal/manyreach/import`)
- Campaign selector
- Import status/progress
- Email count and stats
- "Start Import" button
- Recent import history

#### Draft Review Queue (`/internal/manyreach/drafts`)
- Table view of all drafts
- Status filters (draft, approved, rejected)
- Inline editing capabilities
- Original email preview panel
- Bulk selection and actions
- Search/filter by domain, email, date

#### Email-Draft Association View
- Split view: Original email | Draft records
- Highlighting of extracted data
- Edit history tracking
- Approval workflow buttons

---

## 📋 Reusable vs New Components

### Fully Reusable ✅
1. ManyReach API authentication
2. Basic polling logic
3. Database connection setup
4. OpenAI integration

### Partially Reusable (Modify) 🔄
1. `manyReachPollingService.ts` → Remove auto-approval, add caching
2. `emailParserService.ts` → Simplify parsing, remove confidence
3. `email_processing_logs` table → Add draft references

### Build from Scratch 🆕
1. Draft tables and schemas
2. `ManyReachImportService`
3. `DraftManagementService`
4. All UI components for draft management
5. Email-to-draft association views

---

## 🚀 Implementation Phases

### Phase 1: Data Import (Week 1)
- [ ] Set up draft tables
- [ ] Build `ManyReachImportService`
- [ ] Create basic import API endpoints
- [ ] Test with existing ManyReach data

### Phase 2: Draft Management (Week 2)
- [ ] Build `DraftManagementService`
- [ ] Create draft CRUD operations
- [ ] Add email-to-draft associations
- [ ] Implement approval workflow

### Phase 3: UI Development (Week 3)
- [ ] Build import dashboard
- [ ] Create draft review queue
- [ ] Add inline editing
- [ ] Implement bulk operations

### Phase 4: Testing & Refinement (Week 4)
- [ ] Import real campaign data
- [ ] Test edit workflows
- [ ] Performance optimization
- [ ] Add missing features based on feedback

---

## 🎯 Success Criteria

1. **Import Speed**: Process 1000 emails in < 5 minutes
2. **Draft Accuracy**: 90% of drafts require minimal editing
3. **Review Efficiency**: Review and approve 50 drafts in < 10 minutes
4. **Audit Trail**: 100% traceability from draft to source email
5. **Data Quality**: Zero duplicate publishers/websites after approval

---

## ⚠️ Key Decisions Required

1. **Email Storage Duration**: How long to keep raw emails after approval?
2. **Draft Expiration**: Auto-delete drafts after X days?
3. **Duplicate Handling**: What if publisher already exists?
4. **Bulk Import Limits**: Max emails per import session?
5. **AI Model Choice**: GPT-4 for accuracy vs GPT-3.5 for speed?

---

## 🔴 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ManyReach API rate limits | Import delays | Implement caching and batch processing |
| Poor AI extraction quality | Manual editing burden | Use GPT-4, provide examples in prompt |
| Duplicate publishers | Data quality issues | Check existing records before draft creation |
| Large email volumes | Performance issues | Pagination, background jobs |

---

## 📝 Next Steps

1. Review and approve this plan
2. Set up draft database tables
3. Start with Phase 1 implementation
4. Create test harness with sample emails
5. Build minimal UI for testing

---

## 📊 Comparison: V1/V2 vs V3

| Feature | V1/V2 (Current) | V3 (Proposed) |
|---------|-----------------|---------------|
| Auto-approval | Yes (confidence-based) | No (all drafts) |
| Shadow publishers | Yes | No |
| Complexity | High | Low |
| User control | Limited | Full |
| Audit trail | Partial | Complete |
| Edit capability | Post-creation | Pre-approval |
| Confidence scoring | Complex algorithm | Not needed |
| Processing stages | 5+ stages | 3 stages |