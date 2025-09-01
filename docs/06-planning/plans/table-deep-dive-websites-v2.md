# Websites Table - AI Extraction Guidelines (Final)

## Overview
Extract website information from publisher email replies. Focus on domains mentioned, content categories, and site classification. Remember: extract from publisher replies only, not our outreach content.

## Extractable Fields

### domain (VARCHAR(255) REQUIRED UNIQUE)
**What it is**: The website domain the publisher manages (normalized format).

**Examples**:
- ✅ Good: "example.com", "techblog.io", "news-website.co.uk"
- ❌ Bad: "https://example.com", "www.example.com/", "Example.COM", invalid formats

**Email Trail Context**: 
```
Publisher says: "Our website example.com offers guest posts..."
Publisher says: "We manage techblog.io and can place your content"
Publisher email: john@marketingnews.com (likely manages marketingnews.com)
```

**Critical**: System will automatically normalize using `normalizeDomain()`:
- "https://www.Example.COM/" → "example.com"
- "blog.example.com" → "blog.example.com" (meaningful subdomain preserved)
- "www.example.com" → "example.com" (www stripped)

---

### niche (TEXT[] REQUIRED)
**What it is**: Specific, granular topics the website focuses on. More detailed than categories. MANDATORY FIELD - AI must always provide at least one niche.

**System Niche List** (AI should choose from these first):
```
Automotive, Business, Careers, Dating, Dental, Design, Diet, Education, 
Entertainment, Faith, Family, Fashion, Finance, Fitness, Food, General, 
Health, Home, Insurance, Legal, Lifestyle, Marketing, Mommy Blogs, Music, 
News, Outdoors, Pets, Photography, Politics, Real Estate, Sales, 
Self Improvement, Shopping, Sports, Technology, Travel, Web Design, Wedding, Women
```

**Examples**:
- ✅ Good: ["Technology", "Business"], ["Health", "Fitness"], ["Finance", "Insurance"]
- ❌ Bad: Very generic terms, single words without context, our categories

**Email Trail Context**:
```
Publisher: "We cover tech and marketing topics" → ["Technology", "Marketing"] 
Publisher: "Our health blog focuses on fitness" → ["Health", "Fitness"]
Publisher: "We write about business and finance" → ["Business", "Finance"]
```

**AI Instructions**:
1. MUST provide at least one niche (this field is REQUIRED)
2. Choose from system niche list first
3. Can suggest new niches if publisher mentions specific topics not in list
4. Store new suggestions in extraction notes for system review
5. Use 1-4 niches maximum per website

---

### categories (TEXT[] REQUIRED)
**What it is**: Broad, high-level classification of the website. More general than niches. MANDATORY FIELD - AI must always provide at least one category.

**Dynamic Category List**:
```typescript
// Injected at runtime from database
// Current: {{CATEGORY_LIST}}
```

**Examples**:
- ✅ Good: ["Technology"], ["Business", "Education"], ["Health & Medical"]
- ❌ Bad: Empty array, undefined, null

**Email Trail Context**:
```
Publisher: "Our business blog about startups" → Categories: ["Business"], Niches: ["Startups", "Entrepreneurship"]
Publisher: "Educational technology for K-12" → Categories: ["Education", "Technology"], Niches: ["EdTech", "K-12"]
Publisher: "Health magazine on fitness and nutrition" → Categories: ["Health & Medical"], Niches: ["Fitness", "Nutrition"]
```

**Relationship Example**:
- Website about crypto trading:
  - Categories: ["Technology", "Business"] (broad classification)
  - Niches: ["Cryptocurrency", "Trading", "Blockchain"] (specific topics)

**AI Instructions**:
1. MUST provide at least one category
2. Choose from system category list
3. Maximum 3 categories per website
4. Categories are broader than niches (e.g., category: "Technology" might have niches: "AI", "Blockchain", "SaaS")

---

### websiteType (TEXT[] REQUIRED)
**What it is**: Classification of website type/format. MANDATORY FIELD - AI must always provide at least one type.

**Standardized Website Types**:
```
Blog, News, Magazine, SaaS, eCommerce, Corporate, Agency, Reviews, Service
```

**Examples**:
- ✅ Good: ["Blog"], ["News", "Magazine"], ["SaaS"], ["eCommerce"]
- ❌ Bad: Content topics (use niche for that), unclear descriptions

**Email Trail Context**:
```
Publisher: "Our tech blog covers startups" → ["Blog"]
Publisher: "We run a news website" → ["News"] 
Publisher: "Our SaaS company blog" → ["SaaS", "Blog"]
Publisher: "We're a digital marketing agency" → ["Agency"]
```

**AI Instructions**:
1. MUST provide at least one type (this field is REQUIRED)
2. Choose from standardized list only
3. Can combine multiple types: ["SaaS", "Blog"] 
4. Max 2 types per website
5. When unclear, use ["Blog"] as default but still required

---

## System-Managed Fields (Don't Extract)

These fields are handled by other systems:

- **domainRating/totalTraffic**: Metrics checkers populate these later
- **status**: Always "Unknown" for email imports (Airtable legacy)
- **hasGuestPost/hasLinkInsert**: Inferred from offerings, not extracted directly
- **overallQuality**: Airtable legacy, ignore completely
- **id/createdAt/updatedAt**: System-generated
- **source/addedByPublisherId**: System tracking

## Email Trail Processing Example

```
From: sarah@techblog.io
Subject: Re: Partnership Inquiry

Hi,

Thanks for reaching out! We run TechBlog.io, a technology news site covering 
SaaS, AI, and startup topics. We're a professional blog that accepts guest posts.

Best,
Sarah Johnson
TechBlog Media
```

**Extract**:
```json
{
  "domain": "techblog.io",
  "categories": ["Technology", "News"],  // Broad classification
  "niche": ["SaaS", "AI", "Startups"],   // Specific topics mentioned
  "websiteType": ["Blog", "News"]
}
```

**Explanation**:
- Domain normalized automatically by system
- Categories = broad website type (Technology news site)
- Niches = specific topics they cover (SaaS, AI, startups)
- "technology news site" + "blog" → websiteType: ["Blog", "News"]

## Multi-Website Publishers

When publisher manages multiple websites, create separate records:

```
Publisher: "We manage 3 sites: techblog.com (tech news), healthtips.com (wellness), 
and financenews.com (market analysis)"
```

**Extract**:
```json
{
  "websites": [
    {
      "domain": "techblog.com",
      "categories": ["Technology", "News"],    // Broad categories
      "niche": ["Tech News", "Gadgets"],       // Specific topics
      "websiteType": ["Blog", "News"]
    },
    {
      "domain": "healthtips.com",
      "categories": ["Health & Medical"],     // Broad category
      "niche": ["Wellness", "Fitness Tips"],  // Specific focus
      "websiteType": ["Blog"]
    },
    {
      "domain": "financenews.com",
      "categories": ["Business", "News"],       // Broad categories
      "niche": ["Stock Market", "Finance"],     // Specific focus
      "websiteType": ["News"]
    }
  ]
}
```

## Quality Control

### High Confidence (0.90-1.00)
- Publisher explicitly states domain ownership
- Clear niche descriptions provided
- Obvious website type mentioned

### Medium Confidence (0.70-0.89)
- Domain inferred from email address
- Some niche context available
- Website type somewhat clear

### Low Confidence (0.50-0.69)
- Minimal website information
- Vague niche descriptions  
- Unclear website classification

## Output Format
```json
{
  "domain": "techblog.io",
  "niche": ["Technology", "Marketing", "Business"],  // REQUIRED - at least 1
  "categories": ["Technology", "Business"],            // REQUIRED - at least 1
  "websiteType": ["Blog", "News"],                    // REQUIRED - at least 1
  "extractionNotes": "Clear tech focus, accepts guest posts",
  "confidenceScore": 0.95
}
```

## Key Reminders

1. **Domain normalization**: System handles this automatically
2. **Niche selection**: REQUIRED FIELD - must provide at least one niche
3. **Categories**: REQUIRED FIELD - must provide at least one category
4. **Website types**: REQUIRED FIELD - must provide at least one type
5. **Email trail context**: Extract from publisher replies, not our outreach
6. **Multiple sites**: Separate record per unique domain
7. **Quality data**: All three fields (niche, categories, websiteType) are mandatory for good data quality