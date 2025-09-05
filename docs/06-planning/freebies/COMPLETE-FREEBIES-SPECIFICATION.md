# Freebies Feature - Complete Technical Specification

## 1. System Overview

### Purpose
Create a lead generation system through collaborative guest posting opportunities where users contribute content to listicle articles in exchange for free backlinks.

### Core Architecture Decisions
- **Authentication**: Use existing account-based auth system (no new user types)
- **Data Model**: Reuse existing client/target page infrastructure  
- **UI Pattern**: Adapt VettedSitesLeadForm flow for signup
- **Workflow**: Simplified version of orders workflow for content management

## 2. User Types & Permissions

### Account Users (External)
- Can view public freebie opportunities
- Must signup to participate
- Can submit contributions
- Can view their submission history
- Cannot see other users' submissions until published

### Internal Users  
- Full CRUD on opportunities
- Review/approve/reject submissions
- Export content for article creation
- Manage publishing workflow
- View all analytics

### Anonymous Users
- Can view public opportunity listings
- Must signup to submit

## 3. Complete User Flows

### 3.1 Anonymous User Discovery Flow
```
1. User receives email about opportunity
   ↓
2. Clicks link → /freebies/[opportunity-id]
   ↓
3. Views opportunity details (public page)
   - Website metrics (DR, traffic)
   - Article topic and requirements
   - Deadline and spots remaining
   ↓
4. Clicks "Claim Your Spot"
   ↓
5. Signup wall (adapted from VettedSitesLeadForm)
   - Enter target URL
   - Enter email/password/name/company
   ↓
6. Account created (account user type)
   - Creates account entry
   - Creates client automatically
   - Creates target page from URL
   ↓
7. Redirected to /freebies/[id]/submit
   ↓
8. Submits contribution
   ↓
9. Success page with upsell
```

### 3.2 Existing Account User Flow
```
1. Login → /account/dashboard
   ↓
2. Sees "Free Opportunities" widget
   ↓
3. Clicks → /freebies (authenticated view)
   ↓
4. Views available opportunities
   ↓
5. Clicks opportunity → /freebies/[id]
   ↓
6. Clicks "Submit" → /freebies/[id]/submit
   ↓
7. Submits contribution
   ↓
8. Returns to dashboard
```

### 3.3 Internal User Management Flow
```
1. Login → /admin/freebies
   ↓
2. Creates new opportunity
   - Select website from database
   - Set topic, deadline, spots
   - Write justification
   ↓
3. Opportunity goes live
   ↓
4. Reviews submissions queue
   ↓
5. Approves/rejects with notes
   ↓
6. Exports approved content
   ↓
7. Creates article externally
   ↓
8. Updates opportunity with published URL
   ↓
9. System notifies contributors
```

## 4. Database Schema

### New Tables

```sql
-- Opportunities table
CREATE TABLE freebie_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  website_id UUID REFERENCES websites(id) NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  justification TEXT, -- Why this site/topic combo is valuable
  requirements TEXT, -- Submission requirements
  example_submission TEXT, -- Example of good submission
  
  -- Constraints
  max_spots INTEGER DEFAULT 50,
  min_spots INTEGER DEFAULT 5,
  deadline TIMESTAMP NOT NULL,
  
  -- Status management
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Values: draft, active, closed, compiling, published
  
  -- Publishing
  published_url TEXT,
  published_at TIMESTAMP,
  
  -- Metadata
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Submissions table  
CREATE TABLE freebie_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  opportunity_id UUID REFERENCES freebie_opportunities(id) NOT NULL,
  account_id UUID REFERENCES accounts(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  target_page_id UUID REFERENCES target_pages(id),
  
  -- Submission content
  content TEXT NOT NULL,
  
  -- Cached from client/target (for history)
  company_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  
  -- Review process
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  -- Values: submitted, in_review, approved, rejected, published
  
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  
  -- Publishing
  published_position INTEGER, -- Order in final article
  published_content TEXT, -- Edited version if modified
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_opportunities_status ON freebie_opportunities(status);
CREATE INDEX idx_opportunities_deadline ON freebie_opportunities(deadline);
CREATE INDEX idx_submissions_opportunity ON freebie_submissions(opportunity_id);
CREATE INDEX idx_submissions_account ON freebie_submissions(account_id);
CREATE INDEX idx_submissions_status ON freebie_submissions(status);
```

### Updates to Existing Tables

```sql
-- Add to target_pages (future enhancement)
ALTER TABLE target_pages 
ADD COLUMN seo_keywords TEXT[], -- SEO target keywords
ADD COLUMN seo_keywords_updated_at TIMESTAMP;

-- Add to clients (track source)
ALTER TABLE clients
ADD COLUMN acquisition_source VARCHAR(50); -- 'freebie', 'vetted_sites', 'direct'
```

## 5. State Machines

### Opportunity States
```
draft → active → closed → compiling → published
         ↓
      expired (if deadline passes)
```

**Transitions:**
- `draft → active`: Internal user publishes
- `active → closed`: Deadline reached OR max spots filled
- `active → expired`: Deadline passed with < min_spots
- `closed → compiling`: Internal user starts article creation
- `compiling → published`: Article goes live

### Submission States
```
submitted → in_review → approved → published
              ↓
           rejected
```

**Transitions:**
- `submitted → in_review`: Internal user opens submission
- `in_review → approved`: Passes quality check
- `in_review → rejected`: Fails quality check  
- `approved → published`: Article goes live

## 6. API Routes

### Public Routes
```
GET  /api/freebies/opportunities - List active opportunities
GET  /api/freebies/opportunities/[id] - Get opportunity details
```

### Authenticated Routes (Account Users)
```
POST /api/freebies/opportunities/[id]/submit - Submit contribution
GET  /api/freebies/my-submissions - User's submission history
```

### Internal Routes
```
# Opportunities CRUD
POST   /api/admin/freebies/opportunities - Create opportunity
PUT    /api/admin/freebies/opportunities/[id] - Update opportunity
DELETE /api/admin/freebies/opportunities/[id] - Delete opportunity
POST   /api/admin/freebies/opportunities/[id]/activate - Make active
POST   /api/admin/freebies/opportunities/[id]/close - Close manually

# Submissions Management
GET    /api/admin/freebies/submissions - List all with filters
PUT    /api/admin/freebies/submissions/[id]/review - Approve/reject
GET    /api/admin/freebies/opportunities/[id]/export - Export approved
POST   /api/admin/freebies/opportunities/[id]/publish - Mark published
```

## 7. UI Components & Pages

### Public Pages

#### `/freebies` - Opportunities listing
```jsx
<FreebiesListing>
  <Hero>
    <h1>Get Free Backlinks from High-Quality Sites</h1>
    <p>Contribute to collaborative articles, get links</p>
  </Hero>
  
  <OpportunityGrid>
    {opportunities.map(opp => (
      <OpportunityCard>
        <WebsiteMetrics dr={} traffic={} />
        <Topic>{opp.topic}</Topic>
        <Deadline>{opp.deadline}</Deadline>
        <SpotsRemaining>{opp.maxSpots - submissionCount}</SpotsRemaining>
        <CTAButton href="/freebies/[id]">View Details</CTAButton>
      </OpportunityCard>
    ))}
  </OpportunityGrid>
</FreebiesListing>
```

#### `/freebies/[id]` - Opportunity detail
```jsx
<OpportunityDetail>
  <WebsiteShowcase>
    <Domain>{website.domain}</Domain>
    <Metrics dr={} traffic={} />
    <Justification>{opportunity.justification}</Justification>
  </WebsiteShowcase>
  
  <ArticleDetails>
    <Topic>{opportunity.topic}</Topic>
    <Requirements>{opportunity.requirements}</Requirements>
    <Example>{opportunity.example_submission}</Example>
  </ArticleDetails>
  
  <CTASection>
    {!authenticated ? (
      <SignupCTA>Claim Your Spot</SignupCTA>
    ) : hasSubmitted ? (
      <ViewSubmission />
    ) : (
      <SubmitButton>Submit Your Content</SubmitButton>
    )}
  </CTASection>
</OpportunityDetail>
```

#### `/freebies/[id]/submit` - Submission form (auth required)
```jsx
<SubmissionForm>
  <OpportunityContext>
    <h2>Contributing to: {opportunity.title}</h2>
    <WebsiteBadge>{website.domain}</WebsiteBadge>
  </OpportunityContext>
  
  <YourDetails>
    <CompanyName value={client.name} disabled />
    <TargetURL value={targetPage.url} disabled />
  </YourDetails>
  
  <ContentSection>
    <label>
      How does {client.name} help with {opportunity.topic}?
    </label>
    <RichTextEditor
      value={content}
      onChange={setContent}
      minLength={200}
      maxLength={1000}
      placeholder="Write 2-3 paragraphs..."
    />
    <CharacterCount>{content.length}/1000</CharacterCount>
  </ContentSection>
  
  <SubmitButton disabled={content.length < 200}>
    Submit Contribution
  </SubmitButton>
</SubmissionForm>
```

### Internal Admin Pages

#### `/admin/freebies` - Management dashboard
```jsx
<FreebiesAdmin>
  <Tabs>
    <Tab name="Opportunities">
      <CreateOpportunityButton />
      <OpportunitiesTable>
        {/* CRUD interface */}
      </OpportunitiesTable>
    </Tab>
    
    <Tab name="Submissions">
      <SubmissionsQueue>
        <FilterBar status={} opportunity={} />
        <SubmissionsList>
          {submissions.map(sub => (
            <SubmissionReview>
              <CompanyInfo />
              <Content />
              <ApproveButton />
              <RejectButton />
            </SubmissionReview>
          ))}
        </SubmissionsList>
      </SubmissionsQueue>
    </Tab>
    
    <Tab name="Analytics">
      <ConversionFunnel />
      <SubmissionMetrics />
    </Tab>
  </Tabs>
</FreebiesAdmin>
```

## 8. Email Notifications

### Templates Needed

1. **Opportunity announcement** (mass email)
2. **Submission confirmation** (to contributor)
3. **Submission approved** (to contributor)
4. **Submission rejected** (to contributor)
5. **Article published** (to all approved contributors)
6. **Deadline reminder** (to non-submitters)

### Trigger Points
- Opportunity activated → Send announcement
- Submission created → Send confirmation
- Review completed → Send approval/rejection
- Article published → Send to all approved

## 9. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create database tables
- [ ] Set up basic CRUD APIs
- [ ] Create opportunity model
- [ ] Basic admin interface

### Phase 2: Public Interface (Week 2)
- [ ] Public opportunities page
- [ ] Opportunity detail page
- [ ] Adapt signup flow
- [ ] Submission form

### Phase 3: Review Workflow (Week 3)
- [ ] Submission queue
- [ ] Review interface
- [ ] Approval/rejection flow
- [ ] Export functionality

### Phase 4: Polish & Launch (Week 4)
- [ ] Email templates
- [ ] Analytics tracking
- [ ] Success page upsell
- [ ] Testing & QA

## 10. Success Metrics

### Primary KPIs
- **Signup rate**: Visitors → Signups
- **Submission rate**: Signups → Submissions
- **Approval rate**: Submissions → Approved
- **Conversion rate**: Freebie users → Paid customers

### Secondary KPIs
- Time to fill opportunities
- Repeat participation rate
- Email open/click rates
- Content quality score

## 11. Security Considerations

1. **Rate limiting**: Max 1 submission per account per opportunity
2. **Content moderation**: Review all submissions before publishing
3. **Email verification**: Required for all accounts
4. **CAPTCHA**: On signup to prevent bots
5. **Sanitization**: Clean all HTML from submissions

## 12. Technical Debt & Future Enhancements

### Immediate Debt
- Reusing VettedSitesLeadForm (should create FreebieSignupForm)
- No automated quality checks
- Manual article creation process

### Future Enhancements
- AI-powered submission quality scoring
- Automated article compilation
- Contributor reputation system
- Premium spots for better placement
- Integration with workflow system for article creation

## 13. Migration Plan

No migrations needed initially. Future migration for SEO keywords on target_pages.

## 14. Testing Strategy

### Unit Tests
- Opportunity state transitions
- Submission validation
- Permission checks

### Integration Tests  
- Full signup → submission flow
- Review workflow
- Email notifications

### E2E Tests
- Complete user journey
- Admin management flow

## 15. Rollback Plan

Feature can be toggled off via environment variable:
```env
FEATURE_FREEBIES_ENABLED=false
```

All data remains intact, just hidden from UI.