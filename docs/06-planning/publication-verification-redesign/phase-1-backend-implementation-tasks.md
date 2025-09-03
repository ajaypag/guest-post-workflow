# Phase 1: Backend Implementation - Detailed Task List
**Start Time**: ___________  
**Developer**: ___________

## 🚀 Setup & Environment Configuration

### 1. Environment Setup (30 min)
- [ ] Create feature branch: `git checkout -b feature/publication-verification-backend`
- [ ] Add to `.env.local`:
  ```env
  SERPER_API_KEY=555225bf71d614f7a908566279b5ddf723021ad8
  ```
- [ ] Verify env variable loads: `console.log(process.env.SERPER_API_KEY)`
- [ ] Test Serper API manually with curl:
  ```bash
  # Test scraping
  curl -X POST https://scrape.serper.dev \
    -H "X-API-KEY: 555225bf71d614f7a908566279b5ddf723021ad8" \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
  
  # Test Google search
  curl -X POST https://google.serper.dev/search \
    -H "X-API-KEY: 555225bf71d614f7a908566279b5ddf723021ad8" \
    -H "Content-Type: application/json" \
    -d '{"q": "site:example.com"}'
  ```
- [ ] **✅ CHECKPOINT**: Both API calls return valid JSON

---

## 📦 Service Layer Implementation

### 2. Create Web Scraping Service (2 hours)

#### File: `lib/services/webScrapingService.ts`

**2.1 Basic Structure** (30 min)
```typescript
// Start with this skeleton
export class WebScrapingService {
  private static readonly API_KEY = process.env.SERPER_API_KEY || '555225bf...';
  private static readonly SCRAPE_URL = 'https://scrape.serper.dev';
  private static readonly SEARCH_URL = 'https://google.serper.dev/search';
}
```
- [ ] Create file with class structure
- [ ] Add interfaces for response types
- [ ] Add error class for service errors
- [ ] **✅ CHECKPOINT**: File compiles with `npm run build`

**2.2 Rate Limiter** (30 min)
```typescript
private static lastRequestTime = 0;
private static requestCount = 0;
private static readonly RATE_LIMIT = 10; // per minute

private static async checkRateLimit(): Promise<void> {
  // Implementation here
}
```
- [ ] Implement rate limit checker (10 req/min)
- [ ] Add time window reset logic
- [ ] Throw user-friendly error when limit hit
- [ ] Test with rapid calls in console
- [ ] **✅ CHECKPOINT**: Rate limiter blocks 11th request

**2.3 Scrape Article Method** (30 min)
```typescript
async scrapeArticle(url: string): Promise<{
  success: boolean;
  html: string;
  markdown: string;
  title: string;
  statusCode: number;
  error?: string;
}>
```
- [ ] Implement fetch to Serper scrape API
- [ ] Parse response and extract fields
- [ ] Handle errors gracefully
- [ ] Add timeout (30 seconds)
- [ ] Test with real article URL
- [ ] **✅ CHECKPOINT**: Successfully scrapes a known article

**2.4 Check Google Indexed Method** (30 min)
```typescript
async checkGoogleIndexed(url: string): Promise<{
  indexed: boolean | null;
  resultCount: number;
  error?: string;
}>
```
- [ ] Implement site: search query
- [ ] Parse search results
- [ ] Check if exact URL matches
- [ ] Handle "no results" case
- [ ] Test with known indexed URL
- [ ] **✅ CHECKPOINT**: Correctly identifies indexed page

**2.5 Error Handling & Retry** (30 min)
- [ ] Add retry logic (3 attempts)
- [ ] Exponential backoff between retries
- [ ] Log errors for debugging
- [ ] Return user-friendly error messages
- [ ] Test with invalid URL
- [ ] **✅ CHECKPOINT**: Gracefully handles bad URLs

---

### 3. Create Publication Verification Service (3 hours)

#### File: `lib/services/publicationVerificationService.ts`

**3.1 Interfaces & Types** (30 min)
```typescript
export interface VerificationResult {
  critical: {
    urlIsLive: boolean | null;
    clientLinkPresent: boolean | null;
    anchorTextCorrect: boolean | null;
    linkIsDofollow: boolean | null;
    correctDomain: boolean | null;
    clientMentionPresent: boolean | null;
  };
  additional: {
    googleIndexed: boolean | null;
    imagesPresent: boolean | null;
    urlMatchesSuggestion: boolean | null;
  };
  metadata: {
    verifiedAt: Date;
    scrapedContent?: string;
    errors: string[];
  };
}
```
- [ ] Create all interfaces
- [ ] Add type exports
- [ ] Document each field with JSDoc
- [ ] **✅ CHECKPOINT**: Types import correctly in other files

**3.2 Missing Fields Check** (30 min)
```typescript
static checkRequiredFields(
  lineItem: any,
  workflow: any
): { missing: string[]; values: Record<string, any> }
```
- [ ] Check for targetPageUrl
- [ ] Check for anchorText
- [ ] Check for assignedDomain
- [ ] Check for client mention phrase in workflow
- [ ] Return list of missing fields
- [ ] **✅ CHECKPOINT**: Correctly identifies missing data

**3.3 Domain Verification** (30 min)
```typescript
private static verifyDomain(
  publishedUrl: string,
  expectedDomain: string
): { match: 'exact' | 'subdomain' | 'none'; passed: boolean }
```
- [ ] Normalize both domains
- [ ] Check exact match
- [ ] Check subdomain match (blog.example.com)
- [ ] Handle www variations
- [ ] Test with various domain formats
- [ ] **✅ CHECKPOINT**: Handles all domain variations

**3.4 Link Detection** (45 min)
```typescript
private static detectClientLink(
  html: string,
  targetUrl: string,
  anchorText: string
): {
  linkFound: boolean;
  anchorTextCorrect: boolean;
  isDofollow: boolean;
  linkHtml?: string;
}
```
- [ ] Search for target URL in HTML
- [ ] Check if anchor text matches exactly
- [ ] Check for rel="nofollow"
- [ ] Extract link HTML for inspection
- [ ] Handle URL encoded characters
- [ ] Test with sample HTML
- [ ] **✅ CHECKPOINT**: Correctly finds and analyzes links

**3.5 Client Mention Detection** (30 min)
```typescript
private static detectClientMention(
  text: string,
  brandName: string,
  keyword: string
): {
  found: boolean;
  proximity: 'same-sentence' | 'same-paragraph' | 'not-found';
}
```
- [ ] Search for brand name
- [ ] Search for keyword
- [ ] Check proximity (same paragraph)
- [ ] Handle case variations
- [ ] Test with sample text
- [ ] **✅ CHECKPOINT**: Finds brand+keyword nearby

**3.6 Main Verification Method** (45 min)
```typescript
static async autoVerify(
  publishedUrl: string,
  lineItem: any,
  workflow: any
): Promise<VerificationResult>
```
- [ ] Call web scraping service
- [ ] Run all critical checks
- [ ] Run additional checks
- [ ] Compile results
- [ ] Handle errors for each check
- [ ] Test with mock data
- [ ] **✅ CHECKPOINT**: Returns complete results

---

### 4. Create Workflow-LineItem Sync Service (1 hour)

#### File: `lib/services/workflowLineItemSyncService.ts`

**4.1 Basic Structure** (15 min)
```typescript
export class WorkflowLineItemSyncService {
  static async syncVerificationToLineItem(
    lineItemId: string,
    verificationResult: VerificationResult,
    userId: string
  ): Promise<void>
```
- [ ] Create file and class
- [ ] Import database connections
- [ ] Import required schemas
- [ ] **✅ CHECKPOINT**: File structure ready

**4.2 Find Line Item** (15 min)
```typescript
private static async getLineItem(lineItemId: string)
```
- [ ] Query database for line item
- [ ] Handle not found case
- [ ] Return typed result
- [ ] **✅ CHECKPOINT**: Finds test line item

**4.3 Update Line Item** (30 min)
```typescript
private static async updateLineItem(
  lineItemId: string,
  updates: Partial<OrderLineItem>
)
```
- [ ] Build update query
- [ ] Set publishedUrl if provided
- [ ] Set deliveredAt if verification passed
- [ ] Update metadata.qaResults
- [ ] Update status to 'delivered' if passed
- [ ] Handle database errors
- [ ] **✅ CHECKPOINT**: Updates test line item

---

### 5. Create API Endpoint (1 hour)

#### File: `app/api/workflows/[id]/verify-publication/route.ts`

**5.1 Route Structure** (15 min)
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
```
- [ ] Create route file
- [ ] Add imports
- [ ] Setup async params handling
- [ ] **✅ CHECKPOINT**: Route responds to POST

**5.2 Authentication** (15 min)
```typescript
const session = await AuthServiceServer.getSession(request);
if (!session || session.userType !== 'internal') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
- [ ] Check session exists
- [ ] Verify internal user only
- [ ] Return 401 if unauthorized
- [ ] **✅ CHECKPOINT**: Blocks non-internal users

**5.3 Get Workflow & Line Item** (15 min)
```typescript
const workflow = await WorkflowService.getGuestPostWorkflow(workflowId);
const lineItem = await findLineItemByWorkflowId(workflowId);
```
- [ ] Fetch workflow from database
- [ ] Find associated line item
- [ ] Handle not found cases
- [ ] **✅ CHECKPOINT**: Retrieves test workflow

**5.4 Run Verification** (15 min)
```typescript
const body = await request.json();
const { publishedUrl } = body;

const result = await PublicationVerificationService.autoVerify(
  publishedUrl,
  lineItem,
  workflow
);
```
- [ ] Parse request body
- [ ] Validate published URL
- [ ] Call verification service
- [ ] Handle service errors
- [ ] Return results as JSON
- [ ] **✅ CHECKPOINT**: Returns verification results

---

## 🧪 Testing Phase 1

### 6. Unit Tests (1 hour)

**6.1 Test Web Scraping Service** (20 min)
- [ ] Mock Serper API responses
- [ ] Test successful scrape
- [ ] Test rate limiting
- [ ] Test error handling
- [ ] **✅ CHECKPOINT**: All tests pass

**6.2 Test Verification Logic** (20 min)
- [ ] Test domain matching
- [ ] Test link detection
- [ ] Test client mention detection
- [ ] Test with various HTML samples
- [ ] **✅ CHECKPOINT**: Logic tests pass

**6.3 Test API Endpoint** (20 min)
- [ ] Test with valid request
- [ ] Test authentication
- [ ] Test missing data
- [ ] Test error responses
- [ ] **✅ CHECKPOINT**: API tests pass

---

### 7. Integration Testing (1 hour)

**7.1 Manual API Testing** (30 min)
- [ ] Start dev server: `npm run dev`
- [ ] Test with Postman/Thunder Client
- [ ] Use real published article URL
- [ ] Verify all checks work
- [ ] Check rate limiting works
- [ ] **✅ CHECKPOINT**: Real article verifies correctly

**7.2 Database Integration** (30 min)
- [ ] Create test workflow in database
- [ ] Create test line item
- [ ] Run verification
- [ ] Check line item updated (if implementing sync)
- [ ] **✅ CHECKPOINT**: Database updates work

---

## 📋 Final Checklist

### 8. Code Quality (30 min)
- [ ] Run TypeScript compiler: `npm run build`
- [ ] Fix any type errors
- [ ] Run linter: `npm run lint`
- [ ] Fix linting issues
- [ ] Add comments to complex logic
- [ ] **✅ CHECKPOINT**: Clean build, no errors

### 9. Documentation (30 min)
- [ ] Document API endpoint in README
- [ ] Add example request/response
- [ ] Document environment variables
- [ ] Note any limitations
- [ ] **✅ CHECKPOINT**: Docs complete

### 10. Commit & Push (15 min)
- [ ] Review all changes: `git diff`
- [ ] Commit with message: `feat: Add publication verification backend services`
- [ ] Push branch: `git push origin feature/publication-verification-backend`
- [ ] Create draft PR for review
- [ ] **✅ CHECKPOINT**: Code in repository

---

## 🎯 Success Criteria

**Phase 1 is complete when:**
- [ ] ✅ Serper API integration works
- [ ] ✅ All verification checks implemented
- [ ] ✅ API endpoint functional
- [ ] ✅ Rate limiting prevents abuse
- [ ] ✅ Error handling graceful
- [ ] ✅ Tests passing
- [ ] ✅ Code reviewed and merged

---

## 🐛 Troubleshooting

### Common Issues:

**Serper API fails:**
- Check API key is correct
- Check network connectivity
- Check rate limits not exceeded

**TypeScript errors:**
- Run `npm run build` frequently
- Check imports are correct
- Ensure types match

**Database errors:**
- Check connection string
- Verify schema matches
- Check permissions

**Rate limit issues:**
- Clear rate limit state
- Wait 60 seconds
- Check time calculation

---

## 📝 Notes Section
_Track issues, decisions, and observations here:_

Time started: ___________
Time completed: ___________
Blockers encountered:
___________________________
___________________________
___________________________

Next steps for Phase 2:
___________________________
___________________________
___________________________