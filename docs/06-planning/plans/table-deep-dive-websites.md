# Websites Table - AI Extraction Guidelines

## Overview
Extract website information from publisher email replies using AI reasoning. Focus on domains mentioned, metrics provided, and content restrictions stated by publishers.

## Field Definitions & Examples

### domain (VARCHAR(255) REQUIRED UNIQUE)
**What it is**: The website domain the publisher manages (normalized format).

**Examples**:
- ✅ Good: "example.com", "techblog.io", "news-website.co.uk"
- ❌ Bad: "https://example.com", "www.example.com/", "Example.COM", invalid formats

**Email Trail Context**: Extract from publisher statements like "our website example.com" or "we manage techblog.io". Normalize to lowercase, remove www/https/trailing slashes.

**Critical**: Use `normalizeDomain()` function - prevents duplicate website records.

---

### domainRating (INTEGER OPTIONAL)
**What it is**: Domain authority/rating metric (DR, DA, etc.) if publisher mentions it.

**Examples**:
- ✅ Good: 45, 72, 85 (typical DR/DA scores 0-100)
- ❌ Bad: "high DR", "good domain authority", non-numeric values

**Email Trail Context**: Extract only if publisher explicitly states "DR 45", "Domain Authority: 72", or similar metrics.

---

### totalTraffic (INTEGER OPTIONAL)  
**What it is**: Monthly website traffic if publisher provides specific numbers.

**Examples**:
- ✅ Good: 50000, 250000, 1000000 (monthly visitors/sessions)
- ❌ Bad: "lots of traffic", "high traffic", percentage growth, non-specific numbers

**Email Trail Context**: Extract from "50K monthly visitors", "250,000 page views per month", specific traffic numbers only.

---

### niche (TEXT[] OPTIONAL)
**What it is**: Content categories/niches the website covers.

**Examples**:
- ✅ Good: ["Technology", "SaaS", "Marketing"], ["Health", "Fitness"], ["Finance", "Investing"]
- ❌ Bad: Single strings, very generic terms, our business categories

**Email Trail Context**: Extract from publisher descriptions like "we cover tech and marketing topics" or "our finance blog focuses on investing".

---

### websiteType (TEXT[] OPTIONAL)
**What it is**: Type/classification of website.

**Examples**:
- ✅ Good: ["Blog"], ["News"], ["Magazine"], ["eCommerce"], ["SaaS"], ["Corporate"]
- ❌ Bad: Vague descriptions, content topics (use niche for that), our website types

**Email Trail Context**: Extract when publisher describes site as "tech blog", "news website", "corporate magazine", etc.

---

### status (VARCHAR(50) DEFAULT 'Unknown')
**What it is**: Publisher-stated availability or site status.

**Examples**:
- ✅ Good: "Active", "Available", "Limited", "Seasonal"
- ❌ Bad: Our internal statuses, unclear descriptions

**Email Trail Context**: Extract from "currently accepting posts", "limited availability", "seasonal content only".

---

### hasGuestPost (BOOLEAN DEFAULT false)
**What it is**: Whether publisher offers guest posting services.

**Email Trail Context**: Set to `true` if publisher mentions guest posts, sponsored content, article placement. Default `false` if unclear.

---

### hasLinkInsert (BOOLEAN DEFAULT false)
**What it is**: Whether publisher offers link insertion services.

**Email Trail Context**: Set to `true` if publisher mentions link insertions, existing post updates, contextual links. Default `false` if unclear.

---

### overallQuality (VARCHAR(255) OPTIONAL)
**What it is**: Publisher's own quality description or claims.

**Examples**:
- ✅ Good: "Premium content", "High-quality editorial", "Established authority site"
- ❌ Bad: Our quality assessments, generic marketing claims

**Email Trail Context**: Extract when publisher describes their site's quality standards or positioning.

---

## System-Managed Fields (Don't Extract)

These fields are set by the system, not extracted from emails:

- **id**: System-generated UUID
- **airtableId**: Legacy Airtable reference (not applicable)
- **source**: Always `'manyreach'` for email imports
- **addedByPublisherId**: Links to publisher who manages this website
- **importBatchId**: System batch tracking
- **createdAt/updatedAt**: System timestamps
- **lastSyncedAt**: System sync tracking

## Fields Not Relevant for Email Extraction

These fields exist for other purposes and should not be extracted:

- **airtableCreatedAt/airtableUpdatedAt**: Legacy Airtable timestamps
- **publisherTier/primaryContactId**: Internal classification
- **accountManagerId**: Internal assignment
- **avgResponseTimeHours/successRatePercentage**: Performance tracking (system calculated)
- **internalQualityScore/internalNotes**: Internal team assessments

## Email Trail Processing Instructions

### Website Identification Patterns
```
1. Explicit mentions: "Our website example.com offers..."
2. Email domain inference: john@techblog.com likely manages techblog.com
3. Multiple sites: "We manage 3 sites: a.com, b.com, c.com"
4. Portfolio descriptions: "Our network includes finance.com and health.com"
```

### Domain Normalization Critical
```typescript
// All these normalize to same domain:
"https://www.Example.COM/" → "example.com"
"WWW.EXAMPLE.COM"        → "example.com"  
"example.com/page"       → "example.com"
```

**Prevents**: Duplicate website records, broken publisher-website relationships.

### Example Email Trail
```
From: sarah@techblog.io
Subject: Re: Partnership Inquiry

Hi,

Thanks for reaching out! We run TechBlog.io, a technology news site with 
50K monthly readers. We cover SaaS, AI, and startup topics.

Our Domain Rating is 45 and we offer both guest posts and link insertions.
Currently accepting new content partnerships.

Best,
Sarah Johnson
TechBlog Media
```

**Extract**:
- domain: "techblog.io" (normalized)  
- totalTraffic: 50000
- domainRating: 45
- niche: ["SaaS", "AI", "Startup"]
- websiteType: ["News"]
- status: "Available" 
- hasGuestPost: true
- hasLinkInsert: true

## Multi-Website Publishers

When publisher manages multiple websites:

```json
// Create separate website record for each domain
{
  "websites": [
    {
      "domain": "techblog.com",
      "domainRating": 45,
      "niche": ["Technology", "SaaS"]
    },
    {
      "domain": "marketingnews.com", 
      "domainRating": 38,
      "niche": ["Marketing", "Business"]
    }
  ]
}
```

**Important**: Each domain gets its own website record. Publisher-website relationships handled in separate table.

## Quality Control & Confidence

### High Confidence Extraction (0.90-1.00)
- Publisher explicitly states domain ownership
- Specific metrics provided (DR, traffic numbers)
- Clear service offerings described
- Professional website description

### Medium Confidence (0.70-0.89)
- Domain ownership implied but not explicit
- Some metrics or descriptions provided
- Basic service information available

### Low Confidence (0.50-0.69)
- Domain inferred from email address only
- Vague or generic descriptions
- Unclear service offerings
- Requires manual verification

### Output Format
```json
{
  "domain": "techblog.io",
  "domainRating": 45,
  "totalTraffic": 50000,
  "niche": ["Technology", "SaaS", "AI"],
  "websiteType": ["Blog", "News"],
  "status": "Active",
  "hasGuestPost": true,
  "hasLinkInsert": true,
  "overallQuality": "Established tech authority with engaged readership"
}
```

## Email Trail Context Reminders

1. **Extract from publisher replies only** - ignore our outreach content
2. **Look for quoted/reply sections** - publisher info usually above our original message
3. **Check email signatures** - often contain website links and descriptions
4. **Normalize all domains** - prevents duplicate records
5. **Multiple websites = multiple records** - one record per unique domain
6. **Be specific with metrics** - only extract concrete numbers, not vague claims
7. **Service availability** - hasGuestPost/hasLinkInsert based on explicit offers