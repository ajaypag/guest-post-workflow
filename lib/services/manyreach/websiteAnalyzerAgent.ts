import { Agent, Runner } from '@openai/agents';
import { webSearchTool, OpenAIProvider } from '@openai/agents-openai';
import { z } from 'zod';

/**
 * Website Analyzer Agent using o3 with webSearch
 * 
 * This agent visits websites to determine their actual niches, categories, and types
 * based on real content analysis rather than guessing from email descriptions.
 */

// Website analyzer agent - uses o3 for intelligent analysis
export const websiteAnalyzerAgent = new Agent({
  name: 'WebsiteAnalyzer',
  model: 'o3-2025-04-16',
  instructions: `Visit the given website using web search and categorize it based on its actual content.

Select appropriate niches, categories, and website types from these lists:

NICHES (choose 1-4): Automotive, Business, Careers, Dating, Dental, Design, Diet, Education, Entertainment, Faith, Family, Fashion, Finance, Fitness, Food, General, Health, Home, Insurance, Legal, Lifestyle, Marketing, Mommy Blogs, Music, News, Outdoors, Pets, Photography, Politics, Real Estate, Sales, Self Improvement, Shopping, Sports, Technology, Travel, Web Design, Wedding, Women

CATEGORIES (choose 1-3): Blog, Business, Directory, E-commerce, Education, Entertainment, Food and Drink, Forum, Gambling, Government, Health & Medical, Magazine, News, Non-profit, Other, Personal, Technology

WEBSITE TYPES (choose 1-2): Blog, News, Magazine, SaaS, eCommerce, Corporate, Agency, Reviews, Service`,
  tools: [webSearchTool()],
  outputType: z.object({
    domain: z.string(),
    niche: z.array(z.string()).min(1).max(4),
    categories: z.array(z.string()).min(1).max(3),
    websiteType: z.array(z.string()).min(1).max(2),
    contentSummary: z.string(),
    confidenceScore: z.number().min(0).max(1),
    visitedPages: z.array(z.string())
  })
});

/**
 * Analyze a website using o3-mini with web search
 */
export async function analyzeWebsite(domain: string): Promise<{
  domain: string;
  niche: string[];
  categories: string[];
  websiteType: string[];
  contentSummary: string;
  confidenceScore: number;
  visitedPages: string[];
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

  // Run the agent with messages array format
  const messages = [{
    role: 'user' as const,
    content: `Analyze this website: ${domain}`
  }];

  const result = await runner.run(websiteAnalyzerAgent, messages);

  // For structured output agents, extract the actual data
  // The output can be in various formats depending on the agent framework version
  const output = result.output as any;
  
  if (!output) {
    throw new Error(`Failed to analyze website: ${domain} - no output received`);
  }

  // Handle array format (multiple output items)
  if (Array.isArray(output)) {
    // Look for the structured data in the array
    for (const item of output) {
      // Check if this item has our expected structure
      if (item && typeof item === 'object' && 'domain' in item) {
        return item;
      }
      // Check if it's wrapped in a data property
      if (item && typeof item === 'object' && 'data' in item && item.data?.domain) {
        return item.data;
      }
    }
  }
  
  // Handle direct object format
  if (typeof output === 'object' && 'domain' in output) {
    return output;
  }

  throw new Error(`Failed to analyze website: ${domain} - unexpected output format`);
}