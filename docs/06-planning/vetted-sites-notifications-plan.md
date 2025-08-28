# Vetted Sites Request Notification System Plan

## Current State Analysis

### Finding: No Existing Notification System
After comprehensive analysis of the vetted sites request flow, there is **no notification system currently implemented**. All status changes and actions only update the database without triggering any user communications.

### Existing Email Infrastructure
The application has robust email capabilities through `emailService.ts` using Resend API:
- Order confirmations
- Publisher notifications
- Account invitations
- Password resets
- Email verification

However, none of these are integrated into the vetted sites request workflow.

## Actual Workflow Analysis

### The Real Flow (Based on Code Review)
1. **Submitted → Approved**: Auto-creates clients and target pages from target URLs
2. **Approved (Keyword Generation Phase)**: Internal team manually generates keywords for each target page
3. **Approved → In Progress**: Via "Confirm Request" - creates bulk analysis projects (one per client)
4. **In Progress**: Team adds and vets external domains for analysis
5. **In Progress → Fulfilled**: Analysis complete, actual vetted domain results ready
6. **Share Token Generation**: Post-fulfillment, creates shareable link (no email currently sent)

## 1. Notification Touchpoints (Revised Based on Actual Flow)

### Core Status Transitions

#### A. Status: Reviewing → Approved
- **What Actually Happens**: System auto-creates clients and target pages
- **User Impact**: Request approved, analysis will begin soon
- **Notification Value**: Build anticipation, set expectations

#### B. Status: In Progress → Fulfilled  ⭐ **MOST IMPORTANT**
- **What Actually Happens**: Analysis complete, vetted domains ready
- **User Impact**: Results available, can access vetted site list
- **Notification Value**: Critical - user gets their deliverable

#### C. Status: Reviewing → Rejected
- **What Actually Happens**: Request doesn't meet criteria
- **User Impact**: Need to understand why and next steps
- **Notification Value**: Important for user clarity

### Share/Claim Token Activities

#### D. Share Token Generated & Sent
- **Current Gap**: Share tokens are generated but not emailed
- **Need**: Add email field when generating share token
- **Challenge**: Sometimes we know recipient email, sometimes not
- **Solution**: Optional email field in share generation UI

#### E. Claim Token Used
- **What Happens**: Token links request to new account
- **Alert Value**: Sales team knows prospect engaged
- **Note**: Token enables transfer between accounts

### Secondary Touchpoints

#### F. Share Token Expiry Warning
- **When**: 7 days before expiry
- **Challenge**: Only if we have recipient email
- **Value**: Prevent wasted opportunities

## 2. Revised Notification Priorities

### Priority 1: Essential User Journey
1. **Fulfillment Notification** - Critical deliverable ready
2. **Approval Notification** - Build anticipation  
3. **Rejection Notification** - Provide clarity on next steps

### Priority 2: Share/Transfer System
4. **Share Link Delivery** - Send results to specified recipients
5. **Claim Alert** - Notify sales of engagement

### Priority 3: Nice to Have
6. **Expiry Warning** - If email available
7. ~~Request Confirmation~~ - Not needed (user sees it immediately in app)
8. ~~Project Creation Alert~~ - Internal process, users don't need to know
9. ~~Keyword Generation Complete~~ - Part of internal approval process

## 3. Notification Content Planning

### Email 1: Fulfillment Notification (Priority 1 - MOST CRITICAL)
**Subject**: "Your vetted sites analysis is ready! 🎯"
**Link**: `/vetted-sites?requestId=[requestId]&utm_source=email&utm_campaign=fulfillment`

**Email Structure:**

**Opening:**
"Great news! We found **[X] strategic matches** for your target URLs that already rank for your keywords."

**Rich Data Table:**
```
Top 5 Strategic Matches:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain           | Keyword Match | Avg Position | DR  | Traffic | Cost
─────────────────────────────────────────────────────────────────────
example.com      | 12 direct     | #8          | 72  | 45K/mo  | $379
                 | 18 related    |             |     |         |
                 | Why: "Already ranks for 'your-keyword' and related terms"
─────────────────────────────────────────────────────────────────────
site2.com        | 8 direct      | #15         | 68  | 32K/mo  | $299
                 | 22 related    |             |     |         |
                 | Why: "Strong authority in your niche, ranks for buyer intent"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Key Insights:**
- **Keyword Overlap**: Sites rank for an average of **[X] of your target keywords**
- **Authority Level**: **[X]% have strong authority** (rank top 30) for your topics  
- **Match Quality**: **[X] excellent matches**, **[Y] good matches**
- **AI Visibility**: These sites appear in ChatGPT, Claude, and AI Overviews for your keywords

**Pricing:**
"Guest post costs shown include all fees"

**CTA Button:**
[View Full Analysis & Justifications →] → `/vetted-sites?requestId=[requestId]`

**Footer:**
"Each site includes detailed justification showing exactly WHY it was selected and which of your keywords it ranks for."

### Email 2: Approval Notification (Priority 1)
**Subject**: "Your vetted sites request has been approved ✅"

**Content:**
- Opening: "Good news! Your request has been approved and we're beginning the analysis."
- List of target URLs we'll be analyzing
- What happens next in the process
- Expected timeline: **within 24 hours**
- Set expectations about what they'll receive
- Link to track status in real-time

### Email 3: Rejection Notification (Priority 1)
**Subject**: "Update on your vetted sites request"

**Content:**
"We're unable to process this vetted sites request at this time. Reply to this email if you think this was a mistake and we'll take care of it."

**Simple and direct** - no over-explanation of reasons or complex next steps.

### Email 4: Share Token - Single Email (Priority 2)
**When sent**: When internal user generates share token and provides recipient email  
**Frequency**: One email only - no reminder sequence  
**Purpose**: Share vetted sites analysis with prospects/clients via claim link

**Subject Options (personalized with actual data):**
- "[X] keyword-matched sites identified for [client.website]"
- "Found [X] sites already ranking for your keywords"
- "Your keyword analysis: [X] relevant sites found"

**Data Available:** 
- ✅ `client.website` (normalized domain like "example.com") 
- ✅ `client.name` (company name, but may not always be meaningful)
- ✅ First target URL from the request (`targetUrls[0]`)
- ✅ Top 5 qualified domains with full metrics from bulk_analysis_domains + websites tables
- ✅ Custom message from internal team (when provided)
- ✅ Optional proposal video URL

**Complete Email Template:**
```
Subject: 12 keyword-matched sites identified for example.com

Hi [Name],

We found **12 websites with significant keyword overlap** to your target terms - our approach to building links that actually influence how AI systems understand your expertise.

Instead of backlinks from random high DR sites, we identified websites with proven expertise in your space that already rank for your target keywords.

TOP STRATEGIC MATCHES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain               | Keyword Match | Avg Pos | DR  | Traffic | Cost
─────────────────────────────────────────────────────────────────────
techcrunch.com       | 15 direct     | #6      | 91  | 2.1M/mo | $2,850
                     | 23 related    |         |     |         |
                     | Why: "Already ranks for 'SaaS analytics' + related"
─────────────────────────────────────────────────────────────────────
entrepreneur.com     | 8 direct      | #12     | 88  | 890K/mo | $1,250
                     | 31 related    |         |     |         |
                     | Why: "Strong in 'business tools' vertical"
─────────────────────────────────────────────────────────────────────
...and 10 more strategic matches
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[IF PROPOSAL VIDEO PROVIDED:]
📹 Personal Analysis Overview:
[Embedded video player or thumbnail with play button]

[IF CUSTOM MESSAGE PROVIDED:]
💬 From our team:
"[Custom message from internal user]"

[MAIN CTA BUTTON]
→ View Full Analysis & Create Your Account ←
Link: /vetted-sites/claim/[shareToken]

This analysis includes detailed justifications for each site and AI-powered matching to your exact keywords. The link above will expire in 30 days.

Questions? Just reply to this email.

Best regards,
The Linkio Team
```

**Database Integration:**
- Query same data as fulfillment email (bulk_analysis_domains + websites LEFT JOIN)
- Include `proposalVideoUrl` and `proposalMessage` from vettedSitesRequests table
- Use `shareToken` for claim URL generation
- Track email send in existing email_logs table

**Key Benefits of Single Email Approach:**
- Higher conversion through quality over quantity
- Complete information provided upfront
- No reminder fatigue or unsubscribe risk
- Simpler implementation and maintenance

---

**Note**: Previously planned reminder email sequence (Emails 5-9) removed per user feedback. Share token uses single email approach for higher conversion and simpler implementation.

---

## 4. Implementation Plan

### Phase 1: Core Notifications (Week 1)
- [ ] Create vetted sites email templates in emailService
- [ ] Implement fulfillment notification (HIGHEST PRIORITY)
- [ ] Implement approval notification
- [ ] Implement rejection notification
- [ ] Add notification logging

### Phase 2: Share System Enhancement (Week 2)
- [ ] Add email fields to share token generation UI (single recipient)
- [ ] Update share API to accept recipient email, name, and custom message
- [ ] Implement single share link email with rich preview
- [ ] Add video embed support if video URL provided
- [ ] ~~Implement weekly reminder sequence~~ (REMOVED - single email approach)
- [ ] Store email history with share tokens

### Phase 3: Polish & Testing (Week 3)
- [ ] Add expiry warning system (if email available)
- [ ] Test all email templates
- [ ] Add email preview endpoints
- [ ] Implement retry logic for failed sends
- [ ] Documentation and training

## 5. Technical Implementation Details

### Phase 2: Share Token Enhancement Requirements
```typescript
// Enhanced share generation with email capability
POST /api/vetted-sites/requests/[id]/share
{
  expiresInDays: 30,
  sendViaEmail: boolean,      // Toggle to enable email
  recipientEmail?: string,    // Required if sendViaEmail is true
  recipientName?: string,     // Optional: for personalization
  customMessage?: string,     // Optional: custom context
  videoUrl?: string,          // Optional: Loom/video URL for embed
  enableReminders?: boolean   // Default: true - send weekly reminders
}

// Reminder scheduling (automated background job)
interface ReminderSchedule {
  initial: 'immediate',
  reminder1: '+7 days',
  reminder2: '+14 days', 
  reminder3: '+21 days (7 days before expiry)',
  finalWarning: '+27 days (3 days before expiry)',
  lastChance: '+29 days (1 day before expiry)'
}
```

### Database Schema Changes
```sql
-- Add to vetted_sites_requests table for Phase 2
ALTER TABLE vetted_sites_requests ADD COLUMN IF NOT EXISTS 
  share_recipient_email VARCHAR(255),          -- Single recipient email
  share_recipient_name VARCHAR(255),           -- Recipient name for personalization
  share_custom_message TEXT,                   -- Custom message from sender (NEW FEATURE)
  share_video_url TEXT,                        -- Loom or other video URL
  share_reminders_enabled BOOLEAN DEFAULT true, -- Enable reminder sequence
  share_last_reminder_sent TIMESTAMP,          -- Track last reminder sent
  share_reminder_count INTEGER DEFAULT 0;      -- Count of reminders sent

-- Note: Custom message feature currently doesn't exist in the system
-- Need to add:
-- 1. Database field above ✓
-- 2. UI field in share modal
-- 3. Pass custom message to email template
-- 4. Display custom message in share email (see Email 4 template)

-- Simple notification log
CREATE TABLE IF NOT EXISTS vetted_sites_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES vetted_sites_requests(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,  -- 'approved', 'fulfilled', 'rejected', 'share', 'claim'
  status VARCHAR(50) DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Data Extraction for Rich Email Content
```typescript
// When status changes to fulfilled, gather rich data for email:
async function gatherFulfillmentEmailData(requestId: string) {
  // Get qualified domains with their rich metrics
  const domains = await db
    .select({
      domain: bulkAnalysisDomains.domain,
      qualificationStatus: bulkAnalysisDomains.qualificationStatus,
      evidence: bulkAnalysisDomains.evidence,
      aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
      overlapStatus: bulkAnalysisDomains.overlapStatus,
      authorityDirect: bulkAnalysisDomains.authorityDirect,
      authorityRelated: bulkAnalysisDomains.authorityRelated,
      // Website metrics
      domainRating: websites.domainRating,
      totalTraffic: websites.totalTraffic,
      guestPostCost: websites.guestPostCost,
    })
    .from(bulkAnalysisDomains)
    .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
    .where(
      and(
        eq(bulkAnalysisDomains.sourceRequestId, requestId),
        inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality'])
      )
    )
    .orderBy(desc(bulkAnalysisDomains.evidence.directCount))
    .limit(5);

  // Calculate aggregates
  const stats = {
    totalQualified: domains.length,
    avgDirectKeywords: avg(domains.evidence.directCount),
    avgRelatedKeywords: avg(domains.evidence.relatedCount),
    strongAuthorityCount: domains.filter(d => d.authorityDirect === 'strong').length,
    avgPosition: avg(domains.evidence.directMedianPosition),
  };

  return { topDomains: domains, stats };
}
```

### Email Service Integration Points
```typescript
// In /api/vetted-sites/requests/[id]/route.ts
import { emailService } from '@/lib/services/emailService';

// When status changes to fulfilled (MOST IMPORTANT)
if (validatedData.status === 'fulfilled') {
  const account = await getAccountDetails(requestRecord.accountId);
  if (account?.email) {
    // Gather rich data for email
    const { topDomains, stats } = await gatherFulfillmentEmailData(requestId);
    
    await emailService.send({
      to: account.email,
      subject: 'Your vetted sites analysis is ready! 🎯',
      template: 'vetted-sites-fulfilled',
      data: {
        requestId,
        resultsUrl: `${baseUrl}/vetted-sites/requests/${requestId}?utm_source=email&utm_campaign=fulfillment`,
        totalQualified: stats.totalQualified,
        topDomains: topDomains.map(d => ({
          domain: d.domain,
          directKeywords: d.evidence?.directCount || 0,
          relatedKeywords: d.evidence?.relatedCount || 0,
          avgPosition: d.evidence?.directMedianPosition || null,
          dr: d.domainRating,
          traffic: d.totalTraffic,
          cost: d.guestPostCost, // Show actual price from database, not markup formula
          reasoning: d.aiQualificationReasoning?.substring(0, 100) + '...'
        })),
        insights: {
          avgKeywordOverlap: stats.avgDirectKeywords + stats.avgRelatedKeywords,
          strongAuthorityPercentage: (stats.strongAuthorityCount / stats.totalQualified) * 100,
          avgRanking: stats.avgPosition
        }
      }
    });
  }
}

// In /api/vetted-sites/requests/[id]/share/route.ts
// Enhanced share endpoint with email
export async function POST(request: NextRequest) {
  const { expiresInDays, recipientEmail, recipientName, customMessage } = await request.json();
  
  // Generate share token as before
  const shareToken = uuidv4();
  const shareUrl = `${baseUrl}/vetted-sites/claim/${shareToken}`;
  
  // If email provided, send it
  if (recipientEmail) {
    await emailService.send({
      to: recipientEmail,
      subject: 'Your vetted sites analysis results',
      template: 'vetted-sites-share',
      data: {
        recipientName,
        shareUrl,
        expiresAt: shareExpiresAt,
        customMessage
      }
    });
    
    // Track that we sent this
    await db.update(vettedSitesRequests)
      .set({
        share_recipient_emails: sql`
          COALESCE(share_recipient_emails, '[]'::jsonb) || 
          ${JSON.stringify([{ email: recipientEmail, sentAt: new Date() }])}::jsonb
        `
      });
  }
}

```
## 6. Email Tracking & Metrics

### Resend Standard Tracking (What We'll Use)
```typescript
// Resend provides these metrics out-of-the-box:
- Email delivered (successful delivery to inbox)
- Email opened (via tracking pixel)
- Links clicked (which links and how many times)
- Bounce rate
- Complaint rate (spam reports)
```

### Primary Success Metrics
- **Fulfillment email open rate** (target: >80%)
- **Click-through to "View Full Analysis"** (target: >60%)  
- **Time from email to first site view** (target: <24 hours)
- **Approval email open rate** (target: >70%)

### UI Events to Track (Simple Implementation)
```typescript
// When user lands from email link
- Track UTM parameters: ?utm_source=email&utm_campaign=fulfillment
- Log view event: "user_viewed_results_from_email"
- Store in vetted_sites_notifications table

// No need for complex tracking of:
- Individual domain views (too granular)
- Bookmark actions (not relevant to notification success)
```

## 7. UI Component Requirements

### Phase 2: Enhanced Share Modal UI
```typescript
interface ShareModalProps {
  requestId: string;
  currentVideoUrl?: string;  // If video already attached to request
  onShare: (options: ShareOptions) => void;
}

interface ShareOptions {
  expiresInDays: number;
  sendViaEmail: boolean;
  recipientEmail?: string;
  recipientName?: string; 
  customMessage?: string;
  videoUrl?: string;
  enableReminders: boolean;
}

// Modal UI Structure:
<ShareModal>
  {/* Expiry selector (default: 30 days) */}
  
  {/* Email toggle switch */}
  <Toggle label="Send via email" />
  
  {showEmailFields && (
    <>
      <Input label="Recipient email*" type="email" />
      <Input label="Recipient name" placeholder="Optional" />
      <Textarea 
        label="Personal message" 
        placeholder="Add context about this analysis..."
      />
      <Input 
        label="Video URL" 
        placeholder="Loom or video link (optional)"
      />
      <Checkbox 
        label="Send weekly reminders until viewed" 
        defaultChecked={true}
      />
    </>
  )}
  
  {/* Preview of what will be sent */}
  {recipientEmail && (
    <div className="preview">
      Sending to: {recipientEmail}
      {enableReminders && "✓ Weekly reminders enabled"}
    </div>
  )}
</ShareModal>
```

## 8. Custom Message Feature Requirements (NEW)

**Current State**: Custom message functionality doesn't exist yet  
**User Feedback**: "That's a good idea actually, expand on that"

### Implementation Requirements:

**1. Database (✓ Planned above)**
- `share_custom_message TEXT` column added to vetted_sites_requests

**2. UI Components Needed:**
```typescript
// In ShareModal component:
<Textarea 
  label="Personal message" 
  placeholder="Add context about this analysis..."
  value={customMessage}
  onChange={setCustomMessage}
  maxLength={500}
/>
```

**3. API Update Needed:**
```typescript
// In /api/vetted-sites/requests/[id]/share/route.ts
export async function POST(request: NextRequest) {
  const { customMessage, recipientEmail, recipientName } = await request.json();
  
  // Store in database
  await db.update(vettedSitesRequests)
    .set({
      shareCustomMessage: customMessage,
      shareRecipientEmail: recipientEmail,
      shareRecipientName: recipientName
    })
    .where(eq(vettedSitesRequests.id, requestId));

  // Send email with custom message
  await emailService.send({
    template: 'vetted-sites-share',
    data: {
      customMessage,
      recipientName,
      // ... other data
    }
  });
}
```

**4. Email Template Integration:**
- Display custom message in Email 4 (Share Link - Initial)
- Also include in reminder emails if original message provided

## 9. Unsubscribe System (REQUIRED)

**User Feedback**: "We probably need some way to stop these emails if the user just isn't interested."

### Database Schema Addition
```sql
-- Add unsubscribe tracking to vetted_sites_requests
ALTER TABLE vetted_sites_requests ADD COLUMN IF NOT EXISTS 
  email_unsubscribed BOOLEAN DEFAULT false,
  email_unsubscribed_at TIMESTAMP,
  email_unsubscribe_reason TEXT;

-- Simple unsubscribe log
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  request_id UUID REFERENCES vetted_sites_requests(id),
  unsubscribe_type VARCHAR(50) NOT NULL, -- 'fulfillment', 'reminders', 'all'
  unsubscribed_at TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  reason TEXT
);
```

### Implementation Requirements
1. **Unsubscribe Links**: Add to all email footers
2. **Unsubscribe Page**: Simple one-click unsubscribe at `/unsubscribe/[token]`
3. **Email Check**: Before sending any email, check unsubscribe status
4. **Granular Control**: 
   - Unsubscribe from ALL emails for this request
   - Unsubscribe from reminders only (keep fulfillment/approval)

### Email Footer Template
```html
<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
  <a href="{{unsubscribeUrl}}" style="color: #666;">Unsubscribe from these emails</a>
</div>
```

## 10. DEEP DATA ANALYSIS - ACTUAL SYSTEM CAPABILITIES

**Based on code review, here's what data we ACTUALLY have:**

### ✅ Available Data for Emails

**From `bulk_analysis_domains` table:**
- `domain` - The actual domain name
- `qualificationStatus` - 'high_quality', 'good_quality', 'marginal_quality', 'disqualified'
- `evidence` (JSONB) - `{directCount, directMedianPosition, relatedCount, relatedMedianPosition}`
- `overlapStatus` - 'direct', 'related', 'both', 'none'
- `authorityDirect`/`authorityRelated` - 'strong', 'moderate', 'weak', 'n/a'
- `topicScope` - 'short_tail', 'long_tail', 'ultra_long_tail'
- `aiQualificationReasoning` - Text explaining WHY the site was selected
- `suggestedTargetUrl` - AI's recommended target page
- `targetMatchData` (JSONB) - Complete target URL analysis

**From `websites` table (LEFT JOINed):**
- `domainRating` - Ahrefs DR score
- `totalTraffic` - Monthly traffic estimate  
- `guestPostCost` - Actual pricing
- `categories`, `niche`, `websiteType` - Arrays of classifications

**From `clients` table:**
- `name` - Company name (may not always be meaningful)
- `website` - Normalized domain (e.g., "example.com" - this is what you mentioned)

**From `vettedSitesRequests` table:**
- `targetUrls` (JSONB) - Array of target URLs submitted
- `accountId` - Links to account for email address

### ❌ Data We DON'T Have (Stop Making This Up!)
- ❌ **Competition data** - No competitive analysis exists
- ❌ **"20K sites analyzed"** - We don't track total sites analyzed 
- ❌ **Cost savings comparisons** - No baseline to compare against
- ❌ **"AI Overviews visibility"** - This is marketing copy, not tracked data

### ✅ Correct Link Format
**Account User Results**: `/vetted-sites?requestId=[requestId]`  
**Share Token Results**: `/vetted-sites/claim/[shareToken]`

## 11. GRANULAR IMPLEMENTATION PLAN - READY TO BUILD

### **Research Findings:**
- ✅ **No existing notifications/progress system** in vetted sites pages - we're building from scratch
- ✅ **Schema review complete** - found recent additions: `domainCount`, `qualifiedDomainCount`, junction tables
- ✅ **Email logging plan**: Integrate into existing vetted sites request tracking (no separate progress system exists)

---

---

## **🔄 IMPLEMENTATION STATUS - PHASE 1 COMPLETE WITH UNIFIED UX**

**Status**: ✅ **PHASE 1 COMPLETE** - Share token notification system fully implemented  
**Focus**: Share token notification (Email 4) - Full end-to-end functionality  
**Date**: 2025-08-27  

**What's Working**: 
- ✅ Backend email system fully functional
- ✅ Unified share modal with consolidated UX
- ✅ Single message field (no fragmentation)
- ✅ Smart validation (share links always work, email blocked only when 0 qualified domains)
- ✅ Rich email template with domain metrics table
- ✅ End-to-end testing completed

**What Was Fixed**: 
- ❌ **UX Fragmentation Issue**: Eliminated duplicate message fields, consolidated "Add Video & Message" + "Send Email" into unified interface
- ❌ **Inconsistent Validation**: Now allows share links with 0 domains, blocks only email sending
- ❌ **Import Path Errors**: Fixed module resolution issues with build cache clearing

### **What Was Built:**

**1. Database Schema (Migration 0074)**
- Added `shareRecipientEmail`, `shareRecipientName`, `shareCustomMessage`, `shareEmailSentAt` to `vettedSitesRequests`
- Uses existing `email_logs` table for delivery tracking
- Migration file: `/migrations/0074_share_token_email_support.sql`

**2. Email Template (`VettedSitesShareEmail.tsx`)**
- Professional React Email template with data table
- Shows top 5 domains with keyword matches, DR, traffic, cost
- Supports optional video embeds and custom messages
- Monospace styling for technical data display

**3. Email Service (`VettedSitesEmailService.ts`)**
- Queries `bulkAnalysisDomains` + `websites` for rich email data
- Formats data for email template consumption
- Integrates with existing `EmailService.sendWithTemplate()`
- Handles errors gracefully without breaking share link generation

**4. API Integration (`/api/vetted-sites/requests/[id]/share`)**
- Extended POST endpoint to accept email parameters
- Optional email sending via `sendEmail: true` flag
- Backward compatible - works with/without email
- Returns email success/failure status

**5. Email Type Registration**
- Added `'vetted-sites-share'` to `EmailType` enum
- Integrates with existing email logging system

### **How To Use:**

**API Call to Send Share Email:**
```javascript
POST /api/vetted-sites/requests/[requestId]/share
{
  "expiresInDays": 30,
  "sendEmail": true,
  "recipientEmail": "prospect@example.com", 
  "recipientName": "John Smith",
  "customMessage": "Based on our conversation about your Q4 launch, these sites align perfectly with your target audience."
}
```

**Response:**
```javascript
{
  "success": true,
  "shareToken": "abc-123-def",
  "shareUrl": "https://app.com/vetted-sites/claim/abc-123-def",
  "expiresAt": "2025-09-26T...",
  "emailSent": true,
  "emailError": null
}
```

**Email Will Show:**
- Subject: "12 keyword-matched sites identified for example.com"
- Rich data table with top 5 domains
- Optional video embed if `proposalVideoUrl` exists on request
- Optional custom message if provided
- CTA button to claim analysis
- Professional Linkio branding

## **PROGRESS STATUS:**

### **✅ COMPLETED (Share Token Email Only):**
1. **Database Schema** - Migration 0074 applied with share email fields
2. **Email Template** - `VettedSitesShareEmail.tsx` with rich data table  
3. **Email Service** - `VettedSitesEmailService.ts` with data queries
4. **API Integration** - Share endpoint accepts email parameters
5. **UI Modal** - Unified share modal with email fields
6. **Frontend Integration** - Connected to backend API
7. **End-to-End Testing** - Share token email flow fully working

### **❌ NOT IMPLEMENTED (Other Notification Types):**
1. **Approval Notifications** - Email when status → 'approved'
2. **Fulfillment Notifications** - Email when status → 'fulfilled'  
3. **Rejection Notifications** - Email when status → 'rejected'
4. **Unsubscribe System** - User preference management
5. **Reminder System** - Follow-up emails for shares

---

## **INFRASTRUCTURE AUDIT FINDINGS (2025-08-27)**

### **Existing Email Infrastructure**
✅ **Strong foundation already exists** - No need to build from scratch

**Current Tables:**
1. **`email_logs`** (migration 0017) - Universal email tracking:
   - Already tracks: `type`, `recipients[]`, `subject`, `status`, `resend_id`
   - Has GIN index on recipients array for fast queries
   - Integrated with Resend API
   - Perfect foundation for notifications

2. **`email_processing_logs`** (migration 0056) - Different purpose:
   - For ManyReach webhook processing (publisher email responses)
   - Not suitable for notification unsubscribes

**Current emailService.ts:**
- ✅ Resend integration working
- ✅ Automatic logging to email_logs
- ✅ Support for email types including 'notification'
- ✅ Multi-recipient support
- ✅ Error handling and status tracking

### **User Tables (3 Types for Notifications)**
1. **`users`** - Internal staff (schema.ts:6-16)
2. **`accounts`** - External clients who order guest posts (accountSchema.ts)  
3. **`publishers`** - Publisher users (publisherSchemaActual.ts)

**Key Insight**: Need to support unsubscribes across all 3 user types, not just accounts.

### **Recommended Architecture (When Ready to Implement)**

**Extend existing infrastructure instead of creating new:**

```sql
-- Add to existing email system
CREATE TABLE email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'account', 'publisher', 'internal'
  user_id UUID NOT NULL, -- References accounts.id, publishers.id, or users.id
  
  -- Context
  context_type VARCHAR(50) NOT NULL, -- 'vetted_sites_request', 'order', 'workflow'
  context_id VARCHAR(255), -- Specific ID or NULL for global
  unsubscribe_scope VARCHAR(50) DEFAULT 'all', -- 'all', 'reminders', 'updates'
  
  unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reference existing email_logs table for history
-- No need to duplicate email tracking functionality
```

**Service Pattern:**
- Extend existing `EmailService.send()` method
- Add unsubscribe checking before sending
- Use existing email_logs for delivery tracking
- Generate unsubscribe tokens that work universally

---

## **IMPLEMENTATION PHASES (READY WHEN NEEDED)**

### **Phase 1: Core Vetted Sites Notifications**
✅ **Research complete** - All touchpoints identified  
✅ **Database audit complete** - Can extend existing email_logs  
✅ **Service pattern defined** - Extend existing emailService  
⏸️ **Implementation paused**

**What's Ready:**
- Email templates designed (fulfillment, approval, rejection)
- Database queries written (real data from bulk_analysis_domains)
- Unsubscribe system designed (app-wide reusable)
- API integration points identified (PATCH /api/vetted-sites/requests/[id]/route.ts)

### **Phase 2: Advanced Features (Future)**
- Reminder sequences for unfulfilled requests
- Email preferences dashboard
- Granular unsubscribe options
- Cross-feature notification management

### **Phase 3: Analytics & Optimization (Future)**
- Email open/click tracking
- Notification effectiveness metrics
- A/B testing framework

---

## **WHEN TO RESUME IMPLEMENTATION**

**Triggers:**
1. User feedback confirms notification value
2. Manual fulfillment process becomes burdensome
3. Client requests for better communication
4. Ready to invest in notification infrastructure

**Estimated Implementation Time:**
- Phase 1: 2-3 days (foundation already researched)
- Database migration: 30 minutes
- Service integration: 4 hours
- Email templates: 2 hours  
- API integration: 2 hours
- Testing: 4 hours

---

## **ORIGINAL IMPLEMENTATION PLAN (PRESERVED FOR REFERENCE)**

### **Task 1.1: Database Schema Updates (Day 1) - APP-WIDE REUSABLE**
**Files to create/modify:** 
- `lib/db/emailNotificationSchema.ts` (new - app-wide)
- `lib/db/vettedSitesRequestSchema.ts` (modify - specific fields)

**1.1.1: Create App-Wide Email Notification System**
```sql
-- Create universal unsubscribe system
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
  
  -- What they're unsubscribing from (flexible)
  context_type VARCHAR(50) NOT NULL, -- 'vetted_sites_request', 'order', 'newsletter', etc.
  context_id VARCHAR(255), -- The ID of the thing they're unsubscribing from
  
  -- Granular unsubscribe options
  unsubscribe_scope VARCHAR(50) DEFAULT 'all', -- 'all', 'reminders', 'updates', 'marketing'
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  reason TEXT,
  unsubscribed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Universal email log (not tied to one feature)
CREATE TABLE IF NOT EXISTS email_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who and what
  recipient_email VARCHAR(255) NOT NULL,
  email_type VARCHAR(100) NOT NULL, -- 'vetted_sites_fulfillment', 'order_confirmation', etc.
  
  -- Context (flexible for any app feature)
  context_type VARCHAR(50) NOT NULL, -- 'vetted_sites_request', 'order', 'workflow', etc.
  context_id VARCHAR(255) NOT NULL, -- The specific ID
  
  -- Email tracking
  sent_at TIMESTAMP DEFAULT NOW(),
  resend_message_id VARCHAR(255), -- For Resend API tracking
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'failed'
  
  -- Debugging
  template_used VARCHAR(100),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unsubscribe link included
  unsubscribe_token VARCHAR(255), -- References email_unsubscribes.unsubscribe_token
  
  FOREIGN KEY (unsubscribe_token) REFERENCES email_unsubscribes(unsubscribe_token)
);

-- Indexes for performance across all features
CREATE INDEX idx_email_log_recipient ON email_notifications_log(recipient_email);
CREATE INDEX idx_email_log_context ON email_notifications_log(context_type, context_id);
CREATE INDEX idx_email_log_sent_at ON email_notifications_log(sent_at);
CREATE INDEX idx_email_log_type ON email_notifications_log(email_type);
CREATE INDEX idx_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX idx_unsubscribes_token ON email_unsubscribes(unsubscribe_token);
CREATE INDEX idx_unsubscribes_context ON email_unsubscribes(context_type, context_id);
```

**1.1.2: Vetted Sites Specific Fields**
```sql
-- Add minimal tracking to vetted_sites_requests (most logic in universal tables)
ALTER TABLE vetted_sites_requests ADD COLUMN IF NOT EXISTS 
  -- Simple email tracking
  last_notification_sent_at TIMESTAMP,
  notification_count INTEGER DEFAULT 0;
  
-- Note: Unsubscribe status checked via email_unsubscribes table
-- Note: Email logging in email_notifications_log table
```

**Checklist:**
- [ ] Run migration on local database
- [ ] Update TypeScript schema file with new fields
- [ ] Test schema changes don't break existing queries
- [ ] Verify all indexes are created

### **Task 1.2: Email Service Integration (Day 1-2)**
**Files to create/modify:** 
- `lib/services/vettedSitesEmailService.ts` (new)
- `lib/services/emailService.ts` (modify to add templates)

**1.2.1: Create Vetted Sites Email Service**
```typescript
// lib/services/vettedSitesEmailService.ts
export class VettedSitesEmailService {
  
  // Check if user has unsubscribed (using universal system)
  private async checkUnsubscribeStatus(email: string, contextId: string): Promise<boolean> {
    const unsubscribe = await db.query.emailUnsubscribes.findFirst({
      where: and(
        eq(emailUnsubscribes.email, email),
        eq(emailUnsubscribes.contextType, 'vetted_sites_request'),
        eq(emailUnsubscribes.contextId, contextId)
      )
    });
    return !!unsubscribe;
  }

  // Generate unsubscribe token (universal system)
  private async generateUnsubscribeToken(email: string, contextId: string): Promise<string> {
    const token = crypto.randomUUID();
    
    await db.insert(emailUnsubscribes).values({
      email,
      unsubscribeToken: token,
      contextType: 'vetted_sites_request',
      contextId,
      unsubscribeScope: 'all' // Can be made granular later
    });
    
    return token;
  }

  // Log email send attempt (using universal system)
  private async logEmail(
    email: string, 
    emailType: string, 
    contextId: string, 
    unsubscribeToken: string,
    metadata: any
  ) {
    return db.insert(emailNotificationsLog).values({
      recipientEmail: email,
      emailType,
      contextType: 'vetted_sites_request',
      contextId,
      unsubscribeToken,
      templateUsed: emailType.replace('vetted_sites_', ''),
      metadata
    });
  }

  // Extract fulfillment email data from database
  async buildFulfillmentEmailData(requestId: string) {
    // Get qualified domains with their rich metrics (from our analysis)
    const domains = await db
      .select({
        domain: bulkAnalysisDomains.domain,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus,
        evidence: bulkAnalysisDomains.evidence,
        aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
        overlapStatus: bulkAnalysisDomains.overlapStatus,
        authorityDirect: bulkAnalysisDomains.authorityDirect,
        authorityRelated: bulkAnalysisDomains.authorityRelated,
        // Website metrics (LEFT JOIN)
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        guestPostCost: websites.guestPostCost,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .where(
        and(
          eq(bulkAnalysisDomains.sourceRequestId, requestId),
          inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality'])
        )
      )
      .orderBy(desc(bulkAnalysisDomains.evidence)) // Order by best evidence first
      .limit(5); // Top 5 for email

    // Calculate summary stats
    const stats = {
      totalQualified: domains.length,
      excellentCount: domains.filter(d => d.qualificationStatus === 'high_quality').length,
      goodCount: domains.filter(d => d.qualificationStatus === 'good_quality').length,
      avgDirectKeywords: domains.reduce((sum, d) => sum + (d.evidence?.directCount || 0), 0) / domains.length,
      avgRanking: domains.reduce((sum, d) => sum + (d.evidence?.directMedianPosition || 0), 0) / domains.length
    };

    return { topDomains: domains, stats };
  }

  async sendFulfillmentNotification(requestId: string) {
    // Get request and account details first to get email
    const request = await db.query.vettedSitesRequests.findFirst({
      where: eq(vettedSitesRequests.id, requestId),
      with: { account: true }
    });
    
    if (!request?.account?.email) return;

    // Check if user has unsubscribed (universal system)
    if (await this.checkUnsubscribeStatus(request.account.email, requestId)) return;

    // Build rich email data
    const { topDomains, stats } = await this.buildFulfillmentEmailData(requestId);
    
    // Generate unsubscribe token (universal system - stored in email_unsubscribes table)
    const unsubscribeToken = await this.generateUnsubscribeToken(request.account.email, requestId);

    try {
      // Send email via existing emailService
      const result = await emailService.send({
        to: request.account.email,
        subject: `Your vetted sites analysis is ready! 🎯`,
        template: 'vetted-sites-fulfillment',
        data: {
          requestId,
          resultsUrl: `${process.env.NEXTAUTH_URL}/vetted-sites?requestId=${requestId}&utm_source=email&utm_campaign=fulfillment`,
          unsubscribeUrl: `${process.env.NEXTAUTH_URL}/unsubscribe/${unsubscribeToken}`,
          totalQualified: stats.totalQualified,
          excellentCount: stats.excellentCount,
          goodCount: stats.goodCount,
          topDomains: topDomains.map(d => ({
            domain: d.domain,
            directKeywords: d.evidence?.directCount || 0,
            relatedKeywords: d.evidence?.relatedCount || 0,
            avgPosition: d.evidence?.directMedianPosition || null,
            dr: d.domainRating,
            traffic: d.totalTraffic,
            cost: d.guestPostCost,
            reasoning: d.aiQualificationReasoning?.substring(0, 100) + '...'
          }))
        }
      });

      // Log the email (universal system)
      await this.logEmail(
        request.account.email, 
        'vetted_sites_fulfillment', 
        requestId, 
        unsubscribeToken,
        { stats, topDomainsCount: topDomains.length, resendMessageId: result?.id }
      );

      // Update request with notification tracking
      await db.update(vettedSitesRequests)
        .set({ 
          lastNotificationSentAt: new Date(),
          notificationCount: sql`notification_count + 1`
        })
        .where(eq(vettedSitesRequests.id, requestId));

    } catch (error) {
      // Log failed email attempt (universal system)
      await this.logEmail(
        request.account.email, 
        'vetted_sites_fulfillment', 
        requestId, 
        unsubscribeToken,
        { error: error.message, failed: true }
      );
      throw error;
    }
  }

  async sendApprovalNotification(requestId: string) { /* Similar pattern */ }
  async sendRejectionNotification(requestId: string) { /* Similar pattern */ }
}
```

**Checklist:**
- [ ] Create vettedSitesEmailService.ts with all 3 notification methods
- [ ] Test buildFulfillmentEmailData query returns correct data
- [ ] Integrate unsubscribe token generation
- [ ] Test email logging functionality

### **Task 1.3: Email Templates (Day 2)**
**Files to modify:** `lib/services/emailService.ts`

Add 3 new email templates to the existing emailService:

```typescript
// Add to emailService.ts templates
const templates = {
  // ... existing templates
  
  'vetted-sites-fulfillment': {
    subject: 'Your vetted sites analysis is ready! 🎯',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Great news! We found {{totalQualified}} strategic matches</h2>
        
        <p>We found sites that already rank for your keywords, giving you visibility in search and AI results.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Top Strategic Matches:</h3>
          {{#each topDomains}}
          <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <strong>{{domain}}</strong><br>
            Keywords: {{directKeywords}} direct, {{relatedKeywords}} related<br>
            {{#if avgPosition}}Avg Position: #{{avgPosition}}{{/if}}
            {{#if dr}}DR: {{dr}}{{/if}} 
            {{#if traffic}}Traffic: {{traffic}}/mo{{/if}}
            {{#if cost}}Cost: ${{cost}}{{/if}}<br>
            <em style="font-size: 12px; color: #666;">{{reasoning}}</em>
          </div>
          {{/each}}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resultsUrl}}" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Full Analysis & Justifications →
          </a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <a href="{{unsubscribeUrl}}" style="color: #666;">Unsubscribe from these emails</a>
        </div>
      </div>
    `
  },
  
  'vetted-sites-approval': {
    subject: 'Your vetted sites request has been approved ✅',
    html: `...` // Similar structure, simpler content
  },
  
  'vetted-sites-rejection': {
    subject: 'Update on your vetted sites request',
    html: `...` // Simple rejection message with reply option
  }
};
```

**Checklist:**
- [ ] Create all 3 HTML email templates
- [ ] Test template rendering with real data
- [ ] Verify unsubscribe links are included
- [ ] Test responsive design on mobile

### **Task 1.4: API Integration (Day 2-3)**
**Files to modify:** `app/api/vetted-sites/requests/[id]/route.ts`

**1.4.1: Trigger Notifications on Status Changes**
```typescript
// In the PATCH handler where status is updated

if (validatedData.status === 'fulfilled') {
  updateData.fulfilledBy = session.userId;
  updateData.fulfilledAt = new Date();
  
  // NEW: Trigger fulfillment notification
  try {
    await vettedSitesEmailService.sendFulfillmentNotification(id);
    console.log(`✅ Fulfillment notification sent for request ${id}`);
  } catch (error) {
    console.error(`❌ Failed to send fulfillment notification:`, error);
    // Don't fail the status update if email fails
  }
}

if (validatedData.status === 'approved') {
  updateData.approvedBy = session.userId;
  updateData.approvedAt = new Date();
  
  // NEW: Trigger approval notification
  try {
    await vettedSitesEmailService.sendApprovalNotification(id);
    console.log(`✅ Approval notification sent for request ${id}`);
  } catch (error) {
    console.error(`❌ Failed to send approval notification:`, error);
  }
}

if (validatedData.status === 'rejected') {
  // NEW: Trigger rejection notification  
  try {
    await vettedSitesEmailService.sendRejectionNotification(id);
    console.log(`✅ Rejection notification sent for request ${id}`);
  } catch (error) {
    console.error(`❌ Failed to send rejection notification:`, error);
  }
}
```

**Checklist:**
- [ ] Add notification triggers to all 3 status changes
- [ ] Test error handling doesn't break status updates
- [ ] Verify notifications only send when email is available
- [ ] Test with real request status changes

### **Task 1.5: Unsubscribe System (Day 3)**
**Files to create:**
- `app/unsubscribe/[token]/page.tsx` (new)
- `app/api/unsubscribe/[token]/route.ts` (new)

**1.5.1: Unsubscribe Page**
```typescript
// app/unsubscribe/[token]/page.tsx
export default async function UnsubscribePage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const { token } = await params;
  
  // Find request by unsubscribe token
  const request = await db.query.vettedSitesRequests.findFirst({
    where: eq(vettedSitesRequests.unsubscribeToken, token),
    with: { account: true }
  });

  if (!request) {
    return <div>Invalid unsubscribe link</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Unsubscribe from Emails</h2>
        <p className="mb-6">
          You will no longer receive emails about your vetted sites request for:
          <br />
          <strong>{request.targetUrls.join(', ')}</strong>
        </p>
        
        <form action={`/api/unsubscribe/${token}`} method="POST">
          <button 
            type="submit"
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
          >
            Unsubscribe
          </button>
        </form>
      </div>
    </div>
  );
}
```

**1.5.2: Unsubscribe API**
```typescript
// app/api/unsubscribe/[token]/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  
  const result = await db
    .update(vettedSitesRequests)
    .set({
      emailUnsubscribed: true,
      emailUnsubscribedAt: new Date()
    })
    .where(eq(vettedSitesRequests.unsubscribeToken, token))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  return NextResponse.redirect(new URL('/unsubscribe/success', request.url));
}
```

**Checklist:**
- [ ] Create unsubscribe page with clear messaging
- [ ] Create unsubscribe API endpoint
- [ ] Test token validation
- [ ] Create success page
- [ ] Test complete unsubscribe flow

### **Task 1.6: Testing & Integration (Day 4)**
**Testing Checklist:**
- [ ] Test fulfillment notification with real vetted sites request
- [ ] Test approval notification sends within 24hr timeline
- [ ] Test rejection notification is respectful and clear
- [ ] Test unsubscribe prevents future emails
- [ ] Test email logging appears in database
- [ ] Test error handling doesn't break existing functionality
- [ ] Test email templates render correctly on mobile
- [ ] Test Resend integration and delivery tracking

---

## **PHASE 2: Share System Enhancement (Week 2) - DETAILED TASKS**

### **Task 2.1: Database Schema for Custom Messages (Day 5)**
### **Task 2.2: Enhanced Share Modal UI (Day 5-6)**
### **Task 2.3: Share Email Template & Logic (Day 6-7)**
### **Task 2.4: Reminder System Background Jobs (Day 8-9)**

## **PHASE 3: Testing & Production Launch (Week 3)**

### **Task 3.1: Comprehensive Email Testing (Day 10-11)**
### **Task 3.2: Production Deployment & Monitoring (Day 12-14)**

---

**Status**: ✅ **PHASE 1 DETAILED BREAKDOWN COMPLETE**  
**Next Action**: Execute Task 1.1 (Database Schema Updates) immediately