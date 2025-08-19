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
    type: 'guest_post' | 'link_insertion';
    basePrice?: number;
    currency?: string;
    turnaroundDays?: number;
    requirements?: {
      acceptsDoFollow?: boolean;
      maxLinks?: number;
      prohibitedTopics?: string[];
      minWordCount?: number;
      maxWordCount?: number;
    };
    confidence: number;
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
    const prompt = `Extract the following information from this email response:
    
Email from: ${request.from}
Subject: ${request.subject}
Content: ${content}

Extract:
1. Sender's name (if mentioned)
2. Company/website name
3. Website URL(s) they manage
4. Contact email (if different from sender)

Return as JSON with this structure:
{
  "name": "sender name or null",
  "company": "company name or null",
  "websites": ["domain1.com", "domain2.com"],
  "email": "contact email or sender email"
}`;

    try {
      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to extract basic info:', error);
      return {};
    }
  }
  
  private async extractPricingInfo(content: string, request: EmailParseRequest): Promise<any> {
    const prompt = `Extract pricing information from this publisher's email:
    
Content: ${content}

Look for:
1. Guest post pricing
2. Link insertion pricing
3. Currency (USD, EUR, GBP, etc.)
4. Bulk discounts
5. Package deals
6. Turnaround time

Return as JSON:
{
  "guest_post_price": number or null,
  "link_insertion_price": number or null,
  "currency": "USD",
  "bulk_discounts": [{"quantity": 5, "discount": 10}],
  "turnaround_days": number or null,
  "notes": "any special pricing notes"
}`;

    try {
      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to extract pricing info:', error);
      return {};
    }
  }
  
  private async extractRequirements(content: string, request: EmailParseRequest): Promise<any> {
    const prompt = `Extract content requirements from this publisher's email:
    
Content: ${content}

Look for:
1. DoFollow/NoFollow link policy
2. Maximum links per post
3. Prohibited topics or niches
4. Word count requirements
5. Content quality requirements
6. Any special guidelines

Return as JSON:
{
  "accepts_dofollow": true/false/null,
  "max_links": number or null,
  "prohibited_topics": ["topic1", "topic2"],
  "min_word_count": number or null,
  "max_word_count": number or null,
  "guidelines": "any special requirements"
}`;

    try {
      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
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
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at extracting structured data from publisher emails. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
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
    
    // Process offerings
    const offerings: ParsedEmailData['offerings'] = [];
    
    // Guest post offering
    if (pricingInfo.guest_post_price !== null && pricingInfo.guest_post_price !== undefined) {
      offerings.push({
        type: 'guest_post',
        basePrice: Number(pricingInfo.guest_post_price),
        currency: pricingInfo.currency || 'USD',
        turnaroundDays: pricingInfo.turnaround_days || undefined,
        requirements: {
          acceptsDoFollow: requirements.accepts_dofollow,
          maxLinks: requirements.max_links,
          prohibitedTopics: requirements.prohibited_topics || [],
          minWordCount: requirements.min_word_count,
          maxWordCount: requirements.max_word_count,
        },
        confidence: 0.8,
      });
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
          maxLinks: requirements.max_links,
        },
        confidence: 0.8,
      });
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