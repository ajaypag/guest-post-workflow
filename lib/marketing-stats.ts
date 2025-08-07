import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

export interface MarketingStats {
  totalSites: number;
  totalNiches: number;
}

export async function getMarketingStats(): Promise<MarketingStats> {
  try {
    // Get total website count - same query as guest-posting-sites page
    const totalSites = await db
      .select({ count: sql<number>`count(*)` })
      .from(websites);
    
    // Get total niches with 10+ sites (same threshold as guest-posting-sites)
    const nicheCount = await db.execute(sql`
      SELECT COUNT(DISTINCT niche_name) as count
      FROM (
        SELECT UNNEST(niche) as niche_name, COUNT(*) as site_count
        FROM websites
        WHERE niche IS NOT NULL AND array_length(niche, 1) > 0
        GROUP BY niche_name
        HAVING COUNT(*) >= 10
      ) niche_stats
    `);

    return {
      totalSites: totalSites[0]?.count || 13000,
      totalNiches: nicheCount.rows[0]?.count || 100
    };
  } catch (error) {
    console.warn('Could not fetch marketing stats:', error);
    // Return consistent fallback stats
    return {
      totalSites: 13000,
      totalNiches: 100
    };
  }
}

// Format the total sites number consistently across pages
export function formatSiteCount(count: number): string {
  if (count >= 1000) {
    const thousands = Math.floor(count / 1000);
    const remainder = count % 1000;
    if (remainder === 0) {
      return `${thousands},000`;
    } else {
      return count.toLocaleString();
    }
  }
  return count.toString();
}