# Airtable Integration Flow Analysis

## Current Domain Addition Flow

1. **Location**: `/app/clients/[id]/bulk-analysis/projects/[projectId]/page.tsx`
2. **Current Process**:
   - User manually types/pastes domains into a textarea
   - One domain per line (e.g., example.com, blog.example.com)
   - System checks for duplicates
   - Domains are added to the project with selected target pages/keywords

## Proposed Airtable Integration Points

### 1. Import Button Addition
**Location**: Next to the domain textarea
**UI**: Button with text "Import from Airtable" and database icon
**Behavior**: Opens a modal for filtering and selecting domains

### 2. Airtable Import Modal
**Components Needed**:
```
- AirtableImportModal.tsx
- AirtableFilterPanel.tsx  
- AirtableDomainList.tsx
```

**Filter Options**:
- Domain Rating (DR) range slider
- Traffic range slider
- Categories (multi-select dropdown)
- Guest Post Cost range
- Post Type (Guest Post, Link Insert, Both)
- Active/Inactive status

### 3. Data Flow Architecture

```
User clicks "Import from Airtable"
    ↓
Modal opens with filters
    ↓
Frontend calls: GET /api/airtable/websites/search
    ↓
Backend uses Airtable REST API (not MCP)
    ↓
Returns filtered websites with metadata
    ↓
User selects domains to import
    ↓
Selected domains added to textarea or directly to project
```

## Technical Implementation

### Environment Variables (Production)
```env
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=appnZ4GebaC99OEaX
```

### API Service Structure
```typescript
// lib/services/airtableApiService.ts
class AirtableApiService {
  private apiKey: string;
  private baseId: string;
  
  async searchWebsites(filters: WebsiteFilters): Promise<Website[]> {
    // Use Airtable REST API
    // Apply filters
    // Return formatted data
  }
  
  async getWebsiteDetails(recordId: string): Promise<WebsiteDetails> {
    // Get full website data including contacts
  }
  
  async getLinkPrices(websiteId: string): Promise<LinkPrice[]> {
    // Get pricing for all contacts
  }
}
```

### Key Considerations

1. **Performance**: 
   - Cache Airtable data locally for fast filtering
   - Implement pagination for large result sets
   - Use debounced search for real-time filtering

2. **Data Mapping**:
   - Airtable Website → PostFlow Domain
   - Include metadata: DR, traffic, cost, categories
   - Store Airtable record ID for future sync

3. **Contact Selection**:
   - Don't auto-select contacts during import
   - Let users choose contacts later in workflow
   - Use Link Price table to validate paid relationships

4. **Sync Strategy**:
   - One-way sync: Airtable → PostFlow
   - Manual refresh button for updated data
   - No automatic background sync initially

## User Experience Flow

1. User working on bulk analysis project
2. Clicks "Import from Airtable" button
3. Modal opens with smart defaults:
   - DR: 30-100
   - Traffic: 1000+
   - Status: Active
4. User adjusts filters, sees live count update
5. User reviews filtered domains with metadata
6. User selects domains (checkbox or select all)
7. User clicks "Import X domains"
8. Domains added to project with Airtable metadata
9. User proceeds with normal qualification flow

## Benefits

- **Speed**: Import 100s of domains in seconds vs manual entry
- **Accuracy**: No typos, includes all metadata
- **Filtering**: Only import domains that meet criteria
- **Context**: See DR, traffic, cost before importing

## Next Steps

1. Create Airtable API service with proper auth
2. Build filter UI components
3. Implement search endpoint
4. Add import button to existing UI
5. Test with real Airtable data