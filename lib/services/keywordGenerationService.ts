import OpenAI from 'openai';

interface KeywordGenerationResult {
  keywords: string[];
  success: boolean;
  error?: string;
  promptId?: string;
  conversationId?: string;
}

/**
 * Generate keywords for a given target URL using OpenAI Response API
 * Follows the two-step process: initial keyword generation + listicle follow-up
 */
export async function generateKeywords(targetUrl: string): Promise<KeywordGenerationResult> {
  try {
    console.log('🔍 generateKeywords called with URL:', targetUrl);
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('🔴 Missing OPENAI_API_KEY environment variable');
      throw new Error('OpenAI API key not configured');
    }

    console.log('🔑 OpenAI API key found, initializing client...');

    // Initialize OpenAI client inside the function to avoid build-time issues
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🟡 OpenAI client initialized, starting keyword generation...');

    // Step 1: Initial keyword generation with the provided prompt ID
    const initialInput = targetUrl;
    
    console.log('🚀 Making initial OpenAI Responses API call...');
    
    const initialResponse = await openai.responses.create({
      model: "o3",
      prompt: { 
        id: "pmpt_6872f2263c98819590f881b5ec7212aa087e433dc13d1236" 
      },
      input: initialInput,
      reasoning: { effort: "high" },
      store: true
    });

    console.log('✅ Initial keyword generation response received:', {
      id: initialResponse.id,
      status: initialResponse.status,
      contentLength: initialResponse.output_text?.length || 0
    });

    // Step 2: Follow-up question about listicles
    const followUpInput = "And what about listicles that this site would show up on? What various themes could those listicles be about? Think about one word themes. While it's okay to be specific, keep in mind that oftentimes this is an industry that overlaps with many other industries, or it may serve a different purpose. Maybe it's a good thing to gift. For example, maybe it's a good thing for hobbyists - think wide as well. Merge your output with the output from above.";
    
    console.log('🚀 Making follow-up OpenAI Responses API call...');
    
    const followUpResponse = await openai.responses.create({
      model: "o3",
      input: followUpInput,
      previous_response_id: initialResponse.id,
      reasoning: { effort: "high" },
      store: true
    });

    console.log('✅ Follow-up listicle response received:', {
      id: followUpResponse.id,
      status: followUpResponse.status,
      contentLength: followUpResponse.output_text?.length || 0
    });

    // Parse the final response to extract keywords
    const finalContent = followUpResponse.output_text || '';
    const keywords = parseKeywordsFromResponse(finalContent);

    return {
      keywords,
      success: true,
      promptId: "pmpt_6872f2263c98819590f881b5ec7212aa087e433dc13d1236",
      conversationId: followUpResponse.id
    };

  } catch (error: any) {
    console.error('Error generating keywords:', error);
    
    return {
      keywords: [],
      success: false,
      error: error.message || 'Unknown error occurred',
      promptId: "pmpt_6872f2263c98819590f881b5ec7212aa087e433dc13d1236"
    };
  }
}

/**
 * Parse comma-separated keywords from AI response
 * Handles various formats and cleans up the keywords
 */
function parseKeywordsFromResponse(content: string): string[] {
  try {
    // Look for comma-separated lists in the content
    const lines = content.split('\n');
    let keywordLines: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and obvious non-keyword content
      if (!trimmedLine || 
          trimmedLine.length < 3 || 
          trimmedLine.includes('?') ||
          trimmedLine.toLowerCase().includes('listicle') ||
          trimmedLine.toLowerCase().includes('should') ||
          trimmedLine.toLowerCase().includes('analysis') ||
          trimmedLine.startsWith('#') ||
          trimmedLine.startsWith('*')) {
        continue;
      }
      
      // Look for lines with commas (likely keyword lists)
      if (trimmedLine.includes(',')) {
        keywordLines.push(trimmedLine);
      }
      // Also capture single keywords that don't have commas
      else if (trimmedLine.length > 5 && trimmedLine.length < 100) {
        keywordLines.push(trimmedLine);
      }
    }
    
    // Parse keywords from the identified lines
    const allKeywords: string[] = [];
    
    for (const line of keywordLines) {
      if (line.includes(',')) {
        // Split by comma and clean up
        const keywords = line.split(',').map(k => k.trim()).filter(k => k.length > 0);
        allKeywords.push(...keywords);
      } else {
        // Single keyword
        allKeywords.push(line.trim());
      }
    }
    
    // Clean up and deduplicate keywords
    const cleanedKeywords = allKeywords
      .map(keyword => keyword.trim())
      .map(keyword => keyword.replace(/^["']|["']$/g, '')) // Remove quotes
      .map(keyword => keyword.replace(/^\d+\.\s*/, '')) // Remove list numbers
      .map(keyword => keyword.replace(/^-\s*/, '')) // Remove list dashes
      .filter(keyword => keyword.length > 2 && keyword.length < 150) // Reasonable length
      .filter((keyword, index, arr) => arr.indexOf(keyword) === index) // Deduplicate
      .slice(0, 20); // Limit to 20 keywords max
    
    console.log('Parsed keywords:', cleanedKeywords);
    
    return cleanedKeywords;
    
  } catch (error) {
    console.error('Error parsing keywords from response:', error);
    return [];
  }
}

/**
 * Format keywords as comma-separated string for database storage
 */
export function formatKeywordsForStorage(keywords: string[]): string {
  return keywords.join(', ');
}

/**
 * Parse keywords from database storage format back to array
 */
export function parseKeywordsFromStorage(keywordsString: string): string[] {
  if (!keywordsString || keywordsString.trim() === '') {
    return [];
  }
  
  return keywordsString
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}