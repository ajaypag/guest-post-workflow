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
    const followUpInput = "And what about listicles that this site would show up on? What various themes could those listicles be about? Think about one word themes. While it's okay to be specific, keep in mind that oftentimes this is an industry that overlaps with many other industries, or it may serve a different purpose. Examples: Maybe it's a good thing to gift or a good thing for hobbyists - so think about what the target url would be a good thing for as well. Merge your output with the output from previous so that its a single comma separated list.";
    
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
    console.log('🔍 Parsing keywords from content:', content.substring(0, 200) + '...');
    
    // First, check if it looks like an error message
    const errorIndicators = ['error', 'failed', 'sorry', 'unable', 'cannot', 'issue', 'problem'];
    if (errorIndicators.some(indicator => content.toLowerCase().includes(indicator))) {
      console.warn('⚠️ Response appears to contain error message');
    }
    
    // Look for the most comma-rich line (likely the keyword list)
    const lines = content.split('\n');
    let bestLine = '';
    let maxCommas = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      const commaCount = (trimmedLine.match(/,/g) || []).length;
      
      // Skip obvious non-keyword content
      if (!trimmedLine || 
          trimmedLine.length < 10 ||
          trimmedLine.includes('?') ||
          trimmedLine.toLowerCase().includes('here are') ||
          trimmedLine.toLowerCase().includes('these are') ||
          trimmedLine.toLowerCase().includes('listicle') ||
          trimmedLine.toLowerCase().includes('themes') ||
          trimmedLine.toLowerCase().includes('analysis') ||
          trimmedLine.toLowerCase().includes('output') ||
          trimmedLine.toLowerCase().includes('response') ||
          trimmedLine.startsWith('#') ||
          trimmedLine.startsWith('**') ||
          trimmedLine.includes(':::')) {
        continue;
      }
      
      if (commaCount > maxCommas) {
        maxCommas = commaCount;
        bestLine = trimmedLine;
      }
    }
    
    // If we didn't find a good comma-separated line, try to extract from all content
    if (!bestLine || maxCommas < 3) {
      console.log('🔍 No clear keyword line found, extracting from all content');
      bestLine = content.replace(/\n/g, ' ');
    }
    
    console.log('🎯 Best keyword line found:', bestLine.substring(0, 150) + '...');
    
    // Split by commas and clean up each keyword
    const rawKeywords = bestLine.split(',');
    
    const cleanedKeywords = rawKeywords
      .map(keyword => keyword.trim())
      .map(keyword => keyword.replace(/^["'`]|["'`]$/g, '')) // Remove quotes
      .map(keyword => keyword.replace(/^\d+\.\s*/, '')) // Remove list numbers (1. 2. etc)
      .map(keyword => keyword.replace(/^[-•*]\s*/, '')) // Remove bullet points
      .map(keyword => keyword.replace(/^\w+:\s*/, '')) // Remove labels like "Keywords:"
      .map(keyword => keyword.replace(/\s+/g, ' ')) // Normalize whitespace
      .map(keyword => keyword.replace(/[^\w\s-]/g, '')) // Remove special chars except hyphens
      .filter(keyword => {
        const k = keyword.toLowerCase();
        return keyword.length > 2 && 
               keyword.length < 50 && 
               !k.includes('keyword') &&
               !k.includes('theme') &&
               !k.includes('listicle') &&
               !k.includes('output') &&
               !k.includes('response') &&
               !k.includes('merge') &&
               !k.includes('above') &&
               !k.includes('previous') &&
               !k.match(/^\d+$/) && // No pure numbers
               k.split(' ').length <= 4; // Max 4 words
      })
      .filter((keyword, index, arr) => arr.indexOf(keyword) === index) // Deduplicate
      .slice(0, 30); // Limit to 30 keywords max
    
    console.log('✅ Final parsed keywords:', cleanedKeywords);
    
    if (cleanedKeywords.length === 0) {
      console.warn('⚠️ No valid keywords extracted from response');
    }
    
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