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

You have web search capabilities. Use them to research the guest post site and understand what topics they cover.

Then select the 20 most relevant client URLs that would be suitable for guest posts on that site.

Return ONLY the URLs, one per line. Nothing else.`;

      const userInput = `Guest post site: ${guestPostSite}

First, search the web to understand what topics ${guestPostSite} covers.

Then, from this list of client URLs, select the 20 most relevant ones for guest posting on ${guestPostSite}:

${targetPages.map((page) => {
  const keywords = page.keywords?.join(', ') || '';
  const description = page.description || '';
  return `${page.url} - Keywords: ${keywords} - Description: ${description}`;
}).join('\n')}

Return ONLY the selected URLs, one per line. No explanations, no numbering, just the URLs.`;

      console.log(`🤖 Starting AI analysis of ${guestPostSite} against ${targetPages.length} target URLs using Responses API...`);

      // Make a direct HTTP request to the Responses API
      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "o3",
          instructions: instructions,
          input: userInput,
          tools: [
            {
              type: "web_search"
            }
          ]
        })
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const responseText = await apiResponse.text();
      console.log('Raw API response:', responseText.substring(0, 200) + '...');
      
      let response;
      try {
        response = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`API returned non-JSON response: ${responseText.substring(0, 100)}...`);
      }

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
      let urlList: string;
      
      if (!outputText) {
        // Fallback to checking output array
        const messageOutput = finalResponse.output?.find((item: any) => item.type === 'message');
        const textContent = messageOutput?.content?.find((c: any) => c.type === 'output_text');
        
        if (!textContent?.text) {
          throw new Error('No response content from AI');
        }
        
        urlList = textContent.text.trim();
      } else {
        urlList = outputText.trim();
      }

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