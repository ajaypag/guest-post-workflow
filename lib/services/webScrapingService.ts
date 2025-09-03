/**
 * Web Scraping Service
 * Handles all web scraping and Google search operations using Serper API
 * Includes rate limiting to prevent API abuse
 */

interface ScrapeResult {
  success: boolean;
  html?: string;
  markdown?: string;
  text?: string;
  title?: string;
  statusCode?: number;
  error?: string;
}

interface SearchResult {
  indexed: boolean | null;
  resultCount: number;
  error?: string;
}

interface SerperScrapeResponse {
  text?: string;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
  statusCode?: number;
  credits?: number;
  error?: string;
}

interface SerperSearchResponse {
  organic?: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  searchParameters?: {
    q: string;
  };
  error?: string;
}

export class WebScrapingService {
  private static readonly API_KEY = process.env.SERPER_API_KEY || '555225bf71d614f7a908566279b5ddf723021ad8';
  private static readonly SCRAPE_URL = 'https://scrape.serper.dev';
  private static readonly SEARCH_URL = 'https://google.serper.dev/search';
  
  // Rate limiting
  private static requestTimestamps: number[] = [];
  private static readonly RATE_LIMIT = 10; // 10 requests per minute
  private static readonly RATE_WINDOW = 60000; // 1 minute in milliseconds

  /**
   * Check and enforce rate limiting
   */
  private static async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.RATE_WINDOW
    );
    
    // Check if we've hit the rate limit
    if (this.requestTimestamps.length >= this.RATE_LIMIT) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = this.RATE_WINDOW - (now - oldestRequest);
      
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before making another request.`
      );
    }
    
    // Add current timestamp
    this.requestTimestamps.push(now);
  }

  /**
   * Scrape a webpage and extract content
   */
  static async scrapeArticle(url: string): Promise<ScrapeResult> {
    try {
      // Check rate limit
      await this.checkRateLimit();
      
      console.log(`[WebScrapingService] Scraping URL: ${url}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(this.SCRAPE_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          includeMarkdown: true,
          includeHtml: true
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WebScrapingService] Scrape failed: ${response.status} - ${errorText}`);
        
        return {
          success: false,
          error: `Scraping failed: ${response.status} - ${errorText}`,
          statusCode: response.status
        };
      }
      
      const data: SerperScrapeResponse = await response.json();
      
      if (data.error) {
        return {
          success: false,
          error: data.error
        };
      }
      
      console.log(`[WebScrapingService] Successfully scraped ${url}`);
      
      return {
        success: true,
        html: data.html || '',
        markdown: data.markdown || '',
        text: data.text || '',
        title: data.metadata?.title || '',
        statusCode: data.statusCode || 200
      };
      
    } catch (error) {
      console.error(`[WebScrapingService] Error scraping ${url}:`, error);
      
      if (error instanceof Error) {
        // Check if it's a rate limit error
        if (error.message.includes('Rate limit')) {
          return {
            success: false,
            error: error.message
          };
        }
        
        // Check if it's a timeout
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - the page took too long to load'
          };
        }
      }
      
      return {
        success: false,
        error: `Failed to scrape page: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if a URL is indexed in Google
   */
  static async checkGoogleIndexed(url: string): Promise<SearchResult> {
    try {
      // Check rate limit
      await this.checkRateLimit();
      
      console.log(`[WebScrapingService] Checking if indexed: ${url}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(this.SEARCH_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: `site:${url}`
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WebScrapingService] Search failed: ${response.status} - ${errorText}`);
        
        return {
          indexed: null,
          resultCount: 0,
          error: `Search failed: ${response.status}`
        };
      }
      
      const data: SerperSearchResponse = await response.json();
      
      if (data.error) {
        return {
          indexed: null,
          resultCount: 0,
          error: data.error
        };
      }
      
      // Check if the exact URL appears in the search results
      const results = data.organic || [];
      const isIndexed = results.length > 0 && results.some(result => 
        result.link === url || 
        result.link === url.replace(/\/$/, '') || // Handle trailing slash
        result.link === url + '/' // Handle missing trailing slash
      );
      
      console.log(`[WebScrapingService] Index check complete: ${isIndexed ? 'Indexed' : 'Not indexed'} (${results.length} results)`);
      
      return {
        indexed: isIndexed,
        resultCount: results.length
      };
      
    } catch (error) {
      console.error(`[WebScrapingService] Error checking index for ${url}:`, error);
      
      if (error instanceof Error) {
        // Check if it's a rate limit error
        if (error.message.includes('Rate limit')) {
          return {
            indexed: null,
            resultCount: 0,
            error: error.message
          };
        }
        
        // Check if it's a timeout
        if (error.name === 'AbortError') {
          return {
            indexed: null,
            resultCount: 0,
            error: 'Request timeout'
          };
        }
      }
      
      return {
        indexed: null,
        resultCount: 0,
        error: `Failed to check index: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Reset rate limiting (useful for testing)
   */
  static resetRateLimit(): void {
    this.requestTimestamps = [];
  }

  /**
   * Get current rate limit status
   */
  static getRateLimitStatus(): { requestsUsed: number; requestsRemaining: number; resetIn: number } {
    const now = Date.now();
    
    // Remove expired timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < this.RATE_WINDOW
    );
    
    const requestsUsed = this.requestTimestamps.length;
    const requestsRemaining = this.RATE_LIMIT - requestsUsed;
    const resetIn = requestsUsed > 0 
      ? Math.ceil((this.RATE_WINDOW - (now - this.requestTimestamps[0])) / 1000)
      : 0;
    
    return {
      requestsUsed,
      requestsRemaining,
      resetIn
    };
  }
}