# Airtable Integration Implementation Roadmap

## Architecture Overview

```
PostFlow (Server) <-> Airtable REST API
     ↓
Environment Variables:
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
```

## Phase 1: Foundation (Start Here)

### 1.1 Environment Setup
```env
# .env.local
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=appnZ4GebaC99OEaX
```

### 1.2 Create Airtable Service
Following the pattern from `dataForSeoService.ts`:

```typescript
// lib/services/airtableService.ts
export class AirtableService {
  private static readonly API_BASE_URL = 'https://api.airtable.com/v0';
  private static readonly BASE_ID = process.env.AIRTABLE_BASE_ID;
  private static readonly WEBSITE_TABLE_ID = 'tblT8P0fPHV5fdrT5';
  private static readonly LINK_PRICE_TABLE_ID = 'tblEnYjUwKHok7Y3K';
  
  private static getHeaders() {
    if (!process.env.AIRTABLE_API_KEY) {
      throw new Error('Airtable API key not configured');
    }
    
    return {
      'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }
  
  static async searchWebsites(filters: WebsiteFilters): Promise<AirtableWebsite[]> {
    // Implementation
  }
}
```

### 1.3 Type Definitions
```typescript
// types/airtable.ts
export interface AirtableWebsite {
  id: string; // Airtable record ID
  domain: string;
  domainRating: number;
  totalTraffic: number;
  guestPostCost: number;
  categories: string[];
  contacts: string[]; // Email addresses
  publishedOpportunities: number;
}

export interface WebsiteFilters {
  minDR?: number;
  maxDR?: number;
  minTraffic?: number;
  categories?: string[];
  maxCost?: number;
  hasGuestPost?: boolean;
}
```

## Phase 2: API Integration

### 2.1 Create API Route
```typescript
// app/api/airtable/websites/search/route.ts
import { AirtableService } from '@/lib/services/airtableService';

export async function POST(request: Request) {
  try {
    const filters = await request.json();
    const websites = await AirtableService.searchWebsites(filters);
    return Response.json({ websites });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### 2.2 Database Migration
```sql
-- migrations/00XX_add_airtable_metadata.sql
ALTER TABLE bulk_analysis_domains 
ADD COLUMN airtable_record_id VARCHAR(255),
ADD COLUMN airtable_metadata JSONB,
ADD COLUMN airtable_last_synced TIMESTAMP;

CREATE INDEX idx_bulk_domains_airtable_id 
ON bulk_analysis_domains(airtable_record_id);
```

## Phase 3: UI Components

### 3.1 Import Button
Add to existing bulk analysis page:
```typescript
// In page.tsx around line 1500 (near the textarea)
<button
  onClick={() => setShowAirtableImport(true)}
  className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-lg 
             hover:bg-blue-700 flex items-center gap-2"
>
  <Database className="w-4 h-4" />
  Import from Airtable
</button>
```

### 3.2 Import Modal Component
```typescript
// components/bulk-analysis/AirtableImportModal.tsx
export default function AirtableImportModal({ 
  isOpen, 
  onClose, 
  onImport 
}: Props) {
  const [filters, setFilters] = useState<WebsiteFilters>({
    minDR: 30,
    minTraffic: 1000
  });
  const [websites, setWebsites] = useState<AirtableWebsite[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  // Implementation
}
```

## Phase 4: Integration Flow

### 4.1 User Flow
1. User clicks "Import from Airtable"
2. Modal opens with filters (DR, traffic, categories)
3. User adjusts filters → real-time search
4. User selects domains (checkboxes)
5. Click "Import" → domains added with metadata

### 4.2 Data Flow
```typescript
// When importing domains
const domainsToAdd = selectedWebsites.map(website => ({
  domain: website.domain,
  airtableRecordId: website.id,
  airtableMetadata: {
    domainRating: website.domainRating,
    totalTraffic: website.totalTraffic,
    guestPostCost: website.guestPostCost,
    categories: website.categories,
    contacts: website.contacts
  }
}));
```

## Implementation Checklist

- [ ] Add environment variables to .env.local
- [ ] Create AirtableService class
- [ ] Add type definitions
- [ ] Create API search route
- [ ] Run database migration
- [ ] Update bulkAnalysisSchema.ts
- [ ] Add import button to UI
- [ ] Build import modal
- [ ] Implement search/filter logic
- [ ] Test with real Airtable data
- [ ] Add loading states
- [ ] Handle errors gracefully
- [ ] Document API usage

## Key Considerations

1. **Rate Limiting**: Airtable allows 5 requests/second
2. **Pagination**: Handle large result sets (100 records per page)
3. **Caching**: Consider caching search results for 5 minutes
4. **Security**: Never expose API key to frontend
5. **Performance**: Use debounced search as user types

## Next Steps

1. Start with Phase 1: Create the service layer
2. Test API connection with simple queries
3. Build minimal UI to prove concept
4. Iterate based on user feedback