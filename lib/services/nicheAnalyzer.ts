import { Agent, Runner } from '@openai/agents';
import { webSearchTool, OpenAIProvider } from '@openai/agents-openai';
import { z } from 'zod';

/**
 * Enhanced Website Niche Analyzer using O3
 * 
 * This analyzer:
 * 1. Visits websites to determine their actual niches and categories
 * 2. Suggests new niches/categories that aren't in the current list
 * 3. Provides reasoning for its determinations
 */

// Create the enhanced analyzer agent
export function createNicheAnalyzerAgent(currentNiches: string[], currentCategories: string[]) {
  const nichesList = currentNiches.length > 0 ? currentNiches.join(', ') : 'ERROR: No niches loaded from database';
  const categoriesList = currentCategories.length > 0 ? currentCategories.join(', ') : 'ERROR: No categories loaded from database';

  return new Agent({
    name: 'EnhancedNicheAnalyzer',
    model: 'o3-2025-04-16',
    instructions: `Visit the given website using web search and analyze it comprehensively.

UNDERSTANDING THE HIERARCHY:
- CATEGORIES are broad, overarching classifications (like "Business & Enterprise", "Leisure & Hobbies", "Science & Technology")
- NICHES are more specific, granular topics within those categories (like "Cryptocurrency", "Yoga", "Machine Learning")
- Categories group multiple related niches together

Your task is to:
1. Determine the website's niches from the existing list (specific topics)
2. Determine the website's categories from the existing list (broad classifications)
3. Suggest NEW niches that aren't in the current list if appropriate
4. Suggest NEW categories that aren't in the current list if appropriate
5. Identify the website type

EXISTING NICHES (choose 1-4 that apply) - SPECIFIC TOPICS:
${nichesList}

EXISTING CATEGORIES (choose 1-3 that apply) - BROAD CLASSIFICATIONS:
${categoriesList}

WEBSITE TYPES (choose 1-2):
Blog, News, Magazine, SaaS, eCommerce, Corporate, Agency, Reviews, Service, Community, Educational, Government, Non-profit

IMPORTANT RULES:
- Visit the actual website to analyze real content - don't guess from the domain name
- Be specific and accurate in your categorization
- If you identify niches that would be valuable but aren't in the list, suggest them as new niches
- New niche suggestions should be granular/specific (e.g., "Cryptocurrency", "Mental Health", "Sustainability", "3D Printing", "Veganism")
- New category suggestions should be broad groupings (e.g., "Science & Technology", "Arts & Culture", "Home & Garden", "Society & Politics")
- Include a brief summary of what the website is about
- Explain your reasoning for classifications`,
    tools: [webSearchTool()],
    outputType: z.object({
      domain: z.string(),
      niches: z.array(z.string()).min(1).max(4).describe('From existing list - specific topics'),
      categories: z.array(z.string()).min(1).max(3).describe('From existing list - broad classifications'),
      websiteTypes: z.array(z.string()).min(1).max(2),
      suggestedNewNiches: z.array(z.string()).describe('New granular/specific niches not in current list (empty array if none)'),
      suggestedNewCategories: z.array(z.string()).describe('New broad categories not in current list (empty array if none)'),
      contentSummary: z.string().describe('Brief description of what the website is about'),
      visitedPages: z.array(z.string()),
      reasoning: z.string().describe('Why you chose these classifications and suggestions')
    })
  });
}

/**
 * Analyze a website with enhanced niche detection
 */
export async function analyzeWebsiteEnhanced(
  domain: string,
  currentNiches: string[] = [],
  currentCategories: string[] = []
): Promise<{
  domain: string;
  niches: string[];
  categories: string[];
  websiteTypes: string[];
  suggestedNewNiches?: string[];
  suggestedNewCategories?: string[];
  contentSummary: string;
  visitedPages: string[];
  reasoning: string;
}> {
  // Create OpenAI provider
  const openaiProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Create runner
  const runner = new Runner({
    modelProvider: openaiProvider,
    tracingDisabled: true
  });

  // Create the agent with current niches/categories
  const agent = createNicheAnalyzerAgent(currentNiches, currentCategories);

  // Run the agent
  const messages = [{
    role: 'user' as const,
    content: `Analyze this website and suggest new niches/categories if needed: ${domain}`
  }];

  try {
    console.log(`🤖 Calling O3 for ${domain}...`);
    let result = await runner.run(agent, messages);
    
    // Save raw response for debugging
    const debugFile = `/tmp/o3_response_${Date.now()}.json`;
    await require('fs').promises.writeFile(debugFile, JSON.stringify(result, null, 2));
    console.log(`📊 O3 response saved to: ${debugFile}`);
    
    // The O3 response has a complex structure, extract the actual output
    let output: any = null;
    
    // PRIORITY 1: Check state._currentStep.output first (most reliable location)
    if (result.state && (result.state as any)._currentStep && (result.state as any)._currentStep.output) {
      if (typeof (result.state as any)._currentStep.output === 'string') {
        try {
          output = JSON.parse((result.state as any)._currentStep.output);
          console.log(`✅ Parsed O3 response from result.state._currentStep.output`);
          if (output && output.domain) {
            console.log(`✅ Returning valid analysis for ${output.domain}`);
            return output;
          }
        } catch (e) {
          console.error(`Failed to parse result.state._currentStep.output as JSON`);
        }
      }
    }
    
    // Also check currentStep (sometimes it's this instead of _currentStep)
    if (!output && result.state && (result.state as any).currentStep && (result.state as any).currentStep.output) {
      if (typeof (result.state as any).currentStep.output === 'string') {
        try {
          output = JSON.parse((result.state as any).currentStep.output);
          console.log(`✅ Parsed O3 response from result.state.currentStep.output`);
          if (output && output.domain) {
            console.log(`✅ Returning valid analysis for ${output.domain}`);
            return output;
          }
        } catch (e) {
          console.error(`Failed to parse result.state.currentStep.output as JSON`);
        }
      }
    }
    
    // Try direct output first (simpler structure)
    if (result.output !== undefined) {
      // Check if it's a string that needs parsing
      if (typeof result.output === 'string') {
        try {
          output = JSON.parse(result.output);
          console.log(`✅ Parsed O3 response from result.output string`);
          // If we got valid data, return immediately
          if (output && output.domain) {
            console.log(`✅ Returning valid analysis for ${output.domain}`);
            return output;
          }
        } catch (e) {
          console.error(`Failed to parse result.output as JSON`);
        }
      } else if (Array.isArray(result.output)) {
        // result.output is an array - this is NOT what we want, skip it
        console.log(`⚠️ result.output is an array (O3 tool calls), skipping to check state.currentStep...`);
      } else if (typeof result.output === 'object') {
        // Check if it's an empty object (common case)
        const keys = Object.keys(result.output);
        if (keys.length === 0) {
          console.log(`⚠️ result.output is empty object {}, continuing to check other locations...`);
        } else if ((result.output as any).domain) {
          console.log(`✅ Got valid O3 response from result.output object`);
          return result.output as any;
        } else {
          console.log(`❌ result.output is object with keys [${keys.join(', ')}] but no domain property`);
        }
      }
    }
    
    
    // If not found, check for the complex O3 structure (try both _modelResponses and modelResponses)
    const modelResponses = (result.state as any)?._modelResponses || (result.state as any)?.modelResponses;
    if (!output && result.state && modelResponses && modelResponses.length > 0) {
      const modelResponse = modelResponses[0];
      
      // Check if output has the actual data directly
      if (modelResponse.output) {
        // Sometimes it's a string
        if (typeof modelResponse.output === 'string') {
          try {
            output = JSON.parse(modelResponse.output);
            console.log(`✅ Parsed O3 response from modelResponse.output string`);
          } catch (e) {
            console.error(`Failed to parse modelResponse.output as JSON`);
          }
        }
        // Sometimes it's already an object
        else if (typeof modelResponse.output === 'object' && modelResponse.output.domain) {
          output = modelResponse.output;
          console.log(`✅ Got O3 response from modelResponse.output object`);
        }
        // Sometimes it's an array of messages
        else if (Array.isArray(modelResponse.output)) {
          // Find the last item with content
          for (let i = modelResponse.output.length - 1; i >= 0; i--) {
            const item = modelResponse.output[i];
            
            // Check for content.text pattern
            if (item && item.content && Array.isArray(item.content)) {
              for (const content of item.content) {
                if (content.text) {
                  try {
                    output = JSON.parse(content.text);
                    console.log(`✅ Parsed O3 response from output[${i}].content.text`);
                    break;
                  } catch (e) {
                    // Not JSON, continue
                  }
                }
              }
              if (output) break;
            }
            
            // Check for direct text field
            if (item && item.text) {
              try {
                output = JSON.parse(item.text);
                console.log(`✅ Parsed O3 response from output[${i}].text`);
                break;
              } catch (e) {
                // Not JSON, continue
              }
            }
          }
        }
      }
      
      // Also check modelResponse.output_text
      if (!output && modelResponse.output_text) {
        try {
          output = JSON.parse(modelResponse.output_text);
          console.log(`✅ Parsed O3 response from modelResponse.output_text`);
        } catch (e) {
          console.error(`Failed to parse modelResponse.output_text as JSON`);
        }
      }
    }
    
    if (!output) {
      // Log structure for debugging
      console.error(`Could not extract output from O3 response. Check ${debugFile} for full response`);
      throw new Error(`Failed to analyze website: ${domain} - no output received`);
    }

    // Handle array format (older pattern)
    if (Array.isArray(output)) {
      console.log(`📦 Output is array with ${output.length} items`);
      
      // Check if first element is our result
      if (output.length > 0) {
        const firstItem = output[0];
        console.log(`🔍 First item type: ${typeof firstItem}, has domain: ${'domain' in (firstItem || {})}`);
        
        // If first item has domain property, return it
        if (firstItem && typeof firstItem === 'object' && 'domain' in firstItem) {
          console.log(`✅ Found valid analysis in first array item`);
          return firstItem;
        }
        
        // Check nested data property
        if (firstItem && typeof firstItem === 'object' && 'data' in firstItem && firstItem.data?.domain) {
          console.log(`✅ Found valid analysis in first item's data property`);
          return firstItem.data;
        }
      }
      
      // Try all items if first didn't work
      for (const item of output) {
        if (item && typeof item === 'object' && 'domain' in item) {
          console.log(`✅ Found valid analysis in array item`);
          return item;
        }
        if (item && typeof item === 'object' && 'data' in item && item.data?.domain) {
          console.log(`✅ Found valid analysis in item's data property`);
          return item.data;
        }
      }
    }
    
    // Handle direct object format
    if (typeof output === 'object' && output !== null && 'domain' in output) {
      console.log(`✅ Output is direct object with domain property`);
      return output;
    }

    console.log(`❌ Unexpected output format. Type: ${typeof output}, IsArray: ${Array.isArray(output)}, Keys: ${output ? Object.keys(output) : 'null'}`);
    throw new Error(`Failed to analyze website: ${domain} - unexpected output format`);
  } catch (error) {
    console.error(`Error analyzing ${domain}:`, error);
    
    // Return error state - no fallback to avoid misleading data
    throw new Error(`Failed to analyze ${domain} - O3 analysis unsuccessful`);
  }
}

/**
 * Batch analyze multiple websites
 */
export async function batchAnalyzeWebsites(
  domains: string[],
  currentNiches: string[] = [],
  currentCategories: string[] = [],
  concurrency: number = 5
): Promise<any[]> {
  const results = [];
  
  // Process in batches
  for (let i = 0; i < domains.length; i += concurrency) {
    const batch = domains.slice(i, i + concurrency);
    
    // Analyze batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map(domain => analyzeWebsiteEnhanced(domain, currentNiches, currentCategories))
    );
    
    // Collect results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Batch analysis error:', result.reason);
      }
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < domains.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}