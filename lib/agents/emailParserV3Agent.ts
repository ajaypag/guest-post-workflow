import { Agent } from '@openai/agents';
import { webSearchTool } from '@openai/agents-openai';

// Web search tool for analyzing websites
const webSearch = webSearchTool();

// Factory function to create agent with dynamic metadata
export function createEmailParserAgent(metadata?: string, outreachSenderEmail?: string) {
  const senderContext = outreachSenderEmail 
    ? `\nOUTREACH SENDER: ${outreachSenderEmail}
These are OUR team members who sent the original outreach - they are NOT the publishers.
Any websites or offers mentioned by these senders are OUR offers, not the publisher's.\n`
    : '';

  const baseInstructions = `You are an expert at analyzing email trails between our outreach team and publishers for a guest posting platform.

CRITICAL CONTEXT: You're analyzing an EMAIL TRAIL that contains:
1. Our original outreach email (from our team) - IGNORE this for extraction
2. The publisher's reply with their actual offer - EXTRACT from this part only
${senderContext}

COMMON EMAIL PATTERNS TO RECOGNIZE (mark hasOffer as false for these):
- Auto-replies: Generic "out of office" or "we received your email" messages
- Internal forwards: When recipient forwards to a colleague without making an offer (e.g., "FYI", "Please handle", "@Ruth Abiley Best Regards")
- Acknowledgments: Simple "thanks, we'll review" without any service details or pricing
- Rejections: "We're not interested" or "We don't offer this service"
- Link exchange offers: When they're just offering to trade links, not selling services

IMPORTANT: Only extract information from the PUBLISHER'S REPLY, not from our outreach. Look for:
- The publisher's email address (from the From: field or signature)
- The publisher's email signature and contact details
- Their website information, traffic metrics, and basic restrictions
- Simple pricing mentions (we'll analyze complex pricing later)

FOCUS: Extract PUBLISHER INFO (Table 1) and WEBSITE INFO (Table 2) only. Skip detailed offerings, complex pricing, and business terms for now.

IMPORTANT: For each website mentioned, analyze what type of content they publish:
- Use web search to visit and analyze each website domain
- Search for "[domain] website" or "[domain] about" to understand their content
- Based on actual website content you find, select appropriate categories, niches, and types
- Don't just guess from domain names - actually search and verify
- Choose the most appropriate categories, niches, and website types from the provided lists

Return a JSON object with this structure:
{
  "hasOffer": boolean, // true if they provide any pricing or service info
  "publisher": {
    "email": "sender email address",
    "contactName": "person's name or null",
    "companyName": "business/company name or null", 
    "phone": "phone number or null",
    "websites": ["array of normalized domains they manage"],
    "paymentMethods": ["PayPal", "Stripe", "Bank Transfer", "Crypto", etc],
    "paymentTerms": "payment timing requirements or null"
  },
  "websites": [
    {
      "domain": "normalized domain (no www, https)",
      "categories": ["SELECT MULTIPLE from the categories list provided"],
      "niche": ["SELECT MULTIPLE from the niches list provided"], 
      "suggestedNewNiches": ["Any relevant niches not in our list"],
      "websiteType": ["SELECT MULTIPLE from the website types list provided"],
      "totalTraffic": "monthly traffic number or null",
      "domainRating": "DR/DA number or null",
      "internalNotes": "notes about the website or null"
    }
  ],
  "offerings": [
    {
      "offeringType": "guest_post" | "link_insertion",
      "basePrice": number or null,
      "currency": "USD" | "EUR" | "GBP" etc,
      "turnaroundDays": number or null,
      "minWordCount": number or null (for guest posts),
      "maxWordCount": number or null (for guest posts),
      "requirements": {
        "acceptsDoFollow": boolean,
        "requiresAuthorBio": boolean (for guest posts),
        "maxLinksPerPost": number or null,
        "contentRequirements": "string or null - quality standards like 'Original content only', 'Well-researched', 'AP style'",
        "prohibitedTopics": "SELECT FROM: CBD, Cannabis, Casino, Gambling, Adult Content, Pornography, Cryptocurrency, Binary Options, Forex Trading, Get Rich Quick, MLM, Weight Loss Pills, Pharmaceuticals, Payday Loans, Weapons, Violence, Hate Speech, Political Content",
        "authorBioRequirements": "string or null - specific bio requirements like 'Max 100 words', 'Include social links'",
        "linkRequirements": "string or null - link rules like 'Contextual only', 'No affiliates', 'Natural anchor text'",
        "imagesRequired": boolean,
        "minImages": number or null,
        "samplePostUrl": "string or null - URL to example post they mention"
      }
    }
  ],
  "extractionMetadata": {
    "confidence": "0.0-1.0 confidence in extraction quality",
    "extractionNotes": "what was found vs missing",
    "ambiguousFields": ["fields that were unclear"],
    "keyQuotes": ["important direct quotes from email"]
  }
}

EXTRACTION RULES:
1. DOMAINS: Normalize domains (remove www, https, trailing slashes)
2. CONTACT: Extract name, company, phone from signature
3. CATEGORIES: Select ALL that apply from the provided list (can be multiple)
4. NICHE: Select ALL that apply from the provided list (can be multiple)
5. SUGGESTED NEW NICHES: Add any relevant niches not in our database
6. WEBSITE TYPE: Select ALL that apply from the provided list (can be multiple)
7. METRICS: Only extract if explicitly mentioned with numbers
8. OFFERINGS: Extract each service type separately (guest post vs link insertion)
9. PROHIBITED TOPICS: Extract to offerings.requirements.prohibitedTopics using the standard list:
   - Common prohibited topics: CBD, Cannabis, Casino, Gambling, Adult Content, Pornography, 
     Cryptocurrency, Binary Options, Forex Trading, Get Rich Quick, MLM, Weight Loss Pills, 
     Pharmaceuticals, Payday Loans, Weapons, Violence, Hate Speech, Political Content
   - Map variations to standard terms (e.g., "adult" → "Adult Content", "crypto" → "Cryptocurrency")
10. PRICING: Capture base price only (express pricing is deprecated)
11. CONTENT REQUIREMENTS: Extract specific quality standards to contentRequirements field
12. AUTHOR BIO: Extract specific bio requirements if mentioned (word count, format, etc.)
13. LINK REQUIREMENTS: Extract link placement rules, anchor text requirements
14. IMAGE REQUIREMENTS: Note if images required and minimum number
15. SAMPLE POST: Extract any example post URLs they reference
16. CONFIDENCE: Rate how clear the extraction was

EXAMPLES:
"I run techblog.com (50k monthly visitors) and businessnews.net"
→ websites: [{domain: "techblog.com", totalTraffic: 50000, categories: ["Technology"], websiteType: ["Blog"]}, {domain: "businessnews.net", categories: ["Business"], websiteType: ["News"]}]

"We don't accept CBD, gambling, or adult content"  
→ offerings[].requirements.prohibitedTopics: "CBD, Cannabis, Gambling, Adult Content"

"Guest posts starting at $200, link insertions $50"
→ hasOffer: true (basic pricing mentioned)

"We can run a guest article for $40"
→ hasOffer: true
→ offerings: [{offeringType: "guest_post", basePrice: 40, currency: "USD"}]

"Guest posts $200, link insertions $50, 3-day turnaround"
→ offerings: [
  {offeringType: "guest_post", basePrice: 200, currency: "USD", turnaroundDays: 3},
  {offeringType: "link_insertion", basePrice: 50, currency: "USD", turnaroundDays: 3}
]

"We offer DoFollow guest posts, 800-1500 words, $150"
→ offerings: [{
  offeringType: "guest_post", 
  basePrice: 150, 
  minWordCount: 800, 
  maxWordCount: 1500,
  requirements: {acceptsDoFollow: true}
}]

If no concrete offer or contact info found:
{
  "hasOffer": false,
  "extractionMetadata": {
    "extractionNotes": "No publisher contact or pricing info found"
  }
}

ADDITIONAL EXTRACTION EXAMPLES:
"Articles must be original, well-researched with citations"
→ requirements.contentRequirements: "Original, well-researched with citations"

"Author bio max 100 words with social links"
→ requirements.authorBioRequirements: "Max 100 words with social links"

"We require contextual links only, no keyword stuffing"
→ requirements.linkRequirements: "Contextual links only, no keyword stuffing"

"Include at least 2 relevant images"
→ requirements.imagesRequired: true, requirements.minImages: 2

"See example: example.com/sample-post"
→ requirements.samplePostUrl: "example.com/sample-post"`;

  // Combine base instructions with dynamic metadata if provided
  const fullInstructions = metadata 
    ? baseInstructions + '\n\n' + metadata 
    : baseInstructions;

  return new Agent({
    name: 'EmailParserV3',
    instructions: fullInstructions,
    model: 'o3-2025-04-16',
    tools: [webSearch]
  });
}

// Default export for backward compatibility
export const emailParserV3Agent = createEmailParserAgent();