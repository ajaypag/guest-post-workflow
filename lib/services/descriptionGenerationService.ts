import OpenAI from 'openai';

interface DescriptionGenerationResult {
  description: string;
  success: boolean;
  error?: string;
  promptId?: string;
  conversationId?: string;
}

/**
 * Generate description for a given target URL using OpenAI Response API
 * Uses a single prompt (no follow-up required) for site qualification
 */
export async function generateDescription(targetUrl: string): Promise<DescriptionGenerationResult> {
  try {
    console.log('🔍 generateDescription called with URL:', targetUrl);
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('🔴 Missing OPENAI_API_KEY environment variable');
      throw new Error('OpenAI API key not configured');
    }

    console.log('🔑 OpenAI API key found, initializing client...');

    // Initialize OpenAI client inside the function to avoid build-time issues
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🟡 OpenAI client initialized, starting description generation...');

    // Single prompt call for URL description generation
    const input = targetUrl;
    
    console.log('🚀 Making OpenAI Responses API call for description...');
    
    const response = await openai.responses.create({
      model: "o3",
      prompt: { 
        id: "pmpt_687320ae29748193b407cc07bd0a683f0605e5d920c44630",
        version: "1"
      },
      input: input,
      reasoning: { effort: "high" },
      store: true
    });

    console.log('✅ Description generation response received:', {
      id: response.id,
      status: response.status,
      contentLength: response.output_text?.length || 0
    });

    // Extract the description from the response
    const description = parseDescriptionFromResponse(response.output_text || '');

    return {
      description,
      success: true,
      promptId: "pmpt_687320ae29748193b407cc07bd0a683f0605e5d920c44630",
      conversationId: response.id
    };

  } catch (error: any) {
    console.error('Error generating description:', error);
    
    return {
      description: '',
      success: false,
      error: error.message || 'Unknown error occurred',
      promptId: "pmpt_687320ae29748193b407cc07bd0a683f0605e5d920c44630"
    };
  }
}

/**
 * Parse and clean the AI-generated description from the response
 * Handles various formats and removes unnecessary content
 */
function parseDescriptionFromResponse(content: string): string {
  try {
    console.log('🔍 Parsing description from content:', content.substring(0, 200) + '...');
    
    // First, check if it looks like an error message
    const errorIndicators = ['error', 'failed', 'sorry', 'unable', 'cannot', 'issue', 'problem'];
    if (errorIndicators.some(indicator => content.toLowerCase().includes(indicator))) {
      console.warn('⚠️ Response appears to contain error message');
    }
    
    // Clean up the content
    let description = content.trim();
    
    // Remove common prefixes that AI might add
    const prefixesToRemove = [
      'description:',
      'site description:',
      'url description:',
      'this url',
      'this site',
      'this page',
      'the url',
      'the site',
      'the page'
    ];
    
    for (const prefix of prefixesToRemove) {
      const regex = new RegExp(`^${prefix}\\s*:?\\s*`, 'i');
      description = description.replace(regex, '');
    }
    
    // Remove markdown formatting
    description = description.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
    description = description.replace(/\*(.*?)\*/g, '$1');     // Remove italic
    description = description.replace(/#{1,6}\s+/g, '');       // Remove headers
    description = description.replace(/```[\s\S]*?```/g, '');  // Remove code blocks
    description = description.replace(/`([^`]+)`/g, '$1');     // Remove inline code
    
    // Clean up multiple spaces and newlines
    description = description.replace(/\s+/g, ' ');
    description = description.replace(/\n+/g, ' ');
    
    // Trim and ensure proper sentence ending
    description = description.trim();
    
    // If description doesn't end with punctuation, add a period
    if (description && !description.match(/[.!?]$/)) {
      description += '.';
    }
    
    // Limit description length (500 characters should be plenty)
    if (description.length > 500) {
      description = description.substring(0, 497) + '...';
    }
    
    console.log('✅ Final parsed description:', description);
    
    if (!description || description.length < 10) {
      console.warn('⚠️ No valid description extracted from response');
      return 'No description available';
    }
    
    return description;
    
  } catch (error) {
    console.error('Error parsing description from response:', error);
    return 'Description parsing failed';
  }
}

/**
 * Validate if a description looks reasonable
 */
export function validateDescription(description: string): boolean {
  if (!description || description.trim().length < 10) {
    return false;
  }
  
  const invalidIndicators = [
    'error',
    'failed',
    'parsing failed',
    'no description available'
  ];
  
  return !invalidIndicators.some(indicator => 
    description.toLowerCase().includes(indicator.toLowerCase())
  );
}