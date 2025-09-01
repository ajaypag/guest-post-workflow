# ManyReach V3 Extraction Test Prompt

## System Instructions

You are an AI that extracts publisher information from email trails. The email trails contain BOTH our outreach emails AND publisher replies. You must extract information ONLY from publisher replies, not from our outreach content.

## Table 1: Publishers (Contact Information)

Extract these REQUIRED fields from publisher replies:
- **email**: Publisher's business email (from their reply)
- **contactName**: Full name of the person
- **companyName**: Publisher's business/company name
- **phone**: Business phone (if provided)
- **paymentEmail**: Payment email if different from main
- **paymentMethod**: PayPal, wire, check, etc.
- **internalNotes**: Important info for our team
- **confidenceScore**: Your confidence (0.00-1.00)

## Table 2: Websites (Domain Information)

Extract these REQUIRED fields for each website:
- **domain**: Website URL (we'll normalize it automatically)
- **niche**: Specific topics (array, at least 1) - Choose from: Automotive, Business, Careers, Dating, Dental, Design, Diet, Education, Entertainment, Faith, Family, Fashion, Finance, Fitness, Food, General, Health, Home, Insurance, Legal, Lifestyle, Marketing, Mommy Blogs, Music, News, Outdoors, Pets, Photography, Politics, Real Estate, Sales, Self Improvement, Shopping, Sports, Technology, Travel, Web Design, Wedding, Women
- **categories**: Broad classification (array, at least 1) - Choose from: Blog, Business, Directory, E-commerce, Education, Entertainment, Food and Drink, Forum, Gambling, Government, Health & Medical, Magazine, News, Non-profit, Other, Personal, Technology
- **websiteType**: Site format (array, at least 1) - Choose from: Blog, News, Magazine, SaaS, eCommerce, Corporate, Agency, Reviews, Service

**Important**: 
- Categories are broader than niches (e.g., "Technology" category contains niches like "AI", "Blockchain")
- All fields are REQUIRED - you must provide at least one value for each

## Output Format

```json
{
  "publisher": {
    "email": "contact@example.com",
    "contactName": "John Smith",
    "companyName": "Example Media LLC",
    "phone": "+1-555-0100",
    "paymentEmail": "billing@example.com",
    "paymentMethod": "PayPal",
    "internalNotes": "Prefers Net 30 terms, responsive",
    "confidenceScore": 0.95
  },
  "websites": [
    {
      "domain": "techblog.com",
      "niche": ["Technology", "Marketing", "Business"],
      "categories": ["Technology", "Business"],
      "websiteType": ["Blog", "News"],
      "extractionNotes": "Tech blog focusing on SaaS and startups",
      "confidenceScore": 0.90
    }
  ]
}
```

## Test Email Trail

```
From: outreach@linkio.com
To: contact@techpublishers.com
Subject: Guest Post Partnership Opportunity

Hi there,

I'm reaching out from LinkIO. We're looking for quality websites to partner with for guest posting opportunities. We work with many SaaS companies who need exposure in the tech space.

Would you be interested in discussing a partnership?

Best,
Sarah from LinkIO

---

From: john@techpublishers.com
To: outreach@linkio.com
Subject: Re: Guest Post Partnership Opportunity

Hi Sarah,

Thanks for reaching out! Yes, we'd be interested in working with you.

I'm John Martinez, founder of TechPublishers Media. We manage several technology and business websites including:

1. DevBlog.io - Our main tech blog covering software development, AI, cloud computing, and DevOps topics. It's a news and blog hybrid site.

2. StartupWeekly.com - Focused on startup news, entrepreneurship, and venture capital. Pure news site format.

3. MarketingTechToday.com - Covers marketing automation, SEO, SaaS tools. It's a blog-style publication.

All our sites accept high-quality guest posts. We charge $350 for DevBlog.io, $275 for StartupWeekly, and $225 for MarketingTechToday. 

We prefer PayPal for payments (send to billing@techpublishers.com, not this email). Typical turnaround is 5-7 business days after content approval.

Let me know if you need our content guidelines or have any questions!

Best regards,
John Martinez
Founder, TechPublishers Media
Phone: +1-415-555-9823
john@techpublishers.com
```

## Expected Extraction

Based on the email trail above, extract the publisher and website information following the format specified. Remember to:
1. Extract ONLY from John's reply, not Sarah's outreach
2. Provide all REQUIRED fields
3. Use the standardized lists for niches, categories, and website types
4. Include confidence scores

---

**Now extract the information from the test email trail above.**