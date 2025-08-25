import { db } from './lib/db/connection';
import { bulkAnalysisDomains, bulkAnalysisProjects } from './lib/db/bulkAnalysisSchema';
import { clients } from './lib/db/schema';
import { websites } from './lib/db/websiteSchema';
import { orderLineItems } from './lib/db/orderLineItemSchema';
import { eq, sql } from 'drizzle-orm';

async function testFieldByField() {
  try {
    console.log('Testing fields one by one...\n');
    
    // Test each field group separately
    const fieldGroups = [
      {
        name: 'Basic domain fields',
        fields: {
          id: bulkAnalysisDomains.id,
          domain: bulkAnalysisDomains.domain,
          qualificationStatus: bulkAnalysisDomains.qualificationStatus,
        }
      },
      {
        name: 'Date fields',
        fields: {
          qualifiedAt: bulkAnalysisDomains.aiQualifiedAt,
          updatedAt: bulkAnalysisDomains.updatedAt,
        }
      },
      {
        name: 'User curation fields',
        fields: {
          userBookmarked: bulkAnalysisDomains.userBookmarked,
          userHidden: bulkAnalysisDomains.userHidden,
          userBookmarkedAt: bulkAnalysisDomains.userBookmarkedAt,
          userHiddenAt: bulkAnalysisDomains.userHiddenAt,
        }
      },
      {
        name: 'AI analysis fields',
        fields: {
          overlapStatus: bulkAnalysisDomains.overlapStatus,
          authorityDirect: bulkAnalysisDomains.authorityDirect,
          authorityRelated: bulkAnalysisDomains.authorityRelated,
          evidence: bulkAnalysisDomains.evidence,
        }
      },
      {
        name: 'AI reasoning fields',
        fields: {
          aiQualificationReasoning: bulkAnalysisDomains.aiQualificationReasoning,
          topicScope: bulkAnalysisDomains.topicScope,
          topicReasoning: bulkAnalysisDomains.topicReasoning,
        }
      },
      {
        name: 'Additional data fields',
        fields: {
          qualificationData: bulkAnalysisDomains.qualificationData,
          targetPageIds: bulkAnalysisDomains.targetPageIds,
          suggestedTargetUrl: bulkAnalysisDomains.suggestedTargetUrl,
          targetMatchData: bulkAnalysisDomains.targetMatchData,
        }
      },
      {
        name: 'Client info with join',
        fields: {
          clientId: bulkAnalysisDomains.clientId,
          clientName: clients.name,
        }
      },
      {
        name: 'Project info with join',
        fields: {
          projectId: bulkAnalysisDomains.projectId,
          projectName: bulkAnalysisProjects.name,
        }
      },
      {
        name: 'Website metrics with join',
        fields: {
          websiteId: websites.id,
          domainRating: websites.domainRating,
          traffic: websites.totalTraffic,
          categories: websites.categories,
          guestPostPrice: websites.guestPostCost,
        }
      }
    ];

    for (const group of fieldGroups) {
      try {
        console.log(`Testing: ${group.name}`);
        
        let query = db.select(group.fields).from(bulkAnalysisDomains);
        
        // Add joins if needed
        if (group.name.includes('Client')) {
          query = query.leftJoin(clients, eq(bulkAnalysisDomains.clientId, clients.id));
        }
        if (group.name.includes('Project')) {
          query = query
            .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id));
        }
        if (group.name.includes('Website')) {
          query = query
            .leftJoin(websites, eq(bulkAnalysisDomains.domain, websites.domain));
        }
        
        const result = await query.limit(1);
        console.log(`  ✅ Success - returned ${result.length} rows`);
      } catch (error: any) {
        console.log(`  ❌ FAILED: ${error.message}`);
      }
    }
    
    // Test the SQL expression separately
    console.log('\nTesting SQL expression field...');
    try {
      const sqlResult = await db
        .select({
          id: bulkAnalysisDomains.id,
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
        .limit(1);
      console.log('  ✅ SQL expression works');
    } catch (error: any) {
      console.log(`  ❌ SQL expression FAILED: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error('Test error:', error.message);
  }
}

testFieldByField();