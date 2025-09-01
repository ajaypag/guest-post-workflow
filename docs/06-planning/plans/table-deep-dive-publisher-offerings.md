# Publisher Offerings Table - AI Extraction Guidelines

## Overview
Extract service offerings and pricing information from publisher email replies. This table stores specific services publishers offer (guest posts, link insertions, etc.) with pricing and requirements.

## Field Definitions & Examples

### offeringType (VARCHAR(50) REQUIRED)
**What it is**: Type of service the publisher offers.

**Allowed Values**:
- `guest_post` - Full article placement
- `link_insertion` - Links added to existing content  
- `press_release` - Press release distribution
- `sponsored_post` - Sponsored content placement
- `niche_edit` - Content updates/modifications

**Examples**:
- ✅ Good: Publisher says "we offer guest posts for $200" → `guest_post`
- ✅ Good: "We can add links to existing articles" → `link_insertion`
- ❌ Bad: Generic mentions without specific service type

**Email Trail Context**: Extract from explicit service descriptions in publisher replies.

---

### basePrice (INTEGER REQUIRED)
**What it is**: Base price in cents (multiply dollars by 100).

**Examples**:
- ✅ Good: "$200" → 20000, "€150" → 15000, "$50.75" → 5075  
- ❌ Bad: "competitive rates", "contact for pricing", non-numeric values

**Critical**: Always convert to cents by multiplying by 100.

**Email Trail Context**: Extract only concrete pricing numbers from publisher quotes.

---

### currency (VARCHAR(10) DEFAULT 'USD')
**What it is**: Currency code for pricing.

**Examples**:
- ✅ Good: "USD", "EUR", "GBP", "CAD"
- ❌ Bad: "$", "dollars", "euros", currency symbols

**Email Trail Context**: Extract from explicit currency mentions or infer from publisher location/context.

---

### turnaroundDays (INTEGER OPTIONAL)
**What it is**: Delivery timeframe in days.

**Examples**:
- ✅ Good: "5 business days" → 5, "1 week" → 7, "48 hours" → 2
- ❌ Bad: "fast turnaround", "ASAP", "flexible timing"

**Email Trail Context**: Extract specific timeframes mentioned by publishers.

---

### currentAvailability (VARCHAR(50) DEFAULT 'available')
**What it is**: Publisher's stated availability for this service.

**Examples**:
- ✅ Good: "available", "limited", "booked", "seasonal"
- ❌ Bad: Our availability assessments, unclear status

**Email Trail Context**: Extract from "currently accepting", "limited slots", "booked until..."

---

### expressAvailable (BOOLEAN DEFAULT false)
**What it is**: Whether publisher offers rush/express delivery.

**Email Trail Context**: Set to `true` if publisher mentions rush service, 24-hour delivery, express options.

---

### expressPrice (INTEGER OPTIONAL)
**What it is**: Additional cost for express service in cents.

**Examples**:
- ✅ Good: "Rush delivery +$50" → 5000
- ❌ Bad: Percentage markups, unclear express pricing

**Email Trail Context**: Extract additional fees for expedited service.

---

### expressDays (INTEGER OPTIONAL)
**What it is**: Express delivery timeframe in days.

**Examples**:
- ✅ Good: "24-hour rush" → 1, "48-hour express" → 2
- ❌ Bad: "super fast", unclear timeframes

**Email Trail Context**: Extract specific express delivery timelines.

---

### offeringName (VARCHAR(255) OPTIONAL)
**What it is**: Publisher's descriptive name for this service.

**Examples**:
- ✅ Good: "Premium Guest Post Package", "Contextual Link Insertion", "Express Article Placement"
- ❌ Bad: Generic service types, our naming conventions

**Email Trail Context**: Extract publisher's branded service names if mentioned.

---

### minWordCount (INTEGER OPTIONAL)
**What it is**: Minimum content length requirement.

**Examples**:
- ✅ Good: "Minimum 1000 words" → 1000, "500+ word articles" → 500
- ❌ Bad: "long-form content", "detailed articles", non-specific requirements

**Email Trail Context**: Extract specific word count minimums from content requirements.

---

### maxWordCount (INTEGER OPTIONAL)
**What it is**: Maximum content length allowed.

**Examples**:
- ✅ Good: "Maximum 2000 words" → 2000, "up to 1500 words" → 1500
- ❌ Bad: "reasonable length", "not too long", unclear limits

**Email Trail Context**: Extract word count ceilings if publisher specifies them.

---

### niches (TEXT[] OPTIONAL)
**What it is**: Content categories this offering covers.

**Examples**:
- ✅ Good: ["Technology", "SaaS", "Marketing"], ["Health", "Fitness"], ["Finance"]
- ❌ Bad: Very generic categories, our niche classifications

**Email Trail Context**: Extract from "we accept tech articles", "finance content only", specific topic restrictions.

---

### languages (VARCHAR(10)[] DEFAULT ['en'])
**What it is**: Languages accepted for this offering.

**Examples**:
- ✅ Good: ["en"], ["en", "es"], ["fr", "de"]  
- ❌ Bad: "English", "multiple languages", full language names

**Email Trail Context**: Extract if publisher mentions language requirements or multi-language services.

---

### attributes (JSONB DEFAULT {})
**What it is**: Flexible storage for additional offering details.

**Structure**:
```json
{
  "includedFeatures": {
    "dofollowLinks": 2,
    "nofollowLinks": 0,
    "socialShares": true,
    "authorBio": true,
    "imageInsertion": true,
    "permanentHosting": true
  },
  "requirements": {
    "contentGuidelines": "High-quality, original content only",
    "approvalProcess": "All content requires pre-approval",
    "linkGuidelines": "Maximum 2 contextual links per article",
    "imageRequirements": "Provide custom images or we source them"
  },
  "extractionNotes": "Publisher emphasized quality standards",
  "sourceEmailQuotes": ["Our rates are $200 for guest posts with 2 dofollow links"]
}
```

**Email Trail Context**: Store detailed service features, requirements, and quality guidelines from publisher replies.

---

## System-Managed Fields (Don't Extract)

These fields are set by the system, not extracted from emails:

- **id**: System-generated UUID
- **publisherId**: Links to publisher record (relationship managed by system)
- **isActive**: Always `true` for new extractions
- **createdAt/updatedAt**: System timestamps

## Email Trail Processing Instructions

### Service Identification Patterns
```
1. Explicit service mentions: "We offer guest posts for $200"
2. Service descriptions: "We can place articles on our tech blog"
3. Multiple services: "Guest posts $200, link insertions $50"
4. Package offerings: "Complete SEO package includes articles and links"
```

### Pricing Extraction Critical
```typescript
// Always convert to cents
"$200" → 20000
"€150.50" → 15050  
"£75" → 7500
"$50.75" → 5075
```

### Multiple Services Handling
When publisher offers multiple services, create separate offering records:

```json
{
  "offerings": [
    {
      "offeringType": "guest_post",
      "basePrice": 20000,
      "turnaroundDays": 7,
      "attributes": {
        "includedFeatures": {
          "dofollowLinks": 2,
          "authorBio": true
        }
      }
    },
    {
      "offeringType": "link_insertion", 
      "basePrice": 5000,
      "turnaroundDays": 2,
      "attributes": {
        "includedFeatures": {
          "dofollowLinks": 1
        }
      }
    }
  ]
}
```

### Example Email Trail
```
From: sarah@techblog.io
Subject: Re: Content Partnership

Hi,

Thanks for your interest! We offer two main services:

1. Guest Posts: $250 each, includes 2 dofollow links, 1000+ words, 5 business days
2. Link Insertions: $75 each, contextual placement, 48-hour turnaround

We accept technology, SaaS, and marketing content. All articles require pre-approval.
Rush delivery available for +$50 (24 hours).

Best regards,
Sarah Johnson
```

**Extract**:
- Two separate offering records  
- Specific pricing converted to cents
- Turnaround times parsed correctly
- Features stored in attributes
- Rush service details captured

## Content Guidelines Migration

**Important**: Fields like `contentGuidelines`, `prohibitedTopics`, `turnaroundTime` will be migrated FROM publishers table TO this table. These should be extracted here, not in publishers table.

### Guidelines Extraction
```json
{
  "attributes": {
    "requirements": {
      "contentGuidelines": "Minimum 1000 words, original content only, professional tone",
      "prohibitedTopics": ["CBD", "Casino", "Adult content"],
      "approvalProcess": "Submit outline first, then full article for review"
    }
  }
}
```

## Quality Control & Confidence

### High Confidence Extraction (0.90-1.00)
- Clear service types and specific pricing
- Detailed feature descriptions provided  
- Professional service offerings with requirements
- Multiple services properly distinguished

### Medium Confidence (0.70-0.89)
- Basic service types identified
- Some pricing information available
- Partial feature/requirement details

### Low Confidence (0.50-0.69)
- Vague service descriptions
- Unclear or missing pricing
- Generic offering information
- Requires manual review

### Output Format
```json
{
  "offeringType": "guest_post",
  "basePrice": 25000,
  "currency": "USD",
  "turnaroundDays": 5,
  "currentAvailability": "available",
  "expressAvailable": true,
  "expressPrice": 5000,
  "expressDays": 1,
  "offeringName": "Premium Guest Post Package",
  "minWordCount": 1000,
  "maxWordCount": 2000,
  "niches": ["Technology", "SaaS", "Marketing"],
  "languages": ["en"],
  "attributes": {
    "includedFeatures": {
      "dofollowLinks": 2,
      "socialShares": true,
      "authorBio": true,
      "permanentHosting": true
    },
    "requirements": {
      "contentGuidelines": "High-quality, original content with professional tone",
      "linkGuidelines": "Maximum 2 contextual links per article"
    },
    "extractionNotes": "Rush delivery available, pre-approval required"
  }
}
```