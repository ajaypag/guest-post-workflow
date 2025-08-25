# Vetted Sites Managed Service Gateway - Implementation Plan

## Product Requirements Document

### Executive Summary

Transform the existing vetted sites interface into a managed service gateway that supports both internal fulfillment workflows and external sales enablement. This system enables prospects to submit discovery requests via a simple target URL, with internal team approval gates, automated project creation, and shareable public results for sales conversion.

### Problem & Opportunity

**Current State Issues:**
- Rigid order creation process: Users must explicitly create orders with fixed line items
- Limited serendipity: Orders constrain analysis to predefined line items (3-4 sites) even when team analyzes 20+ sites
- Poor first interaction: Complex setup before users see value from vetted sites data
- Missing flexibility: Current flow lacks "here's data, figure out what you want to do with it" approach

**Market Opportunity:**
- **Gateway Experience**: Target URL entry becomes primary entry point to platform
- **Flexible Discovery**: Replace rigid orders with serendipitous data exploration via vetted sites
- **Multi-Brand Support**: Handle multiple target URLs and intelligently parse different brands
- **Sales Enablement**: Internal team can generate analyses for prospects

### Solution Overview

#### Core Architecture: Two-Pathway Gateway System

**Pathway 1: Account Users (Primary)**
```
Account User → Enter Target URL(s) + Filters → Internal Approval → Auto Client/Project Creation → Bulk Analysis → Vetted Sites Results
```

**Pathway 2: Sales Tool**  
```
Internal Team → Create Analysis for Prospect → Generate Shareable Link → Prospect Views Results → Claim & Convert to Account
```

#### Key Components

1. **Discovery Request Interface** - Target URL entry with account creation requirement
2. **Multi-Brand Intelligence** - Parse multiple URLs and intelligently create separate brands
3. **Internal Approval Dashboard** - Cost-controlled human gate for analysis requests
4. **Auto Client/Project Creation** - Streamlined setup from target URLs using existing app structure
5. **Bulk Analysis Integration** - Leverage existing qualification pipeline
6. **Vetted Sites Results** - Flexible data exploration replacing rigid order line items

## User Personas & Use Cases

### Primary Users (Based on Existing System Architecture)

#### 1. **Account Users** (External Customers - PRIMARY)
- **Profile**: External clients/agencies who order guest posts via account authentication
- **Database**: `accounts` table with roles (viewer, editor, admin) and permissions
- **Current Behavior**: Manage multiple clients via `primaryClientId`, create orders with rigid line items
- **Multi-Client Access**: Can manage 1-N clients through account relationship
- **Pain Point**: Order creation forces upfront commitment before seeing full analysis results
- **Need**: Discovery-first approach - see vetted sites data before creating specific orders
- **Goal**: Flexible data exploration that leads to informed order decisions

#### 2. **Internal Users** (Staff - FULFILLMENT)
- **Profile**: Internal staff managing the platform (users table)
- **Database**: `users` table with roles (user, admin) - INTERNAL STAFF ONLY
- **Current Behavior**: Manage bulk analysis projects, fulfill orders, assign clients
- **Multi-Client Access**: Access controlled via `userClientAccess` and `clientAssignments`
- **Need**: Efficient workflow to approve/reject discovery requests with cost controls
- **Goal**: Streamlined project creation and analysis fulfillment

#### 3. **Publishers** (External Suppliers - SECONDARY)
- **Profile**: Website owners providing guest post opportunities
- **Database**: `publishers` table with website management via `publisherWebsites`
- **Current Behavior**: Manage websites, pricing, availability through publisher portal
- **Relevance**: May benefit from seeing demand signals from discovery requests
- **Goal**: (Future) Understand market demand for their website offerings

### User Journeys

### User Journeys (Confirmed Implementation Approach)

#### Journey A: Existing Account User Discovery (Primary Flow)
**Interface Location**: Vetted Sites page with "Request More Vetted Sites" option
```
Account User (authenticated) → Navigate to Vetted Sites page → Click "Request More Vetted Sites" (form popup/section) → Enter target URL(s) + filters (DR, traffic, price) → System parses multiple domains and auto-creates separate clients → Discovery request created with tracking → Internal user reviews & approves → Internal team runs bulk analysis → Results appear in Vetted Sites interface with request filter → User explores flexible data alongside existing vetted sites → Creates orders from selected domains
```

#### Journey B: New Account User Onboarding (Primary Landing Experience)
**Interface Location**: Replaces current "Get Started" flow entirely
```
New user visits landing page → Prominent discovery request form (main action) → Enters target URL → Required account creation + email verification → Discovery request submitted to internal team → Internal team approves & fulfills → User gets notification → Logs in to Vetted Sites interface → Results filtered by their request → Flexible data exploration → Order creation when ready
```

#### Journey C: Sales-Generated Analysis (External Account Transfer Pattern)
**Interface Location**: Separate internal page (following existing order transfer pattern)
```
Internal user creates discovery request in company-owned external account (e.g., "Sales" account) → Internal team fulfills analysis → System creates claim page with token (similar to order transfer) → Internal sales shares claim link → Prospect views results (no signup) → If interested, prospect creates account and claims analysis → Client and analysis data transfers from company-owned external account to their new account → Sales team gets conversion notification
```

**Key Integration Decisions**:
- **Vetted Sites Integration**: Discovery results appear in existing vetted sites interface
- **Filtering**: Sidebar filters added to filter by specific discovery request
- **Schema Update**: Pair generated vetted sites back to original discovery request
- **Home Page**: Prominent discovery request option for new users
- **Multi-Brand**: Multiple URLs automatically create separate clients

**Decision Summary**:
1. **Primary Interface**: Vetted Sites page with "Request More" option
2. **New User Onboarding**: Replace current get-started flow with discovery request
3. **Sales Tool**: Use existing account transfer pattern with claim pages
4. **Integration**: Results appear in existing vetted sites with request-based filtering
5. **Multi-Brand**: Auto-create separate clients per domain

## Functional Requirements

### Phase 1: Vetted Sites Request System

#### 1.1 Vetted Sites Request Interface
**Existing Users Location**: Vetted Sites page - "Request More Vetted Sites" button/section
**New Users Location**: Main landing page form (replaces get-started flow)

**Form Fields (Keep Simple):**
- **Required**: Target URL(s) - supports multiple URLs
- **Filters**: 
  - DR range (slider or input)
  - Traffic range
  - Price range
- **Optional**:
  - Niche selection (dropdown from websites table niches)
  - Special notes/instructions
- **No complexity**: Avoid keywords, categories, urgency - keep it simple

**Data Model:**
```typescript
interface VettedSitesRequest {
  id: string;
  accountId: string; // Link to account making request
  targetUrls: string[]; // Multiple URLs supported
  filters: {
    minDR?: number;
    maxDR?: number;
    minTraffic?: number;
    maxTraffic?: number;
    minPrice?: number;
    maxPrice?: number;
    niches?: string[]; // From website niches
  };
  notes?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  
  // Assignment workflow
  createdBy: string; // User who created request
  assignedTo: string; // Internal user assigned (defaults to creator)
  
  // Linking to other tables
  bulkAnalysisProjectId?: string; // Links to bulk analysis created
  clientIds: string[]; // Auto-created clients from parsed domains
  
  // Timestamps
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  completedAt?: Date;
  
  // For sales flow
  shareToken?: string; // For claim pages
  sourceAccountId?: string; // Company-owned external account for sales
}
```

#### 1.2 Internal Approval Dashboard
**Location**: `/internal/vetted-sites-requests`

**Features:**
- Queue of pending vetted sites requests
- Request details with parsed target URLs
- Approve/Reject with assignment workflow:
  - Auto-assigns to creator by default
  - Manager can reassign during approval
- Simple legitimacy check (manual for now)
- Batch operations for efficiency

**Approval Workflow:**
- Internal user reviews request
- Checks if legitimate (manual judgment)
- Approves and assigns (or reassigns)
- System sends notifications:
  - External user: "We're working on your request"
  - Assigned internal user: "New vetted sites request assigned"
- Expected turnaround: 24 hours

### Phase 2: Auto Client & Project Creation

#### 2.1 Smart Client/Target URL Selection (Existing Data)
**For existing account users with data:**
- UI shows existing clients and target URLs
- Users can select from existing or add new
- Smart duplicate detection using unique website+account constraint
- More flexible than just entering new URLs

**Duplicate Handling:**
- Check if client domain already exists for this account
- If exists: Add target URLs to existing client
- If target URL already exists: Use existing one
- Maintain unique constraint: website + account combination

#### 2.2 Editable Until Confirmation
```typescript
interface VettedSitesRequestEditability {
  // Editable states
  canEdit: status === 'submitted' || status === 'under_review';
  
  // Locked states (internal team working on it)
  locked: status === 'approved' || status === 'in_progress' || status === 'completed';
}
```

#### 2.3 Automated Setup After Approval (Following Orders Pattern)
**Review existing orders code for pattern - recreate similar flow:**

1. **Parse domains from URLs:**
   - Extract domain from each target URL
   - Guess client name from domain (e.g., shopify.com → "Shopify")
   - User can edit later if needed

2. **Create one project per unique brand/client:**
   - Internal user clicks button to auto-create projects
   - System creates one bulk analysis project per unique brand
   - Name format: "[Client Name] - Vetted Sites Request [Date]"

3. **Target page creation (after confirmation only):**
   - Auto-create target pages from submitted URLs
   - AI automation waits until confirmation (prevent abuse)
   - No automatic extraction of related pages
   - Must have keyword data and client description (check like orders)

4. **Bulk analysis configuration:**
   - Pre-select correct target URLs in bulk analysis
   - Pre-populate DR/traffic/price filters if possible
   - Internal user waits for analysis completion
   - Buttons appear to access projects once ready

#### 2.4 Internal Fulfillment Flow (Structured)
```
1. Internal user reviews approved request
2. Clicks "Create Projects" button
3. System auto-creates one project per unique client
4. System validates target URLs have required data (keywords, description)
5. Internal user initiates bulk analysis with pre-populated filters
6. Waits for AI analysis to complete
7. Reviews results and marks request as completed
```

### Phase 3: Results Generation & Tracking

#### 3.1 Bulk Analysis Execution (Using Existing System)
**No special configuration needed - use standard bulk analysis flow:**
1. Internal user clicks buttons to add domains
2. System runs auto AI qualification
3. Results automatically marked by quality level
4. Default filter: Only show high quality/good quality sites in vetted sites
5. Marginal/disqualified sites hidden by default

**Manual curation (optional):**
- Internal users can review within bulk analysis interface
- To hide a domain: Mark as disqualified manually
- No separate curation interface needed

#### 3.2 Flexible Results Approach (No Arbitrary Quality Gates)
**Philosophy**: User filters are hints, not gospel
- Default suggestion target: ~20 sites (flexible, not rigid)
- No minimum/maximum requirements
- No arbitrary quality thresholds
- Users can filter themselves in vetted sites sidebar (DR, traffic, price)

**Useful metrics to show (not requirements):**
```typescript
interface VettedSitesRequestMetrics {
  totalSuggestions: number;
  averagePrice: number;
  averageDR: number;
  averageTraffic: number;
  excellentMatches: number; // For target URL
  goodMatches: number;
  byTargetUrl: {
    [url: string]: {
      suggestions: number;
      excellentMatches: number;
    }
  }
}
```

#### 3.3 Results Linking & Filtering
**Link vetted sites back to request:**
- Each vetted site record links to generating request
- Appears in vetted sites sidebar filter: "My Requests"
- Smart dropdown design (not just simple list)

**Internal user considerations:**
- When filtering by account/client, smart filter vetted sites requests
- Integrate with existing filtering system
- Consider hierarchy: Account → Client → Request

#### 3.4 Completion Criteria
**Simple manual completion:**
- Vetted sites request is done when internal user marks it done
- NOT when bulk analysis completes
- NOT based on quality thresholds
- Internal user has full control over when it's "ready"

### Phase 4: Public Results Pages (Critical for Sales)

#### 4.1 Public Results Interface
**Purpose**: Eliminate friction - show amazing data first, then get signup
**Location**: Let implementation decide optimal URL structure

**Features:**
- **Full vetted sites data display** (no limits or preview)
- Reuse existing vetted sites component (without filter sidebar)
- Show everything to get prospects excited
- NO download/export before signup (view only)
- Clear, compelling call-to-action to sign up and claim

**Data Display (Already Safe):**
```typescript
// Show same data as logged-in users see
// Already excludes sensitive info:
// - Shows marked-up prices (not wholesale)
// - No publisher contact info
// - No internal notes
// Match scores CAN be shown (not sensitive)
```

#### 4.2 Conversion-Focused Design
**Key Message**: "Check out all this amazing data, all these amazing suggestions we have. Why wouldn't you sign up?"

**Page Design Requirements:**
- Professional presentation of vetted sites table
- Compelling signup CTA placement
- Value proposition clear and prominent
- Seamless flow from viewing to claiming
- Trust signals and social proof

#### 4.3 Technical Considerations
- Reuse vetted sites table component
- Remove interactive filters for public view
- Add signup/claim CTAs strategically
- Track viewing analytics for conversion optimization
- Secure token-based access (no auth required for viewing)

### Phase 5: Claim & Convert Flow (Following Order Claim Pattern)

#### 5.1 Claim Interface
**Location**: `/vetted-sites/claim/[shareToken]`

**Flow (matches existing order claim):**
1. Prospect views public results at `/results/[shareToken]`
2. Clicks "Claim These Results" → Goes to claim page
3. Shows signup form: email, password, contactName
4. Creates account and claims in one action
5. Redirects to verification pending page

#### 5.2 Data Transfer Process (Based on Order Pattern)
```typescript
// Following existing claim pattern from orders
const claimVettedSitesRequest = async (shareToken: string, accountData: any) => {
  // 1. Create new account
  const account = await createAccount({
    email: accountData.email,
    password: hashedPassword,
    contactName: accountData.contactName,
    companyName: '', // Filled later in onboarding
    status: 'pending', // Until email verified
    emailVerified: false,
    onboardingCompleted: true // Skip for claimed accounts
  });
  
  // 2. Transfer vetted sites request ownership
  await updateVettedSitesRequest(requestId, {
    accountId: account.id, // Transfer from company-owned account
    shareToken: null, // Revoke after claiming (one-time use)
    shareExpiresAt: null,
    claimedAt: new Date()
  });
  
  // 3. COPY clients to new account (not transfer)
  // Create copies of all clients associated with request
  for (const client of requestClients) {
    await copyClientToAccount(client, account.id);
  }
  
  // 4. COPY bulk analysis projects
  // Ensures new account has full access to data
  for (const project of requestProjects) {
    await copyProjectToAccount(project, account.id);
  }
  
  // 5. Send verification email
  await sendVerificationEmail(account.email);
};
```

#### 5.3 Post-Claim Experience
- **Immediate**: Redirect to `/vetted-sites/claim/verification-pending`
- **After verification**: Full access to vetted sites filtered by their request
- **Data access**: All copied clients and projects available
- **Sales notification**: Internal team notified of successful claim

#### 5.4 Key Implementation Details
- **One-time use**: Share tokens revoked after claiming
- **Data copying**: Clients/projects COPIED not transferred (maintains data integrity)
- **Email verification**: Required for security
- **Skip onboarding**: Claimed accounts skip normal onboarding
- **Rate limiting**: Prevent signup abuse (matches order claim)

### Phase 6: Sales Team Tools & Portal

#### 6.1 Internal Sales Portal
**Location**: `/internal/sales-portal` (new dedicated section)

**Features:**
- Create vetted sites requests for prospects
- Track which internal user created each request
- Conversion metrics per salesperson
- Sales attribution and performance tracking

**Request Creation Flow:**
1. Internal user creates request through internal page
2. System creates it in company-owned external "Sales" account
3. Links request to creating internal user for attribution
4. Follows standard approval and fulfillment flow

#### 6.2 Share Link Generation (Manual Action)
**Following existing order transfer pattern:**
- "Generate Share Link" button (like current transfer button)
- Popup for configuration:
  - Add custom video embed URL
  - Add proposal message
  - Set 30-day expiration
- Manual action (not automatic)

#### 6.3 Sales-Specific Features
**Custom presentation for prospects:**
- Video embed capability (proposalVideoUrl)
- Marketing site headers/footers (consistent branding)
- Professional presentation layout
- Custom messaging per share link

**Share page structure:**
```typescript
interface VettedSitesSharePage {
  // Branding
  header: LinkioHeader; // Marketing site header
  footer: MarketingFooter; // Marketing site footer
  
  // Content
  proposalVideoUrl?: string; // Custom video embed
  proposalMessage?: string; // Custom message
  vettedSitesTable: VettedSitesComponent; // Full results
  
  // CTA
  claimButton: 'Create Account to Claim These Results';
}
```

#### 6.4 Sales Notifications & Tracking
**When prospect claims:**
- Creating internal user gets notified
- Notification includes:
  - Company name
  - Contact name
  - Original request details
  - Time to conversion

**Sales metrics tracking:**
```typescript
interface SalesMetrics {
  createdBy: string; // Internal user who created
  createdAt: Date;
  sharedAt: Date;
  claimedAt?: Date;
  conversionTime?: number; // Hours from share to claim
  orderValue?: number; // If converted to order
}
```

#### 6.5 Company-Owned External Account
**Simple setup:**
- One shared "Sales" account (external account type)
- Standard login/password
- All sales-generated requests created here
- Transfers to real accounts upon claiming

## Non-Functional Requirements

### Performance Requirements (Practical Targets)
- Standard page load times (no special optimization needed)
- Handle normal traffic volumes
- Use existing infrastructure capabilities
- No need for extreme scale considerations

### Security & Privacy
- **Use existing patterns:**
  - Standard signup security (existing CAPTCHA if implemented)
  - Existing rate limiting patterns from order claim
  - Secure token generation (like current shareToken)
  - No sensitive data on public pages (already handled)

- **Not worried about:**
  - Data scraping (share links are temporary anyway)
  - Complex DDoS protection (standard measures sufficient)

### Data Management (TBD)
- Data retention policies to be determined later
- Focus on functionality first, optimization later
- Use existing database backup procedures

### Integration Requirements
- **Email Service**: Use existing Resend integration
  - Modify existing templates or create new ones as needed
  - Same setup and patterns as current system
- **Future considerations**: CRM integration when needed
- **No immediate need for**: Complex analytics or PDF generation

## Success Criteria & KPIs

### Core Business Model
**Simple cost-plus pricing:**
- Cost + $79 margin = Revenue
- Costs: Fulfillment + team
- Remainder = Profit

### Basic Tracking (No Arbitrary Targets)
**Track these for visibility, not "success" metrics:**
- Number of vetted sites requests
- Conversion from request to order
- Time from request to fulfillment
- Revenue per request

### Sales Portal Metrics (Future Infrastructure)
**When sales team exists:**
- Which salesperson created which request
- Conversion tracking per person
- Basic attribution

### Keep It Simple
- No arbitrary success targets
- Track data for insights, not for metrics' sake
- Focus on building functionality first
- Add sophisticated tracking when actually needed

## Implementation Roadmap

### Build Strategy: Complete Feature, Test Everything, Then Ship
**No incremental shipping - build comprehensively, test thoroughly, ship once**

### Implementation Order (Logical Dependencies)

#### 1. Database Foundation
- Vetted sites request table with all fields
- Proper relationships to accounts, clients, projects
- Sales attribution tracking from the start

#### 2. Core Request System
- Request form for existing users (vetted sites page)
- Internal approval dashboard at `/internal/vetted-sites-requests`
- Assignment workflow (created by, assigned to)
- Editable until confirmed

#### 3. Auto-Creation & Fulfillment
- Client/project auto-creation (following orders pattern)
- Smart duplicate handling
- Bulk analysis integration
- Results linking back to requests

#### 4. Vetted Sites Integration
- Filter by "My Requests" in sidebar
- Request-based filtering
- Metrics display (averages, matches)
- Manual completion by internal user

#### 5. Sales Flow (Company-Owned Account)
- Create "Sales" external account
- Internal sales portal for creating requests
- Attribution tracking to internal users

#### 6. Public Results & Claim
- Public results pages (full data, no limits)
- Share link generation (manual, 30-day expiry)
- Video embed and proposal messages
- Claim flow with account creation
- Data copying (not transfer)

#### 7. Testing & Polish
- End-to-end flow testing
- All edge cases handled
- Email notifications working
- Sales tracking functional

### Critical Details Not to Skip
- Proper duplicate client/URL handling
- Assignment workflow for internal users
- Editable requests until confirmed
- Full data copying on claim (not transfer)
- Sales attribution from creation
- Video embeds for proposals
- Marketing headers/footers on public pages
- Email verification after claim

## Risk Assessment & Mitigations

### High-Risk Items

#### **Risk**: Unbounded Analysis Costs
- **Impact**: Expensive AI analysis for low-quality prospects
- **Mitigation**: Human approval gate, cost estimation, usage caps
- **Monitoring**: Track analysis costs per request, set alerts

#### **Risk**: Poor Conversion Rates
- **Impact**: High acquisition costs, low ROI on prospect development
- **Mitigation**: A/B testing, clear value proposition, follow-up automation
- **Monitoring**: Conversion funnel analytics, cohort tracking

#### **Risk**: Internal Team Overwhelm
- **Impact**: Slow response times, poor prospect experience
- **Mitigation**: Efficient workflows, batch operations, automation
- **Monitoring**: Request queue length, processing times

### Medium-Risk Items

#### **Risk**: Results Quality Issues
- **Impact**: Poor prospect experience, low conversion
- **Mitigation**: Quality gates, internal curation, feedback loops
- **Monitoring**: Prospect feedback scores, claim rates

#### **Risk**: Security Vulnerabilities
- **Impact**: Data breaches, system abuse
- **Mitigation**: Rate limiting, secure tokens, security audits
- **Monitoring**: Failed attempts, unusual traffic patterns

## Future Evolution Considerations

### Marketplace Transition Readiness
- Shareable links could support publisher self-service
- Prospect data becomes valuable for marketplace targeting
- Results pages could evolve into publisher discovery tools
- Claim mechanism supports multi-sided platform conversion

### Advanced Analytics & AI
- Machine learning for approval prediction
- Automated prospect scoring and prioritization
- Predictive conversion rate modeling
- Dynamic pricing based on prospect quality

### Integration Ecosystem
- CRM platform integrations
- Marketing automation connections
- Sales tool integrations
- Analytics and reporting platforms

### Scalability Considerations
- Multi-tenant architecture for white-label deployment
- API-first design for partner integrations
- Automated quality assurance systems
- International expansion support

## Technical Implementation - Database Schema

### Core Table: vetted_sites_requests
```sql
CREATE TABLE vetted_sites_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  account_id UUID NOT NULL REFERENCES accounts(id),
  created_by_user_id UUID REFERENCES users(id), -- Sales attribution
  assigned_to_user_id UUID REFERENCES users(id), -- Internal assignment
  
  -- Request data
  target_urls TEXT[] NOT NULL,
  filters JSONB DEFAULT '{}', -- DR, traffic, price, niches
  special_instructions TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'submitted', -- submitted, under_review, approved, rejected, in_progress, completed
  priority VARCHAR(20) DEFAULT 'normal',
  
  -- Approval workflow
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  approval_notes TEXT,
  rejection_reason TEXT,
  
  -- Auto-creation tracking
  auto_created_clients UUID[] DEFAULT '{}',
  auto_created_projects UUID[] DEFAULT '{}',
  
  -- Sharing & claiming
  share_token VARCHAR(255) UNIQUE,
  share_expires_at TIMESTAMP,
  proposal_video_url TEXT,
  proposal_message TEXT,
  claimed_at TIMESTAMP,
  claimed_by_account_id UUID REFERENCES accounts(id),
  
  -- Sales tracking
  source_type VARCHAR(50) DEFAULT 'direct', -- direct, sales_generated
  source_account_id UUID REFERENCES accounts(id), -- Company-owned account
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Junction tables for relationships
CREATE TABLE vetted_request_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vetted_sites_request_id UUID NOT NULL REFERENCES vetted_sites_requests(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  auto_created BOOLEAN DEFAULT FALSE,
  target_urls TEXT[],
  UNIQUE(vetted_sites_request_id, client_id)
);

CREATE TABLE vetted_request_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vetted_sites_request_id UUID NOT NULL REFERENCES vetted_sites_requests(id),
  bulk_analysis_project_id UUID NOT NULL REFERENCES bulk_analysis_projects(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  domains_qualified INTEGER DEFAULT 0,
  UNIQUE(vetted_sites_request_id, bulk_analysis_project_id)
);
```

### Existing Table Modifications
```sql
-- Link vetted sites back to requests
ALTER TABLE bulk_analysis_domains 
ADD COLUMN vetted_sites_request_id UUID REFERENCES vetted_sites_requests(id);

-- Track request source in projects
ALTER TABLE bulk_analysis_projects
ADD COLUMN source_vetted_request_id UUID REFERENCES vetted_sites_requests(id);
```

### Key Relationships
```
Account → Creates → Vetted Sites Request
    ↓                      ↓
Generates →  Clients  →  Bulk Analysis Projects
                            ↓
                    Bulk Analysis Domains
                            ↓
                    Links back to Request (for filtering)
                            ↓
                        Orders (downstream)

Sales Flow:
Internal User → Creates in Company Account → Generates Share Link → Prospect Claims → Data Copies to New Account
```

### API Endpoints
```typescript
// Account user endpoints
GET  /api/vetted-sites-requests        // List user's requests
POST /api/vetted-sites-requests        // Create new request
GET  /api/vetted-sites-requests/[id]   // Get request details
PATCH /api/vetted-sites-requests/[id]  // Edit (if not confirmed)

// Internal endpoints
GET  /api/internal/vetted-sites-requests         // Queue for approval
PUT  /api/internal/vetted-sites-requests/[id]/approve
PUT  /api/internal/vetted-sites-requests/[id]/assign
POST /api/internal/vetted-sites-requests/[id]/share  // Generate share link
POST /api/internal/sales-portal/create-request   // Sales creation

// Public endpoints (no auth)
GET  /api/results/[shareToken]         // View public results
POST /api/vetted-sites/claim/[token]/signup  // Claim with account creation
```

### Integration Points
- **Bulk Analysis**: Minimal changes - add request tracking
- **Vetted Sites UI**: Add "My Requests" filter in sidebar
- **Orders**: Can reference domains from specific requests
- **Email**: Use existing Resend patterns
- **Claims**: Follow existing order claim pattern

This schema provides complete tracking from request creation through sales attribution while maintaining compatibility with existing systems.