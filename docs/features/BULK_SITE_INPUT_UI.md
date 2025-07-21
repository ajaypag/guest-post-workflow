# Bulk Site Input Interface - V1 Manual Entry

## Overview
Streamlined manual input interface for bulk site qualification. Future versions will add Airtable integration.

## UI Components

### 1. Bulk Site Input Modal
```typescript
interface BulkSiteInputProps {
  clientId: string;
  selectedTargetPages: TargetPage[];
  onSubmit: (sites: BulkSiteInput[]) => void;
  onCancel: () => void;
}

interface BulkSiteInput {
  url: string;
  siteName?: string;
  monthlyTraffic?: number;
  domainAuthority?: number;
}
```

### 2. Input Methods

#### A. Paste List (Primary Method)
```
┌─────────────────────────────────────────────────────────┐
│ Add Sites for Qualification                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Selected Target Pages: 3                                │
│ • Payment Processing Solutions                          │
│ • Fraud Detection Software                              │
│ • PCI Compliance Tools                                  │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Paste URLs (one per line)                       │   │
│ │                                                 │   │
│ │ https://techcrunch.com                          │   │
│ │ finextra.com                                    │   │
│ │ https://www.paymentssource.com/                 │   │
│ │ thepaypers.com                                  │   │
│ │                                                 │   │
│ │                                                 │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Detected: 4 sites                                       │
│                                                         │
│ [Parse & Continue] [Cancel]                             │
└─────────────────────────────────────────────────────────┘
```

#### B. Structured Input (Optional Enhancement)
```
┌─────────────────────────────────────────────────────────┐
│ Add Site Details (Optional)                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Site 1: techcrunch.com ✓                        │   │
│ │ Name: [TechCrunch                            ]  │   │
│ │ Traffic: [15M                ] visitors/month    │   │
│ │ DA: [91    ]                                    │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Site 2: finextra.com ✓                          │   │
│ │ Name: [___________________]                     │   │
│ │ Traffic: [_______] visitors/month               │   │
│ │ DA: [____]                                      │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [Skip Details & Start] [Add Details & Start]            │
└─────────────────────────────────────────────────────────┘
```

### 3. URL Parsing & Validation

```typescript
class URLParser {
  static parseURLList(input: string): ParsedSite[] {
    const lines = input.split('\n').map(line => line.trim()).filter(Boolean);
    const sites: ParsedSite[] = [];
    
    for (const line of lines) {
      try {
        // Handle various URL formats
        let url = line;
        
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        const parsed = new URL(url);
        const domain = parsed.hostname.replace('www.', '');
        
        sites.push({
          originalInput: line,
          url: parsed.href,
          domain: domain,
          isValid: true
        });
      } catch (error) {
        sites.push({
          originalInput: line,
          url: '',
          domain: '',
          isValid: false,
          error: 'Invalid URL format'
        });
      }
    }
    
    return sites;
  }
  
  static validateSites(sites: ParsedSite[]): ValidationResult {
    const valid = sites.filter(s => s.isValid);
    const invalid = sites.filter(s => !s.isValid);
    const duplicates = this.findDuplicates(valid);
    
    return {
      validCount: valid.length - duplicates.length,
      invalidCount: invalid.length,
      duplicateCount: duplicates.length,
      totalCount: sites.length,
      validSites: valid,
      invalidSites: invalid,
      duplicateSites: duplicates
    };
  }
}
```

### 4. Validation Feedback

```
┌─────────────────────────────────────────────────────────┐
│ URL Validation Results                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ✅ Valid sites: 12                                      │
│ ⚠️  Duplicates removed: 2                               │
│ ❌ Invalid URLs: 1                                      │
│                                                         │
│ Invalid URLs:                                           │
│ • "tech blog.com" - Invalid URL format                 │
│                                                         │
│ Duplicates removed:                                     │
│ • techcrunch.com (appeared 3 times)                    │
│                                                         │
│ Ready to qualify 12 unique sites                       │
│                                                         │
│ [Edit List] [Proceed with 12 sites]                    │
└─────────────────────────────────────────────────────────┘
```

### 5. Pre-flight Check

```
┌─────────────────────────────────────────────────────────┐
│ Qualification Job Summary                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📊 Job Configuration                                    │
│ • Sites to qualify: 12                                  │
│ • Target pages: 3                                       │
│ • Check depth: Balanced (recommended)                   │
│                                                         │
│ 💰 Estimated Cost                                       │
│ • Topic terms extracted: ~25-30                         │
│ • API calls needed: ~300-360                            │
│ • Estimated cost: $3.00 - $3.60                         │
│                                                         │
│ ⏱️ Estimated Time                                       │
│ • Processing time: 5-10 minutes                         │
│                                                         │
│ [Change Settings] [Start Qualification]                 │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. React Component Structure
```typescript
// components/BulkSiteInput.tsx
const BulkSiteInput: React.FC<BulkSiteInputProps> = ({ 
  clientId, 
  selectedTargetPages,
  onSubmit,
  onCancel 
}) => {
  const [rawInput, setRawInput] = useState('');
  const [parsedSites, setParsedSites] = useState<ParsedSite[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [checkDepth, setCheckDepth] = useState<'minimal' | 'balanced' | 'thorough'>('balanced');
  
  const handleParse = () => {
    const parsed = URLParser.parseURLList(rawInput);
    const validation = URLParser.validateSites(parsed);
    setParsedSites(parsed);
    setValidationResult(validation);
  };
  
  const handleSubmit = async () => {
    if (!validationResult) return;
    
    const sitesToSubmit = validationResult.validSites.map(site => ({
      url: site.url,
      domain: site.domain,
      siteName: site.siteName,
      monthlyTraffic: site.monthlyTraffic,
      domainAuthority: site.domainAuthority
    }));
    
    onSubmit(sitesToSubmit);
  };
  
  // ... render UI
};
```

### 2. API Endpoint
```typescript
// /api/qualification-jobs/create
export async function POST(req: Request) {
  const { 
    clientId, 
    targetPageIds, 
    sites, 
    checkDepth,
    jobName 
  } = await req.json();
  
  // Create job
  const job = await createQualificationJob({
    clientId,
    name: jobName || `Bulk Qualification ${new Date().toLocaleDateString()}`,
    checkDepth,
    totalSites: sites.length,
    status: 'pending'
  });
  
  // Add sites to job
  await addBulkSites(job.id, sites);
  
  // Link target pages
  await linkTargetPages(job.id, targetPageIds);
  
  // Start async processing
  startQualificationProcess(job.id);
  
  return NextResponse.json({ 
    success: true, 
    jobId: job.id,
    message: 'Qualification job created and processing started'
  });
}
```

### 3. Smart Defaults

1. **URL Cleaning**
   - Auto-add https:// if missing
   - Remove www. for consistency
   - Handle trailing slashes
   - Extract domain from full URLs

2. **Duplicate Detection**
   - Check by domain (not full URL)
   - Merge duplicates automatically
   - Show user which were removed

3. **Batch Size Limits**
   - Soft limit: 50 sites (warning)
   - Hard limit: 100 sites (enforced)
   - Suggest splitting large batches

## Future Enhancements (V2)

1. **Airtable Integration**
   - Connect to Airtable base
   - Select view/table
   - Map fields automatically
   - Import with one click

2. **CSV Upload**
   - Drag & drop CSV
   - Auto-detect columns
   - Preview before import

3. **Saved Lists**
   - Save frequently used sites
   - Create site groups
   - Quick-add from history

4. **Advanced Options**
   - Set per-site priorities
   - Exclude specific sites
   - Custom relevance thresholds