# ManyReach V3 Parser → Database Schema Mapping

## Overview
This document maps the enhanced V3 email parser output to the actual 5-table database architecture that needs to be populated when creating draft records from publisher outreach emails.

## Current Parser Output Structure
```json
{
  "hasOffer": boolean,
  "publisher": {
    "email": "string",
    "contactName": "string",
    "companyName": "string", 
    "phone": "string",
    "websites": ["array of domains"],
    "paymentMethods": ["PayPal", "Stripe", etc],
    "paymentTerms": "string"
  },
  "websites": [{
    "domain": "normalized string",
    "domainRating": number,
    "totalTraffic": number,
    "niches": ["array"],
    "websiteType": ["Blog", "News", etc],
    "restrictions": {
      "forbiddenNiches": ["CBD", "Casino", etc],
      "contentRequirements": "string",
      "linkRestrictions": "string"
    },
    "metrics": {
      "monthlySessions": number,
      "pageviews": number,
      "bounceRate": number,
      "avgSessionDuration": "string"
    }
  }],
  "offerings": [{
    "offeringType": "guest_post|link_insertion|etc",
    "serviceName": "string",
    "basePrice": number, // in cents
    "currency": "USD|EUR|GBP",
    "turnaroundDays": number,
    "minWordCount": number,
    "maxWordCount": number,
    "includedFeatures": {
      "dofollowLinks": number,
      "nofollowLinks": number,
      "socialShares": boolean,
      "authorBio": boolean,
      "imageInsertion": boolean,
      "permanentHosting": boolean
    },
    "pricing": {
      "basePrice": number,
      "expressPrice": number,
      "expressDays": number,
      "additionalLinkPrice": number,
      "revisionPrice": number,
      "bulkDiscounts": [{
        "minQuantity": number,
        "discountPercentage": number,
        "description": "string"
      }],
      "nicheUpcharges": [{
        "niche": "string",
        "upchargeAmount": number,
        "description": "string"
      }],
      "positionPricing": [{
        "position": "string",
        "price": number,
        "description": "string"
      }]
    },
    "requirements": {
      "contentGuidelines": "string",
      "approvalProcess": "string", 
      "authorshipRequirements": "string",
      "linkGuidelines": "string",
      "imageRequirements": "string"
    },
    "availability": {
      "currentStatus": "available|limited|booked",
      "availableSlots": number,
      "nextAvailable": "string",
      "seasonalNotes": "string"
    },
    "specialConditions": {
      "minimumOrder": "string",
      "packageDeals": "string",
      "longTermDiscounts": "string",
      "exclusivityOptions": "string"
    }
  }],
  "businessTerms": {
    "communicationPreferences": "string",
    "responseTime": "string",
    "workingHours": "string",
    "projectManagement": "string",
    "reporting": "string", 
    "guarantees": "string",
    "cancellationPolicy": "string"
  },
  "extractionMetadata": {
    "confidence": number,
    "extractionNotes": "string",
    "ambiguousFields": ["array"],
    "rawPricingText": "string",
    "keyQuotes": ["array"]
  }
}
```

## Target Database Tables

### 1. publishers (from parser.publisher)
**Direct Mappings:**
- `companyName` ← `parser.publisher.companyName`
- `email` ← `parser.publisher.email`
- `contactName` ← `parser.publisher.contactName`
- `phone` ← `parser.publisher.phone`

**Derived/Default Fields:**
- `id` ← UUID (generated)
- `emailVerified` ← `false` (default for email imports)
- `status` ← `"shadow"` (draft mode)
- `source` ← `"manyreach"` 
- `attributes` ← Store parser.businessTerms + extractionMetadata

**Missing Fields (require user input or null):**
- `description`, `address`, `city`, `state`, `zipCode`, `country`

### 2. websites (from parser.websites[])
**Direct Mappings:**
- `domain` ← `parser.websites[].domain`
- `domainRating` ← `parser.websites[].domainRating`
- `totalTraffic` ← `parser.websites[].totalTraffic`
- `niche` ← `parser.websites[].niches` (array)
- `websiteType` ← `parser.websites[].websiteType` (array)

**Derived Fields:**
- `id` ← UUID (generated)
- `source` ← `"manyreach"`
- `attributes` ← Store parser.websites[].metrics + restrictions
- `categories` ← Map from niches (requires category mapping logic)

**Missing Fields (require defaults or null):**
- `contentGuidelinesUrl`, `editorialCalendarUrl`, `websiteLanguage`, `publisherTier`

### 3. publisherOfferings (from parser.offerings[])
**Direct Mappings:**
- `offeringType` ← `parser.offerings[].offeringType`
- `basePrice` ← `parser.offerings[].basePrice` (already in cents)
- `currency` ← `parser.offerings[].currency`
- `turnaroundDays` ← `parser.offerings[].turnaroundDays`
- `offeringName` ← `parser.offerings[].serviceName`
- `minWordCount` ← `parser.offerings[].minWordCount`
- `maxWordCount` ← `parser.offerings[].maxWordCount`
- `niches` ← `parser.offerings[].niches` (if different from website niches)

**Complex Mappings:**
- `attributes` ← Combine multiple objects:
  - `parser.offerings[].includedFeatures`
  - `parser.offerings[].requirements`
  - `parser.offerings[].availability`
  - `parser.offerings[].specialConditions`
  - Raw pricing text from extractionMetadata

**Derived Fields:**
- `publisherId` ← Link to created publisher
- `currentAvailability` ← Map from `parser.offerings[].availability.currentStatus`
- `expressAvailable` ← `parser.offerings[].pricing.expressPrice > 0`
- `expressPrice` ← `parser.offerings[].pricing.expressPrice`
- `expressDays` ← `parser.offerings[].pricing.expressDays`
- `languages` ← Default to `["en"]` or derive from website
- `isActive` ← `false` (draft mode)

### 4. publisherOfferingRelationships (linking logic)
**For each website × offering combination:**
- `publisherId` ← Created publisher ID
- `offeringId` ← Created offering ID  
- `websiteId` ← Created website ID
- `relationshipType` ← `"contact"` (default for email imports)
- `verificationStatus` ← `"claimed"` (needs verification)
- `isPrimary` ← `true` for first website, `false` for others
- `contactEmail` ← `parser.publisher.email`
- `contactName` ← `parser.publisher.contactName`
- `paymentTerms` ← `parser.publisher.paymentTerms`

### 5. publisherPricingRules (from parser.offerings[].pricing)
**Bulk Discounts (from parser.offerings[].pricing.bulkDiscounts[]):**
```
ruleType: "bulk_discount"
ruleName: "5+ Posts Discount" 
conditions: {"type": "quantity", "operator": "gte", "value": 5}
actions: {"adjustmentType": "percentage_discount", "adjustmentValue": 10}
priority: 10
isCumulative: false
```

**Niche Upcharges (from parser.offerings[].pricing.nicheUpcharges[]):**
```
ruleType: "niche_surcharge"
ruleName: "Finance Premium"
conditions: {"type": "niche", "operator": "contains", "value": "Finance"}
actions: {"adjustmentType": "fixed_markup", "adjustmentValue": 2500}
priority: 20
isCumulative: true
```

**Position Pricing (from parser.offerings[].pricing.positionPricing[]):**
```
ruleType: "position_pricing"
ruleName: "Listicle 1st Position"
conditions: {"type": "position", "operator": "equals", "value": "1st"}
actions: {"adjustmentType": "override_price", "finalPrice": 99900}
priority: 30
isCumulative: false
```

## Data Transformation Logic

### 1. Multiple Websites Handling
- If `parser.websites.length > 1`: Create separate website records
- Create relationships for each website-offering pair
- Mark first website as `isPrimary: true`

### 2. Multiple Offerings Handling  
- Each `parser.offerings[]` item → separate `publisherOfferings` record
- Each offering linked to ALL websites (many-to-many via relationships)

### 3. Pricing Rules Generation
- Extract from each `parser.offerings[].pricing` object
- Create separate `publisherPricingRules` record for each rule
- Link via `publisherOfferingId`

### 4. Missing Data Handling
- Store parser confidence in `attributes.extractionConfidence`
- Flag uncertain fields in `attributes.ambiguousFields`
- Store original email content for review

## Draft Creation Strategy

### Phase 1: Create Base Records
1. Insert `publishers` record (get publisherId)
2. Insert `websites` records (get websiteIds)
3. Insert `publisherOfferings` records (get offeringIds)

### Phase 2: Create Relationships  
4. Insert `publisherOfferingRelationships` (link all combinations)
5. Insert `publisherPricingRules` (for each pricing rule found)

### Phase 3: Store Metadata
6. Update offering `attributes` with complex data
7. Store extraction metadata for review
8. Flag any ambiguous or missing fields

## Validation Rules

### Required Fields
- Publisher: `email`, `companyName` 
- Website: `domain`
- Offering: `offeringType`, `basePrice` > 0

### Business Logic
- Normalize all domains (lowercase, no www/https)
- Convert all prices to cents
- Validate email format
- Ensure offering types are valid enum values
- Check for duplicate websites (by normalized domain)

### Quality Thresholds
- Require parser confidence > 0.7 for auto-import
- Flag offerings with no pricing data
- Require at least 1 website per publisher
- Validate currency codes (USD, EUR, GBP, etc.)

## Next Steps
1. Design multi-step draft UI based on this mapping
2. Create comprehensive parser prompt for all fields
3. Build database insertion logic with proper error handling
4. Add validation and review workflow for complex cases