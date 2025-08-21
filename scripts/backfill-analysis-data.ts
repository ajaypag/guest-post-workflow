import { db } from '../lib/db/connection';
import { orderLineItems } from '../lib/db/orderLineItemSchema';
import { bulkAnalysisDomains } from '../lib/db/bulkAnalysisSchema';
import { eq, and } from 'drizzle-orm';

async function backfillAnalysisData() {
  const projectId = 'f77dfdfb-0874-42e7-b07e-cd7fe642a2b8';
  const domainsToFix = ['tekedia.com', 'mindstick.com'];
  
  console.log('\n=== BACKFILLING ANALYSIS DATA ===\n');
  
  for (const domainName of domainsToFix) {
    console.log(`\n--- Processing ${domainName} ---`);
    
    // 1. Get bulk analysis data from correct project
    const bulkDomain = await db.query.bulkAnalysisDomains.findFirst({
      where: and(
        eq(bulkAnalysisDomains.domain, domainName),
        eq(bulkAnalysisDomains.projectId, projectId)
      )
    });
    
    if (!bulkDomain) {
      console.log(`❌ No bulk analysis data found for ${domainName}`);
      continue;
    }
    
    console.log('✅ Found bulk analysis data:');
    console.log('   Qualification Status:', bulkDomain.qualificationStatus);
    console.log('   Overlap Status:', bulkDomain.overlapStatus);
    console.log('   Direct Keywords:', bulkDomain.evidence?.direct_count || 0);
    console.log('   Related Keywords:', bulkDomain.evidence?.related_count || 0);
    console.log('   AI Reasoning:', bulkDomain.aiQualificationReasoning ? 'exists' : 'missing');
    
    // 2. Get line item
    const lineItem = await db.query.orderLineItems.findFirst({
      where: eq(orderLineItems.assignedDomain, domainName)
    });
    
    if (!lineItem) {
      console.log(`❌ No line item found for ${domainName}`);
      continue;
    }
    
    // 3. Update with rich metadata
    await db
      .update(orderLineItems)
      .set({
        metadata: {
          ...((lineItem.metadata as any) || {}),
          // Rich qualification analysis data
          aiQualificationReasoning: bulkDomain.aiQualificationReasoning,
          overlapStatus: bulkDomain.overlapStatus,
          authorityDirect: bulkDomain.authorityDirect,
          authorityRelated: bulkDomain.authorityRelated,
          topicScope: bulkDomain.topicScope,
          keywordCount: bulkDomain.keywordCount,
          dataForSeoResultsCount: bulkDomain.dataForSeoResultsCount,
          hasDataForSeoResults: bulkDomain.hasDataForSeoResults,
          evidence: bulkDomain.evidence,
          notes: bulkDomain.notes,
          // Keep existing data
          domainRating: (lineItem.metadata as any)?.domainRating,
          traffic: (lineItem.metadata as any)?.traffic,
          domainQualificationStatus: bulkDomain.qualificationStatus,
          assignmentMethod: 'enriched_with_analysis_data',
          // Add target URL analysis data
          suggestedTargetUrl: bulkDomain.suggestedTargetUrl,
          targetMatchData: bulkDomain.targetMatchData,
          targetMatchedAt: bulkDomain.targetMatchedAt
        }
      })
      .where(eq(orderLineItems.id, lineItem.id));
    
    console.log('✅ Updated line item with rich analysis data');
  }
  
  console.log('\n=== BACKFILL COMPLETE ===');
  process.exit(0);
}

backfillAnalysisData().catch(console.error);