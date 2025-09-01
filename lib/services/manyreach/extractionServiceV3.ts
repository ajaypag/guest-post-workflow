import OpenAI from 'openai';
import { analyzeWebsite } from './websiteAnalyzerAgent';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';
import { ManyReachPromptGenerator } from './promptGenerator';

/**
 * ManyReach V3 Extraction Service
 * 
 * Two-phase extraction:
 * 1. Extract publisher info and domains from email using GPT-4
 * 2. Visit websites using o3-mini to determine actual niches/categories
 */
export class ManyReachExtractionServiceV3 {
  private openai: OpenAI;
  private promptGenerator: ManyReachPromptGenerator;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.promptGenerator = new ManyReachPromptGenerator();
  }

  /**
   * Phase 1: Extract publisher info and domains from email trail
   */
  async extractFromEmail(emailTrail: string): Promise<{
    publisher: any;
    domains: string[];
  }> {
    // Generate extraction prompt with current database values
    const extractionPrompt = await this.promptGenerator.generateExtractionPrompt('initial');
    
    // First pass: Extract publisher info and domains only
    const phase1Prompt = `
You are an AI that extracts publisher information from email trails.

IMPORTANT: The email trails contain BOTH our outreach emails (from LinkIO/our team) AND publisher replies.
Extract information ONLY from publisher replies, not from our outreach content.

For this phase, extract:
1. Publisher contact information (email, name, company, etc.)
2. Website domains they manage (we'll analyze them separately)
3. Pricing information if mentioned
4. Any requirements or guidelines mentioned

Return as JSON:
{
  "publisher": {
    "email": "from their reply",
    "contactName": "person's name",
    "companyName": "company name",
    "phone": "if provided",
    "paymentEmail": "if different",
    "paymentMethod": "if mentioned",
    "internalNotes": "pricing, requirements, etc.",
    "confidenceScore": 0.00
  },
  "domains": ["domain1.com", "domain2.com"],
  "extractionNotes": "any important context"
}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: phase1Prompt },
        { role: 'user', content: emailTrail }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Normalize domains
    result.domains = result.domains.map((d: string) => normalizeDomain(d));
    
    return result;
  }

  /**
   * Phase 2: Visit and analyze each website using o3-mini
   */
  async analyzeWebsites(domains: string[]): Promise<any[]> {
    const websites = [];
    
    for (const domain of domains) {
      try {
        console.log(`🔍 Analyzing website: ${domain}`);
        
        // Use o3-mini with web search to analyze the actual website
        const analysis = await analyzeWebsite(domain);
        
        websites.push({
          domain: analysis.domain,
          niche: analysis.niche,
          categories: analysis.categories,
          websiteType: analysis.websiteType,
          extractionNotes: analysis.contentSummary,
          confidenceScore: analysis.confidenceScore,
          visitedPages: analysis.visitedPages
        });
        
        console.log(`✅ Analyzed ${domain}: ${analysis.categories.join(', ')}`);
      } catch (error) {
        console.error(`❌ Failed to analyze ${domain}:`, error);
        
        // Fallback: basic categorization if website analysis fails
        websites.push({
          domain,
          niche: ['General'],
          categories: ['Other'],
          websiteType: ['Blog'],
          extractionNotes: 'Could not access website for analysis',
          confidenceScore: 0.3
        });
      }
    }
    
    return websites;
  }

  /**
   * Complete extraction pipeline
   */
  async extractComplete(emailTrail: string): Promise<{
    publisher: any;
    websites: any[];
  }> {
    console.log('📧 Phase 1: Extracting from email...');
    const { publisher, domains } = await this.extractFromEmail(emailTrail);
    
    console.log(`✅ Found publisher: ${publisher.companyName || publisher.email}`);
    console.log(`📊 Found ${domains.length} domains to analyze`);
    
    console.log('\n🌐 Phase 2: Analyzing websites...');
    const websites = await this.analyzeWebsites(domains);
    
    return {
      publisher,
      websites
    };
  }

  /**
   * Test extraction with sample data
   */
  async testExtraction(): Promise<void> {
    const sampleEmail = `
From: outreach@linkio.com
To: publisher@example.com
Subject: Guest Post Opportunity

Hi, we're interested in guest posting...

---

From: john@techblog.com
To: outreach@linkio.com
Subject: Re: Guest Post Opportunity

Hi there,

Thanks for reaching out! Yes, we accept guest posts.

I'm John Smith from TechBlog Media. We manage several websites:
- TechBlog.com - Our main technology site
- MarketingToday.com - Digital marketing insights
- HealthTechNews.com - Healthcare technology coverage

Our rates are $350-$450 per post depending on the site.
Payment via PayPal to billing@techblog.com.

Best,
John Smith
TechBlog Media
    `;
    
    const result = await this.extractComplete(sampleEmail);
    
    console.log('\n📊 Extraction Results:');
    console.log(JSON.stringify(result, null, 2));
  }
}

// Export for use in API routes
export const extractionService = new ManyReachExtractionServiceV3();