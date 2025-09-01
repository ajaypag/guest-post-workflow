import OpenAI from 'openai';

// Initialize OpenAI lazily to avoid errors when API key is not set
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for email parsing');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

export interface ParsedEmailData {
  hasOffer: boolean;
  publisher?: {
    email: string;
    contactName?: string;
    companyName?: string;
    phone?: string;
    websites?: string[];
    paymentMethods?: string[];
    paymentTerms?: string;
  };
  websites?: Array<{
    domain: string;
    domainRating?: number;
    totalTraffic?: number;
    niches?: string[];
    websiteType?: string[];
    restrictions?: {
      forbiddenNiches?: string[];
      contentRequirements?: string;
      linkRestrictions?: string;
    };
    metrics?: {
      monthlySessions?: number;
      pageviews?: number;
      bounceRate?: number;
      avgSessionDuration?: string;
    };
  }>;
  offerings?: Array<{
    offeringType: 'guest_post' | 'link_insertion' | 'listicle_placement' | 'sponsored_review' | 'press_release' | 'package_deal';
    serviceName?: string;
    basePrice?: number; // in cents
    currency?: string;
    turnaroundDays?: number;
    minWordCount?: number;
    maxWordCount?: number;
    includedFeatures?: {
      dofollowLinks?: number;
      nofollowLinks?: number;
      socialShares?: boolean;
      authorBio?: boolean;
      imageInsertion?: boolean;
      permanentHosting?: boolean;
    };
    pricing?: {
      basePrice?: number;
      expressPrice?: number;
      expressDays?: number;
      additionalLinkPrice?: number;
      revisionPrice?: number;
      bulkDiscounts?: Array<{
        minQuantity: number;
        discountPercentage: number;
        description: string;
      }>;
      nicheUpcharges?: Array<{
        niche: string;
        upchargeAmount: number;
        description: string;
      }>;
      positionPricing?: Array<{
        position: string;
        price: number;
        description: string;
      }>;
    };
    requirements?: {
      contentGuidelines?: string;
      approvalProcess?: string;
      authorshipRequirements?: string;
      linkGuidelines?: string;
      imageRequirements?: string;
    };
    availability?: {
      currentStatus?: string;
      availableSlots?: number;
      nextAvailable?: string;
      seasonalNotes?: string;
    };
    specialConditions?: {
      minimumOrder?: string;
      packageDeals?: string;
      longTermDiscounts?: string;
      exclusivityOptions?: string;
    };
  }>;
  businessTerms?: {
    communicationPreferences?: string;
    responseTime?: string;
    workingHours?: string;
    projectManagement?: string;
    reporting?: string;
    guarantees?: string;
    cancellationPolicy?: string;
  };
  extractionMetadata?: {
    confidence?: number;
    extractionNotes?: string;
    ambiguousFields?: string[];
    rawPricingText?: string;
    keyQuotes?: string[];
  };
  rawExtraction?: string; // Store raw AI response for debugging
}

const PARSING_PROMPT = `You are an expert at analyzing email trails between our outreach team and publishers for a guest posting platform.

CRITICAL CONTEXT: You're analyzing an EMAIL TRAIL that contains:
1. Our original outreach email (from Nick or our team) - IGNORE this for extraction
2. The publisher's reply with their actual offer - EXTRACT from this part only

IMPORTANT: Only extract information from the PUBLISHER'S REPLY, not from our outreach. Look for:
- The publisher's email signature and contact details
- Their pricing and service offerings
- Their website information and requirements
- Any restrictions or guidelines they mention

Analyze this email trail and extract ALL relevant information from the PUBLISHER'S RESPONSE. Be thorough but only extract what the PUBLISHER explicitly mentioned - don't make assumptions.

Database Schema Context:
- Publishers offer guest posting, link insertion, sponsored content, press releases
- Websites have domain ratings, traffic metrics, niches, restrictions
- Offerings include pricing, turnaround times, word counts, special conditions
- Pricing can be simple ($X per post) or complex (bulk rates, niche surcharges, position pricing)
- Publishers may have payment terms, restrictions, requirements

Return a JSON object with this comprehensive structure:
{
  "hasOffer": boolean, // true if they provide specific pricing or detailed service info
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
      "domainRating": "DR/DA number or null",
      "totalTraffic": "monthly traffic number or null",
      "niches": ["array of categories/niches"],
      "websiteType": ["Blog", "News", "SaaS", "E-commerce", etc],
      "restrictions": {
        "forbiddenNiches": ["CBD", "Casino", "Adult", etc],
        "contentRequirements": "quality standards, word count, etc",
        "linkRestrictions": "dofollow policy, anchor text rules, etc"
      },
      "metrics": {
        "monthlySessions": "number or null",
        "pageviews": "number or null",
        "bounceRate": "percentage or null",
        "avgSessionDuration": "time or null"
      }
    }
  ],
  "offerings": [
    {
      "offeringType": "guest_post | link_insertion | listicle_placement | sponsored_review | press_release | package_deal",
      "serviceName": "descriptive name of the service",
      "basePrice": "price in cents (multiply dollars by 100) or null",
      "currency": "USD | EUR | GBP",
      "turnaroundDays": "delivery time in days or null",
      "minWordCount": "minimum words or null",
      "maxWordCount": "maximum words or null",
      "includedFeatures": {
        "dofollowLinks": "number of included dofollow links or null",
        "nofollowLinks": "number of nofollow links or null",
        "socialShares": "social media promotion included (boolean)",
        "authorBio": "author bio section included (boolean)",
        "imageInsertion": "custom images allowed (boolean)",
        "permanentHosting": "content stays permanently (boolean)"
      },
      "pricing": {
        "basePrice": "standard price in cents",
        "expressPrice": "rush delivery price in cents or null",
        "expressDays": "rush delivery time or null",
        "additionalLinkPrice": "price per extra link in cents or null",
        "revisionPrice": "price per revision in cents or null",
        "bulkDiscounts": [
          {
            "minQuantity": "number",
            "discountPercentage": "percentage off",
            "description": "5+ posts get 10% off"
          }
        ],
        "nicheUpcharges": [
          {
            "niche": "Finance",
            "upchargeAmount": "additional cost in cents",
            "description": "Finance posts +$50"
          }
        ],
        "positionPricing": [
          {
            "position": "1st position",
            "price": "price in cents",
            "description": "Listicle 1st position $999"
          }
        ]
      },
      "requirements": {
        "contentGuidelines": "quality standards, style requirements",
        "approvalProcess": "content review process",
        "authorshipRequirements": "byline, credentials needed",
        "linkGuidelines": "anchor text, destination restrictions",
        "imageRequirements": "custom images, alt text, etc"
      },
      "availability": {
        "currentStatus": "available | limited | booked | seasonal",
        "availableSlots": "number of open slots or null",
        "nextAvailable": "next available date or null",
        "seasonalNotes": "timing restrictions or peak seasons"
      },
      "specialConditions": {
        "minimumOrder": "minimum number of posts or spend",
        "packageDeals": "multi-service discounts",
        "longTermDiscounts": "ongoing relationship benefits",
        "exclusivityOptions": "exclusive content guarantees"
      }
    }
  ],
  "businessTerms": {
    "communicationPreferences": "email, phone, Skype, etc",
    "responseTime": "how quickly they respond",
    "workingHours": "business hours/timezone",
    "projectManagement": "how they handle projects",
    "reporting": "what reports/updates they provide",
    "guarantees": "satisfaction guarantees, revisions included",
    "cancellationPolicy": "refund/cancellation terms"
  },
  "extractionMetadata": {
    "confidence": "0.0-1.0 confidence in extraction quality",
    "extractionNotes": "important notes about what was found",
    "ambiguousFields": ["fields that were unclear or assumed"],
    "rawPricingText": "exact pricing quotes from email",
    "keyQuotes": ["important direct quotes from email"]
  }
}

CRITICAL EXTRACTION RULES:
1. PRICES: Always convert to cents ($250 = 25000, $40 = 4000)
2. DOMAINS: Normalize domains (remove www, https, trailing slashes)
3. TURNAROUND: Only extract if explicitly mentioned (not "usually 5-7 days")
4. RESTRICTIONS: Extract all forbidden niches, content types, link policies
5. BULK PRICING: Create separate rules for quantity discounts
6. NICHE SURCHARGES: Extract premium pricing for specific categories
7. PACKAGE DEALS: Identify multi-service offerings
8. PAYMENT TERMS: Extract deposit requirements, net terms, etc
9. GUARANTEES: Note satisfaction guarantees, revision policies
10. AVAILABILITY: Current capacity, booking schedules

EXTRACTION EXAMPLES:
"Guest posts $250 with 2 dofollow links, additional links $30 each"
→ basePrice: 25000, includedFeatures.dofollowLinks: 2, additionalLinkPrice: 3000

"We don't accept CBD, casino, adult, or payday loan content"
→ restrictions.forbiddenNiches: ["CBD", "Casino", "Adult", "Payday Loans"]

"5+ posts get 15% discount, 10+ posts get 25% discount"
→ Create 2 bulkDiscounts entries with minQuantity and discountPercentage

"Finance/Crypto posts are +$100, standard rate $200"
→ basePrice: 20000, nicheUpcharges: [{niche: "Finance", upchargeAmount: 10000}]

"Delivery in 3-5 business days, rush delivery in 24 hours for +$75"
→ turnaroundDays: 4, expressPrice: basePrice + 7500, expressDays: 1

If there's no concrete offer with pricing or detailed service info, return:
{
  "hasOffer": false,
  "extractionMetadata": {
    "extractionNotes": "No specific pricing or service details found"
  }
}

Email content:`;

export class EmailParserV3 {
  async parseEmail(htmlContent: string): Promise<ParsedEmailData> {
    try {
      // Strip HTML to get plain text
      const textContent = htmlContent
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Truncate if too long (GPT-4 can handle ~8k tokens)
      const maxLength = 4000;
      const truncatedContent = textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '... [truncated]'
        : textContent;

      console.log('🤖 Parsing email with GPT-4...');
      
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: PARSING_PROMPT 
          },
          { 
            role: "user", 
            content: truncatedContent 
          }
        ],
        temperature: 0.1 // Low temperature for consistent extraction
        // Note: response_format removed - not supported by gpt-4 base model
      });

      // Clean the response content to extract JSON
      const rawContent = response.choices[0].message.content || '{"hasOffer": false}';
      const cleanedContent = rawContent
        .replace(/^```json\s*/, '') // Remove opening code block
        .replace(/\s*```$/, '') // Remove closing code block
        .replace(/^```\s*/, '') // Remove any other opening code block
        .trim();
      
      const parsed = JSON.parse(cleanedContent);
      
      // Add raw extraction for debugging
      parsed.rawExtraction = response.choices[0].message.content;

      // Validate and clean the response
      if (parsed.hasOffer) {
        // Ensure required fields exist
        if (!parsed.publisher?.email) {
          console.warn('⚠️ No publisher email found in parsed data');
          parsed.hasOffer = false;
        }
        
        // Clean domains if present
        if (parsed.websites && Array.isArray(parsed.websites)) {
          parsed.websites = parsed.websites.map((website: any) => ({
            ...website,
            domain: this.cleanDomain(website.domain)
          }));
        }

        // Clean publisher website domains
        if (parsed.publisher?.websites && Array.isArray(parsed.publisher.websites)) {
          parsed.publisher.websites = parsed.publisher.websites.map((domain: string) => 
            this.cleanDomain(domain)
          );
        }

        // Validate offerings and ensure valid offering types
        if (parsed.offerings && Array.isArray(parsed.offerings)) {
          const validOfferingTypes = ['guest_post', 'link_insertion', 'listicle_placement', 'sponsored_review', 'press_release', 'package_deal'];
          parsed.offerings = parsed.offerings.filter((offer: any) => 
            offer.offeringType && validOfferingTypes.includes(offer.offeringType)
          );

          // Ensure prices are in cents
          parsed.offerings = parsed.offerings.map((offer: any) => {
            const processedOffer = { ...offer };
            
            // Convert basePrice to cents if it exists and looks like dollars
            if (processedOffer.basePrice && processedOffer.basePrice < 1000) {
              processedOffer.basePrice = processedOffer.basePrice * 100;
            }
            
            // Process pricing object if it exists
            if (processedOffer.pricing) {
              ['basePrice', 'expressPrice', 'additionalLinkPrice', 'revisionPrice'].forEach(priceField => {
                if (processedOffer.pricing[priceField] && processedOffer.pricing[priceField] < 1000) {
                  processedOffer.pricing[priceField] = processedOffer.pricing[priceField] * 100;
                }
              });
              
              // Process niche upcharges
              if (processedOffer.pricing.nicheUpcharges && Array.isArray(processedOffer.pricing.nicheUpcharges)) {
                processedOffer.pricing.nicheUpcharges = processedOffer.pricing.nicheUpcharges.map((upcharge: any) => {
                  if (upcharge.upchargeAmount && upcharge.upchargeAmount < 1000) {
                    upcharge.upchargeAmount = upcharge.upchargeAmount * 100;
                  }
                  return upcharge;
                });
              }
              
              // Process position pricing
              if (processedOffer.pricing.positionPricing && Array.isArray(processedOffer.pricing.positionPricing)) {
                processedOffer.pricing.positionPricing = processedOffer.pricing.positionPricing.map((position: any) => {
                  if (position.price && position.price < 1000) {
                    position.price = position.price * 100;
                  }
                  return position;
                });
              }
            }
            
            return processedOffer;
          });
        }
      }

      console.log(`✅ Parsing complete. Has offer: ${parsed.hasOffer}`);
      return parsed;

    } catch (error) {
      console.error('❌ Error parsing email:', error);
      
      // Return safe default on error
      return {
        hasOffer: false,
        rawExtraction: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clean and normalize domain
   */
  private cleanDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '') // Remove protocol
      .replace(/^www\./, '') // Remove www
      .replace(/\/.*$/, '') // Remove path
      .trim();
  }

  /**
   * Parse multiple emails in batch (for efficiency)
   */
  async parseEmailBatch(htmlContents: string[]): Promise<ParsedEmailData[]> {
    // Process in parallel but limit concurrency
    const batchSize = 3;
    const results: ParsedEmailData[] = [];
    
    for (let i = 0; i < htmlContents.length; i += batchSize) {
      const batch = htmlContents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(html => this.parseEmail(html))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}