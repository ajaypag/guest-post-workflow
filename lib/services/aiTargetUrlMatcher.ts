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

export class AITargetUrlMatcher {
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
      // Build comprehensive prompt for the AI
      const systemPrompt = `You are an expert SEO analyst specializing in guest post placement and topical relevance analysis. Your task is to analyze a guest post website and determine which client target URLs would be most relevant for guest posts on that site.

You have access to web search capabilities. Use them to:
1. Search for and analyze the guest post site's homepage
2. Look at their blog or articles section
3. Understand their main topics, categories, and content themes
4. Check their recent posts to understand what they typically publish

Then match this against the client's target URLs based on:
- Topical relevance and overlap
- Content compatibility
- Natural link placement opportunities
- Likelihood of editorial acceptance`;

      const userPrompt = `Analyze this guest post opportunity:

GUEST POST SITE: ${guestPostSite}

TASK:
1. First, search and analyze ${guestPostSite} to understand:
   - Main topics and categories they cover
   - Types of content they publish
   - Their target audience
   - Recent blog posts or articles

2. Then evaluate these client target URLs for relevance:
${targetPages.map((page, index) => {
  const keywords = page.keywords?.join(', ') || 'No keywords';
  const description = page.description || 'No description';
  return `
URL ${index + 1}: ${page.url}
Keywords: ${keywords}
Description: ${description}`;
}).join('\n')}

3. Return a JSON response with:
{
  "siteAnalysis": "Brief summary of what ${guestPostSite} is about and what content they publish",
  "rankedUrls": [
    {
      "url": "the target URL",
      "relevanceScore": 95, // 0-100 score
      "reasoning": "Why this URL is highly relevant",
      "topicalOverlap": ["topic1", "topic2"], // Overlapping topics
      "confidenceLevel": "high" // high/medium/low
    }
    // ... rank ALL URLs, but especially identify the top ${topCount}
  ]
}

IMPORTANT: 
- Use web search to gather real data about ${guestPostSite}
- Rank ALL provided URLs from most to least relevant
- Be specific in your reasoning
- Consider both direct topical matches and adjacent/related topics`;

      console.log(`🤖 Starting AI analysis of ${guestPostSite} against ${targetPages.length} target URLs...`);

      // Use gpt-4-turbo for now until o1 is available with tools
      const completion = await this.getOpenAI().chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        response_format: { type: "json_object" },
        tools: [{
          type: "function",
          function: {
            name: "web_search",
            description: "Search the web for information",
            parameters: {
              type: "object", 
              properties: {
                query: { type: "string", description: "The search query" }
              },
              required: ["query"]
            }
          }
        }],
        tool_choice: "auto"
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(response);
      const processingTime = Date.now() - startTime;

      // Ensure we have the expected structure
      if (!result.siteAnalysis || !result.rankedUrls || !Array.isArray(result.rankedUrls)) {
        throw new Error('Invalid response structure from AI');
      }

      // Sort by relevance score and take top N
      const sortedUrls = result.rankedUrls
        .sort((a: AnalysisResult, b: AnalysisResult) => b.relevanceScore - a.relevanceScore)
        .slice(0, topCount);

      return {
        rankedUrls: sortedUrls,
        siteAnalysis: result.siteAnalysis,
        processingTime
      };

    } catch (error) {
      console.error('AI Target URL matching failed:', error);
      throw new Error(`Failed to analyze target URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to format results for display
  formatResultsForDisplay(results: AnalysisResult[]): string {
    return results.map((result, index) => {
      const emoji = result.confidenceLevel === 'high' ? '🟢' : 
                   result.confidenceLevel === 'medium' ? '🟡' : '🔴';
      
      return `${index + 1}. ${emoji} ${result.url}
   Score: ${result.relevanceScore}/100
   Reasoning: ${result.reasoning}
   Topics: ${result.topicalOverlap.join(', ')}`;
    }).join('\n\n');
  }
}

// Create a singleton instance but initialize lazily
let instance: AITargetUrlMatcher | null = null;

export const aiTargetUrlMatcher = {
  analyzeAndRankTargetUrls: async (...args: Parameters<AITargetUrlMatcher['analyzeAndRankTargetUrls']>) => {
    if (!instance) {
      instance = new AITargetUrlMatcher();
    }
    return instance.analyzeAndRankTargetUrls(...args);
  },
  formatResultsForDisplay: (...args: Parameters<AITargetUrlMatcher['formatResultsForDisplay']>) => {
    if (!instance) {
      instance = new AITargetUrlMatcher();
    }
    return instance.formatResultsForDisplay(...args);
  }
};