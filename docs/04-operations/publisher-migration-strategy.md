# Publisher Migration Strategy & Planning

## ✅ MIGRATION COMPLETE (2025-08-23)

### Migration Results
- **742 Publishers** created from unique contact emails
- **852 Publisher-Website Relationships** established  
- **852 Draft Offerings** created with proper pricing (converted to cents)
- **737 Shadow Publishers** (without accounts)
- All data successfully migrated from `website_contacts` → `publishers`

### What We Built
1. **Complete Migration System**:
   - Migration engine at `/scripts/migrate-websites-to-publishers.ts`
   - Admin dashboard at `/admin/publisher-migration`
   - Validation & dry-run capabilities
   - Rollback functionality
   - HTML report generation

2. **Critical Fixes Applied**:
   - Fixed data model: `website_contacts` → `publishers` (NOT websites.publisherCompany)
   - Fixed schema mismatches (removed non-existent fields)
   - Fixed price conversion (dollars to cents: $90 → 9000)
   - Removed dummy data (turnaround days, word counts set to NULL)

### Production Migration Requirements
```bash
# 1. Backup database first!
# 2. Run validation
npm run migrate:publishers:validate
# 3. Execute migration  
npm run migrate:publishers:execute
# 4. Verify results
psql -c "SELECT COUNT(*) FROM publishers WHERE account_status = 'shadow';"
```

## Migration Strategy Goals

1. **Create Draft/Shadow Publishers First**
   - Transform existing website/contact data into shadow publishers
   - Create draft offerings based on current guest post costs
   - Keep these as "unverified" or "draft" status initially

2. **Email Outreach Campaign**
   - Reach out to existing contacts/websites
   - Introduce the new marketplace concept
   - Invite them to create accounts and verify/update their information

3. **Progressive Activation**
   - Only make offerings "official" after publishers sign up and confirm
   - Allow publishers to update outdated information
   - Maintain backward compatibility during transition

## Key Considerations

1. **Data Quality Issues**:
   - Much of the existing data may be outdated
   - Need verification before making offerings official
   - Should maintain draft/unverified status until confirmed

2. **Email Outreach Message**:
   > "Hey, this is Linkio. You've worked with us previously through Outreach Labs potentially. 
   > We're getting organized with a marketplace to make it easier to create orders, receive 
   > placements, and so on. Please create an account and set up your portal, update your 
   > information."

3. **Migration Phases**:
   - Phase 1: Data transformation (websites → shadow publishers)
   - Phase 2: Draft offering creation
   - Phase 3: Email outreach
   - Phase 4: Publisher activation and verification
   - Phase 5: Full cutover to new system

## Database Schema Analysis

### Legacy Tables (Current Production)
1. **websites** table:
   - Contains: domain, guestPostCost, domainRating, traffic metrics
   - Publisher info: publisherCompany, primaryContactId
   - Performance: avgResponseTimeHours, successRatePercentage
   - **This is our main source of truth currently**

2. **contacts** table (in publisherCrmSchema):
   - Personal info: firstName, lastName, email, phone
   - Professional: jobTitle, company, linkedinUrl
   - Relationship: status, acquisition channel, notes

### New Publisher System (Ready to Use)
1. **publishers** table:
   - Account management: email, contactName, companyName
   - Shadow support: claimedAt, confidenceScore, invitationToken
   - Commission: rates, payouts, payment methods

2. **shadow_publisher_websites** table:
   - Links unclaimed publishers to websites
   - Tracks confidence scores and sources

3. **publisher_offerings** table:
   - Structured pricing: basePrice, bulkDiscounts
   - Service details: turnaroundTime, linkTypes
   - Content specs: wordCount, contentTypes

4. **publisher_performance** table:
   - Enhanced metrics per publisher/website
   - Response times, success rates, quality scores

## Existing Infrastructure We Can Leverage

### ✅ Already Built and Ready:
1. **Shadow Publisher System** (`/admin/shadow-publishers`)
   - Automated publisher discovery from emails
   - Confidence-based creation with human review
   - Full admin interface for management

2. **Publisher Invitation System**
   - Email templates ready (`InvitationEmail.tsx`)
   - Token-based claiming (`/publisher/claim?token=`)
   - Bulk invitation support

3. **Domain Normalization** (`/admin/domain-migration`)
   - Prevents duplicate websites
   - Already handles www, protocols, casing

4. **Email Qualification** (`/admin/email-qualification-migration`)
   - Filters non-paying sites
   - Critical for V2 parser

## Proposed Migration Strategy

### Phase 1: Data Preparation (Week 1)
1. **Run Prerequisites**:
   ```
   - Domain normalization migration
   - Email qualification migration
   - Verify all publisher tables exist
   ```

2. **Data Analysis**:
   ```sql
   -- Count unique publishers in websites
   SELECT COUNT(DISTINCT publisherCompany) FROM websites;
   
   -- Identify websites with pricing data
   SELECT COUNT(*) FROM websites WHERE guestPostCost IS NOT NULL;
   ```

### Phase 2: Shadow Publisher Creation (Week 1-2)
1. **Extract Unique Publishers**:
   - Group websites by publisherCompany
   - Match with existing contacts
   - Create shadow publishers for each unique entity

2. **Generate Draft Offerings**:
   ```javascript
   // For each website with guestPostCost:
   {
     basePrice: website.guestPostCost,
     status: 'draft', // Not active until verified
     turnaroundTime: 14, // Default 2 weeks
     linkType: 'dofollow',
     contentTypes: ['guest_post'],
     requiresApproval: true
   }
   ```

3. **Set Confidence Levels**:
   - High (0.9): Has recent successful orders
   - Medium (0.6): Has pricing data and contact
   - Low (0.3): Only basic website info

### Phase 3: Email Outreach Campaign (Week 2-3)
1. **Segmented Approach**:
   - **Active Partners** (worked with us in last 6 months)
     - Personal email from account manager
     - Pre-filled offerings based on recent work
   
   - **Past Partners** (6-24 months ago)
     - Re-engagement email with marketplace benefits
     - Request to verify/update information
   
   - **Cold Contacts** (24+ months or never worked)
     - Introduction to new marketplace
     - Incentive to join (featured placement, etc.)

2. **Email Template**:
   ```
   Subject: Update Your Publisher Profile with Linkio Marketplace
   
   Hi [Name],
   
   You've previously worked with us (or Outreach Labs) on guest posting 
   opportunities for [website].
   
   We're launching a streamlined marketplace that will:
   • Simplify order management
   • Ensure faster payments
   • Reduce back-and-forth communication
   • Provide transparent metrics
   
   We've created a draft profile for you with:
   - Website: [domain]
   - Current rate: $[guestPostCost]
   - Turnaround: [estimated days]
   
   Please claim your account to:
   ✓ Verify your current rates
   ✓ Update service offerings  
   ✓ Set availability preferences
   ✓ Configure payment methods
   
   [Claim Your Account Button → /publisher/claim?token=xxx]
   
   This takes less than 5 minutes and ensures you don't miss out on 
   upcoming orders.
   ```

## ✅ EXISTING INFRASTRUCTURE (ALREADY BUILT!)

### 1. Complete Email Invitation System ✅
**Location**: `lib/services/shadowPublisherInvitationService.ts`
- Token generation with crypto
- Resend API integration
- HTML email templates (invitation + reminder)
- Bulk sending with rate limiting
- Re-invitation prevention (24hr cooldown)

### 2. Publisher Claim Flow ✅
**Pages**: `/publisher/claim?token=xxx`
**API**: `/api/publisher/claim`
- Token validation & expiry checks
- Password setup with confirmation
- Profile completion (name, company, phone)
- Account activation on success
- Claim history logging for security

### 3. Publisher Portal ✅
**Location**: `/publisher/(dashboard)/*`
- Full dashboard with stats & earnings
- Website management
- Offering management
- Order management
- Analytics & invoices
- Payment profile & settings
- Complete auth system (login/signup/reset)

### 4. Advanced Claiming Service ✅
**Location**: `lib/services/publisherClaimingService.ts`
- Multiple verification methods (email/DNS/file)
- Smart website matching by domain
- Admin approval workflow
- Publisher-website relationship creation

### 5. Migration Admin API ✅
**Endpoint**: `/api/admin/publisher-migration/invitations`
- Bulk invitation sending
- Statistics tracking
- Error reporting

## 🔴 REMAINING TASKS

### 1. Add "Send Invitations" Button to Admin UI (PRIORITY 1)
**Location**: `/admin/publisher-migration` page
```typescript
// Add button to trigger bulk invitations
const sendInvitations = async () => {
  const response = await fetch('/api/admin/publisher-migration/invitations', {
    method: 'POST',
    body: JSON.stringify({ batchSize: 50 })
  });
};
```

### 2. Fix Service Method Signature (PRIORITY 1)
**File**: `lib/services/shadowPublisherInvitationService.ts`
```typescript
// Update sendBulkInvitations to accept parameters:
async sendBulkInvitations(
  publisherIds?: string[], 
  source: string = 'migration'
)
```

### 3. Test with Small Batch First (PRIORITY 1)
- Send to 5 test publishers
- Verify email delivery
- Test claim flow end-to-end
- Monitor for issues
- Then proceed with all 737

### 4. Implement Welcome Email (PRIORITY 2)
**Location**: `/api/publisher/claim/route.ts` line 206
- Create welcome email template
- Send after successful claim
- Include onboarding resources

### Phase 4: Progressive Activation (Week 3-4)
1. **Account Claiming Process**:
   - Publisher clicks claim link
   - Reviews draft offerings
   - Updates/confirms information
   - Offerings change from 'draft' to 'active'

2. **Verification Workflow**:
   ```javascript
   // When publisher claims account:
   - Mark shadow_publisher as claimed
   - Activate verified offerings
   - Send confirmation email
   - Notify internal team
   ```

3. **Non-Responder Handling**:
   - Keep as shadow publishers
   - Internal team can still use for orders
   - Send follow-up after 1 week, 2 weeks
   - Eventually mark as 'inactive'

### Phase 5: Full Migration (Week 4-5)
1. **Order System Integration**:
   - Update order creation to use publisher_offerings
   - Maintain backward compatibility temporarily
   - Gradually phase out direct website references

2. **Performance Data Migration**:
   - Copy historical metrics to publisher_performance
   - Maintain data attribution accuracy
   - Set up new tracking for future orders

3. **Decommission Legacy**:
   - Archive websites table (don't delete yet)
   - Update all references to use publishers
   - Final data validation

## Risk Mitigation

1. **Data Quality Issues**:
   - Use 'draft' status for unverified data
   - Require publisher confirmation before activation
   - Maintain audit trail of all changes

2. **Non-Responsive Publishers**:
   - Keep as shadow publishers for internal use
   - Don't disrupt current operations
   - Can still fulfill orders internally

3. **Technical Rollback Plan**:
   - Keep websites table as backup
   - Dual-write during transition
   - Easy switch back if issues arise

## Success Metrics

- **Adoption Rate**: % of publishers who claim accounts
- **Data Quality**: % of offerings verified/updated
- **Order Flow**: No disruption to order fulfillment
- **Response Time**: Publishers claim within 2 weeks
- **Completion**: 80% migration within 30 days

## Implementation Checklist

### Week 1:
- [ ] Run domain normalization migration
- [ ] Run email qualification migration  
- [ ] Extract unique publisher list
- [ ] Create shadow publishers
- [ ] Generate draft offerings

### Week 2:
- [ ] Prepare email templates
- [ ] Set up tracking/analytics
- [ ] Send first batch of invitations
- [ ] Monitor claim rates

### Week 3:
- [ ] Send follow-up emails
- [ ] Review claimed accounts
- [ ] Activate verified offerings
- [ ] Begin order system integration

### Week 4:
- [ ] Complete order system updates
- [ ] Migrate performance data
- [ ] Final follow-ups to non-responders
- [ ] Prepare for cutover

### Week 5:
- [ ] Full system cutover
- [ ] Archive legacy tables
- [ ] Post-migration validation
- [ ] Documentation updates