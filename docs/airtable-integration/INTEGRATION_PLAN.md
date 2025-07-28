# Airtable Integration Plan for PostFlow

## Overview
This document outlines the integration plan for incorporating Airtable's guest post site data into the PostFlow workflow system.

## Integration Points

### 1. Domain Import for Bulk Analysis
**Goal**: Allow users to filter and import domains from Airtable when creating bulk analysis projects

**Current Flow**:
- User manually copy-pastes domain lists
- No filtering or metadata available

**New Flow**:
- User clicks "Import from Airtable" button
- Modal shows filtering options (DR range, traffic, category, etc.)
- User selects filters and sees matching domains
- User confirms import and domains are added with metadata

### 2. Guest Post Site Data Enhancement
**Goal**: Enrich PostFlow data with Airtable's comprehensive site information

**Data to Import**:
- Domain Rating (DR)
- Total Traffic
- Guest Post Cost
- Categories/Niches
- Contact information (with Link Price validation)
- Success metrics (published opportunities count)

## Architecture Design

### Data Flow
```
Airtable MCP <-> Next.js API Routes <-> PostFlow Database <-> UI Components
```

### Key Components

#### 1. Airtable Service Layer (`/lib/services/airtableService.ts`)
- Handles MCP communication
- Implements caching strategy
- Manages API rate limits
- Provides typed interfaces for Airtable data

#### 2. API Routes
- `/api/airtable/websites/search` - Search and filter websites
- `/api/airtable/websites/[id]` - Get single website details
- `/api/airtable/contacts/link-prices` - Get contact pricing
- `/api/airtable/sync` - Sync data with PostFlow database

#### 3. Database Schema Updates
```sql
-- New table for cached Airtable data
CREATE TABLE airtable_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255) NOT NULL,
  domain_rating INTEGER,
  total_traffic DECIMAL(10,2),
  guest_post_cost DECIMAL(10,2),
  categories TEXT[],
  primary_contact_email VARCHAR(255),
  primary_contact_cost DECIMAL(10,2),
  success_count INTEGER,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link table for bulk analysis domains
CREATE TABLE bulk_analysis_domain_airtable (
  bulk_analysis_domain_id UUID REFERENCES bulk_analysis_domains(id),
  airtable_website_id UUID REFERENCES airtable_websites(id),
  PRIMARY KEY (bulk_analysis_domain_id, airtable_website_id)
);
```

#### 4. UI Components
- `AirtableDomainImporter` - Modal for filtering and importing domains
- `GuestPostSiteCard` - Display Airtable data in workflows
- `ContactSelector` - Choose primary contact based on Link Price

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. Set up Airtable service layer with MCP
2. Create basic API routes
3. Add database tables
4. Implement caching strategy

### Phase 2: Domain Import (Week 2)
1. Build domain filter UI
2. Implement search/filter API
3. Create import flow
4. Add to bulk analysis creation

### Phase 3: Data Enhancement (Week 3)
1. Sync Airtable data with existing domains
2. Display enriched data in UI
3. Implement contact selection logic
4. Add success metrics

### Phase 4: Polish & Optimization (Week 4)
1. Add real-time sync capabilities
2. Implement webhook updates
3. Optimize performance
4. Add error handling

## Technical Considerations

### Caching Strategy
- Cache Airtable data locally for 24 hours
- Implement on-demand refresh
- Use background jobs for bulk syncs

### Rate Limiting
- Airtable API: 5 requests/second
- Implement request queuing
- Batch operations where possible

### Data Consistency
- Primary source: Airtable for site metadata
- PostFlow owns workflow-specific data
- Sync conflicts resolved by last-modified timestamp

### Security
- Store Airtable API keys in environment variables
- Implement row-level security for cached data
- Audit log for all sync operations

## Success Metrics
- Reduce domain addition time by 80%
- Increase data accuracy for guest post costs
- Enable filtering of 10,000+ domains in <2 seconds
- Zero data loss during sync operations

## Next Steps
1. Review and approve plan
2. Set up development environment
3. Begin Phase 1 implementation