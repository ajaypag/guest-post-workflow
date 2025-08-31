# Publisher-Website-Offering Relationship Structure

## Database Relationship Diagram

```
┌──────────────────┐
│    WEBSITES      │
├──────────────────┤
│ id (UUID)        │◄──────┐
│ domain           │       │
│ guest_post_cost  │       │ (One Website can have Multiple Publishers)
│ (NUMERIC 10,2)   │       │
└──────────────────┘       │
                           │
                    ┌──────┴───────────────┐
                    │ PUBLISHER_WEBSITES   │
                    ├──────────────────────┤
                    │ id                   │
                    │ publisher_id ────────┼────────┐
                    │ website_id           │        │
                    │ status               │        │
                    │ can_edit_pricing     │        │
                    └──────────────────────┘        │
                                                    │
┌────────────────────────────────────────┐         │
│           PUBLISHERS                   │         │
├────────────────────────────────────────┤         │
│ id (UUID)                              │◄────────┘
│ business_name                          │         │
│ email                                  │         │ (One Publisher has Multiple Offerings)
│ status                                 │         │
└────────────────────────────────────────┘         │
                    ▲                               │
                    │                               ▼
                    │        ┌──────────────────────────────┐
                    │        │   PUBLISHER_OFFERINGS        │
                    │        ├──────────────────────────────┤
                    └────────┤ id                          │
                             │ publisher_id                │
                             │ base_price (INTEGER cents)  │
                             │ offering_type               │
                             │ offering_name               │
                             │ turnaround_days             │
                             │ currency                    │
                             └──────────────────────────────┘
```

## How The Connection Works

### 1. **Website → Publisher Connection**
- **Table**: `publisher_websites` (junction/link table)
- **Purpose**: Links websites to publishers who can fulfill orders for those sites
- **Relationship**: Many-to-Many (one website can have multiple publishers, one publisher can manage multiple websites)

### 2. **Publisher → Offerings Connection**
- **Table**: `publisher_offerings`
- **Purpose**: Each publisher can have multiple service offerings
- **Relationship**: One-to-Many (one publisher has many offerings)
- **Key Field**: `publisher_id` directly references `publishers.id`

### 3. **The Missing Direct Link**
- **Problem**: There's NO direct link between websites and offerings!
- **Current Logic**: 
  - Website has `guest_post_cost` (e.g., $100.00)
  - Publisher has offerings with `base_price` (e.g., 10000 cents)
  - System ASSUMES the offering applies to all websites that publisher manages

## Current Data Flow

```sql
-- To find offerings for a website:
SELECT 
    w.domain,
    w.guest_post_cost,
    p.business_name,
    po.offering_name,
    po.base_price
FROM websites w
JOIN publisher_websites pw ON pw.website_id = w.id
JOIN publishers p ON p.id = pw.publisher_id
JOIN publisher_offerings po ON po.publisher_id = p.id
WHERE w.id = 'some-website-id';
```

## The Problem

1. **No Website-Specific Offerings**
   - A publisher might manage 10 websites
   - They create one offering for $100
   - That offering applies to ALL 10 websites (even if some should be $50 or $200)

2. **Price Mismatches Happen Because**
   - Publisher creates offering based on one website's price
   - That offering gets incorrectly applied to all their other websites
   - Example: Publisher manages both premium ($200) and budget ($50) sites, but has one $100 offering

3. **Multiple Offerings Confusion**
   - When a publisher has multiple offerings, which one applies to which website?
   - Currently no way to specify "Offering A is for Website X, Offering B is for Website Y"

## What's Missing

### Option 1: Add website_id to publisher_offerings
```sql
ALTER TABLE publisher_offerings 
ADD COLUMN website_id UUID REFERENCES websites(id);
```
**Pro**: Direct connection, clear pricing per website
**Con**: Would need one offering per website (lots of duplication)

### Option 2: Create offering_website_assignments table
```sql
CREATE TABLE offering_website_assignments (
    id UUID PRIMARY KEY,
    offering_id UUID REFERENCES publisher_offerings(id),
    website_id UUID REFERENCES websites(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(offering_id, website_id)
);
```
**Pro**: Flexible many-to-many relationships
**Con**: Another table to manage

### Option 3: Use publisher_offering_relationships (already exists!)
- This table already exists but seems underutilized
- Has both `offering_id` and `website_id` fields
- Could be the solution but needs investigation

## Current Workarounds

The system currently:
1. Falls back to `websites.guest_post_cost` when offerings don't match
2. Uses the first available offering from the publisher
3. Hardcodes $79 service fee regardless of offering

## Recommendations

1. **Immediate Fix**: Ensure every website with `guest_post_cost` has a matching offering with correct `base_price`

2. **Short-term**: Use `publisher_offering_relationships` table properly to link specific offerings to specific websites

3. **Long-term**: Deprecate `guest_post_cost` entirely and use offerings as single source of truth

## SQL to Fix Missing Connections

```sql
-- Create offerings for websites without them
INSERT INTO publisher_offerings (
    publisher_id,
    offering_name,
    offering_type,
    base_price,
    currency,
    turnaround_days
)
SELECT DISTINCT
    pw.publisher_id,
    CONCAT('Guest Post - ', w.domain),
    'guest_post',
    (w.guest_post_cost * 100)::INTEGER,
    'USD',
    7
FROM websites w
JOIN publisher_websites pw ON pw.website_id = w.id
LEFT JOIN publisher_offerings po ON po.publisher_id = pw.publisher_id
WHERE w.guest_post_cost IS NOT NULL
  AND po.id IS NULL;

-- Fix mismatched prices
UPDATE publisher_offerings po
SET base_price = (w.guest_post_cost * 100)::INTEGER
FROM publisher_websites pw
JOIN websites w ON w.id = pw.website_id
WHERE po.publisher_id = pw.publisher_id
  AND w.guest_post_cost IS NOT NULL
  AND po.base_price != (w.guest_post_cost * 100)::INTEGER;
```