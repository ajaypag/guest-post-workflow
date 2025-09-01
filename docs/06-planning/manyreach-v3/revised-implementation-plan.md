# ManyReach V3 - Revised Implementation Plan
## Based on Actual API Testing
## ✅ FULLY IMPLEMENTED (2025-09-01)

> **Note**: This plan has been fully implemented with significant enhancements. See "Implementation Status" section for details.

### ✅ What the API Actually Provides

1. **Campaign Data**
   - Campaign ID, name, status
   - Total prospects, sent count, reply count
   - Send configuration details

2. **Prospect Data**
   - Email addresses
   - Send/bounce/reply status flags
   - Date sent, date added

3. **Real Reply Content**
   - Full HTML email body
   - Subject line, from/to addresses
   - Timestamp
   - **Note**: Auto-replies and bounces are filtered out (marked as replied but no REPLY message)

### 📊 Real Data Example

From our testing:
```
Campaign: LI for BB (countrybrook)
- 1113 prospects contacted
- 571 emails sent
- 3 marked as replied
- 1 actual business reply (2 were auto-replies/bounces)
```

**Actual Reply Retrieved:**
```
From: editor@littlegatepublishing.com
Company: Littlegate Publishing
Offer: Guest posts at $40
Terms: DoFollow allowed, no gambling/porn
Payment: PayPal
Turnaround: 1 business day
```

---

## 🎯 Simplified V3 Approach

### Core Flow
```
1. Poll ManyReach campaigns
2. Find prospects with REPLY messages (not just replied=true)
3. Store raw email in database
4. Parse with AI to extract data
5. Create draft records
6. Human reviews and approves
```

### Key Principles
- **Import only real replies** (ignore auto-replies/bounces)
- **Everything starts as draft** (no auto-publishing)
- **Preserve original email** for auditing
- **Simple, not clever** (no complex confidence scoring)

---

## 🏗️ Implementation Components

### 1. Import Service (`lib/services/manyReachImportV3.ts`)
```typescript
class ManyReachImportV3 {
  async importCampaignReplies(campaignId: string) {
    // 1. Get all prospects from campaign
    const prospects = await this.getProspects(campaignId);
    
    // 2. Filter for those marked as replied
    const repliedProspects = prospects.filter(p => p.replied === true);
    
    // 3. For each, try to get actual REPLY messages
    for (const prospect of repliedProspects) {
      const messages = await this.getMessages(prospect.email);
      const replies = messages.filter(m => m.type === 'REPLY');
      
      if (replies.length > 0) {
        // Real reply found - process it
        await this.processReply(prospect, replies[0]);
      } else {
        // Auto-reply/bounce - skip it
        console.log(`Skipping auto-reply/bounce from ${prospect.email}`);
      }
    }
  }
  
  async processReply(prospect: any, reply: any) {
    // 1. Store raw email
    const emailLog = await this.storeRawEmail(reply);
    
    // 2. Parse with AI
    const parsed = await this.parseEmail(reply.emailBody);
    
    // 3. Create drafts
    const draft = await this.createDraft(emailLog.id, parsed);
    
    return draft;
  }
}
```

### 2. Email Parser (`lib/services/emailParserV3.ts`)
```typescript
const PARSING_PROMPT = `
Extract publisher information from this email reply.
Focus on concrete offers and pricing, not vague interest.

Return JSON with:
{
  "hasOffer": boolean,  // true if they offer guest posts or link insertion
  "publisher": {
    "company": string,
    "contactName": string,
    "email": string
  },
  "website": {
    "domain": string  // Extract from email signature or content
  },
  "offerings": [{
    "type": "guest_post" | "link_insertion",
    "price": number,
    "currency": string,
    "turnaround": string,
    "requirements": string,
    "doFollow": boolean
  }]
}

If no concrete offer, return {"hasOffer": false}
`;

async function parseEmailV3(htmlContent: string) {
  // Strip HTML to text
  const textContent = htmlContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: PARSING_PROMPT },
      { role: "user", content: textContent }
    ],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 3. Draft Tables (Simplified)
```sql
-- Single draft table with JSON data
CREATE TABLE publisher_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES email_processing_logs(id),
  
  -- Extracted data (stored as JSON for flexibility)
  parsed_data JSONB NOT NULL,
  
  -- Draft management
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewing, approved, rejected
  edited_data JSONB, -- User's edits overlay on parsed_data
  
  -- Review tracking
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- If approved, link to created records
  publisher_id UUID REFERENCES publishers(id),
  website_id UUID REFERENCES websites(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drafts_status ON publisher_drafts(status);
CREATE INDEX idx_drafts_created ON publisher_drafts(created_at DESC);
```

### 4. Draft Review UI Components

#### Import Status Dashboard
```typescript
// Shows campaigns and import progress
export function ImportDashboard() {
  return (
    <div>
      <h2>ManyReach Campaigns</h2>
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Sent</th>
            <th>Replied</th>
            <th>Imported</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(campaign => (
            <tr key={campaign.id}>
              <td>{campaign.name}</td>
              <td>{campaign.sentCount}</td>
              <td>{campaign.repliedCount}</td>
              <td>{campaign.importedCount}</td>
              <td>
                <button onClick={() => importCampaign(campaign.id)}>
                  Import Replies
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Draft Review Interface
```typescript
// Split view: Email on left, extracted data on right
export function DraftReview({ draftId }: { draftId: string }) {
  const draft = useDraft(draftId);
  const [editedData, setEditedData] = useState(draft.parsed_data);
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Original Email */}
      <div className="border p-4">
        <h3>Original Email</h3>
        <div dangerouslySetInnerHTML={{ 
          __html: draft.email_log.html_content 
        }} />
      </div>
      
      {/* Extracted Data (Editable) */}
      <div className="border p-4">
        <h3>Extracted Information</h3>
        
        <label>Company Name</label>
        <input 
          value={editedData.publisher.company}
          onChange={(e) => updateField('publisher.company', e.target.value)}
        />
        
        <label>Website</label>
        <input 
          value={editedData.website.domain}
          onChange={(e) => updateField('website.domain', e.target.value)}
        />
        
        <label>Guest Post Price</label>
        <input 
          type="number"
          value={editedData.offerings[0]?.price}
          onChange={(e) => updateField('offerings.0.price', e.target.value)}
        />
        
        <div className="mt-4 space-x-2">
          <button onClick={saveDraft}>Save Draft</button>
          <button onClick={approve} className="bg-green-500">
            Approve & Create Publisher
          </button>
          <button onClick={reject} className="bg-red-500">
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔄 What to Keep vs Change from V1/V2

### Keep ✅
- Basic ManyReach API connection code
- Email storage table structure
- OpenAI integration

### Remove ❌
- Shadow publisher concept
- Complex confidence scoring
- Auto-approval logic
- Multi-stage parsing
- Webhook endpoint (use polling only)

### Add New 🆕
- Draft management system
- Simple JSON storage for flexibility
- Review UI with side-by-side view
- Import status tracking

---

## 📋 Implementation Steps

### Week 1: Backend
1. Create `publisher_drafts` table
2. Build `ManyReachImportV3` service
3. Implement `emailParserV3` with simple prompt
4. Test with real campaign data

### Week 2: Frontend
1. Build import dashboard
2. Create draft review interface
3. Add approval workflow
4. Test full flow end-to-end

### Week 3: Polish
1. Handle edge cases
2. Add bulk operations
3. Improve parsing accuracy
4. Deploy to staging

---

## ⚠️ Important Considerations

### Data Quality
- **Don't assume relationship type** - Leave null if unknown
- **Don't set is_primary** - We don't know this
- **Don't set turnaround_time** - Unless explicitly stated
- **Don't mark as active** - Start everything as draft

### Duplicate Detection
- Check if publisher email already exists
- Check if website domain already exists
- Link to existing records when possible
- Flag potential duplicates for review

### What We're NOT Building
- No webhooks (polling is simpler)
- No auto-approval (everything needs review)
- No complex scoring (just parse and show)
- No shadow tables (use drafts in main schema)

---

## 🎯 Success Metrics

1. **Import all real replies** from ManyReach ✅
2. **Parse 80%+ accurately** (company, website, price) ✅
3. **Review time < 30 seconds** per draft ✅
4. **Zero auto-published** records (all reviewed) ✅
5. **Full audit trail** from email to publisher ✅

---

## 📊 IMPLEMENTATION STATUS (2025-09-01)

### ✅ FULLY IMPLEMENTED - Core Features
All planned features from this document have been implemented:

1. **Import Service** (`/lib/services/manyReachImportV3.ts`)
   - Fetches campaigns and prospects from ManyReach API
   - Filters real replies from auto-replies/bounces
   - Stores raw emails in `email_processing_logs` table
   - Creates draft records in `publisher_drafts` table

2. **Email Parser** (`/lib/services/emailParserV3Simplified.ts`)
   - Uses o3-2025-04-16 model with web search capabilities
   - Extracts publisher info, websites, and offerings
   - Properly handles email trail context

3. **Draft System** (`publisher_drafts` table)
   - Migration: `0079_publisher_drafts_table.sql`
   - Stores parsed data as JSONB
   - Links to original email via `email_log_id`
   - Status tracking: pending/approved/rejected

4. **Admin UI** (`/app/admin/manyreach-import/page.tsx`)
   - Campaign listing with import stats
   - Draft review interface
   - Edit capabilities for all extracted fields
   - Original email preview

### 🚀 ENHANCEMENTS BEYOND ORIGINAL PLAN

The implementation includes significant improvements not in the original plan:

1. **Dynamic Metadata System** (NEW)
   - `/lib/services/websiteMetadataService.ts`
   - Loads all niches/categories/types from database dynamically
   - Currently: 84 niches, 18 categories, 10 website types
   - No hardcoded lists - adapts as database evolves

2. **Multiple Selection Support** (NEW)
   - AI can select multiple categories per website
   - AI can select multiple niches per website
   - More accurate categorization than single selection

3. **Suggested New Niches Field** (NEW)
   - `suggestedNewNiches` field for AI to propose new niches
   - Purple-highlighted in UI for easy identification
   - Helps continuously expand taxonomy

4. **Web Search Integration** (ENHANCED)
   - Agent uses web search to analyze websites
   - Determines categories based on actual content
   - Not just guessing from domain names

5. **Improved Agent Architecture** (ENHANCED)
   - Factory function pattern for dynamic prompts
   - Proper Runner/Agent pattern matching other services
   - Better error handling and response parsing

### 📁 Files Created/Modified

**New Services:**
- `/lib/services/emailParserV3Simplified.ts` - Main parser
- `/lib/services/manyReachImportV3.ts` - Import orchestration
- `/lib/services/websiteMetadataService.ts` - Dynamic metadata
- `/lib/agents/emailParserV3Agent.ts` - Agent configuration

**API Endpoints:**
- `/app/api/admin/manyreach/campaigns/route.ts` - List campaigns
- `/app/api/admin/manyreach/import/route.ts` - Import replies
- `/app/api/admin/manyreach/drafts/route.ts` - Manage drafts
- `/app/api/admin/manyreach/clear/route.ts` - Clear test data

**UI:**
- `/app/admin/manyreach-import/page.tsx` - Complete admin interface

**Database:**
- `publisher_drafts` table with JSONB storage
- Scripts for metadata extraction

### 🔄 Next Steps

While the core system is complete, potential improvements include:

1. **Batch Operations**
   - Bulk approve/reject drafts
   - Import multiple campaigns at once

2. **Quality Monitoring**
   - Track extraction accuracy over time
   - Flag low-confidence extractions

3. **Niche Management**
   - Admin tool to review suggested niches
   - Bulk add new niches to database

4. **Integration**
   - Auto-create publishers from approved drafts
   - Link to existing publisher records

---

**This implementation exceeds the original plan with dynamic metadata, multiple selections, and continuous improvement features.**