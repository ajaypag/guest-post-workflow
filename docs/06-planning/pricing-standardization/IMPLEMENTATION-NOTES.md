# Pricing Fixes Implementation Notes

## Key Learnings from Data Audit

### Database State (as of implementation)
- **742 total publishers** exist
  - 737 are shadow publishers (99.3%)
  - Only 3 are active publishers
  - 2 unclaimed
- **722 websites** have complete setup (publisher + offering + relationships)
- **250 pricing issues** identified:
  - 111 no offering
  - 107 no publisher  
  - 15 price mismatches
  - 17 multiple offerings

### Critical Discovery: Email Deduplication
For the 107 websites without publishers:
- **1 website** can link to existing publisher (email already exists)
- **106 websites** need NEW shadow publishers created
- **0 websites** have no email data in Airtable

This means we must check for existing publishers by email before creating new ones to avoid duplicates.

## Conservative Field Population Strategy

### What We Set vs What We Don't

#### publisher_websites table
**We SET:**
- `publisherId`, `websiteId` (required links)
- `canEditPricing: true` (reasonable default)
- `canEditAvailability: true` (reasonable default)
- `canViewAnalytics: true` (reasonable default)
- `status: 'active'` (appropriate for new connections)

#### publisher_offerings table
**We SET:**
- `publisherId` (required)
- `offeringType: 'guest_post'` ⚠️ **ASSUMPTION** (99.7% of existing are this)
- `basePrice` (in cents - multiply dollars by 100!)
- `currency: 'USD'` (standard)
- `currentAvailability: 'available'` (reasonable default)
- `isActive: true` (appropriate for new offerings)

**We DON'T SET:**
- `offeringName` (usually NULL in existing data)
- `turnaroundDays` (varies, no consistent pattern)
- `minWordCount`, `maxWordCount` (rarely populated)

#### publisher_offering_relationships table
**We ONLY SET:**
- `publisherId`, `offeringId`, `websiteId` (required links)

**We DON'T SET (use database defaults):**
- `isPrimary` (defaults to FALSE - we don't know if primary)
- `relationshipType` (defaults to 'contact' - we don't know actual relationship)
- `verificationStatus` (defaults to 'claimed')
- `priorityRank` (defaults to 100)
- `isPreferred` (defaults to FALSE)

### Why This Conservative Approach?

1. **We don't know relationship types** - Setting 'owner' was an assumption
2. **We don't know primary status** - Multiple publishers might manage a site
3. **We're bulk importing** - Better to be conservative and let humans verify
4. **Database defaults exist** - They were chosen for a reason

## Implementation Features

### 1. Dry Run Mode
Add `dryRun: true` to any execute request to see what would happen without making changes.

### 2. Duplicate Detection
Always checks if a publisher with the email already exists before creating a new one.

### 3. Operation Tracking
Returns detailed list of all operations performed/skipped for audit trail.

### 4. Manual Review Cases
Clearly identifies cases that need human intervention:
- Multiple offerings (which to keep?)
- No email in Airtable data
- Other edge cases

## Assumptions We're Making

1. **offeringType = 'guest_post'**
   - Based on 99.7% of existing offerings being this type
   - Could be made configurable if needed

2. **Shadow publishers for new imports**
   - Following existing pattern (737 of 742 are shadow)
   - Appropriate for bulk imports from Airtable

3. **Prices from Airtable are authoritative**
   - Using Airtable as source of truth for corrections
   - Falls back to existing guest_post_cost if no Airtable data

## API Endpoints

### Analysis
- `GET /api/admin/pricing-fixes/analyze` - Basic analysis with counts
- `GET /api/admin/pricing-fixes/analyze-detailed` - Detailed analysis with proposed actions

### Execution
- `POST /api/admin/pricing-fixes/execute-v2` - Production-ready execution with all safety checks
  - Supports `dryRun` mode
  - Handles duplicate detection
  - Conservative field population
  - Detailed operation tracking

### Bulk Operations
- `POST /api/admin/pricing-fixes/bulk-action` - Approve/reject multiple items

## Next Steps

1. Test with dry run mode first
2. Review proposed actions for accuracy
3. Execute in small batches initially
4. Monitor for any issues
5. Consider adding more sophisticated duplicate detection (fuzzy email matching?)