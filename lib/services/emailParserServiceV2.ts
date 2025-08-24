/**
 * Email Parser Service V2 - Schema-based single-prompt extraction
 * 
 * This is a complete rewrite that:
 * 1. Uses a single AI call instead of 3
 * 2. Provides exact database schema to AI
 * 3. Gets offerings and pricing rules ready to insert
 * 4. Reduces cost by 66% and improves accuracy
 */

import OpenAI from 'openai';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface PublisherInfo {
  email: string;
  name: string | null;
  company: string | null;
  websites: string[];
}

export interface OfferingRecord {
  publisherId: string; // Will be 'PENDING' initially
  offeringType: 'guest_post' | 'link_insertion' | 'listicle_placement' | 'sponsored_review';
  basePrice: number; // In cents
  currency: string;
  turnaroundDays: number | null;
  currentAvailability: 'available' | 'limited' | 'unavailable' | 'pending_verification';
  expressAvailable: boolean;
  expressPrice: number | null;
  expressDays: number | null;
  offeringName: string | null;
  minWordCount: number | null;
  maxWordCount: number | null;
  niches: string[] | null;
  languages: string[];
  attributes: Record<string, any>;
  isActive: boolean;
}

export interface PricingRule {
  forOfferingType: string;
  ruleType: 'bulk_discount' | 'niche_surcharge' | 'position_pricing' | 'seasonal' | 'express_service' | 'package_deal';
  ruleName: string;
  description: string | null;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  isCumulative: boolean;
  autoApply: boolean;
}

export interface ParsedEmailV2 {
  publisher: PublisherInfo;
  offerings: OfferingRecord[];
  pricingRules: PricingRule[];
  confidence: number;
  extractionNotes: string;
  rawExtraction?: any; // For debugging
}

export class EmailParserServiceV2 {
  private maxRetries = 3;
  private retryDelay = 1000;

  async parseEmail(emailContent: string, senderEmail: string, subject?: string): Promise<ParsedEmailV2> {
    console.log('📧 EmailParserServiceV2.parseEmail called for:', senderEmail);
    const prompt = this.buildPrompt(emailContent, senderEmail, subject);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`🤖 Calling OpenAI API (attempt ${attempt + 1}) with model: o3-mini`);
        const response = await openai.chat.completions.create({
          model: 'o3-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_completion_tokens: 5000,
          // o3-mini supports reasoning_effort parameter: "low", "medium", or "high"
          // Using medium for balanced performance and accuracy
          reasoning_effort: 'medium' as any
        });
        
        console.log('✅ OpenAI API call successful');
        const content = response.choices[0]?.message?.content || '{}';
        const cleanContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanContent);
        
        // Post-process the result
        return this.postProcess(parsed);
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ OpenAI API attempt ${attempt + 1} failed:`, error);
        console.error('Error details:', {
          message: (error as any).message,
          status: (error as any).status,
          statusText: (error as any).statusText,
          response: (error as any).response?.data
        });
        
        if (attempt < this.maxRetries - 1) {
          console.log(`⏳ Retrying in ${this.retryDelay * Math.pow(2, attempt)}ms...`);
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    
    throw lastError || new Error('Failed to parse email after retries');
  }

  private buildPrompt(emailContent: string, senderEmail: string, subject?: string): string {
    return `You are an expert at extracting publisher information from emails and creating structured database records.

Email from: ${senderEmail}
Subject: ${subject || 'Not provided'}
Email content:
${emailContent}

Your task: Extract ALL information and create offering records that match our exact database schema.

INSTRUCTIONS:
- Analyze this email and extract any publishing/content services with pricing
- Create separate offerings for each service type mentioned
- Convert ALL prices to cents (multiply dollars by 100)
- Extract websites from email domain or content

DATABASE SCHEMA FOR OFFERINGS:
{
  "publisherId": "PENDING", // Always use "PENDING"
  "offeringType": "guest_post" | "link_insertion" | "listicle_placement" | "sponsored_review",
  "basePrice": INTEGER_IN_CENTS, // CRITICAL: $250 = 25000, $80 = 8000
  "currency": "USD" | "EUR" | "GBP",
  "turnaroundDays": INTEGER or null,
  "currentAvailability": "pending_verification", // Always for new offerings
  "expressAvailable": boolean,
  "expressPrice": INTEGER_IN_CENTS or null,
  "expressDays": INTEGER or null,
  "offeringName": string or null,
  "minWordCount": INTEGER or null,
  "maxWordCount": INTEGER or null,
  "niches": ["array", "of", "niches"] or null,
  "languages": ["en"], // Default to ["en"]
  "attributes": {
    // Store ALL extra data here:
    "restrictions": {"niches": ["cbd", "casino", "adult"]},
    "includedLinks": 2,
    "additionalLinkPrice": 3000, // in cents!
    "acceptsDoFollow": true,
    "requiresAuthorBio": false,
    "noLinkExchanges": true,
    "noBarter": true,
    "rawPricingText": "exact pricing text from email",
    "transactionalPricing": {"transactional": 25000, "non_transactional": 20000},
    "listiclePosition": 1, // for listicle offerings
    "specialNotes": "any other important notes"
  },
  "isActive": false // Always false for new offerings
}

PRICING RULES SCHEMA:
{
  "forOfferingType": "guest_post" | "link_insertion" | etc,
  "ruleType": "bulk_discount" | "niche_surcharge" | "position_pricing" | "package_deal",
  "ruleName": "descriptive name",
  "description": "detailed description",
  "conditions": {
    "type": "quantity" | "niche" | "position" | "custom",
    "operator": "gte" | "lte" | "equals" | "contains",
    "value": <appropriate value>
  },
  "actions": {
    "adjustmentType": "percentage_discount" | "fixed_discount" | "percentage_markup" | "fixed_markup" | "override_price",
    "adjustmentValue": NUMBER,
    "finalPrice": NUMBER (for overrides)
  },
  "priority": 1-100,
  "isCumulative": boolean,
  "autoApply": true
}

EXTRACTION EXAMPLES:

1. "Guest posts are $250" 
   → Create offering with basePrice: 25000

2. "$200 (includes 2 do-follow links), additional links $30 each"
   → basePrice: 20000, attributes.includedLinks: 2, attributes.additionalLinkPrice: 3000

3. "We do not accept CBD, casino, or adult content"
   → attributes.restrictions.niches: ["cbd", "casino", "adult"]

4. "10% off for 5+ posts"
   → Create pricing rule: bulk_discount for quantity >= 5

5. "SAAS posts are $250 instead of $200"
   → Create pricing rule: niche_surcharge for SAAS

6. Listicle pricing: "1st: $999, 2nd: $899, 3rd: $799"
   → Create SEPARATE offerings for each position with offeringType: "listicle_placement"

CRITICAL RULES:
1. ALWAYS multiply dollar amounts by 100 for cents
2. Create SEPARATE offering records for each service
3. If no turnaround mentioned, use null (not 7)
4. Extract website from email domain if not explicitly mentioned
5. Store complex/unusual data in attributes field
6. Create pricing rules for variations (bulk, niche, etc)

OUTPUT FORMAT:
{
  "publisher": {
    "email": "sender@example.com",
    "name": "Name or null",
    "company": "Company or null",
    "websites": ["example.com"]
  },
  "offerings": [
    // Array of offering objects matching schema above
  ],
  "pricingRules": [
    // Array of pricing rules if any variations mentioned
  ],
  "confidence": 0.0-1.0,
  "extractionNotes": "what was unclear or noteworthy"
}

Extract and return ONLY valid JSON:`;
  }

  private postProcess(parsed: any): ParsedEmailV2 {
    // Normalize websites
    if (parsed.publisher?.websites) {
      parsed.publisher.websites = parsed.publisher.websites.map((domain: string) => {
        try {
          const normalized = normalizeDomain(domain);
          return normalized.domain;
        } catch {
          return domain;
        }
      });
    }

    // Ensure all offerings have required fields
    if (parsed.offerings) {
      parsed.offerings = parsed.offerings.map((offer: any) => ({
        publisherId: 'PENDING',
        offeringType: offer.offeringType || 'guest_post',
        basePrice: offer.basePrice || 0,
        currency: offer.currency || 'USD',
        turnaroundDays: offer.turnaroundDays ?? null,
        currentAvailability: 'pending_verification',
        expressAvailable: offer.expressAvailable || false,
        expressPrice: offer.expressPrice ?? null,
        expressDays: offer.expressDays ?? null,
        offeringName: offer.offeringName || null,
        minWordCount: offer.minWordCount ?? null,
        maxWordCount: offer.maxWordCount ?? null,
        niches: offer.niches || null,
        languages: offer.languages || ['en'],
        attributes: offer.attributes || {},
        isActive: false
      }));
    }

    // Ensure pricing rules have required fields
    if (parsed.pricingRules) {
      parsed.pricingRules = parsed.pricingRules.map((rule: any) => ({
        forOfferingType: rule.forOfferingType || 'guest_post',
        ruleType: rule.ruleType || 'custom',
        ruleName: rule.ruleName || 'Unnamed Rule',
        description: rule.description || null,
        conditions: rule.conditions || {},
        actions: rule.actions || {},
        priority: rule.priority || 10,
        isCumulative: rule.isCumulative ?? false,
        autoApply: rule.autoApply ?? true
      }));
    }

    return {
      publisher: parsed.publisher || { email: '', name: null, company: null, websites: [] },
      offerings: parsed.offerings || [],
      pricingRules: parsed.pricingRules || [],
      confidence: parsed.confidence || 0.5,
      extractionNotes: parsed.extractionNotes || '',
      rawExtraction: parsed
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const emailParserV2 = new EmailParserServiceV2();