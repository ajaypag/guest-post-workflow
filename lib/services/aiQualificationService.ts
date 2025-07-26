import OpenAI from 'openai';

interface QualificationResult {
  domainId: string;
  domain: string;
  qualification: 'high_quality' | 'average_quality' | 'disqualified';
  reasoning: string;
}

interface DomainData {
  domainId: string;
  domain: string;
  keywordRankings: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    url: string;
  }>;
}

interface ClientContext {
  targetPages: Array<{
    url: string;
    keywords: string[];
    description?: string;
  }>;
  clientKeywords: string[]; // All keywords from narrow to broad
}

/**
 * AI-powered site qualification service using O3 model
 * Evaluates guest post opportunities based on topical relevance and ranking potential
 */
export class AIQualificationService {
  private openai: OpenAI;
  private readonly BATCH_SIZE = 10; // Process 10 domains concurrently
  private readonly MAX_CONCURRENT = 5; // Max 5 parallel batches (50 domains at once)

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Qualify multiple domains with concurrent processing
   */
  async qualifyDomains(
    domains: DomainData[],
    clientContext: ClientContext,
    onProgress?: (completed: number, total: number) => void
  ): Promise<QualificationResult[]> {
    console.log(`🤖 Starting AI qualification for ${domains.length} domains`);
    
    const results: QualificationResult[] = [];
    const batches = this.createBatches(domains, this.BATCH_SIZE);
    
    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT) {
      const concurrentBatches = batches.slice(i, i + this.MAX_CONCURRENT);
      
      const batchPromises = concurrentBatches.map(batch => 
        this.processBatch(batch, clientContext)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
      
      // Report progress
      const completed = Math.min(results.length, domains.length);
      onProgress?.(completed, domains.length);
      
      console.log(`✅ Processed ${completed}/${domains.length} domains`);
    }
    
    return results;
  }

  /**
   * Process a batch of domains together
   */
  private async processBatch(
    batch: DomainData[],
    clientContext: ClientContext
  ): Promise<QualificationResult[]> {
    try {
      const prompt = this.buildPrompt(batch, clientContext);
      
      const response = await this.openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from AI');

      const result = JSON.parse(content);
      return this.validateResults(result.qualifications || [], batch);

    } catch (error) {
      console.error('Batch processing error:', error);
      // Return all as needing manual review
      return batch.map(domain => ({
        domainId: domain.domainId,
        domain: domain.domain,
        qualification: 'average_quality' as const,
        reasoning: 'AI processing error - requires manual review'
      }));
    }
  }

  private buildPrompt(domains: DomainData[], context: ClientContext): string {
    // Format client data
    const clientInfo = {
      targetPages: context.targetPages.map(page => ({
        url: page.url,
        keywords: page.keywords.join(', '),
        description: page.description || ''
      })),
      keywordThemes: this.extractKeywordThemes(context.clientKeywords)
    };

    // Format domain data - only include relevant info
    const domainData = domains.map(d => ({
      domainId: d.domainId,
      domain: d.domain,
      // Only include top ranking keywords that might be relevant
      topRankings: d.keywordRankings
        .filter(r => r.position <= 50)
        .sort((a, b) => {
          // Prioritize by position then by volume
          if (a.position !== b.position) return a.position - b.position;
          return b.searchVolume - a.searchVolume;
        })
        .slice(0, 20)
        .map(r => ({
          keyword: r.keyword,
          position: r.position,
          volume: r.searchVolume
        }))
    }));

    return `I'm going to give you my client pages, some narrow to broad keyword topics related to it and then I'll give you sites I want to guest post on along with their keyword rankings for phrases that overlap with the clients.

Your job: reason through and determine if each guest post site is highly relevant, average or disqualified. The best site is basically a site that I can publish an article about a topic that is a long tail of my keyword and it has a great chance of ranking from existing topical authority. Average would be some justifiable overlap but not a home run.

Client Information:
${JSON.stringify(clientInfo, null, 2)}

Sites to Evaluate:
${JSON.stringify(domainData, null, 2)}

Output your decision and justification for each site in this JSON format:
{
  "qualifications": [
    {
      "domainId": "domain-id-here",
      "domain": "domain.com",
      "qualification": "high_quality" | "average_quality" | "disqualified",
      "reasoning": "Your detailed reasoning explaining the topical overlap and ranking potential"
    }
  ]
}`;
  }

  private extractKeywordThemes(keywords: string[]): string[] {
    // Group keywords by common terms to identify themes
    const themes = new Set<string>();
    const commonWords = new Map<string, number>();
    
    // Count word frequency
    keywords.forEach(keyword => {
      const words = keyword.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Skip short words
          commonWords.set(word, (commonWords.get(word) || 0) + 1);
        }
      });
    });
    
    // Extract themes (words that appear in multiple keywords)
    Array.from(commonWords.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([word]) => themes.add(word));
    
    return Array.from(themes);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private validateResults(
    aiResults: any[],
    originalDomains: DomainData[]
  ): QualificationResult[] {
    const resultsMap = new Map<string, QualificationResult>();

    // Process AI results
    if (Array.isArray(aiResults)) {
      aiResults.forEach(result => {
        if (result.domainId && result.qualification && result.reasoning) {
          resultsMap.set(result.domainId, {
            domainId: result.domainId,
            domain: result.domain || '',
            qualification: this.validateQualification(result.qualification),
            reasoning: result.reasoning
          });
        }
      });
    }

    // Ensure all domains have results
    return originalDomains.map(d => {
      const aiResult = resultsMap.get(d.domainId);
      if (aiResult) {
        return { ...aiResult, domain: d.domain };
      }

      // Fallback if AI didn't return result for this domain
      return {
        domainId: d.domainId,
        domain: d.domain,
        qualification: 'average_quality' as const,
        reasoning: 'Requires manual review - AI did not provide qualification'
      };
    });
  }

  private validateQualification(qual: string): 'high_quality' | 'average_quality' | 'disqualified' {
    const valid = ['high_quality', 'average_quality', 'disqualified'];
    return valid.includes(qual) ? qual as any : 'average_quality';
  }
}