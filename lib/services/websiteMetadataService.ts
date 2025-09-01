import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export interface WebsiteMetadata {
  niches: string[];
  categories: string[];
  websiteTypes: string[];
}

/**
 * Fetch all unique niches, categories, and website types from the database
 * This ensures the AI always has the most current list of options
 */
export async function getWebsiteMetadata(): Promise<WebsiteMetadata> {
  try {
    // Get unique niches
    const nichesResult = await db.execute(sql`
      SELECT DISTINCT unnest(niche) as value
      FROM websites
      WHERE niche IS NOT NULL
      ORDER BY value
    `);
    const niches = (nichesResult as any).rows
      ?.map((row: any) => row.value)
      .filter((v: any) => v && v !== '#N/A') || [];

    // Get unique categories
    const categoriesResult = await db.execute(sql`
      SELECT DISTINCT unnest(categories) as value
      FROM websites
      WHERE categories IS NOT NULL
      ORDER BY value
    `);
    const categories = (categoriesResult as any).rows
      ?.map((row: any) => row.value)
      .filter((v: any) => v && v !== '#N/A') || [];

    // Get unique website types
    const typesResult = await db.execute(sql`
      SELECT DISTINCT unnest(website_type) as value
      FROM websites
      WHERE website_type IS NOT NULL
      ORDER BY value
    `);
    const websiteTypes = (typesResult as any).rows
      ?.map((row: any) => row.value)
      .filter((v: any) => v && v !== 'Type') || [];

    console.log(`📊 Loaded metadata: ${niches.length} niches, ${categories.length} categories, ${websiteTypes.length} types`);

    return {
      niches,
      categories,
      websiteTypes
    };
  } catch (error) {
    console.error('Error fetching website metadata:', error);
    // Return fallback values if database fails
    return {
      niches: ['SaaS', 'B2B', 'eCommerce', 'Startups', 'Enterprise', 'SMB'],
      categories: ['Technology', 'Business', 'Marketing', 'Health', 'Finance', 'Lifestyle', 'Education'],
      websiteTypes: ['Blog', 'News', 'Magazine', 'Corporate', 'Personal', 'Portfolio']
    };
  }
}

/**
 * Format metadata for inclusion in AI prompts
 */
export function formatMetadataForPrompt(metadata: WebsiteMetadata): string {
  return `
AVAILABLE OPTIONS FROM DATABASE:

CATEGORIES (${metadata.categories.length} total):
${metadata.categories.join(', ')}

NICHES (${metadata.niches.length} total):
${metadata.niches.join(', ')}

WEBSITE TYPES (${metadata.websiteTypes.length} total):
${metadata.websiteTypes.join(', ')}

IMPORTANT RULES:
1. You can select MULTIPLE categories, niches, and website types for each website
2. Choose all that apply - don't limit yourself to just one
3. If you identify relevant niches that aren't in the list above, add them to a "suggestedNewNiches" field
4. The more specific and accurate your categorization, the better
`;
}