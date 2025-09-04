import { Agent, Runner } from '@openai/agents';
import { webSearchTool, OpenAIProvider } from '@openai/agents-openai';
import { z } from 'zod';
import { extractO3Output, validateO3Analysis } from '@/lib/utils/o3ResponseParser';

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
- When it comes to niches, try not to get too granular. The goal is to capture the broad niche, usually that's 1-2 words. When you get into 3+ words, it starts getting randomly granular
- Avoid listing a niche or category as a New suggestion when it already exists in the existing suggestion. Just look carefully at the existing suggestions first
- When adding new suggestions, repeating close variations of the same suggestion doesn't help much. Saying Travel inspiration and travel tips when you already listed Travel as a suggestion is redundant. We're thinking about unique niche segments, not those that can easily be phrase matched
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
    const result = await runner.run(agent, messages);
    
    // Use our standardized parser to extract the output
    const output = extractO3Output(result);
    
    // Validate the output
    if (!validateO3Analysis(output, domain)) {
      throw new Error(`Invalid O3 analysis output for ${domain}`);
    }
    
    console.log(`✅ Successfully analyzed ${domain}`);
    return output;
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
    const batchResults = await Promise.allSettled(
      batch.map(domain => analyzeWebsiteEnhanced(domain, currentNiches, currentCategories))
    );
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`Failed to analyze website:`, result.reason);
        results.push(null);
      }
    }
  }
  
  return results;
}