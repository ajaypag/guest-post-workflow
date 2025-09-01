# ManyReach V3 - Code Reuse Analysis
## Detailed Component Assessment

---

## ✅ Components We Can Reuse As-Is

### 1. ManyReach API Core (`manyReachPollingService.ts`)

#### Reusable Methods:
```typescript
// Lines 204-222: API call to get prospect messages
private async getProspectMessages(email: string): Promise<ManyReachMessage[]>

// Lines 74-88: Fetch campaign details
const campaignResponse = await fetch(`${this.baseUrl}/campaigns?apikey=${this.apiKey}`)

// Lines 91-104: Get prospects in campaign
const prospectsResponse = await fetch(
  `${this.baseUrl}/campaigns/${campaignId}/prospects?apikey=${this.apiKey}`
)
```

**Why Reusable**: Pure API communication, no business logic mixed in

---

### 2. Database Tables (Partial)

#### `email_processing_logs` Table Structure:
- ✅ **Keep**: All email storage fields (raw_content, html_content, email_from, etc.)
- ✅ **Keep**: Indexing strategy 
- ❌ **Remove**: Shadow publisher references
- ❌ **Remove**: Complex status values
- ➕ **Add**: `draft_id` reference field

---

## 🔄 Components to Modify

### 1. Email Parser Service

#### Current Implementation (`emailParserService.ts`):
```typescript
// Complex 3-stage parsing with confidence scoring
async parseEmail(email: EmailData): Promise<ParsedData> {
  // Stage 1: Publisher extraction (lines 40-98)
  // Stage 2: Offering extraction (lines 100-156)  
  // Stage 3: Confidence calculation (lines 158-205)
}
```

#### V3 Simplified Version:
```typescript
async parseEmailForDraft(email: EmailData): Promise<DraftData> {
  // Single OpenAI call with structured output
  // No confidence scoring
  // Focus on data extraction only
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "system",
      content: SIMPLE_EXTRACTION_PROMPT
    }, {
      role: "user", 
      content: email.rawContent
    }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(completion.choices[0].message.content);
}
```

**Changes**:
- Remove 3-stage processing → Single extraction
- Remove confidence scoring → Simple extraction
- Remove qualification logic → Just parse data

---

### 2. ManyReach Polling Service

#### Current Code to Modify:
```typescript
// Lines 226-351: processReply method
private async processReply(
  prospect: ManyReachProspect,
  message: ManyReachMessage,
  campaignId: string,
  campaignName?: string
): Promise<{ confidence: number; publisherId?: string | null }>
```

#### V3 Version:
```typescript
private async processReplyToDraft(
  prospect: ManyReachProspect,
  message: ManyReachMessage,
  campaignId: string
): Promise<{ draftId: string }> {
  // 1. Store email
  const emailLog = await this.storeEmail(prospect, message, campaignId);
  
  // 2. Parse with AI
  const parsed = await this.parser.parseEmailForDraft(message);
  
  // 3. Create draft records
  const draft = await this.draftService.createFromParsed(emailLog.id, parsed);
  
  return { draftId: draft.id };
}
```

**Key Changes**:
- Remove confidence logic
- Remove shadow publisher creation
- Add draft creation
- Simplify return type

---

## 🆕 New Components Needed

### 1. Draft Service (`lib/services/draftService.ts`)
```typescript
export class DraftService {
  // Create draft publisher with associated websites/offerings
  async createFromParsed(emailLogId: string, parsedData: any): Promise<DraftPublisher>
  
  // Update draft fields
  async updateDraft(draftId: string, updates: Partial<DraftPublisher>): Promise<DraftPublisher>
  
  // Approve draft → Create real records
  async approveDraft(draftId: string, approverId: string): Promise<{
    publisher: Publisher,
    websites: Website[],
    offerings: PublisherOffering[]
  }>
  
  // Link draft to existing publisher
  async linkToExisting(draftId: string, publisherId: string): Promise<void>
  
  // Bulk operations
  async bulkApprove(draftIds: string[]): Promise<BulkApprovalResult>
  async bulkReject(draftIds: string[], reason: string): Promise<void>
}
```

### 2. Import Controller (`app/api/internal/manyreach/import/route.ts`)
```typescript
export async function POST(request: Request) {
  const { campaignId, limit } = await request.json();
  
  // Start background import job
  const jobId = await importQueue.add({
    campaignId,
    limit,
    userId: session.user.id
  });
  
  return Response.json({ jobId, status: 'started' });
}

export async function GET(request: Request) {
  // Get import status
  const jobs = await importQueue.getJobs(['active', 'completed', 'failed']);
  return Response.json({ jobs });
}
```

### 3. Draft Review UI (`app/internal/manyreach/drafts/page.tsx`)
```typescript
export default function DraftReviewPage() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left: Draft list */}
      <div className="col-span-4">
        <DraftList 
          onSelect={setSelectedDraft}
          filters={filters}
        />
      </div>
      
      {/* Middle: Draft editor */}
      <div className="col-span-4">
        <DraftEditor 
          draft={selectedDraft}
          onSave={handleSave}
          onApprove={handleApprove}
        />
      </div>
      
      {/* Right: Original email */}
      <div className="col-span-4">
        <EmailViewer 
          emailId={selectedDraft?.emailLogId}
          highlightExtracted={true}
        />
      </div>
    </div>
  );
}
```

---

## 📊 Effort Estimation

| Component | Reuse % | New Code | Effort |
|-----------|---------|----------|--------|
| ManyReach API | 80% | 20% | 2 hours |
| Email Parser | 40% | 60% | 4 hours |
| Database Schema | 60% | 40% | 3 hours |
| Draft Service | 0% | 100% | 8 hours |
| Import API | 10% | 90% | 6 hours |
| Review UI | 0% | 100% | 12 hours |
| **Total** | | | **35 hours** |

---

## 🔨 Refactoring Checklist

### Phase 1: Database Setup
- [ ] Create draft tables migration
- [ ] Add `draft_id` to email_processing_logs
- [ ] Remove shadow publisher tables (or keep for backward compat)
- [ ] Update indexes for draft queries

### Phase 2: Service Layer
- [ ] Fork `emailParserService.ts` → `emailParserV3.ts`
- [ ] Create `draftService.ts`
- [ ] Fork `manyReachPollingService.ts` → `manyReachImportService.ts`
- [ ] Remove shadow publisher dependencies

### Phase 3: API Layer
- [ ] Create `/api/internal/manyreach/import` endpoint
- [ ] Create `/api/internal/manyreach/drafts` CRUD endpoints
- [ ] Add `/api/internal/manyreach/approve` endpoint
- [ ] Add `/api/internal/manyreach/bulk` operations

### Phase 4: UI Components
- [ ] Build DraftList component
- [ ] Build DraftEditor component
- [ ] Build EmailViewer component
- [ ] Create approval workflow UI
- [ ] Add bulk selection interface

---

## 🚨 Breaking Changes

### Will Break:
1. Shadow publisher workflows (remove completely)
2. Auto-approval based on confidence (remove)
3. Existing webhook endpoint (needs update for drafts)

### Backward Compatible:
1. Email storage format (same structure)
2. ManyReach API integration (same API)
3. OpenAI integration (same service, different prompts)

---

## 💡 Optimization Opportunities

### 1. Batch Processing
Instead of processing emails one-by-one:
```typescript
// Current: Sequential
for (const email of emails) {
  await processEmail(email);
}

// V3: Batch
const batchSize = 10;
await Promise.all(
  chunk(emails, batchSize).map(batch => 
    processBatch(batch)
  )
);
```

### 2. Caching Strategy
```typescript
// Add Redis or in-memory cache
class EmailCache {
  private cache = new Map<string, CachedEmail>();
  
  async get(campaignId: string): Promise<Email[]> {
    if (!this.cache.has(campaignId)) {
      const emails = await manyReachAPI.getEmails(campaignId);
      this.cache.set(campaignId, { emails, timestamp: Date.now() });
    }
    return this.cache.get(campaignId).emails;
  }
}
```

### 3. Progressive Loading
```typescript
// Load emails in chunks for UI
async function* loadEmailsProgressive(campaignId: string) {
  let offset = 0;
  const limit = 50;
  
  while (true) {
    const batch = await getEmails(campaignId, offset, limit);
    if (batch.length === 0) break;
    
    yield batch;
    offset += limit;
  }
}
```

---

## 📝 Migration Path

### Step 1: Parallel Development
- Keep V1/V2 running
- Build V3 alongside
- No shared dependencies

### Step 2: Testing Phase
- Import test campaigns with V3
- Compare results with V1/V2
- Refine parsing prompts

### Step 3: Gradual Rollout
- Start with new campaigns only
- Move historical data if needed
- Deprecate V1/V2

### Step 4: Cleanup
- Remove shadow publisher code
- Remove complex confidence logic
- Archive old tables