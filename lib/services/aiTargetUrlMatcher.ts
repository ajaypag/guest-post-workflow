import OpenAI from 'openai';

interface TargetPage {
  id: string;
  url: string;
  domain: string;
  status: string;
  keywords?: string[];
  description?: string;
}

interface AnalysisResult {
  url: string;
  relevanceScore: number;
  reasoning: string;
  topicalOverlap: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

export class AITargetUrlMatcherResponses {
  private openai: OpenAI | null = null;

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  async analyzeAndRankTargetUrls(
    guestPostSite: string,
    targetPages: TargetPage[],
    topCount: number = 20
  ): Promise<{
    rankedUrls: AnalysisResult[];
    siteAnalysis: string;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      const instructions = `You are an SEO analyst helping select relevant URLs for guest posting opportunities. 

Based on the domain name and your knowledge, infer what topics the guest post site likely covers.

Then select the 20 most relevant client URLs that would be suitable for guest posts on that site.

Return ONLY the URLs, one per line. Nothing else.`;

      const userInput = `Guest post site: ${guestPostSite}

Based on this domain, select the 20 most relevant URLs from the list below that would be suitable for guest posting on ${guestPostSite}:

${targetPages.map((page) => {
  const keywords = page.keywords?.join(', ') || '';
  const description = page.description || '';
  return `${page.url} - Keywords: ${keywords} - Description: ${description}`;
}).join('\n')}

Return ONLY the selected URLs, one per line. No explanations, no numbering, just the URLs.`;

      console.log(`🤖 Starting AI analysis of ${guestPostSite} against ${targetPages.length} target URLs...`);

      const openai = this.getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: instructions
          },
          {
            role: "user",
            content: userInput
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content from AI');
      }

      // Extract the URL list from the response
      const urlList = responseContent.trim();

      // Parse the URL list
      const selectedUrls = urlList.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('http'))
        .slice(0, topCount);

      console.log(`✅ AI selected ${selectedUrls.length} URLs`);

      // Match selected URLs back to target pages with their metadata
      const rankedUrls = selectedUrls.map((url, index) => {
        const targetPage = targetPages.find(page => page.url === url);
        return {
          url,
          relevanceScore: 95 - (index * 3), // Simple scoring based on position
          reasoning: `Selected by AI as relevant to ${guestPostSite}`,
          topicalOverlap: targetPage?.keywords || [],
          confidenceLevel: 'high' as const
        };
      });

      const processingTime = Date.now() - startTime;

      return {
        rankedUrls,
        siteAnalysis: `AI analyzed ${guestPostSite} and selected ${selectedUrls.length} relevant URLs for guest posting opportunities.`,
        processingTime
      };

    } catch (error) {
      console.error('AI Target URL matching failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('model')) {
          throw new Error('The o1 model with web search is not available. Please check your OpenAI API access.');
        }
        if (error.message.includes('tools')) {
          throw new Error('Web search tools are not available with your current OpenAI configuration.');
        }
      }
      
      throw new Error(`Failed to analyze target URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  // Helper method to format results for display
  formatResultsForDisplay(results: AnalysisResult[]): string {
    return results.map((result, index) => {
      const emoji = result.relevanceScore >= 80 ? '🟢' : 
                   result.relevanceScore >= 60 ? '🟡' : 
                   result.relevanceScore >= 40 ? '🟠' : '🔴';
      
      return `${index + 1}. ${emoji} ${result.url}
   Score: ${result.relevanceScore}/100
   Reasoning: ${result.reasoning}
   Topics: ${result.topicalOverlap.join(', ')}
   Confidence: ${result.confidenceLevel}`;
    }).join('\n\n');
  }
}

// Create a singleton instance but initialize lazily
let instance: AITargetUrlMatcherResponses | null = null;

export const aiTargetUrlMatcher = {
  analyzeAndRankTargetUrls: async (...args: Parameters<AITargetUrlMatcherResponses['analyzeAndRankTargetUrls']>) => {
    if (!instance) {
      instance = new AITargetUrlMatcherResponses();
    }
    return instance.analyzeAndRankTargetUrls(...args);
  },
  formatResultsForDisplay: (...args: Parameters<AITargetUrlMatcherResponses['formatResultsForDisplay']>) => {
    if (!instance) {
      instance = new AITargetUrlMatcherResponses();
    }
    return instance.formatResultsForDisplay(...args);
  }
};