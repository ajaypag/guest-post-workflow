# Airtable MCP Integration Documentation

## Overview
This document captures all learnings from exploring the Airtable MCP (Model Context Protocol) integration for the Guest Post Workflow system. The goal is to integrate Airtable's website database with the guest post workflow to streamline outreach and content creation.

## Airtable Base Information
- **Base ID**: `appnZ4GebaC99OEaX`
- **Base URL**: https://airtable.com/appnZ4GebaC99OEaX/

## Key Tables

### 1. Website Table (`tblT8P0fPHV5fdrT5`)
The main table containing all website information for link building and guest posting opportunities.

### 2. Link Price Table (`tblEnYjUwKHok7Y3K`)
Contains specific pricing relationships between contacts and websites. Key fields include:
- **Name**: Format "Post Type - Price - Website - Email"
- **Default Cost**: The base cost for this contact-website combination
- **Post type**: "Guest Post" or "Link Insert"
- **Website**: Linked to Website table
- **Contacts**: Linked to Contacts table
- **Guest Post Cost**: Specific cost for guest posts
- **Link Insert Cost**: Specific cost for link inserts
- **Various Retail Prices**: Multiple pricing options and calculations
- **Requirement**: "Paid" or other terms
- **Status**: Active/Inactive

### 3. Contacts Table (`tblVpqKoRElvgqQAQ`)
Contains detailed contact information (structure to be explored).

#### PostFlow View (`viwWrgaGb55n8iaVk`)
A cleaned-up view with 10 essential columns for the guest post workflow:

1. **Website** - The website URL (e.g., `https://begindot.com/`)
2. **Summary** - Detailed description of the website and its content
3. **Type** - Website type (Blog, Reviews, etc.)
4. **Guest Post Contact** - Email contact(s) for guest post submissions
5. **Domain Rating** - DR score (SEO strength metric, 0-100)
6. **Total Traffic** - Website traffic volume
7. **Guest Post Cost V2** - Cost for guest posting
8. **Count of Published Opportunities** - Number of successful posts published
9. **Retail Price (inclusive of Guest Post) V1 (For Filter)** - Total price including guest post
10. **Category** - Website category/niche (e.g., Business & Enterprise, Marketing)

### Important Fields Not in View but in Table
- **LINK INSERTER** - Contacts for link insertion opportunities
- **GUEST POSTER** - Writers/contributors who can submit guest posts
- **Status** - Active/Inactive status
- **Language** - Content language (usually English)
- **Guest Post Access?** - Yes/No boolean
- **Link Insert Access?** - Yes/No boolean
- **Overall Website Quality** - Risk assessment with warnings
- **IOU Points** - Exchange balance tracking
- **Opportunity History Summary** - Detailed history of all interactions

## MCP Tool Usage

### 1. List Tables
```javascript
mcp__airtable-mcp__list_tables({
  baseId: "appnZ4GebaC99OEaX",
  detailLevel: "tableIdentifiersOnly" // Use minimal detail to avoid token limits
})
```

### 2. Search Records
```javascript
mcp__airtable-mcp__search_records({
  baseId: "appnZ4GebaC99OEaX",
  tableId: "tblT8P0fPHV5fdrT5",
  searchTerm: "begindot.com",
  view: "PostFlow", // Optional: filter by view
  maxRecords: 1
})
```

### 3. List Records
```javascript
mcp__airtable-mcp__list_records({
  baseId: "appnZ4GebaC99OEaX",
  tableId: "tblT8P0fPHV5fdrT5",
  view: "PostFlow",
  maxRecords: 5 // Limit to avoid token issues
})
```

## Key Learnings

### 1. API Limitations
- The Airtable API returns ALL fields from a table, not just the columns visible in a view
- Response size can exceed token limits (25,000 tokens max)
- Need to use `maxRecords` parameter to limit response size
- Cannot directly query which columns are visible in a specific view

### 2. Data Structure Insights

#### Multiple Contacts
Some websites have multiple contacts for guest posting:
- Contacts are stored as arrays in GUEST POST CONTACT field
- Each contact may have different success rates and history
- Example: nikolaroza.com has 2 contacts:
  - Primary: nikola@nikolaroza.com (13 published links)
  - Secondary: lisapats12@gmail.com (3 published links)

#### Pricing Structure
- **Guest Post Cost V2**: Base cost for guest posting
- **Retail Price**: Includes additional fees and markups
- Some sites accept swaps (IOU system) instead of payment
- Pricing can vary based on DR, traffic, and relationship

#### Quality Indicators
- **Domain Rating (DR)**: 0-100 score
- **Traffic**: Monthly traffic volume
- **Count of Published Opportunities**: Historical success rate
- **Overall Website Quality**: Risk assessment categories

### 3. Contact Types
Three main contact types exist:
1. **GUEST POST CONTACT** - For submitting guest posts
2. **LINK INSERTER** - For link insertion requests
3. **GUEST POSTER** - Writers who can create content

A single person can have multiple roles.

## Integration Recommendations

### 1. Data Sync Strategy
- Pull only necessary fields to minimize token usage
- Cache frequently accessed data locally
- Use search instead of listing all records
- Implement pagination for large datasets

### 2. Contact Management
- Store all contacts but designate primary/secondary
- Track success rates per contact
- Allow manual contact selection in workflow
- Implement fallback contact logic

### 3. Workflow Integration Points
1. **Site Selection**: Search and filter websites by niche, DR, traffic
2. **Contact Retrieval**: Get appropriate contacts for outreach
3. **Pricing Display**: Show costs and swap options
4. **History Tracking**: Display previous interactions
5. **Quality Filtering**: Use Overall Website Quality field for warnings

### 4. Fields to Prioritize for Integration
Essential:
- Website URL
- Guest Post Contacts
- Domain Rating
- Traffic
- Pricing (Guest Post Cost V2)
- Category/Niche
- Status (Active/Inactive)

Nice to have:
- Summary (for context)
- Published Opportunities Count
- IOU Points (for swap tracking)
- Overall Website Quality (for risk assessment)

## Multiple Contact Handling Strategy

### Understanding Contact Types
- **Not all contacts charge**: Some contacts only do free swaps/exchanges
- **Link Price = Business Relationship**: If a contact has a Link Price record, they have a formal business relationship
- **No Link Price = Free/Informal**: Contacts without Link Price records likely only do free exchanges

### Contact Selection Rules for Guest Post Workflow

1. **For Paid Guest Posts**:
   - Filter Link Price table for `Post type = "Guest Post"` AND `Requirement = "Paid"`
   - Match contacts that have Link Price records with `Default Cost > 0`
   - If multiple paid contacts exist, select the one with lowest cost as primary
   - Import all paid options but mark cheapest as primary

2. **For Link Swaps/Exchanges**:
   - Look for Link Price records with `Requirement = "Swap"` or `Default Cost = 0`
   - Also consider contacts without Link Price records (they likely do free swaps)

3. **Contact Matching Logic**:
   ```
   IF looking for paid guest posts:
     1. Get all contacts from Website table
     2. For each contact, check Link Price table
     3. Find records where:
        - Contact email matches
        - Post type = "Guest Post"
        - Requirement = "Paid"
        - Default Cost matches the Guest Post Cost V2 from Website
     4. If multiple matches, sort by cost (ascending)
     5. Mark lowest cost contact as primary
   ```

4. **Data Quality Considerations**:
   - Some contacts in Website table may not actually handle paid posts
   - Link Price table is the source of truth for business relationships
   - Missing Link Price record often means free/swap only

### Example: nikolaroza.com Analysis
- **Website Table**: Shows 2 contacts (nikola@, lisapats12@)
- **Link Price Table**: 
  - nikola@ has 3 records: paid guest post ($100), free guest post (swap), free link insert
  - lisapats12@ has 0 records (likely only does free swaps)
- **Correct Selection**: For paid guest posts, use nikola@ at $100

### Implementation Strategy for PostFlow Integration

1. **Create Filtered Views in Airtable**:
   - "Paid Guest Post Sites" view: Filter for sites with paid Link Price records
   - "Swap Sites" view: Sites with swap/free Link Price records
   - "Active Paid Contacts" view: Contacts with active paid relationships

2. **Contact Extraction Logic**:
   ```javascript
   async function getCorrectContactForPaidPost(website) {
     const allContacts = website.guestPostContacts;
     const paidContacts = [];
     
     for (const email of allContacts) {
       const linkPrices = await searchLinkPrice({
         contact: email,
         postType: "Guest Post",
         requirement: "Paid",
         website: website.url
       });
       
       if (linkPrices.length > 0) {
         paidContacts.push({
           email,
           cost: linkPrices[0].defaultCost,
           terms: linkPrices[0].paymentTerms
         });
       }
     }
     
     // Sort by cost and return all, marking cheapest as primary
     return paidContacts.sort((a, b) => a.cost - b.cost);
   }
   ```

## Next Steps
1. Design Airtable views for different workflow types (paid, swap, hybrid)
2. Build contact selection logic that properly uses Link Price as source of truth
3. Create data import process that:
   - Validates contact-price relationships
   - Identifies primary vs secondary contacts based on cost
   - Filters out non-business contacts for paid workflows
4. Implement UI that shows:
   - Primary contact with lowest price
   - Alternative contacts with their prices
   - Payment terms and requirements
5. Handle edge cases:
   - Contacts without Link Price records
   - Multiple contacts with same price
   - Inactive or outdated relationships

## Notes
- The PostFlow view has filters applied that aren't visible via API
- Some websites may not appear in PostFlow view due to these filters
- Consider implementing similar filtering logic in the application