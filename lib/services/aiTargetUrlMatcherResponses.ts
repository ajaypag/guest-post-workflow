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
      const instructions = `You are an expert SEO analyst specializing in guest post placement and topical relevance analysis. Your task is to analyze a guest post website and determine which client target URLs would be most relevant for guest posts on that site.

You have access to web search capabilities. Use them to:
1. Search for and analyze the guest post site's homepage
2. Look at their blog or articles section  
3. Understand their main topics, categories, and content themes
4. Check their recent posts to understand what they typically publish

Then match this against the client's target URLs based on:
- Topical relevance and overlap
- Content compatibility
- Natural link placement opportunities
- Likelihood of editorial acceptance

IMPORTANT: You MUST use web search to gather real information about the guest post site before making recommendations.`;

      const userInput = `Analyze this guest post opportunity:

GUEST POST SITE: ${guestPostSite}

TASK:
1. First, use web search to analyze ${guestPostSite}:
   - Search for "${guestPostSite} homepage"
   - Search for "${guestPostSite} blog topics"
   - Search for "${guestPostSite} recent articles"
   - Understand their content focus and audience

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
  "siteAnalysis": "Detailed summary of what ${guestPostSite} is about based on your web search findings",
  "rankedUrls": [
    {
      "url": "the target URL",
      "relevanceScore": 95, // 0-100 score based on actual site content
      "reasoning": "Specific reasoning based on actual site content you found",
      "topicalOverlap": ["topic1", "topic2"], // Actual topics from the site
      "confidenceLevel": "high" // high/medium/low based on search results
    }
    // ... rank ALL URLs from most to least relevant
  ]
}

Your relevance scores should be based on:
- 80-100: Strong topical match with content frequently published on the site
- 60-79: Good topical adjacency, related to site's content
- 40-59: Some connection but not primary focus
- 20-39: Weak connection, might work with creative angle
- 0-19: No clear connection to site's content

Be specific in your reasoning and reference actual content/topics you found on the site.`;

      console.log(`🤖 Starting AI analysis of ${guestPostSite} against ${targetPages.length} target URLs using Responses API...`);

      // Make a direct HTTP request to the Responses API
      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o", // Using gpt-4o which supports tools
          instructions: instructions,
          input: userInput,
          temperature: 0.3,
          text: {
            format: {
              type: "json_object"
            }
          },
          tools: [
            {
              type: "web_search" // OpenAI's built-in web search tool
            }
          ],
          tool_choice: "auto" // Let the model decide when to use web search
        })
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const response = await apiResponse.json();

      // Wait for the response to complete if needed
      let finalResponse = response;
      
      // Check if we need to poll for completion
      if (response.status === 'in_progress' || response.status === 'queued') {
        // Poll for completion
        const maxAttempts = 60; // 60 seconds max
        let attempts = 0;
        
        while ((finalResponse.status === 'in_progress' || finalResponse.status === 'queued') && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          
          // Get the updated response via direct HTTP request
          const pollResponse = await fetch(`https://api.openai.com/v1/responses/${response.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (!pollResponse.ok) {
            throw new Error(`Failed to poll response: ${await pollResponse.text()}`);
          }
          
          finalResponse = await pollResponse.json();
          attempts++;
        }
        
        if (finalResponse.status !== 'completed') {
          throw new Error(`Response did not complete in time. Status: ${finalResponse.status}`);
        }
      }

      // Extract the content from the response
      const outputText = finalResponse.output_text;
      if (!outputText) {
        // Fallback to checking output array
        const messageOutput = finalResponse.output?.find((item: any) => item.type === 'message');
        const textContent = messageOutput?.content?.find((c: any) => c.type === 'output_text');
        
        if (!textContent?.text) {
          throw new Error('No response content from AI');
        }
        
        const result = JSON.parse(textContent.text);
        return this.processResults(result, topCount, startTime);
      }

      const result = JSON.parse(outputText);
      return this.processResults(result, topCount, startTime);

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

  private processResults(result: any, topCount: number, startTime: number) {
    const processingTime = Date.now() - startTime;

    // Ensure we have the expected structure
    if (!result.siteAnalysis || !result.rankedUrls || !Array.isArray(result.rankedUrls)) {
      throw new Error('Invalid response structure from AI');
    }

    // Sort by relevance score and take top N
    const sortedUrls = result.rankedUrls
      .sort((a: AnalysisResult, b: AnalysisResult) => b.relevanceScore - a.relevanceScore)
      .slice(0, topCount);

    console.log(`✅ Analysis complete. Top URL scored ${sortedUrls[0]?.relevanceScore || 0}/100`);

    return {
      rankedUrls: sortedUrls,
      siteAnalysis: result.siteAnalysis,
      processingTime
    };
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

export const aiTargetUrlMatcherResponses = {
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