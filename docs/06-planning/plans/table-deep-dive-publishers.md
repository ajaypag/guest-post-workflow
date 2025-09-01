# Deep Dive: Publishers Table - Field-by-Field AI Extraction Guidelines

## Overview
This document provides comprehensive AI extraction guidelines for every field in the `publishers` table, including business logic, validation rules, and specific instructions for LLM processing.

## Publishers Table Schema Analysis

```sql
CREATE TABLE publishers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companyName VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  contactName VARCHAR(255) DEFAULT 'Unknown',
  phone VARCHAR(50),
  emailVerified BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending',
  accountStatus VARCHAR(50) DEFAULT 'shadow',
  source VARCHAR(50) DEFAULT 'manyreach',
  description TEXT,
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zipCode VARCHAR(20),
  country VARCHAR(100),
  confidenceScore DECIMAL(3,2),
  attributes JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Field-by-Field Extraction Guidelines

### 1. companyName (VARCHAR(255) NOT NULL)
**Business Logic**: The official business/company name that publishes content or manages websites.

**AI Extraction Rules**:
```
PRIORITY ORDER:
1. Explicit company mention: "We are Acme Publishing", "Acme Media Group offers..."
2. Email signature company line: "John Doe\nAcme Publishing\nDirector of Content"
3. Email domain inference: john@acmepublishing.com → "Acme Publishing" (careful with common domains)
4. Website ownership statements: "We own techblog.com" → infer company from context

GUARDRAILS:
- Must be a business entity name, not a person's name
- If only person name found, use it but flag as low confidence
- Remove legal suffixes for normalization: "LLC", "Inc", "Ltd" → store in attributes
- Maximum 255 characters, truncate if longer
- If multiple companies mentioned, choose the one sending the email

VALIDATION:
✅ Valid: "TechCrunch Media", "Sarah's Publishing House", "Digital Marketing Pro"
❌ Invalid: "john@gmail.com", "undefined", "N/A", single letters/numbers

CONFIDENCE SCORING:
- High (0.9+): Explicit company name in signature or clear statement
- Medium (0.7-0.8): Inferred from email domain or context clues  
- Low (0.5-0.6): Person name used as company, unclear context
- Very Low (<0.5): Generic terms, email addresses, unclear references

SPECIAL CASES:
- Freelancer emails: "I'm John, freelance writer" → companyName: "John's Writing Services", flag
- Agency emails: "We're XYZ Agency representing multiple sites" → use agency name
- Generic emails: gmail/yahoo → require explicit company mention, otherwise low confidence
```

### 2. email (VARCHAR(255) UNIQUE NOT NULL)
**Business Logic**: Primary business contact email for the publisher.

**AI Extraction Rules**:
```
PRIORITY ORDER:
1. Sender email address (From: field)
2. Business email mentioned in signature
3. Alternative contact email mentioned in body

GUARDRAILS:
- Must be valid email format (regex: ^[^\s@]+@[^\s@]+\.[^\s@]+$)
- Prefer business domain emails over generic (gmail, yahoo, hotmail)
- If multiple emails, choose business domain first
- Store alternatives in attributes.alternativeEmails[]

VALIDATION:
✅ Valid: "contact@publishinghouse.com", "editor@newsblog.co.uk" 
❌ Invalid: "not-an-email", "@company.com", "email", spaces or special chars

NORMALIZATION:
- Convert to lowercase
- Trim whitespace
- Validate domain exists (basic format check)

CONFIDENCE SCORING:
- High (1.0): Valid business domain email
- Medium (0.8): Valid generic domain email (gmail, yahoo)
- Low (0.6): Suspicious format but passes basic validation
- Invalid (0.0): Fails email format validation

SPECIAL CASES:
- Multiple emails: store primary + alternatives in attributes
- No-reply emails: "noreply@company.com" → flag for manual review
- Role-based emails: "info@", "contact@" → acceptable but flag
```

### 3. contactName (VARCHAR(255) DEFAULT 'Unknown')
**Business Logic**: Name of the primary contact person at the publisher.

**AI Extraction Rules**:
```
EXTRACTION SOURCES:
1. Email signature: "Best regards,\nJohn Smith\nEditor"
2. Email body introduction: "Hi, I'm Sarah Johnson from..."
3. Sender display name: "From: John Doe <john@company.com>"
4. Content mentions: "My name is Michael and I run..."

GUARDRAILS:
- Must be a human name, not company name
- Handle various name formats: "John Smith", "Smith, John", "J. Smith"
- Extract first/last name if possible, store full format
- Remove titles/roles: "Dr. John Smith" → "John Smith" (store title in attributes)
- Maximum 255 characters

VALIDATION:
✅ Valid: "John Smith", "Sarah Johnson-Williams", "Li Wei", "José García"
❌ Invalid: "TechCorp Inc", "info@email.com", "N/A", single letters

NORMALIZATION:
- Title case: "john smith" → "John Smith"
- Remove extra whitespace
- Handle international names appropriately
- Store name parts in attributes if needed

CONFIDENCE SCORING:
- High (0.9+): Clear name in signature with title/role
- Medium (0.7-0.8): Name mentioned in email body or from field
- Low (0.5-0.6): Ambiguous or partial name extraction
- Default (0.3): Use 'Unknown' when no name found

SPECIAL CASES:
- Multiple names: Choose primary sender, store others in attributes
- Generic names: "Admin", "Support" → low confidence flag
- Non-English names: Handle UTF-8 characters properly
- Nicknames: "Bill (William) Smith" → store both forms
```

### 4. phone (VARCHAR(50))
**Business Logic**: Business phone number for direct contact.

**AI Extraction Rules**:
```
EXTRACTION PATTERNS:
- Standard formats: "+1-555-123-4567", "(555) 123-4567", "555.123.4567"
- International: "+44 20 7123 4567", "+49 30 12345678"
- Extensions: "555-123-4567 ext 123", "555-123-4567 x456"
- Signature lines: "Phone: 555-123-4567", "Tel: +1 555 123 4567"

GUARDRAILS:
- Must be valid phone number format (10+ digits with country code)
- Accept various formatting styles but normalize
- Exclude obviously invalid: "123-456-7890", "000-000-0000"
- Store in international format when possible: +1-555-123-4567

VALIDATION:
✅ Valid: "+1-555-123-4567", "(555) 123-4567 ext 123", "+44 20 7123 4567"
❌ Invalid: "123", "555-CALL-NOW", "000-000-0000", "123-456-789"

NORMALIZATION:
- Remove formatting: "+1 (555) 123-4567" → "+1-555-123-4567"
- Add country code if missing and can infer
- Store extensions separately if needed

CONFIDENCE SCORING:
- High (0.9+): Properly formatted business phone with country code
- Medium (0.7-0.8): Valid format but missing country code
- Low (0.5-0.6): Unusual format but appears valid
- None (null): No phone number found or invalid format

SPECIAL CASES:
- Multiple phones: Store primary + alternatives in attributes
- Toll-free numbers: "1-800-PUBLISH" → store as high confidence business number
- Mobile vs business: Prefer business numbers, flag mobile numbers
```

### 5. emailVerified (BOOLEAN DEFAULT false)
**Business Logic**: Whether the email address has been verified as legitimate.

**AI Extraction Rules**:
```
DEFAULT BEHAVIOR:
- Always set to false for email imports
- This field is managed by system verification process, not AI extraction

AI INSTRUCTIONS:
- Do not attempt to extract or infer this value
- Always use default: false
- Verification happens post-import through email confirmation flow
```

### 6. status (VARCHAR(20) DEFAULT 'pending')
**Business Logic**: Current account activation status.

**AI Extraction Rules**:
```
ALLOWED VALUES: 'active', 'pending', 'inactive', 'suspended', 'shadow'

DEFAULT BEHAVIOR:
- Always set to 'shadow' for email imports
- This indicates publisher exists but hasn't been activated yet

AI INSTRUCTIONS:
- Do not attempt to extract status from email content
- Status is determined by business workflow, not email analysis
- Always use 'shadow' for ManyReach imports
```

### 7. accountStatus (VARCHAR(50) DEFAULT 'shadow')
**Business Logic**: Detailed account state for workflow management.

**AI Extraction Rules**:
```
DEFAULT BEHAVIOR:
- Always set to 'shadow' for email imports
- This field is managed by business logic, not extracted from emails

AI INSTRUCTIONS:
- Do not extract or infer this value
- Always use default: 'shadow'
```

### 8. source (VARCHAR(50) DEFAULT 'manyreach')
**Business Logic**: How this publisher was acquired/imported.

**AI Extraction Rules**:
```
DEFAULT BEHAVIOR:
- Always set to 'manyreach' for email imports
- Tracks the acquisition channel for analytics

AI INSTRUCTIONS:
- Do not attempt to extract from email content
- Always use 'manyreach' for this integration
```

### 9. description (TEXT)
**Business Logic**: Free-form description of the publisher's business.

**AI Extraction Rules**:
```
EXTRACTION SOURCES:
1. Explicit business descriptions: "We are a leading tech publisher..."
2. About sections: "About our company: We specialize in..."
3. Service descriptions: "We provide high-quality content marketing..."
4. Company background: "Founded in 2020, TechCorp focuses on..."

GUARDRAILS:
- Extract business-focused descriptions, not personal details
- Maximum reasonable length: ~500 characters for UI purposes
- Remove sales pitch language, focus on factual business info
- Combine multiple descriptive sentences if found

VALIDATION:
✅ Valid: "Digital marketing agency specializing in B2B content and SEO"
❌ Invalid: Single words, obvious sales pitches, contact information

CONFIDENCE SCORING:
- High (0.8+): Clear business description provided
- Medium (0.6-0.7): Partial business info extracted
- Low (0.4-0.5): Inferred from service offerings
- None (null): No business description found

SPECIAL CASES:
- Multiple descriptions: Combine coherently
- Very long text: Summarize key business focus
- Generic descriptions: "We offer great services" → flag as low confidence
```

### 10-14. Address Fields (address, city, state, zipCode, country)
**Business Logic**: Physical business location for legal/tax purposes.

**AI Extraction Rules**:
```
EXTRACTION SOURCES:
1. Email signatures with full address
2. Contact information sections
3. Legal footers: "Company Name, 123 Main St, City, State 12345"

GUARDRAILS:
- Extract only if complete address provided
- Don't infer or guess missing components
- Validate against known formats (US: state abbreviations, zip codes)
- International addresses: handle various formats

VALIDATION:
address: Valid street address format
city: Real city name, proper capitalization
state: US state abbreviations or full international regions  
zipCode: Valid postal code format for country
country: ISO country names or common variants

CONFIDENCE SCORING:
- High (0.9+): Complete address in standard format
- Medium (0.7-0.8): Most components present, minor formatting issues
- Low (0.5-0.6): Partial address, some missing components
- None (null): No address information found

SPECIAL CASES:
- PO Boxes: Accept as valid addresses
- International formats: "London, UK", "Toronto, ON, Canada"
- Multiple addresses: Choose business address over mailing address
```

### 15. confidenceScore (DECIMAL(3,2))
**Business Logic**: Overall AI extraction confidence for this publisher record.

**AI Extraction Rules**:
```
CALCULATION METHOD:
1. Weighted average of individual field confidence scores
2. Core fields (companyName, email) have higher weight
3. Optional fields contribute but don't penalize if missing

WEIGHTING:
- companyName: 30% (critical business identifier)
- email: 30% (critical contact method)
- contactName: 20% (important for communication)
- phone: 10% (useful but not critical)
- description: 5% (nice to have)
- address: 5% (rarely provided in emails)

FINAL SCORE RANGES:
- 0.9-1.0: High confidence, suitable for auto-processing
- 0.7-0.89: Medium confidence, review recommended
- 0.5-0.69: Low confidence, manual review required
- Below 0.5: Very low confidence, likely needs human intervention

CALCULATION EXAMPLE:
companyName: 0.9 (clear from signature) × 0.3 = 0.27
email: 1.0 (valid business email) × 0.3 = 0.30
contactName: 0.8 (name in signature) × 0.2 = 0.16
phone: 0.0 (not found) × 0.1 = 0.00
description: 0.7 (partial info) × 0.05 = 0.035
address: 0.0 (not found) × 0.05 = 0.00
Total: 0.765 (Medium confidence)
```

### 16. attributes (JSONB)
**Business Logic**: Flexible storage for additional data that doesn't fit standard fields.

**AI Extraction Rules**:
```
STORAGE STRUCTURE:
{
  "extractionMetadata": {
    "originalEmail": "email content",
    "extractionNotes": "AI processing notes",
    "ambiguousFields": ["fields with low confidence"],
    "processingTimestamp": "2024-01-01T00:00:00Z"
  },
  "businessDetails": {
    "legalSuffixes": ["LLC", "Inc"], // removed from companyName
    "alternativeEmails": ["other@company.com"],
    "socialMedia": {
      "website": "https://company.com",
      "linkedin": "https://linkedin.com/company/...",
      "twitter": "@company"
    },
    "paymentMethods": ["PayPal", "Stripe", "Wire Transfer"],
    "businessHours": "9am-5pm EST",
    "languages": ["English", "Spanish"]
  },
  "qualityFlags": {
    "requiresManualReview": false,
    "hasIncompleteData": true,
    "potentialDuplicate": false,
    "suspiciousContent": false
  }
}

EXTRACTION GUIDELINES:
- Store any useful information that doesn't fit standard fields
- Maintain structured format for programmatic access
- Include extraction metadata for audit purposes
- Flag data quality issues for review workflow
```

## AI Prompt Integration

### Instructions for LLM:
```
For the publishers table extraction:

1. ALWAYS extract companyName and email (required fields)
2. Use confidence scoring for each field
3. Calculate overall confidence score using weighted formula
4. Store additional context in attributes JSONB field
5. Flag uncertain extractions for manual review
6. Use null for missing optional fields, don't guess
7. Follow validation rules strictly
8. Provide extraction notes explaining confidence levels

Return confidence metadata:
{
  "fieldConfidence": {
    "companyName": 0.9,
    "email": 1.0,
    "contactName": 0.8,
    "phone": 0.0,
    "description": 0.7
  },
  "overallConfidence": 0.765,
  "extractionNotes": "Clear business information found in signature, no contact phone provided",
  "requiresReview": false
}
```

## Next Steps
1. Apply these detailed guidelines to remaining tables
2. Create field validation functions
3. Build confidence scoring algorithms  
4. Test against sample publisher emails
5. Iterate based on extraction quality results