# Freebies Feature - Technical Implementation Plan V2

## Overview
Adapt existing auth and signup flows to create a lead magnet system for free collaborative guest posting opportunities.

## Key Principles
- **USE EXISTING AUTH** - Don't reinvent the wheel
- **Adapt homepage flow** - Already captures company/URL info
- **Keep it simple** - Start with textarea, improve later
- **Lead magnet first** - Focus on getting signups

## User Flow (Using Existing Systems)

### 1. Discovery
```
/freebies (public page)
    ↓
Shows all active opportunities
    ↓
/freebies/[opportunity-id] (detailed view)
```

### 2. Signup/Login (Existing Flow)
- Adapt existing homepage flow that captures:
  - Target URL
  - Company name  
  - Email/password
- Creates account user (with account entry in accounts table)
- For internal users: user_id = '00000000-0000-0000-0000-000000000000'

### 3. Post-Signup Redirect
Instead of vetted sites request, redirect to:
```
/freebies/[opportunity-id]/submit
```

### 4. Submission
- Simple textarea for now
- "Write 2-3 paragraphs about how [your product] helps with [topic]"
- Auto-populated with their company info

### 5. Success & Upsell
- Confirmation message
- Introduction to Linkio's paid services
- Email drip campaign starts

## Database Schema

### Core Tables

```sql
-- Opportunities table
CREATE TABLE freebie_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) NOT NULL,
  title TEXT NOT NULL, -- "50 Best Tools for X"
  topic TEXT NOT NULL, -- "growing online sales"
  description TEXT, -- Why this is valuable
  justification TEXT, -- "This site ranks for X, we're targeting Y"
  max_spots INTEGER DEFAULT 50,
  min_spots INTEGER DEFAULT 5, -- Minimum to publish
  deadline TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, closed, published
  published_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User submissions
CREATE TABLE freebie_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES freebie_opportunities(id),
  account_id UUID REFERENCES accounts(id), -- Links to their account
  client_id UUID REFERENCES clients(id), -- Auto-created from signup
  
  -- Submission content
  content TEXT NOT NULL, -- The main textarea content
  
  -- Metadata from their account/client
  company_name TEXT, -- Pulled from client
  target_url TEXT, -- Pulled from client
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'submitted', -- submitted, approved, rejected, published
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  
  -- Published details
  published_position INTEGER, -- Order in the article
  published_content TEXT -- Final edited version
);

-- Track conversion metrics
CREATE INDEX idx_freebie_submissions_account ON freebie_submissions(account_id);
CREATE INDEX idx_freebie_opportunities_status ON freebie_opportunities(status);
```

## Page Structure

### `/freebies` - Main listing page (public)
```jsx
- Hero: "Get Free Backlinks from High-Quality Sites"
- Active opportunities list:
  - Website domain + metrics (DR, traffic)
  - Article topic
  - Spots remaining
  - Deadline
  - CTA: "Claim Your Spot"
```

### `/freebies/[id]` - Opportunity detail (public)
```jsx
- Full opportunity details
- Website metrics showcase
- "Why this site is valuable" justification
- Submission requirements
- Example of good submission
- Big CTA: "Claim Your Spot" → signup flow
```

### `/freebies/[id]/submit` - Submission page (auth required)
```jsx
- Show opportunity context
- Company name (from client)
- Target URL selector (from their target pages)
- Main textarea:
  "How does [Company] help with [topic]?"
  - Placeholder with format guide
  - Min/max character count
- Submit button
```

### `/admin/freebies` - Internal management
```jsx
- Create new opportunities
- Select website from database
- Set topic, title, justification
- Review submissions queue
- Approve/reject with notes
- Export approved content for article creation
```

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)
1. Create database tables
2. Set up basic CRUD for opportunities
3. Admin page to create opportunities
4. Public listing page

### Phase 2: Submission Flow (Week 2)
1. Adapt existing signup flow for freebies
2. Create submission page
3. Store submissions with account linkage
4. Basic review interface

### Phase 3: Content Management (Week 3)
1. Approval workflow
2. Export functionality for approved content
3. Track published URLs
4. Notify users when published

### Phase 4: Optimization (Week 4)
1. Email notifications for deadlines
2. Analytics on conversion
3. A/B test landing pages
4. Improve submission format

## Key Decisions Made

1. **Use existing auth** - Don't create new signup flow
2. **Start simple** - One textarea, no complex form builder
3. **Account-based** - Every submission creates account user + client
4. **Flexible spots** - Min/max instead of fixed number
5. **Public first** - Show opportunity details before signup (trust building)

## Open Questions

1. Should we auto-create target pages from their submission URL?
2. How do we handle duplicate submissions from same company?
3. Should internal team submissions be allowed (for padding)?
4. Do we need a waitlist if opportunity fills up?
5. Email notifications - what triggers do we need?

## Success Metrics

- Signups per opportunity
- Submission rate (signups → submissions)
- Approval rate (submissions → approved)
- Conversion rate (freebie user → paid customer)
- Time to first order after freebie

## Migration Considerations

Later iteration: Add SEO keywords to target_pages table
```sql
ALTER TABLE target_pages 
ADD COLUMN seo_keywords TEXT[], -- Target keywords for SEO
ADD COLUMN keyword_notes TEXT; -- Keep existing keywords for prospecting
```

## Next Steps

1. Validate with 5 potential users
2. Create mockups for key pages
3. Set up tracking for metrics
4. Identify first 3 websites for launch
5. Draft email templates for outreach