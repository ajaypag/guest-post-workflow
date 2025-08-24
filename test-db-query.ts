import { db } from './lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from './lib/db/bulkAnalysisSchema';
import { clients } from './lib/db/schema';
import { websites } from './lib/db/websiteSchema';
import { eq, sql } from 'drizzle-orm';

async function testQuery() {
  try {
    console.log('Testing basic query...');
    
    // Test 1: Simple query without joins
    const simpleResult = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
      })
      .from(bulkAnalysisDomains)
      .limit(1);
    
    console.log('Simple query works:', simpleResult.length);
    
    // Test 2: Query with one join
    const oneJoinResult = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        clientName: clients.name,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .limit(1);
    
    console.log('One join works:', oneJoinResult.length);
    
    // Test 3: Query with all joins
    const allJoinsResult = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        clientName: clients.name,
        projectName: bulkAnalysisProjects.name,
        domainRating: websites.domainRating,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain))
      .limit(1);
    
    console.log('All joins work:', allJoinsResult.length);
    
    // Test 4: Query with SQL expression
    const sqlExprResult = await db
      .select({
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        activeLineItemsCount: sql<number>`0`,
      })
      .from(bulkAnalysisDomains)
      .limit(1);
    
    console.log('SQL expression works:', sqlExprResult.length);
    
  } catch (error: any) {
    console.error('Query error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testQuery();