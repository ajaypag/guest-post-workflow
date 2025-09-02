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
    paymentEmail?: string;
  };
  websites?: Array<{
    domain: string;
    categories?: string[];
    niche?: string[];
    suggestedNewNiches?: string[];
    websiteType?: string[];
    domainRating?: number;
    internalNotes?: string;
  }>;
  offerings?: Array<{
    websiteDomain: string; // Which website this offering applies to
    offeringType: 'guest_post' | 'link_insertion' | 'link_exchange';
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
      samplePostUrl?: string;
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
  async parseEmail(
    htmlContent: string, 
    outreachSenderEmail?: string,
    emailHeaders?: {
      from?: string;
      to?: string;
      subject?: string;
    }
  ): Promise<SimplifiedParsedEmailData> {
    try {
      // Process HTML to preserve important links while cleaning text
      let processedContent = htmlContent
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        
        // Preserve hyperlinks: <a href="URL">text</a> → text (URL)
        .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
        
        // Remove other HTML tags
        .replace(/<[^>]*>/g, ' ')
        
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();

      // Add email headers if available
      let textContent = processedContent;
      if (emailHeaders) {
        const headerText = [
          emailHeaders.from ? `From: ${emailHeaders.from}` : '',
          emailHeaders.to ? `To: ${emailHeaders.to}` : '',
          emailHeaders.subject ? `Subject: ${emailHeaders.subject}` : ''
        ].filter(Boolean).join('\n');
        
        textContent = headerText + (headerText ? '\n\n' : '') + processedContent;
      }

      // Truncate if too long (GPT-4 can handle ~8k tokens)
      const maxLength = 4000;
      const truncatedContent = textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '... [truncated]'
        : textContent;

      console.log('🤖 Parsing email with o3-2025-04-16 model (with web search)...');
      console.log('📧 Email content being sent to AI:');
      console.log('=' .repeat(50));
      console.log(truncatedContent.substring(0, 1000));
      console.log('=' .repeat(50));
      
      // Fetch current metadata from database
      const metadata = await getWebsiteMetadata();
      const metadataPrompt = formatMetadataForPrompt(metadata);
      
      // Create agent with dynamic metadata and sender context
      const emailParserAgent = createEmailParserAgent(metadataPrompt, outreachSenderEmail);
      
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
      
      // Parse JSON with better error handling
      let parsed;
      try {
        parsed = JSON.parse(cleanedContent);
      } catch (parseError) {
        // Try to fix common JSON issues
        console.log('⚠️ Initial parse failed, attempting to fix JSON...');
        
        // Try multiple fixes for common JSON issues
        let fixedContent = cleanedContent;
        
        // Fix 1: Handle unescaped quotes in strings
        // Look for patterns like ": "text with "quotes" inside"
        fixedContent = fixedContent.replace(/:\s*"([^"]*)"([^",\}]*)"/g, (match, p1, p2) => {
          // If p2 contains quotes, they need escaping
          const fixed = `: "${p1}\\"${p2}"`;
          return fixed;
        });
        
        // Fix 2: Escape newlines, tabs, etc.
        fixedContent = fixedContent
          .replace(/([^\\])\\n/g, '$1\\\\n') // Fix unescaped \n
          .replace(/([^\\])\\t/g, '$1\\\\t') // Fix unescaped \t
          .replace(/([^\\])\\r/g, '$1\\\\r'); // Fix unescaped \r
        
        try {
          parsed = JSON.parse(fixedContent);
          console.log('✅ JSON fixed and parsed successfully');
        } catch (secondError) {
          console.error('❌ JSON Parse Error after fix attempt:', secondError);
          console.log('📝 Raw content that failed to parse:', cleanedContent);
          console.log('📝 Content preview (first 1000 chars):', cleanedContent.substring(0, 1000));
          
          // Return safe fallback with error info
          return {
            hasOffer: false,
            rawExtraction: cleanedContent,
            extractionMetadata: {
              extractionNotes: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
              confidence: 0,
              keyQuotes: ['Parse error - check rawExtraction field for AI response']
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