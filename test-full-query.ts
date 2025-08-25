import { db } from './lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from './lib/db/bulkAnalysisSchema';
import { clients } from './lib/db/schema';
import { websites } from './lib/db/websiteSchema';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { eq, sql, inArray, or, isNull } from 'drizzle-orm';

async function testFullQuery() {
  try {
    console.log('Testing full query from API route...');
    
    const clientId = 'aca65919-c0f9-49d0-888b-2c488f7580dc'; // Zaid's client
    
    // Build the exact query from the API
    const query = db
      .select({
        // Domain data
        id: bulkAnalysisDomains.id,
        domain: bulkAnalysisDomains.domain,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus,
        qualifiedAt: bulkAnalysisDomains.aiQualifiedAt,
        updatedAt: bulkAnalysisDomains.updatedAt,
        
        // User curation
        userBookmarked: bulkAnalysisDomains.userBookmarked,
        userHidden: bulkAnalysisDomains.userHidden,
        userBookmarkedAt: bulkAnalysisDomains.userBookmarkedAt,
        userHiddenAt: bulkAnalysisDomains.userHiddenAt,
        
        // AI analysis data
        overlapStatus: bulkAnalysisDomains.overlapStatus,
        authorityDirect: bulkAnalysisDomains.authorityDirect,
        authorityRelated: bulkAnalysisDomains.authorityRelated,
        evidence: bulkAnalysisDomains.evidence,
        aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
        topicScope: bulkAnalysisDomains.topicScope,
        topicReasoning: bulkAnalysisDomains.topicReasoning,
        qualificationData: bulkAnalysisDomains.qualificationData,
        targetPageIds: bulkAnalysisDomains.targetPageIds,
        
        // Target URL data
        suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
        targetMatchData: bulkAnalysisDomains.targetMatchData,
        
        // Client and project info
        clientId: bulkAnalysisDomains.clientId,
        clientName: clients.name,
        projectId: bulkAnalysisDomains.projectId,
        projectName: bulkAnalysisProjects.name,
        
        // Website metrics (from websites table)
        websiteId: websites.id,
        domainRating: websites.domainRating,
        traffic: websites.totalTraffic,
        categories: websites.categories,
        
        // Pricing from websites
        guestPostPrice: websites.guestPostCost,
        
        // Availability check (count of active line items using this domain)
        activeLineItemsCount: sql<number>`
          COALESCE((
            SELECT COUNT(*)::int
            FROM ${orderLineItems}
            WHERE ${orderLineItems.assignedDomain} = ${bulkAnalysisDomains.domain}
            AND ${orderLineItems.status} != 'cancelled'
          ), 0)
        `,
      })
      .from(bulkAnalysisDomains)
      .leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id))
      .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
      .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain));
    
    // Add conditions
    const conditions = [
      inArray(bulkAnalysisDomains.clientId, [clientId]),
      inArray(bulkAnalysisDomains.qualificationStatus, ['high_quality', 'good_quality']),
      or(
        eq(bulkAnalysisDomains.userHidden, false),
        isNull(bulkAnalysisDomains.userHidden)
      )
    ];
    
    console.log('Applying conditions...');
    // This line might be causing the issue - let's test without .where first
    
    // Test without where clause first
    console.log('Testing without where clause...');
    const resultNoWhere = await query.limit(1);
    console.log('Query without where works:', resultNoWhere.length);
    
    // Now test with where clause
    console.log('Testing with where clause...');
    const queryWithWhere = query.where(conditions.length > 0 ? or(...conditions) : undefined);
    const resultWithWhere = await queryWithWhere.limit(1);
    console.log('Query with where works:', resultWithWhere.length);
    
  } catch (error: any) {
    console.error('Query error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullQuery();