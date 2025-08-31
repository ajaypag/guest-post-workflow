# Plan for Fixing 206 Problem Websites

## Overview
Fix all 206 websites to ensure each has:
1. A publisher relationship (via publisher_websites)
2. A publisher offering with correct price
3. An offering relationship linking the offering to the website

## Data Sources

### Primary Source: Airtable Export
Your contacts CSV export will serve as the master document for:
- Correct pricing information
- Publisher/contact relationships
- Contact emails for publisher assignment

### Current Database State
- 107 websites with NO offerings at all
- 96 websites with wrong prices in offerings
- 3 websites with multiple offerings (none matching)

## Fix Strategy by Category

### Category 1: Missing Offerings (107 websites)

**Requirements from Airtable:**
- Website domain
- Correct guest_post_cost
- Contact email or publisher info

**Fix Process:**
```
1. Match website to Airtable record by domain
2. Find or create publisher based on contact email
3. Create publisher_websites link if missing
4. Create publisher_offering with correct price from Airtable
5. Create publisher_offering_relationships to link offering to website
```

### Category 2: Price Mismatches (96 websites)

**Requirements from Airtable:**
- Website domain
- Authoritative price

**Fix Process:**
```
1. Match website to Airtable record
2. Use Airtable price as source of truth
3. Update publisher_offerings.base_price to match
4. Update websites.guest_post_cost to stay in sync
5. Log any significant price changes for review
```

### Category 3: Multiple Offerings (3 websites)

**Requirements from Airtable:**
- Correct price
- Which offering should be primary

**Fix Process:**
```
1. Identify correct price from Airtable
2. Keep offering that matches Airtable price
3. Archive/delete incorrect duplicate offerings
4. If none match, update best offering to correct price
```

## Airtable Export Requirements

### Essential Fields Needed:
```csv
domain,
guest_post_cost (or price),
contact_email,
contact_name,
publisher_name (if available),
status (active/inactive),
last_updated
```

### How to Export:
1. Export from Airtable with ALL pricing records
2. Include both active and inactive sites (for completeness)
3. Ensure UTF-8 encoding
4. Save as CSV file

## Implementation Scripts

### Script 1: Validate Airtable Data
```typescript
// validate-airtable-export.ts
- Load CSV file
- Check for required fields
- Validate domain formats
- Validate price formats
- Report any missing/invalid data
- Output: validation report
```

### Script 2: Match & Analyze
```typescript
// match-airtable-to-database.ts
- Load Airtable data
- Match each row to database websites by domain
- Categorize each match:
  - Perfect match (price and publisher correct)
  - Needs publisher assignment
  - Needs offering creation
  - Needs price update
  - Not in database
- Output: action plan JSON
```

### Script 3: Create Missing Publishers
```typescript
// create-missing-publishers.ts
- For websites without publishers
- Use Airtable contact email to find/create publisher
- Create publisher_websites relationships
- Output: created publishers report
```

### Script 4: Fix Offerings
```typescript
// fix-all-offerings.ts
- Process action plan from Script 2
- Create missing offerings
- Update incorrect prices
- Create offering relationships
- Output: changes report
```

### Script 5: Validation
```typescript
// validate-fixes.ts
- Check all 940 websites with guest_post_cost
- Verify each has:
  - Publisher assignment
  - Offering with matching price
  - Proper relationships
- Output: final validation report
```

## Execution Plan

### Phase 1: Preparation (Day 1)
1. Get Airtable export
2. Run validation script
3. Review validation report
4. Fix any data issues in CSV

### Phase 2: Analysis (Day 1)
1. Run match & analyze script
2. Review action plan
3. Identify high-risk changes (large price differences)
4. Get approval for significant changes

### Phase 3: Publisher Setup (Day 2)
1. Backup database
2. Run create missing publishers script
3. Verify publisher assignments
4. Check publisher_websites relationships

### Phase 4: Offering Fixes (Day 2)
1. Run fix offerings script in test mode
2. Review proposed changes
3. Execute fixes in batches:
   - Missing offerings first (107)
   - Small price fixes (<$10 difference)
   - Medium price fixes ($10-50)
   - Large price fixes (>$50) with manual review

### Phase 5: Validation (Day 3)
1. Run validation script
2. Manual spot checks on critical websites
3. Test order creation with fixed websites
4. Generate final report

## Safety Measures

### Backups
- Full database backup before any changes
- Export current state of all affected tables
- Keep rollback scripts ready

### Logging
- Log every change made
- Include old value, new value, source (Airtable)
- Timestamp all operations

### Validation Rules
- Price changes >50% require manual review
- New publishers require email validation
- Duplicate offerings must be archived, not deleted

### Testing
- Test scripts on small subset first (10 websites)
- Verify order flow works with updated prices
- Check publisher portal shows correct offerings

## Success Criteria

After execution:
- [ ] All 940 websites with guest_post_cost have matching offerings
- [ ] Zero websites without publisher assignment
- [ ] All prices match between guest_post_cost and base_price
- [ ] No duplicate offerings for same website
- [ ] Order creation works for all websites
- [ ] Publisher portal shows correct data

## Rollback Plan

If issues occur:
1. Stop script execution immediately
2. Restore from backup
3. Analyze what went wrong
4. Fix script logic
5. Re-run from clean state

## Questions for You

1. **Price Conflicts**: When Airtable price differs from current database, should we:
   - Always use Airtable (most recent)?
   - Flag for manual review if difference >X%?
   - Keep existing if within small margin?

2. **Publisher Assignment**: For websites without clear publisher:
   - Create generic "Unclaimed" publisher?
   - Skip until manually assigned?
   - Use domain registration info?

3. **Historical Prices**: Should we:
   - Log all price changes for audit trail?
   - Notify affected publishers of changes?
   - Update existing orders retroactively?

## Next Steps

1. **Provide Airtable export** with fields listed above
2. **Answer policy questions** about conflicts
3. **Approve execution timeline**
4. **Designate testing websites** for initial validation

Ready to proceed once we have the Airtable data!