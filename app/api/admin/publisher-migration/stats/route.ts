import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { 
  websites, 
  publishers, 
  publisherOfferings,
  publisherWebsites 
} from '@/lib/db/schema';
import { sql, eq, isNotNull, isNull, count } from 'drizzle-orm';

/**
 * GET /api/admin/publisher-migration/stats
 * 
 * Returns current migration statistics and progress
 */
export async function GET(request: NextRequest) {
  try {
    // Parallel queries for performance
    const [
      totalWebsitesResult,
      websitesWithPublisherResult,
      uniquePublishersResult,
      shadowPublishersResult,
      offeringsResult,
      relationshipsResult,
      claimedAccountsResult
    ] = await Promise.all([
      // Total websites
      db.select({ count: count() }).from(websites),
      
      // Websites with publisher company
      db.select({ count: count() })
        .from(websites)
        .where(isNotNull(websites.publisherCompany)),
      
      // Unique publisher companies
      db.execute(sql`
        SELECT COUNT(DISTINCT publisher_company) as count
        FROM ${websites}
        WHERE publisher_company IS NOT NULL
      `),
      
      // Shadow publishers created
      db.select({ count: count() })
        .from(publishers)
        .where(eq(publishers.accountStatus, 'shadow')),
      
      // Active offerings created
      db.select({ count: count() })
        .from(publisherOfferings)
        .where(eq(publisherOfferings.isActive, true)),
      
      // Publisher-website relationships
      db.select({ count: count() })
        .from(publisherWebsites),
      
      // Claimed accounts
      db.select({ count: count() })
        .from(publishers)
        .where(eq(publishers.accountStatus, 'active'))
    ]);

    // Get invitation stats
    const invitationStats = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN invitation_sent_at IS NOT NULL THEN 1 END) as sent,
        COUNT(CASE WHEN claimed_at IS NOT NULL THEN 1 END) as claimed
      FROM ${publishers}
      WHERE account_status IN ('shadow', 'active')
    `);

    const stats = {
      totalWebsites: Number(totalWebsitesResult[0]?.count || 0),
      websitesWithPublisher: Number(websitesWithPublisherResult[0]?.count || 0),
      websitesWithoutPublisher: 0, // Calculated below
      uniquePublishers: Number(uniquePublishersResult.rows[0]?.count || 0),
      shadowPublishersCreated: Number(shadowPublishersResult[0]?.count || 0),
      offeringsCreated: Number(offeringsResult[0]?.count || 0),
      relationshipsCreated: Number(relationshipsResult[0]?.count || 0),
      invitationsSent: Number(invitationStats.rows[0]?.sent || 0),
      claimedAccounts: Number(claimedAccountsResult[0]?.count || 0),
      migrationProgress: 0, // Calculated below
      errors: 0, // Will be set by validation
      warnings: 0, // Will be set by validation
      info: 0 // Will be set by validation
    };

    // Calculate derived stats
    stats.websitesWithoutPublisher = stats.totalWebsites - stats.websitesWithPublisher;
    
    // Calculate migration progress (rough estimate)
    let progress = 0;
    if (stats.shadowPublishersCreated > 0) progress += 25;
    if (stats.offeringsCreated > 0) progress += 25;
    if (stats.invitationsSent > 0) progress += 25;
    if (stats.claimedAccounts > 0) progress += 25;
    
    stats.migrationProgress = progress;

    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Failed to fetch migration stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch migration statistics' },
      { status: 500 }
    );
  }
}