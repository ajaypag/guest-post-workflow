# Airtable Integration Database Design

## Current Schema Analysis

The `bulk_analysis_domains` table already stores domains for qualification. We need to extend it to store Airtable metadata.

## Proposed Schema Changes

### Option 1: Add Airtable Metadata Columns (Recommended)
Add columns directly to `bulk_analysis_domains` table:

```sql
-- Migration: Add Airtable metadata columns
ALTER TABLE bulk_analysis_domains ADD COLUMN airtable_record_id VARCHAR(255);
ALTER TABLE bulk_analysis_domains ADD COLUMN airtable_metadata JSONB;
ALTER TABLE bulk_analysis_domains ADD COLUMN airtable_last_synced TIMESTAMP;

-- Index for quick lookups
CREATE INDEX idx_bulk_domains_airtable_id ON bulk_analysis_domains(airtable_record_id);
```

**JSONB Structure for airtable_metadata:**
```json
{
  "domainRating": 65,
  "totalTraffic": 9687.82,
  "guestPostCost": 100,
  "categories": ["Business", "Marketing"],
  "type": "Blog",
  "publishedOpportunities": 13,
  "contacts": [
    {
      "email": "nikola@nikolaroza.com",
      "hasPaidLinkPrice": true,
      "guestPostCost": 100,
      "linkInsertCost": 0,
      "requirement": "Paid"
    }
  ],
  "lastUpdated": "2024-01-20T10:00:00Z"
}
```

### Option 2: Separate Airtable Cache Table
Create a dedicated table for Airtable data:

```sql
CREATE TABLE airtable_websites_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255) NOT NULL,
  domain_rating INTEGER,
  total_traffic DECIMAL(10,2),
  guest_post_cost DECIMAL(10,2),
  categories TEXT[],
  type VARCHAR(100),
  published_opportunities INTEGER,
  contacts JSONB,
  full_data JSONB, -- Complete Airtable record
  last_synced TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Link to bulk analysis domains
ALTER TABLE bulk_analysis_domains 
ADD COLUMN airtable_website_id UUID REFERENCES airtable_websites_cache(id);
```

## Recommendation: Option 1

**Why Option 1 is better for this use case:**
1. **Simplicity**: No joins needed to access Airtable data
2. **Performance**: Faster queries, especially for filtering
3. **Flexibility**: JSONB allows schema evolution
4. **Consistency**: Keeps domain data together

## Implementation Plan

### 1. Database Migration
```typescript
// migrations/00XX_add_airtable_metadata.sql
ALTER TABLE bulk_analysis_domains 
ADD COLUMN airtable_record_id VARCHAR(255),
ADD COLUMN airtable_metadata JSONB,
ADD COLUMN airtable_last_synced TIMESTAMP;

CREATE INDEX idx_bulk_domains_airtable_id 
ON bulk_analysis_domains(airtable_record_id);
```

### 2. Update Schema Types
```typescript
// lib/db/bulkAnalysisSchema.ts
export const bulkAnalysisDomains = pgTable('bulk_analysis_domains', {
  // ... existing columns ...
  
  // Airtable integration
  airtableRecordId: varchar('airtable_record_id', { length: 255 }),
  airtableMetadata: jsonb('airtable_metadata'),
  airtableLastSynced: timestamp('airtable_last_synced'),
});
```

### 3. Type Definitions
```typescript
// types/airtable.ts
export interface AirtableWebsiteMetadata {
  domainRating: number;
  totalTraffic: number;
  guestPostCost: number;
  categories: string[];
  type: string;
  publishedOpportunities: number;
  contacts: AirtableContact[];
  lastUpdated: string;
}

export interface AirtableContact {
  email: string;
  hasPaidLinkPrice: boolean;
  guestPostCost?: number;
  linkInsertCost?: number;
  requirement: 'Paid' | 'Swap';
}
```

## Query Patterns

### 1. Import Domains with Metadata
```typescript
const domainsToInsert = airtableWebsites.map(website => ({
  domain: website.domain,
  clientId: clientId,
  projectId: projectId,
  airtableRecordId: website.id,
  airtableMetadata: {
    domainRating: website.domainRating,
    totalTraffic: website.totalTraffic,
    // ... other metadata
  },
  airtableLastSynced: new Date()
}));
```

### 2. Filter by Airtable Metadata
```sql
-- Find high DR domains
SELECT * FROM bulk_analysis_domains
WHERE (airtable_metadata->>'domainRating')::int > 50
AND project_id = ?;

-- Find domains in specific categories
SELECT * FROM bulk_analysis_domains
WHERE airtable_metadata->'categories' ? 'Marketing'
AND project_id = ?;
```

### 3. Display Enhanced Data
```typescript
// In UI components, access metadata
const domainRating = domain.airtableMetadata?.domainRating || 'N/A';
const traffic = domain.airtableMetadata?.totalTraffic || 'N/A';
const cost = domain.airtableMetadata?.guestPostCost || 'N/A';
```

## Benefits of This Approach

1. **No Breaking Changes**: Existing code continues to work
2. **Optional Enhancement**: Airtable data is additive
3. **Efficient Queries**: Can filter server-side by metadata
4. **Audit Trail**: Track when data was synced
5. **Offline Capable**: Works even if Airtable is down