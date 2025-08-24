# Publisher Email Automation System

## Overview
Automated system to parse email responses from publishers and update our database with website offerings, pricing, and requirements using ManyReach webhooks and OpenAI.

## Architecture

### 1. Email Flow
```
Publisher Email Response → ManyReach → Webhook → Our API → OpenAI Parser → Database Update
```

### 2. Core Components

#### A. ManyReach Webhook Receiver
- **Endpoint**: `/api/webhooks/manyreach/email-response`
- **Authentication**: Webhook signature validation
- **Rate Limiting**: Max 100 requests/minute
- **Retries**: Store failed webhooks for manual review

#### B. OpenAI Email Parser
- **Model**: GPT-4 for accuracy (fallback to GPT-3.5-turbo for cost)
- **Structured Output**: JSON schema for extracted data
- **Confidence Scoring**: Only auto-update if confidence > 80%

#### C. Data Matching Engine
- **Email → Publisher**: Match by email domain, contact info
- **Website Detection**: Extract and normalize domains from email
- **Duplicate Prevention**: Check existing publishers/websites before creating

#### D. Database Update Logic
- **Auto-update**: High confidence data
- **Manual Review Queue**: Low confidence or conflicts
- **Audit Trail**: Track all automated changes

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Webhook Endpoint
```typescript
// /api/webhooks/manyreach/email-response/route.ts
export async function POST(request: NextRequest) {
  // Validate webhook signature
  // Parse email data
  // Queue for processing
  // Return 200 immediately
}
```

#### 1.2 Email Parser Service
```typescript
// /lib/services/emailParserService.ts
interface ParsedEmailData {
  sender: {
    email: string;
    name?: string;
    company?: string;
  };
  website: {
    domain: string;
    confidence: number;
  };
  offerings: {
    type: 'guest_post' | 'link_insertion';
    basePrice?: number;
    currency?: string;
    turnaroundDays?: number;
    requirements?: string;
    confidence: number;
  }[];
  rawContent: string;
  parsedAt: Date;
  confidence: number; // Overall confidence
}
```

#### 1.3 OpenAI Integration
```typescript
// /lib/services/openaiService.ts
const SYSTEM_PROMPT = `
You are an expert at extracting publisher information from emails.
Extract the following information:
1. Website domain (normalize: remove www, https, trailing slashes)
2. Offerings (guest posts, link insertions)
3. Pricing (amount and currency)
4. Requirements (word count, DoFollow policy, etc.)
5. Contact information

Return JSON with confidence scores for each field.
`;
```

### Phase 2: Data Processing (Week 2)

#### 2.1 Publisher Matching
```typescript
// /lib/services/publisherMatchingService.ts
async function findOrCreatePublisher(data: ParsedEmailData) {
  // Check by email
  // Check by domain
  // Create if new with 'pending_verification' status
}
```

#### 2.2 Website & Offering Management
```typescript
// /lib/services/websiteOfferingService.ts
async function updateWebsiteOfferings(data: ParsedEmailData) {
  // Find or create website
  // Update or create offerings
  // Store pricing rules
  // Mark for review if conflicts
}
```

#### 2.3 Confidence-Based Actions
- **>90% confidence**: Auto-update, notify admin
- **70-90% confidence**: Update with 'needs_review' flag
- **<70% confidence**: Queue for manual review

### Phase 3: Admin Interface (Week 3)

#### 3.1 Email Processing Dashboard
- **Path**: `/admin/email-automation`
- **Features**:
  - Live webhook feed
  - Processing queue status
  - Error logs
  - Manual review queue

#### 3.2 Review Interface
- **Path**: `/admin/email-automation/review`
- **Features**:
  - Side-by-side: Original email vs Extracted data
  - Edit extracted data before saving
  - Approve/Reject/Request clarification
  - Train AI with corrections

#### 3.3 Configuration Panel
- **Path**: `/admin/email-automation/settings`
- **Features**:
  - Confidence thresholds
  - Auto-update rules
  - Email templates for clarifications
  - OpenAI model selection

### Phase 4: Testing & Refinement (Week 4)

#### 4.1 Test Suite
```typescript
// __tests__/emailParser.test.ts
describe('Email Parser', () => {
  test('extracts guest post pricing', async () => {
    const email = `
      Hi, our guest post rate is $150 with 7-day turnaround.
      We accept DoFollow links, max 2 per article.
    `;
    const result = await parseEmail(email);
    expect(result.offerings[0].basePrice).toBe(15000); // cents
  });
});
```

#### 4.2 Edge Cases
- Multiple websites mentioned
- Pricing in different currencies
- Conditional pricing (word count tiers)
- Requirements as attachments
- Follow-up emails referencing previous

## Security Considerations

### API Key Management
```typescript
// .env.local (NEVER COMMIT)
OPENAI_API_KEY=sk-...
MANYREACH_API_KEY=...
MANYREACH_WEBHOOK_SECRET=...

// .env.example (COMMIT THIS)
OPENAI_API_KEY=sk-your-openai-api-key-here
MANYREACH_API_KEY=your-manyreach-api-key
MANYREACH_WEBHOOK_SECRET=your-webhook-secret
```

### Webhook Security
1. Validate webhook signatures
2. Rate limiting per IP
3. Store raw webhook data for audit
4. Sanitize all inputs before database storage

### Data Privacy
1. Encrypt sensitive pricing data
2. PII handling compliance
3. Audit logs for all automated actions
4. Data retention policies

## Database Schema Updates

### New Tables
```sql
-- Email processing logs
CREATE TABLE email_processing_logs (
  id UUID PRIMARY KEY,
  webhook_id TEXT,
  email_from TEXT,
  email_subject TEXT,
  raw_content TEXT,
  parsed_data JSONB,
  confidence_score DECIMAL(3,2),
  status TEXT, -- pending, processed, failed, manual_review
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Review queue
CREATE TABLE email_review_queue (
  id UUID PRIMARY KEY,
  log_id UUID REFERENCES email_processing_logs(id),
  parsed_data JSONB,
  reviewer_notes TEXT,
  status TEXT, -- pending, approved, rejected, clarification_sent
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## ManyReach Integration

### Campaign Setup
1. Create "Publisher Outreach" campaign
2. Set up webhook for responses
3. Configure auto-tags for tracking

### Webhook Configuration
```javascript
// ManyReach Webhook Settings
{
  url: "https://your-domain.com/api/webhooks/manyreach/email-response",
  events: ["email.received", "email.replied"],
  secret: "generate-secure-secret"
}
```

## OpenAI Prompts

### Initial Email Parse
```typescript
const parseEmailPrompt = {
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content: `Parse this publisher email:\n\n${emailContent}`
    }
  ],
  response_format: { type: "json_object" }
};
```

### Clarification Generator
```typescript
const clarificationPrompt = {
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "system",
      content: "Generate a polite clarification request for missing publisher information."
    },
    {
      role: "user",
      content: `Missing: ${missingFields.join(', ')}`
    }
  ]
};
```

## Monitoring & Analytics

### Key Metrics
- Emails processed per day
- Auto-update success rate
- Average confidence score
- Manual review backlog
- Cost per email (OpenAI usage)

### Alerts
- Webhook failures
- Low confidence patterns
- Duplicate website creation
- OpenAI API errors
- Rate limit warnings

## Rollout Strategy

### Phase 1: Shadow Mode
- Process emails but don't update database
- Log all extracted data
- Manual verification of accuracy

### Phase 2: Limited Auto-Update
- Auto-update only high-confidence, simple cases
- Everything else to manual review
- Track accuracy metrics

### Phase 3: Full Automation
- Auto-update most cases
- Complex cases to review
- AI learns from corrections

### Phase 4: Advanced Features
- Multi-language support
- Attachment parsing (rate cards)
- Historical email threading
- Predictive pricing models

## Cost Estimates

### OpenAI Usage
- GPT-4: ~$0.03 per email
- GPT-3.5-turbo: ~$0.002 per email
- Estimated: 1000 emails/month = $30-50/month

### Development Time
- Phase 1: 40 hours
- Phase 2: 30 hours
- Phase 3: 20 hours
- Phase 4: 20 hours
- Total: ~110 hours

## Success Criteria
- 80% of emails parsed successfully
- 90% accuracy on extracted data
- <5 minutes from email to database
- 50% reduction in manual data entry time
- Zero security incidents

## Next Steps
1. Set up ManyReach webhook endpoint
2. Create OpenAI service with structured output
3. Build publisher matching logic
4. Create admin review interface
5. Deploy in shadow mode for testing