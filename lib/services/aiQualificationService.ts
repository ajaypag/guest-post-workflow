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
  private readonly MAX_CONCURRENT = 10; // Process up to 10 domains in parallel

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
    let completed = 0;
    
    // Process domains in chunks of MAX_CONCURRENT at a time
    for (let i = 0; i < domains.length; i += this.MAX_CONCURRENT) {
      const chunk = domains.slice(i, i + this.MAX_CONCURRENT);
      
      // Process each domain in the chunk concurrently
      const chunkPromises = chunk.map(domain => 
        this.processSingleDomain(domain, clientContext)
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Report progress
      completed += chunk.length;
      onProgress?.(completed, domains.length);
      
      console.log(`✅ Processed ${completed}/${domains.length} domains`);
    }
    
    return results;
  }

  /**
   * Process a single domain
   */
  private async processSingleDomain(
    domain: DomainData,
    clientContext: ClientContext
  ): Promise<QualificationResult> {
    try {
      const prompt = this.buildPromptForSingleDomain(domain, clientContext);
      
      const response = await this.openai.chat.completions.create({
        model: "o3-2025-04-16",
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
      
      // Validate the single result
      if (result.qualification && result.reasoning) {
        return {
          domainId: domain.domainId,
          domain: domain.domain,
          qualification: this.validateQualification(result.qualification),
          reasoning: result.reasoning
        };
      }
      
      throw new Error('Invalid response format from AI');

    } catch (error) {
      console.error(`Domain ${domain.domain} processing error:`, error);
      // Return as needing manual review
      return {
        domainId: domain.domainId,
        domain: domain.domain,
        qualification: 'average_quality' as const,
        reasoning: 'AI processing error - requires manual review'
      };
    }
  }

  private buildPromptForSingleDomain(domain: DomainData, context: ClientContext): string {
    // Format client data
    const clientInfo = {
      targetPages: context.targetPages.map(page => ({
        url: page.url,
        keywords: page.keywords.join(', '),
        description: page.description || ''
      })),
      keywordThemes: this.extractKeywordThemes(context.clientKeywords)
    };

    // Include ALL keyword rankings - no filtering or limiting
    const domainInfo = {
      domainId: domain.domainId,
      domain: domain.domain,
      totalKeywords: domain.keywordRankings.length,
      keywordRankings: domain.keywordRankings
        .sort((a, b) => {
          // Still sort by position then volume for better readability
          if (a.position !== b.position) return a.position - b.position;
          return b.searchVolume - a.searchVolume;
        })
        .map(r => ({
          keyword: r.keyword,
          position: r.position,
          volume: r.searchVolume,
          url: r.url
        }))
    };

    return `I'm going to give you my client pages, some narrow to broad keyword topics related to it and then I'll give you a site I want to guest post on along with ALL their keyword rankings.

Your job: reason through and determine if this guest post site is highly relevant, average or disqualified. The best site is basically a site that I can publish an article about a topic that is a long tail of my keyword and it has a great chance of ranking from existing topical authority. Average would be some justifiable overlap but not a home run.

Client Information:
${JSON.stringify(clientInfo, null, 2)}

Site to Evaluate:
${JSON.stringify(domainInfo, null, 2)}

Output your decision and justification in this JSON format:
{
  "qualification": "high_quality" | "average_quality" | "disqualified",
  "reasoning": "Your detailed reasoning explaining the topical overlap and ranking potential. Be specific about which keywords show topical authority relevant to the client's needs."
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


  private validateQualification(qual: string): 'high_quality' | 'average_quality' | 'disqualified' {
    const valid = ['high_quality', 'average_quality', 'disqualified'];
    return valid.includes(qual) ? qual as any : 'average_quality';
  }
}