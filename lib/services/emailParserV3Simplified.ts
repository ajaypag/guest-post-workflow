import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { createEmailParserAgent } from '@/lib/agents/emailParserV3Agent';
import { getWebsiteMetadata, formatMetadataForPrompt } from './websiteMetadataService';

export interface SimplifiedParsedEmailData {
  hasOffer: boolean;
  publisher?: {
    email: string;
    contactName?: string;
    companyName?: string;
    phone?: string;
    websites?: string[];
    paymentMethods?: string[];
    paymentTerms?: string;
  };
  websites?: Array<{
    domain: string;
    categories?: string[];
    niche?: string[];
    suggestedNewNiches?: string[];
    websiteType?: string[];
    totalTraffic?: number;
    domainRating?: number;
    internalNotes?: string;
  }>;
  offerings?: Array<{
    offeringType: 'guest_post' | 'link_insertion';
    basePrice?: number;
    currency?: string;
    turnaroundDays?: number;
    minWordCount?: number;
    maxWordCount?: number;
    requirements?: {
      acceptsDoFollow?: boolean;
      requiresAuthorBio?: boolean;
      maxLinksPerPost?: number;
      contentRequirements?: string;
      prohibitedTopics?: string;
      authorBioRequirements?: string;
      linkRequirements?: string;
      imagesRequired?: boolean;
      minImages?: number;
    };
  }>;
  extractionMetadata?: {
    confidence?: number;
    extractionNotes?: string;
    ambiguousFields?: string[];
    keyQuotes?: string[];
  };
  rawExtraction?: string;
}


export class EmailParserV3Simplified {
  async parseEmail(htmlContent: string): Promise<SimplifiedParsedEmailData> {
    try {
      // Strip HTML to get plain text
      const textContent = htmlContent
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Truncate if too long (GPT-4 can handle ~8k tokens)
      const maxLength = 4000;
      const truncatedContent = textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '... [truncated]'
        : textContent;

      console.log('🤖 Parsing email with o3-2025-04-16 model (with web search)...');
      
      // Fetch current metadata from database
      const metadata = await getWebsiteMetadata();
      const metadataPrompt = formatMetadataForPrompt(metadata);
      
      // Create agent with dynamic metadata
      const emailParserAgent = createEmailParserAgent(metadataPrompt);
      
      // Create provider and runner
      const provider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const runner = new Runner({
        modelProvider: provider,
        tracingDisabled: true
      });
      
      // Run the agent
      const result = await runner.run(emailParserAgent, [
        { 
          role: 'user', 
          content: `Extract publisher and website information from this email reply:

${truncatedContent}

IMPORTANT: Use web search to analyze each website domain and determine its categories, niche, and type based on actual content.`
        }
      ], {
        stream: false,
        maxTurns: 1
      });
      
      await result.finalOutput;
      
      // Get the response from conversation history
      const conversationHistory = (result as any).history;
      console.log('📊 Conversation history length:', conversationHistory?.length);
      
      const lastAssistantMessage = conversationHistory
        ?.filter((msg: any) => msg.role === 'assistant')
        ?.pop();
      
      if (!lastAssistantMessage) {
        console.error('❌ No assistant message in history:', conversationHistory);
        throw new Error('No response from email parser agent');
      }
      
      console.log('🤖 Assistant message type:', typeof lastAssistantMessage.content);
      console.log('📝 Assistant content:', JSON.stringify(lastAssistantMessage.content).substring(0, 500));
      
      // Extract text content from the assistant message
      let rawContent = '{"hasOffer": false}';
      if (typeof lastAssistantMessage.content === 'string') {
        rawContent = lastAssistantMessage.content;
      } else if (Array.isArray(lastAssistantMessage.content)) {
        // Look for output_text type in the array
        const outputText = lastAssistantMessage.content.find((item: any) => item.type === 'output_text');
        if (outputText && outputText.text) {
          rawContent = outputText.text;
          console.log('✅ Found output_text in content array');
        } else {
          // Fallback to text type
          const textContent = lastAssistantMessage.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
          if (textContent) rawContent = textContent;
        }
      } else if (lastAssistantMessage.content && typeof lastAssistantMessage.content === 'object') {
        // Handle object format
        console.log('📦 Content is object, checking for text property...');
        if (lastAssistantMessage.content.text) {
          rawContent = lastAssistantMessage.content.text;
        } else {
          rawContent = JSON.stringify(lastAssistantMessage.content);
        }
      }
      
      // Clean the response content to extract JSON
      const cleanedContent = rawContent
        .replace(/^```json\s*/, '') // Remove opening code block
        .replace(/\s*```$/, '') // Remove closing code block
        .replace(/^```\s*/, '') // Remove any other opening code block
        .trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('❌ JSON parse error. Attempting to fix truncated JSON...');
        
        // Try to fix common JSON issues
        let fixedContent = cleanedContent;
        
        // If it's truncated, try to close open structures
        if (!fixedContent.endsWith('}')) {
          // Count open vs closed braces
          const openBraces = (fixedContent.match(/{/g) || []).length;
          const closeBraces = (fixedContent.match(/}/g) || []).length;
          const openBrackets = (fixedContent.match(/\[/g) || []).length;
          const closeBrackets = (fixedContent.match(/\]/g) || []).length;
          
          // Add missing closing brackets/braces
          fixedContent += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
          fixedContent += '}'.repeat(Math.max(0, openBraces - closeBraces));
        }
        
        try {
          parsed = JSON.parse(fixedContent);
          console.log('✅ Successfully recovered truncated JSON');
        } catch (secondError) {
          console.error('❌ Failed to parse JSON even after fix attempt');
          console.error('Raw content:', cleanedContent.substring(0, 500) + '...');
          
          // Return a safe default
          return {
            hasOffer: false,
            publisher: { email: null },
            websites: [],
            offerings: [],
            extractionMetadata: {
              error: 'JSON parsing failed',
              rawContent: cleanedContent.substring(0, 1000)
            }
          };
        }
      }
      
      // Add raw extraction for debugging
      parsed.rawExtraction = rawContent;

      // Validate and clean the response
      if (parsed.hasOffer) {
        // Ensure required fields exist
        if (!parsed.publisher?.email) {
          console.warn('⚠️ No publisher email found in parsed data');
          parsed.hasOffer = false;
        }
        
        // Clean domains if present
        if (parsed.websites && Array.isArray(parsed.websites)) {
          parsed.websites = parsed.websites.map((website: any) => ({
            ...website,
            domain: this.cleanDomain(website.domain)
          }));
        }

        // Clean publisher website domains
        if (parsed.publisher?.websites && Array.isArray(parsed.publisher.websites)) {
          parsed.publisher.websites = parsed.publisher.websites.map((domain: string) => 
            this.cleanDomain(domain)
          );
        }
      }

      console.log(`✅ Simplified parsing complete. Has offer: ${parsed.hasOffer}`);
      return parsed;

    } catch (error) {
      console.error('❌ Error parsing email:', error);
      
      // Return safe default on error
      return {
        hasOffer: false,
        rawExtraction: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clean and normalize domain
   */
  private cleanDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '') // Remove protocol
      .replace(/^www\./, '') // Remove www
      .replace(/\/.*$/, '') // Remove path
      .trim();
  }
}