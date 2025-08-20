import OpenAI from 'openai';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedEmailData {
  sender: {
    email: string;
    name?: string;
    company?: string;
    confidence: number;
  };
  websites: Array<{
    domain: string;
    confidence: number;
  }>;
  offerings: Array<{
    type: 'guest_post' | 'link_insertion' | 'listicle_placement';
    basePrice?: number;
    currency?: string;
    turnaroundDays?: number;
    position?: number; // For listicle placements
    requirements?: {
      acceptsDoFollow?: boolean;
      maxLinks?: number;
      additionalLinkCost?: number;
      prohibitedTopics?: string[];
      minWordCount?: number;
      maxWordCount?: number;
    };
    transactionalPricing?: any; // For transactional pricing variations
    nichePricing?: Array<{
      niche: string;
      price?: number;
      adjustmentType: 'percentage' | 'fixed' | 'multiplier';
      adjustmentValue: number;
      notes?: string;
    }>;
    rawPricingText?: string; // Raw pricing text from email
    rawRequirementsText?: string; // Raw requirements text from email
    confidence: number;
    websiteSpecific?: string;
    notes?: string;
  }>;
  overallConfidence: number;
  missingFields: string[];
  errors?: string[];
}

interface EmailParseRequest {
  from: string;
  subject: string;
  content: string;
  htmlContent?: string;
  campaignType?: 'outreach' | 'follow_up' | 'bulk';
  originalWebsite?: string;
}

export class EmailParserService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  async parseEmail(request: EmailParseRequest): Promise<ParsedEmailData> {
    try {
      // Clean email content
      const cleanedContent = this.cleanEmailContent(request.content);
      
      // Multi-stage extraction
      const [basicInfo, pricingInfo, requirements] = await Promise.all([
        this.extractBasicInfo(cleanedContent, request),
        this.extractPricingInfo(cleanedContent, request),
        this.extractRequirements(cleanedContent, request),
      ]);
      
      // Combine results
      const result = this.combineResults(basicInfo, pricingInfo, requirements, request);
      
      // Calculate overall confidence
      result.overallConfidence = this.calculateOverallConfidence(result);
      
      // Identify missing fields
      result.missingFields = this.identifyMissingFields(result);
      
      return result;
      
    } catch (error) {
      console.error('Email parsing failed:', error);
      return this.getEmptyResult(request.from);
    }
  }
  
  private cleanEmailContent(content: string): string {
    // Remove email signatures
    const signaturePatterns = [
      /^--\s*$/m,
      /^best regards,?$/im,
      /^sincerely,?$/im,
      /^regards,?$/im,
      /^thanks,?$/im,
    ];
    
    let cleanedContent = content;
    for (const pattern of signaturePatterns) {
      const match = cleanedContent.match(pattern);
      if (match && match.index) {
        cleanedContent = cleanedContent.substring(0, match.index);
      }
    }
    
    // Remove quoted text (previous emails)
    cleanedContent = cleanedContent.replace(/^>.*$/gm, '');
    cleanedContent = cleanedContent.replace(/^On .* wrote:$/gm, '');
    
    // Remove excessive whitespace
    cleanedContent = cleanedContent.replace(/\s+/g, ' ').trim();
    
    return cleanedContent;
  }
  
  private async extractBasicInfo(content: string, request: EmailParseRequest): Promise<any> {
    // Extract domain from email address as a fallback
    const emailDomain = request.from.split('@')[1] || '';
    
    const prompt = `You are analyzing an email conversation thread about guest posting/link building services.

The person replying is: ${request.from}
Subject: ${request.subject}

Full email thread:
${content}

Context: This is an outreach conversation. We reached out to ${request.from} asking about guest posting on THEIR website. They are replying with pricing/terms.

Task: Extract information about ${request.from} and their website(s).

CRITICAL UNDERSTANDING:
- In our initial outreach, we likely mentioned THEIR website (e.g., "Hi, I'd like a guest post on yoursite.com")
- When ${request.from} replies with pricing, they're talking about THAT website we mentioned
- They might not repeat their website in the reply since we already mentioned it
- Look for contextual clues like "our rates are..." or "we charge..." - they're talking about the site we inquired about

Extract:
1. Their name (from signature or email content)
2. Their company/business name
3. Their website(s) - CRITICAL LOGIC:
   - If our outreach says "I want to post on [domain.com]" and they reply with pricing, then [domain.com] IS their website
   - Check their email signature for website URLs
   - The domain ${emailDomain} is likely theirs (unless gmail.com, outlook.com, etc.)
   - If they list multiple sites with different prices, those are ALL their websites
   - DO NOT include random third-party sites mentioned in passing
4. Their preferred contact email

Return as JSON with this structure:
{
  "name": "sender name or null",
  "company": "company name or null",
  "websites": ["domain1.com", "domain2.com"],
  "email": "contact email or sender email"
}`;

    try {
      const response = await this.callOpenAI(prompt);
      // Clean response - remove markdown code blocks if present
      const cleanResponse = response.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to extract basic info:', error);
      return {};
    }
  }
  
  private async extractPricingInfo(content: string, request: EmailParseRequest): Promise<any> {
    const prompt = `You are an expert at extracting pricing information from publisher emails. Extract ALL pricing details from this email.

Email content:
${content}

===EXTRACTION INSTRUCTIONS===

1. PRICES: Extract EVERY price mentioned. Common patterns:
   - "Guest posts are $250" → guest_post_price: 250
   - "$200 (includes 2 do-follow links)" → guest_post_price: 200, max_links_included: 2
   - "Additional links: $30 each" → additional_link_price: 30
   - "Link insertion: $80" → link_insertion_price: 80
   - Look for ALL variations: guest post, sponsored post, article placement, link insertion, niche edits

2. COMPLEX PRICING STRUCTURES:
   - Listicle positions (1st: $999, 2nd: $899, etc.) → Store in listicle_pricing array
   - Transactional vs non-transactional pricing → Store both with clear labels
   - Editorial vs existing content pricing → Store separately
   - SAAS/niche-specific pricing → Store in niche_pricing with adjustment

3. TURNAROUND TIME: Look for ANY mention of time:
   - "delivered in 7 days", "48 hours", "1 week turnaround", "within 5 business days"
   - If NOT mentioned, return null (DO NOT make up values)

4. INCLUDED FEATURES: Parse what's included:
   - "includes 2 do-follow links" → extract max_links_included: 2
   - "500-1000 words" → min_words: 500, max_words: 1000
   - "do-follow" or "dofollow" → dofollow_included: true

5. BULK/PACKAGE DEALS:
   - "10% off for 5+ posts" → bulk_discounts
   - "Package of 3 for $500" → package_deals

6. RAW PRICING TEXT: ALWAYS include the exact pricing text from the email in raw_pricing_text field

Return as JSON (be thorough - extract EVERYTHING):
{
  "guest_post_price": number or null,
  "link_insertion_price": number or null,
  "additional_link_price": number or null,
  "currency": "USD",
  "turnaround_days": number or null (DO NOT default to 7),
  "max_links_included": number or null,
  "min_words": number or null,
  "max_words": number or null,
  "dofollow_included": true/false/null,
  "listicle_pricing": [
    {"position": 1, "price": 999},
    {"position": 2, "price": 899}
  ],
  "niche_pricing": [
    {
      "niche": "saas",
      "price": 250,
      "adjustment_type": "fixed",
      "adjustment_value": 50,
      "notes": "SAAS posts are $250 vs standard $200"
    }
  ],
  "transactional_pricing": {
    "guest_post": {"transactional": 250, "non_transactional": 200},
    "link_insertion": {"transactional": 100, "non_transactional": 80}
  },
  "bulk_discounts": [{"quantity": 5, "discount": 10}],
  "package_deals": [{"quantity": 3, "total_price": 500, "per_unit": 167}],
  "raw_pricing_text": "COPY THE EXACT PRICING SECTION FROM THE EMAIL HERE",
  "notes": "any special pricing notes or conditions"
}`;

    try {
      const response = await this.callOpenAI(prompt);
      // Clean response - remove markdown code blocks if present
      const cleanResponse = response.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to extract pricing info:', error);
      return {};
    }
  }
  
  private async extractRequirements(content: string, request: EmailParseRequest): Promise<any> {
    const prompt = `You are an expert at extracting content requirements and restrictions. Extract ALL requirements and restrictions from this publisher email.

Email content:
${content}

===EXTRACTION INSTRUCTIONS===

1. LINK POLICIES - Look for ANY mention of:
   - "do-follow", "dofollow", "DF" → accepts_dofollow: true
   - "no-follow", "nofollow", "NF" → accepts_dofollow: false
   - "includes 2 do-follow links" → max_links: 2, accepts_dofollow: true
   - "Additional links: $30 each" → implies there's a base number of links included

2. PROHIBITED/RESTRICTED CONTENT - Look for:
   - "We do not accept...", "No content about...", "Prohibited topics include..."
   - "Not allowed:", "Restricted:", "We don't do..."
   - Common restrictions: CBD, casino, gambling, adult, porn, dating, essay writing, crypto, weapons, payday loans
   - IMPORTANT: Copy the EXACT text about restrictions to restricted_niches_notes

3. WORD COUNT - Extract from patterns like:
   - "500-1000 words", "minimum 500 words", "at least 800 words", "max 1500 words"
   - "articles should be...", "content length...", "word count..."

4. CONTENT REQUIREMENTS:
   - Author bio requirements
   - Image requirements
   - Content quality standards
   - Specific formatting needs
   - Review/approval process

5. WHAT THEY DON'T DO - Important negatives:
   - "We do not barter" → no_barter: true
   - "We don't do link exchanges" → no_link_exchanges: true
   - "No free posts" → no_free_posts: true

Return as JSON (extract EVERYTHING mentioned):
{
  "accepts_dofollow": true/false/null,
  "max_links": number or null,
  "additional_links_allowed": true/false/null,
  "additional_link_cost": number or null,
  "prohibited_topics": ["cbd", "casino", "gambling", "adult", etc.],
  "restricted_niches_notes": "EXACT text from email about what they don't accept",
  "min_word_count": number or null,
  "max_word_count": number or null,
  "requires_author_bio": true/false/null,
  "requires_images": true/false/null,
  "min_images": number or null,
  "no_barter": true/false/null,
  "no_link_exchanges": true/false/null,
  "no_free_posts": true/false/null,
  "content_approval_required": true/false/null,
  "guidelines": "any other special requirements or guidelines mentioned",
  "raw_requirements_text": "COPY any requirements section verbatim from the email"
}`;

    try {
      const response = await this.callOpenAI(prompt);
      // Clean response - remove markdown code blocks if present
      const cleanResponse = response.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to extract requirements:', error);
      return {};
    }
  }
  
  private async callOpenAI(prompt: string): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: 'o3-mini', // Using o3-mini for advanced reasoning
          messages: [
            {
              role: 'user',
              content: prompt + '\n\nIMPORTANT: Return ONLY valid JSON, no markdown formatting or explanations.',
            },
          ],
          max_completion_tokens: 5000,
          reasoning_effort: 'medium' as any // o3-mini specific parameter
        });
        
        return response.choices[0]?.message?.content || '{}';
        
      } catch (error) {
        lastError = error as Error;
        console.error(`OpenAI attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    
    throw lastError || new Error('Failed to call OpenAI after retries');
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private combineResults(
    basicInfo: any, 
    pricingInfo: any, 
    requirements: any,
    request: EmailParseRequest
  ): ParsedEmailData {
    const result: ParsedEmailData = {
      sender: {
        email: request.from,
        name: basicInfo.name || undefined,
        company: basicInfo.company || undefined,
        confidence: basicInfo.name || basicInfo.company ? 0.9 : 0.5,
      },
      websites: [],
      offerings: [],
      overallConfidence: 0,
      missingFields: [],
    };
    
    // Process websites
    if (basicInfo.websites && Array.isArray(basicInfo.websites)) {
      result.websites = basicInfo.websites.map((domain: string) => {
        try {
          const normalized = normalizeDomain(domain);
          return {
            domain: normalized.domain,
            confidence: 0.8,
          };
        } catch (error) {
          console.error(`Failed to normalize domain: ${domain}`, error);
          return null;
        }
      }).filter(Boolean) as typeof result.websites;
    }
    
    // Add original website if provided and not already in list
    if (request.originalWebsite) {
      try {
        const normalizedOriginal = normalizeDomain(request.originalWebsite);
        if (!result.websites.some(w => w.domain === normalizedOriginal.domain)) {
          result.websites.push({
            domain: normalizedOriginal.domain,
            confidence: 0.9, // Higher confidence for original outreach website
          });
        }
      } catch (error) {
        console.error(`Failed to normalize original website: ${request.originalWebsite}`, error);
      }
    }
    
    // Final fallback: If no websites found, try to extract from email domain
    if (result.websites.length === 0) {
      const emailDomain = request.from.split('@')[1];
      if (emailDomain && !emailDomain.includes('gmail.com') && !emailDomain.includes('yahoo.com') && !emailDomain.includes('outlook.com') && !emailDomain.includes('hotmail.com')) {
        try {
          const normalized = normalizeDomain(emailDomain);
          result.websites.push({
            domain: normalized.domain,
            confidence: 0.6, // Lower confidence for email domain fallback
          });
          console.log(`Using email domain as fallback website: ${normalized.domain}`);
        } catch (error) {
          console.error(`Failed to use email domain as website: ${emailDomain}`, error);
        }
      }
    }
    
    // Process offerings
    const offerings: ParsedEmailData['offerings'] = [];
    
    // Guest post offering
    if (pricingInfo.guest_post_price !== null && pricingInfo.guest_post_price !== undefined) {
      const guestPostOffering: any = {
        type: 'guest_post',
        basePrice: Number(pricingInfo.guest_post_price),
        currency: pricingInfo.currency || 'USD',
        turnaroundDays: pricingInfo.turnaround_days || undefined, // Don't default - let AI be explicit
        requirements: {
          acceptsDoFollow: requirements.accepts_dofollow,
          maxLinks: requirements.max_links || pricingInfo.max_links_included, // Check both places
          prohibitedTopics: requirements.prohibited_topics || [],
          minWordCount: requirements.min_word_count || pricingInfo.min_words,
          maxWordCount: requirements.max_word_count || pricingInfo.max_words,
          additionalLinkCost: requirements.additional_link_cost || pricingInfo.additional_link_price,
          requiresAuthorBio: requirements.requires_author_bio,
          requiresImages: requirements.requires_images,
          noBarter: requirements.no_barter,
          noLinkExchanges: requirements.no_link_exchanges,
        },
        rawPricingText: pricingInfo.raw_pricing_text, // Store raw text for reference
        rawRequirementsText: requirements.raw_requirements_text,
        confidence: 0.8,
      };
      
      // Add niche pricing if available
      if (pricingInfo.niche_pricing && Array.isArray(pricingInfo.niche_pricing)) {
        guestPostOffering.nichePricing = pricingInfo.niche_pricing.map((np: any) => {
          // Calculate adjustment if not provided
          let adjustmentType = np.adjustment_type || 'fixed';
          let adjustmentValue = np.adjustment_value;
          
          if (!adjustmentValue && np.price && pricingInfo.guest_post_price) {
            const diff = np.price - pricingInfo.guest_post_price;
            if (diff !== 0) {
              adjustmentType = 'fixed';
              adjustmentValue = diff;
            }
          }
          
          return {
            niche: np.niche,
            price: np.price,
            adjustmentType,
            adjustmentValue,
            notes: np.notes
          };
        });
      }
      
      offerings.push(guestPostOffering);
    }
    
    // Link insertion offering
    if (pricingInfo.link_insertion_price !== null && pricingInfo.link_insertion_price !== undefined) {
      offerings.push({
        type: 'link_insertion',
        basePrice: Number(pricingInfo.link_insertion_price),
        currency: pricingInfo.currency || 'USD',
        turnaroundDays: pricingInfo.turnaround_days || undefined,
        requirements: {
          acceptsDoFollow: requirements.accepts_dofollow,
          maxLinks: requirements.max_links || pricingInfo.max_links_included,
          additionalLinkCost: requirements.additional_link_cost || pricingInfo.additional_link_price,
        },
        rawPricingText: pricingInfo.raw_pricing_text,
        confidence: 0.8,
      });
    }
    
    // Handle listicle pricing as separate offerings
    if (pricingInfo.listicle_pricing && Array.isArray(pricingInfo.listicle_pricing)) {
      for (const listicle of pricingInfo.listicle_pricing) {
        offerings.push({
          type: 'listicle_placement',
          basePrice: Number(listicle.price),
          currency: pricingInfo.currency || 'USD',
          turnaroundDays: pricingInfo.turnaround_days || undefined,
          position: listicle.position,
          requirements: {
            acceptsDoFollow: requirements.accepts_dofollow,
            prohibitedTopics: requirements.prohibited_topics || [],
          },
          confidence: 0.7,
        } as any);
      }
    }
    
    // Handle transactional pricing variations
    if (pricingInfo.transactional_pricing) {
      // Store as metadata in the offerings
      offerings.forEach(offer => {
        if (pricingInfo.transactional_pricing[offer.type]) {
          offer.transactionalPricing = pricingInfo.transactional_pricing[offer.type];
        }
      });
    }
    
    // Handle per-website pricing (creates additional offerings with website-specific pricing)
    if (pricingInfo.per_website_pricing && Array.isArray(pricingInfo.per_website_pricing)) {
      for (const websitePricing of pricingInfo.per_website_pricing) {
        // Guest post offering for specific website
        if (websitePricing.guest_post_price !== null && websitePricing.guest_post_price !== undefined) {
          const websiteGuestPostOffering: any = {
            type: 'guest_post',
            basePrice: Number(websitePricing.guest_post_price),
            currency: pricingInfo.currency || 'USD',
            turnaroundDays: pricingInfo.turnaround_days || undefined,
            requirements: {
              acceptsDoFollow: requirements.accepts_dofollow,
              maxLinks: requirements.max_links,
              prohibitedTopics: requirements.prohibited_topics || [],
              minWordCount: requirements.min_word_count,
              maxWordCount: requirements.max_word_count,
            },
            confidence: 0.9, // Higher confidence for website-specific pricing
            websiteSpecific: websitePricing.website,
            notes: websitePricing.notes,
          };
          
          offerings.push(websiteGuestPostOffering);
        }
        
        // Link insertion offering for specific website
        if (websitePricing.link_insertion_price !== null && websitePricing.link_insertion_price !== undefined) {
          offerings.push({
            type: 'link_insertion',
            basePrice: Number(websitePricing.link_insertion_price),
            currency: pricingInfo.currency || 'USD',
            turnaroundDays: pricingInfo.turnaround_days || undefined,
            requirements: {
              acceptsDoFollow: requirements.accepts_dofollow,
              maxLinks: requirements.max_links,
            },
            confidence: 0.9, // Higher confidence for website-specific pricing
            websiteSpecific: websitePricing.website,
            notes: websitePricing.notes,
          });
        }
      }
    }
    
    result.offerings = offerings;
    
    return result;
  }
  
  private calculateOverallConfidence(result: ParsedEmailData): number {
    const confidences: number[] = [];
    
    // Add sender confidence
    confidences.push(result.sender.confidence);
    
    // Add website confidences
    result.websites.forEach(w => confidences.push(w.confidence));
    
    // Add offering confidences
    result.offerings.forEach(o => confidences.push(o.confidence));
    
    // If no data extracted, return low confidence
    if (confidences.length === 1) {
      return 0.3;
    }
    
    // Calculate weighted average
    const sum = confidences.reduce((a, b) => a + b, 0);
    return sum / confidences.length;
  }
  
  private identifyMissingFields(result: ParsedEmailData): string[] {
    const missing: string[] = [];
    
    // Check critical fields
    if (!result.sender.name && !result.sender.company) {
      missing.push('contact_name_or_company');
    }
    
    if (result.websites.length === 0) {
      missing.push('website');
    }
    
    if (result.offerings.length === 0) {
      missing.push('pricing');
    } else {
      // Check for guest post pricing specifically
      const hasGuestPost = result.offerings.some(o => o.type === 'guest_post');
      if (!hasGuestPost) {
        missing.push('guest_post_pricing');
      }
    }
    
    // Check requirements
    const hasRequirements = result.offerings.some(o => 
      o.requirements && Object.keys(o.requirements).length > 0
    );
    if (!hasRequirements) {
      missing.push('content_requirements');
    }
    
    return missing;
  }
  
  private getEmptyResult(email: string): ParsedEmailData {
    return {
      sender: {
        email,
        confidence: 0.1,
      },
      websites: [],
      offerings: [],
      overallConfidence: 0.1,
      missingFields: ['all'],
      errors: ['Failed to parse email content'],
    };
  }
}