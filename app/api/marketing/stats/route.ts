import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total website count
    const totalSites = await db
      .select({ count: sql<number>`count(*)` })
      .from(websites);
    
    // Get total niches with 10+ sites
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

    const stats = {
      totalSites: totalSites[0]?.count || 13000,
      totalNiches: nicheCount.rows[0]?.count || 100
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.warn('Could not fetch real-time stats:', error);
    // Return fallback stats
    return NextResponse.json({
      totalSites: 13000,
      totalNiches: 100
    });
  }
}