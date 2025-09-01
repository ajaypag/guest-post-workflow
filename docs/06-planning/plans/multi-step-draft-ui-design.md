# Multi-Step Draft UI Design for ManyReach V3

## Overview
This document designs a comprehensive multi-step draft review UI that handles all 5 database tables populated by the enhanced V3 email parser, mirroring the complexity of the publisher creation workflow.

## Current Problem
The existing simple draft UI only shows:
- ❌ Basic publisher info (company, contact, email)
- ❌ Single offering with basic price
- ❌ Simple requirements field

**Missing 80% of the data:**
- Website details, metrics, restrictions
- Complex offering attributes and requirements  
- Pricing rules (bulk discounts, surcharges, etc.)
- Publisher-website relationships
- Business terms and guarantees

## Design Philosophy

### 1. Mirror Publisher Creation Workflow
Follow the same multi-step pattern as `/publisher/websites/new`:
- Step-by-step progression
- Clear section headers
- Save draft at each step
- Review summary before final approval

### 2. Handle Data Complexity
- Show both AI-extracted and missing fields clearly
- Allow editing of all extracted data
- Highlight uncertain/low-confidence extractions
- Preserve original email text for context

### 3. Progressive Disclosure
- Start with high-level overview
- Drill down into complex details
- Show/hide advanced sections based on data presence
- Prioritize most important fields first

## UI Wireframe Structure

### Sidebar Navigation (Left Side - 25% width)
```
┌─ Email Preview ────────────┐
│ From: publisher@email.com  │
│ Subject: Guest Post Services│
│ [Show Full Email] [Hide]   │
│                           │
│ AI Extraction Summary      │
│ ✅ Publisher: High Conf.   │ 
│ ✅ Website: Medium Conf.   │
│ ✅ Pricing: High Conf.     │
│ ⚠️ Rules: Low Conf.       │
│                           │
│ Progress                   │
│ ● Step 1: Publisher       │
│ ○ Step 2: Websites        │
│ ○ Step 3: Offerings       │  
│ ○ Step 4: Pricing Rules   │
│ ○ Step 5: Relationships   │
│ ○ Step 6: Review          │
└───────────────────────────┘
```

### Main Content Area (Right Side - 75% width)

## Step 1: Publisher Information
```
┌─ Publisher Details ────────────────────────────────┐
│                                                    │
│ Basic Information                                  │
│ ┌─ Company Name* ──────────────────────────────┐   │
│ │ [Littlegate Publishing        ] ✅ Extracted │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Contact Name ───────────────────────────────┐   │  
│ │ [Sarah Johnson              ] ✅ Extracted   │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Email* ─────────────────────────────────────┐   │
│ │ [info@littlegatepublishing.com] ✅ Extracted │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Phone ──────────────────────────────────────┐   │
│ │ [                           ] ❌ Not Found   │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Business Information (Extracted from Email)        │
│ ┌─ Payment Methods ────────────────────────────┐   │
│ │ ☑ PayPal  ☑ Stripe  ☐ Bank Transfer        │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Payment Terms ──────────────────────────────┐   │
│ │ [Payment due within 48 hours ] ✅ Extracted │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Response Time ──────────────────────────────┐   │
│ │ [Usually within 24 hours    ] ✅ Extracted   │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Address Information (Optional - Not Extracted)     │
│ ┌─ Street Address ─────────────────────────────┐   │
│ │ [                           ] ❌ Missing     │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [< Back]                    [Save Draft] [Next >] │
└────────────────────────────────────────────────────┘
```

## Step 2: Website Details  
```
┌─ Website Information ──────────────────────────────┐
│                                                    │
│ Website #1 of 1                                   │
│ ┌─ Domain* ────────────────────────────────────┐   │
│ │ [littlegatepublishing.com  ] ✅ Extracted   │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Metrics (Extracted from Email)                     │
│ ┌─ Domain Rating ──────────────────────────────┐   │
│ │ [35                        ] ✅ Extracted    │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Monthly Traffic ─────────────────────────────┐   │
│ │ [50,000                    ] ✅ Extracted    │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Categories & Niches                                │
│ ┌─ Niches ─────────────────────────────────────┐   │
│ │ ☑ Business  ☑ Marketing  ☐ Technology       │   │
│ │ [+ Add Custom Niche]                         │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Website Type ───────────────────────────────┐   │
│ │ ☑ Blog  ☐ News  ☐ Magazine  ☐ E-commerce    │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Content Restrictions (Extracted)                   │
│ ┌─ Prohibited Content ──────────────────────────┐   │
│ │ ☑ CBD  ☑ Casino  ☑ Adult Content            │   │
│ │ ☐ Cryptocurrency  ☐ Political  ☐ Medical     │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Content Guidelines ──────────────────────────┐   │
│ │ [Must be 100% original and high-quality      │   │
│ │  content. No plagiarism allowed.] ✅ Extract │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [< Back]                    [Save Draft] [Next >] │
└────────────────────────────────────────────────────┘
```

## Step 3: Service Offerings
```
┌─ Service Offerings ────────────────────────────────┐
│                                                    │
│ Offering #1 of 1           [+ Add Another Offering]│
│                                                    │
│ Basic Service Details                              │ 
│ ┌─ Service Type* ───────────────────────────────┐   │
│ │ [Guest Post ▼] ✅ Extracted                  │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Service Name ────────────────────────────────┐   │
│ │ [Permanently Hosted Guest Article] ✅ Extract │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Pricing Information                                │
│ ┌─ Base Price* ─────────────────────────────────┐   │
│ │ $[40                      ] ✅ Extracted      │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Currency ────────────────────────────────────┐   │
│ │ [USD ▼] ✅ Extracted                          │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Turnaround Time ─────────────────────────────┐   │
│ │ [2-3] business days ✅ Extracted              │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Content Specifications                             │
│ ┌─ Word Count Range ────────────────────────────┐   │
│ │ Min: [500 ] Max: [2000] ❌ Not Found         │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Included Features (Extracted from Email)           │
│ ☑ Permanent hosting    ☑ Author bio section       │
│ ☑ 2 dofollow links     ☐ Social media shares      │
│ ☐ Custom images        ☐ Email newsletter         │
│                                                    │
│ Advanced Pricing                                   │
│ ┌─ Express Service ─────────────────────────────┐   │
│ │ ☐ Available   Price: $[    ] Days: [    ]    │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Additional Links ────────────────────────────┐   │
│ │ $[15] per extra link ✅ Extracted            │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Content Requirements                               │
│ ┌─ Content Guidelines ──────────────────────────┐   │
│ │ [Must be 100% original and high-quality.     │   │
│ │  Content reviewed before publishing.          │   │
│ │  Author bio section required.] ✅ Extracted  │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [< Back]                    [Save Draft] [Next >] │
└────────────────────────────────────────────────────┘
```

## Step 4: Pricing Rules (Advanced)
```
┌─ Pricing Rules ────────────────────────────────────┐
│                                                    │
│ Extracted Pricing Rules (2 found)                 │
│                                                    │
│ Rule #1: Bulk Discount                            │
│ ┌──────────────────────────────────────────────┐   │
│ │ Name: [5+ Posts Volume Discount]              │   │
│ │ Type: Bulk Discount                           │   │
│ │ Condition: Order 5 or more posts             │   │
│ │ Discount: 10% off total                      │   │
│ │ Source: "5+ posts get 10% discount" ✅       │   │
│ │                                              │   │
│ │ ☑ Active  ☑ Auto-apply  Priority: [10]      │   │
│ │ [Edit Rule] [Delete]                         │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Rule #2: Niche Surcharge                          │
│ ┌──────────────────────────────────────────────┐   │
│ │ Name: [Finance/Crypto Premium]                │   │
│ │ Type: Niche Surcharge                        │   │
│ │ Condition: Content is Finance or Crypto      │   │
│ │ Surcharge: +$25.00                           │   │
│ │ Source: "Finance and crypto posts are +$25" ✅│   │
│ │                                              │   │
│ │ ☑ Active  ☑ Auto-apply  Priority: [20]      │   │
│ │ [Edit Rule] [Delete]                         │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [+ Add Custom Rule]                                │
│                                                    │
│ Rules Summary                                      │
│ Base Price: $40.00                                │
│ Example: 5 Finance posts = $40 + $25 - 10% = $292.50│
│                                                    │
│ [< Back]                    [Save Draft] [Next >] │
└────────────────────────────────────────────────────┘
```

## Step 5: Publisher-Website Relationships  
```
┌─ Relationships ────────────────────────────────────┐
│                                                    │
│ Publisher ↔ Website Connections                    │
│                                                    │
│ ┌─ Littlegate Publishing ───────────────────────┐   │
│ │ ↓ manages                                     │   │
│ │ littlegatepublishing.com                      │   │
│ │                                               │   │
│ │ Relationship Type: [Contact ▼]                │   │
│ │ ☑ Primary website for this publisher         │   │
│ │ ☑ Verified relationship                      │   │
│ │                                               │   │
│ │ Contact Details:                              │   │
│ │ Email: [info@littlegatepublishing.com]        │   │
│ │ Name:  [Sarah Johnson]                        │   │
│ │ Phone: [                    ]                 │   │
│ │                                               │   │
│ │ Payment Terms:                                │   │
│ │ [Payment due within 48 hours] ✅ Extracted   │   │
│ │                                               │   │
│ │ Internal Notes:                               │   │
│ │ [Email imported from ManyReach campaign      │   │
│ │  "LI for BB (countrybrook)" on 2024-01-XX]   │   │
│ └───────────────────────────────────────────────┘   │
│                                                    │
│ Service Availability                               │
│ This website offers: 1 service type               │
│ ☑ Guest Post ($40 + pricing rules)                │
│                                                    │
│ [< Back]                    [Save Draft] [Next >] │
└────────────────────────────────────────────────────┘
```

## Step 6: Review & Approval
```
┌─ Final Review ─────────────────────────────────────┐
│                                                    │
│ Complete Publisher Profile Preview                 │
│                                                    │
│ Publisher: Littlegate Publishing                   │
│ Contact: Sarah Johnson (info@littlegatepublishing.com)│
│ Source: ManyReach Email Import                     │
│ Confidence: 95% (High)                            │
│                                                    │
│ ┌─ Will Create: ────────────────────────────────┐   │
│ │ ✓ 1 Publisher record                          │   │
│ │ ✓ 1 Website record (littlegatepublishing.com) │   │
│ │ ✓ 1 Service offering (Guest Post - $40)      │   │
│ │ ✓ 2 Pricing rules (Bulk discount, Niche fees)│   │
│ │ ✓ 1 Publisher-website relationship           │   │
│ │                                               │   │
│ │ Total: 6 database records                     │   │
│ └───────────────────────────────────────────────┘   │
│                                                    │
│ ⚠️ Missing Information (will need to be added later):│
│ • Publisher address/location                       │
│ • Website content guidelines URL                   │
│ • Publisher phone number                           │
│                                                    │
│ 📧 Original Email Context                          │
│ [View Full Email Content]                          │
│                                                    │
│ Extraction Notes:                                  │
│ "Comprehensive pricing and service details found. │
│  High confidence extraction with clear pricing    │
│  structure and business terms."                    │
│                                                    │
│ Next Steps After Approval:                         │
│ 1. Create all database records                     │
│ 2. Send verification email to publisher           │
│ 3. Mark draft as "approved" and archive           │
│                                                    │
│ ┌─ Actions ─────────────────────────────────────┐   │
│ │ [< Back to Edit]  [Save as Draft]           │   │
│ │                                               │   │
│ │ [✅ Approve & Create Publisher]  [❌ Reject]  │   │
│ └───────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### State Management
```typescript
interface DraftState {
  // Core data
  publisher: PublisherData;
  websites: WebsiteData[];
  offerings: OfferingData[];  
  pricingRules: PricingRuleData[];
  relationships: RelationshipData[];
  
  // UI state
  currentStep: 'publisher' | 'websites' | 'offerings' | 'rules' | 'relationships' | 'review';
  validationErrors: ValidationErrors;
  hasUnsavedChanges: boolean;
  
  // AI metadata
  extractionMetadata: {
    confidence: number;
    extractionNotes: string;
    ambiguousFields: string[];
    originalEmail: EmailContent;
  };
}
```

### Validation Logic
```typescript
// Step-by-step validation
const validatePublisher = (data: PublisherData) => {
  const errors: ValidationErrors = {};
  if (!data.companyName) errors.companyName = "Required";
  if (!data.email || !isValidEmail(data.email)) errors.email = "Valid email required";
  return errors;
};

const validateWebsite = (data: WebsiteData) => {
  const errors: ValidationErrors = {};
  if (!data.domain) errors.domain = "Required";
  if (!isValidDomain(data.domain)) errors.domain = "Valid domain required";
  return errors;
};

// Overall draft validation  
const validateCompleteDraft = (state: DraftState) => {
  return {
    canProceed: isValidForApproval(state),
    missingFields: getMissingRequiredFields(state),
    warnings: getDataQualityWarnings(state)
  };
};
```

### Auto-Save Pattern
```typescript  
// Save after each step completion
const handleStepChange = (newStep: Step, currentData: DraftState) => {
  saveDraftToDatabase(currentData);
  setCurrentStep(newStep);
};

// Save on field changes (debounced)
const handleFieldChange = debounce((field: string, value: any) => {
  updateDraftState(field, value);
  saveDraftToDatabase(getDraftState());
}, 1000);
```

## Implementation Considerations

### Performance
- Lazy load complex UI sections
- Debounce auto-save operations  
- Cache validation results
- Progressive enhancement for large datasets

### Accessibility
- Proper ARIA labels for all form sections
- Keyboard navigation between steps
- Screen reader friendly error messages
- High contrast mode support

### Error Handling
- Graceful degradation for API failures
- Clear error messages with actionable guidance
- Recovery options for unsaved changes
- Rollback capability for failed approvals

### Mobile Responsiveness  
- Collapsible sidebar on mobile
- Touch-friendly form controls
- Simplified mobile workflow (fewer concurrent fields)
- Swipe navigation between steps

## Next Steps
1. Create comprehensive parsing prompt incorporating this UI design
2. Build step-by-step React components
3. Implement database insertion logic for all 5 tables
4. Add comprehensive validation and error handling
5. Create admin review workflow for complex/ambiguous cases