import { db } from './lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects, clients, websites, orderItems } from './lib/db/schema';
import { eq, inArray, and, or, ilike, desc, asc, isNull, sql } from 'drizzle-orm';

async function debugVettedSites() {
  try {
    console.log('Starting debug...');

    // Simple query first
    const simpleDomains = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
      })
      .from(bulkAnalysisDomains)
      .limit(5);
    
    console.log('Simple query works:', simpleDomains.length, 'domains');

    // Try with join
    const withJoin = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        clientName: clients.name,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .limit(5);
    
    console.log('Join query works:', withJoin.length, 'domains');

    // Try with the full query
    const fullQuery = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus,
        clientName: clients.name,
        activeLineItemsCount: sql<number>`
          COALESCE((
            SELECT COUNT(*)::int
            FROM ${orderItems}
            WHERE ${orderItems.domain} = ${bulkAnalysisDomains.domain}
            AND ${orderItems.status} != 'cancelled'
          ), 0)
        `,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .limit(5);

    console.log('Full query works:', fullQuery.length, 'domains');
    console.log('Sample result:', fullQuery[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugVettedSites();